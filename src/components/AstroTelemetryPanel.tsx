import React, { useState, useEffect } from 'react';
import {
  Compass,
  Maximize,
  Maximize2,
  RotateCw,
  Search,
  Filter,
  Copy,
  Check,
  Sparkles,
  Database,
  ExternalLink,
  Target,
  FileText,
  Download,
  Layers,
  FileSpreadsheet,
} from 'lucide-react';
import { SolvedAstroData, AstrometryAnnotationItem } from '../types/astronomy';
import {
  degToRA_HMS,
  degToDec_DMS,
  formatAngularSize,
  pixelToSkyCoords,
} from '../utils/coordinateMath';
import { AladinSurveyModal } from './AladinSurveyModal';
import { StarChartLayerModal, STAR_CHART_LAYERS, StarChartLayerType } from './StarChartLayerModal';
import {
  generateBrowserStarChartLayers,
  downloadLocalSolverArtifact,
  LocalLayerImageMap,
} from '../utils/localStarChartLayers';
import {
  downloadLiveDualIndexTileFromVizier,
  getLocalDualIndexStats,
} from '../utils/dualIndexCatalog';

interface AstroTelemetryPanelProps {
  data: SolvedAstroData;
  onSelectObject: (objectName: string) => void;
  onOpenDualIndexModal?: () => void;
}

export const AstroTelemetryPanel: React.FC<AstroTelemetryPanelProps> = ({
  data,
  onSelectObject,
  onOpenDualIndexModal,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'star' | 'dso'>('all');
  const [copiedCoords, setCopiedCoords] = useState(false);
  const [downloadedCSV, setDownloadedCSV] = useState(false);
  const [isAladinOpen, setIsAladinOpen] = useState(false);
  const [selectedLayerModal, setSelectedLayerModal] = useState<StarChartLayerType | null>(null);
  const [localLayerUrls, setLocalLayerUrls] = useState<LocalLayerImageMap | null>(null);
  const [isDownloadingTile, setIsDownloadingTile] = useState(false);
  const [tileDownloadNotice, setTileDownloadNotice] = useState<string | null>(null);
  const dualIndexStats = getLocalDualIndexStats();

  const isLocalJob = String(data.jobId).startsWith('local_');
  const cal = data.calibration;
  const annotations = data.annotations || [];
  const objectsInField = data.info?.objects_in_field || [];

  useEffect(() => {
    let cancelled = false;
    generateBrowserStarChartLayers(data)
      .then((urls) => {
        if (!cancelled) {
          setLocalLayerUrls(urls);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [data]);

  const copyCoordinates = () => {
    if (!cal) return;
    const str = `RA: ${degToRA_HMS(cal.ra)} (${cal.ra.toFixed(5)}°), Dec: ${degToDec_DMS(cal.dec)} (${cal.dec.toFixed(5)}°)`;
    navigator.clipboard.writeText(str);
    setCopiedCoords(true);
    setTimeout(() => setCopiedCoords(false), 2000);
  };

  // Export full celestial telemetry & annotations catalog to CSV
  const handleDownloadCSV = () => {
    if (!cal) return;

    const imgW =
      cal.width_arcsec && cal.pixscale && cal.pixscale > 0
        ? Math.round(cal.width_arcsec / cal.pixscale)
        : data.imageWidth || 1920;
    const imgH =
      cal.height_arcsec && cal.pixscale && cal.pixscale > 0
        ? Math.round(cal.height_arcsec / cal.pixscale)
        : data.imageHeight || 1080;

    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const primaryConst = data.matchedConstellations[0];
    const constStr = primaryConst
      ? `${primaryConst.nameKo} (${primaryConst.code} / ${primaryConst.nameEn})`
      : '천구 별자리';

    // 1. Build metadata header comments
    const metaLines: string[] = [
      `# ==============================================================================`,
      `# AstroPlate 천체 관측 분석 데이터 리포트 (Astrometry & Constellation Report)`,
      `# ==============================================================================`,
      `# 작업 ID (Job ID),#${data.jobId}`,
      `# 관측 사진 명칭,"${(data.title || `Job #${data.jobId}`).replace(/"/g, '""')}"`,
      `# 주요 별자리,"${constStr.replace(/"/g, '""')}"`,
      `# 중앙 적경 (Center RA),"${degToRA_HMS(cal.ra)} (${cal.ra.toFixed(5)}° J2000)"`,
      `# 중앙 적위 (Center Dec),"${degToDec_DMS(cal.dec)} (${cal.dec.toFixed(5)}° J2000)"`,
      `# 시야각 반경 (Field Radius),"${cal.radius.toFixed(3)}° (${(cal.radius * 60).toFixed(1)} arcmin)"`,
      `# 화각 크기 (Field Size),"${cal.width_arcsec && cal.height_arcsec ? `${(cal.width_arcsec / 3600).toFixed(2)}° × ${(cal.height_arcsec / 3600).toFixed(2)}°` : `${(cal.radius * 2).toFixed(2)}°`}"`,
      `# 픽셀 스케일 (Pixel Scale),"${cal.pixscale.toFixed(3)} arcsec/pixel"`,
      `# 회전 방위각 (Orientation),"${cal.orientation.toFixed(2)}° (East of North)"`,
      `# 패리티 (Parity),"${cal.parity > 0 ? '+1 (정방향)' : '-1 (반전)'}"`,
      `# 분석 이미지 해상도,"${imgW} × ${imgH} px"`,
      `# 검출된 천체 총수,"${annotations.length} 개"`,
      `# 데이터 추출 시각 (UTC),"${nowStr}"`,
      `# ==============================================================================`,
      ``,
    ];

    // 2. CSV Table Headers
    const headers = [
      '순번',
      '천체명(Primary Name)',
      '분류(Type)',
      '픽셀_X(px)',
      '픽셀_Y(px)',
      '적경_RA(HMS)',
      '적경_RA(deg)',
      '적위_Dec(DMS)',
      '적위_Dec(deg)',
      '실시등급(Vmag)',
      '크기반경(arcsec)',
      '전체_식별자(All Names)',
    ];

    const escapeCSV = (val: string | number | undefined | null) => {
      if (val === undefined || val === null) return '';
      const s = String(val);
      if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    };

    // 3. Rows
    const rows = annotations.map((item, idx) => {
      const isStar = item.type === 'bright' || item.type === 'hd' || item.type === 'star';
      const typeStr = isStar ? '항성 (Star)' : '심우주천체 (DSO)';
      const primaryName = item.names[0] || 'Unknown';
      const allNames = item.names.join('; ');

      // Compute RA & Dec for this specific pixel location
      const skyCoords = pixelToSkyCoords(
        item.pixelx,
        item.pixely,
        imgW,
        imgH,
        cal.ra,
        cal.dec,
        cal.pixscale,
        cal.orientation,
        cal.parity
      );

      const radiusArcsec = item.radius ? (item.radius * cal.pixscale).toFixed(1) : '';

      return [
        idx + 1,
        escapeCSV(primaryName),
        escapeCSV(typeStr),
        Math.round(item.pixelx),
        Math.round(item.pixely),
        escapeCSV(degToRA_HMS(skyCoords.ra)),
        skyCoords.ra.toFixed(5),
        escapeCSV(degToDec_DMS(skyCoords.dec)),
        skyCoords.dec.toFixed(5),
        item.vmag !== undefined ? item.vmag.toFixed(2) : '',
        radiusArcsec,
        escapeCSV(allNames),
      ].join(',');
    });

    const csvContent = [...metaLines, headers.join(','), ...rows].join('\r\n');

    // Create download with UTF-8 BOM so Excel opens Korean characters correctly
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const safeTitle = (data.title || `astroplate_${data.jobId}`)
      .replace(/[^a-zA-Z0-9가-힣_-]/g, '_')
      .substring(0, 40);
    link.download = `${safeTitle}_celestial_data_#${data.jobId}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setDownloadedCSV(true);
    setTimeout(() => setDownloadedCSV(false), 2500);
  };

  // Filtered annotations table
  const filteredAnnotations = annotations.filter((item) => {
    const nameMatch = item.names.some((n) => n.toLowerCase().includes(searchTerm.toLowerCase()));
    if (!nameMatch) return false;

    const isStar = item.type === 'bright' || item.type === 'hd' || item.type === 'star';
    if (filterType === 'star') return isStar;
    if (filterType === 'dso') return !isStar;
    return true;
  });

  return (
    <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 shadow-xl space-y-6">
      {/* Telemetry Overview Cards */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <Target className="w-5 h-5 text-sky-400" />
            <h3 className="text-base font-bold text-white tracking-tight">
              천체 좌표 및 WCS 관측 원격 측정 (Calibration Telemetry)
            </h3>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleDownloadCSV}
              className="text-xs px-3 py-1.5 rounded-lg bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-bold flex items-center space-x-1.5 transition-all shadow-md shadow-sky-500/20 active:scale-95 cursor-pointer"
              title="천체 좌표, WCS 보정 수치 및 검출 항성/DSO 카탈로그를 CSV 파일로 다운로드"
            >
              {downloadedCSV ? (
                <Check className="w-3.5 h-3.5 text-white" />
              ) : (
                <FileSpreadsheet className="w-3.5 h-3.5 text-white" />
              )}
              <span>{downloadedCSV ? 'CSV 다운로드 완료!' : 'CSV 데이터 다운로드'}</span>
            </button>

            <button
              onClick={copyCoordinates}
              className="text-xs px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center space-x-1.5 transition-colors cursor-pointer"
            >
              {copiedCoords ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedCoords ? '복사 완료' : '좌표 복사'}</span>
            </button>

            {/* Aladin Survey Button */}
            <button
              onClick={() => setIsAladinOpen(true)}
              className="text-xs px-2.5 py-1.5 rounded-lg bg-indigo-950/80 hover:bg-indigo-900 text-indigo-300 hover:text-white border border-indigo-800 flex items-center space-x-1.5 transition-colors cursor-pointer"
              title="CDS Aladin Lite 실시간 위성/망원경 정밀 서베이 열기"
            >
              <Compass className="w-3.5 h-3.5 text-indigo-400" />
              <span>Aladin 서베이</span>
            </button>
          </div>
        </div>

        {cal ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* Center RA */}
            <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800">
              <span className="text-[11px] font-semibold text-slate-400 block uppercase">적경 (Center RA)</span>
              <span className="text-sm font-mono font-bold text-sky-400 mt-1 block">
                {degToRA_HMS(cal.ra)}
              </span>
              <span className="text-[10px] text-slate-500 font-mono">{cal.ra.toFixed(4)}° J2000</span>
            </div>

            {/* Center Dec */}
            <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800">
              <span className="text-[11px] font-semibold text-slate-400 block uppercase">적위 (Center Dec)</span>
              <span className="text-sm font-mono font-bold text-sky-400 mt-1 block">
                {degToDec_DMS(cal.dec)}
              </span>
              <span className="text-[10px] text-slate-500 font-mono">{cal.dec.toFixed(4)}° J2000</span>
            </div>

            {/* Field Radius & FOV */}
            <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800">
              <span className="text-[11px] font-semibold text-slate-400 block uppercase">시야각 (FOV / Radius)</span>
              <span className="text-sm font-mono font-bold text-indigo-300 mt-1 block">
                {formatAngularSize(cal.radius)}
              </span>
              <span className="text-[10px] text-slate-500">
                {cal.width_arcsec && cal.height_arcsec
                  ? `${(cal.width_arcsec / 3600).toFixed(1)}° × ${(cal.height_arcsec / 3600).toFixed(1)}°`
                  : `반경 ${cal.radius.toFixed(2)}°`}
              </span>
            </div>

            {/* Pixel Scale */}
            <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800">
              <span className="text-[11px] font-semibold text-slate-400 block uppercase">픽셀 스케일 (Scale)</span>
              <span className="text-sm font-mono font-bold text-emerald-400 mt-1 block">
                {cal.pixscale.toFixed(2)}" / px
              </span>
              <span className="text-[10px] text-slate-500">초각/픽셀 해상도</span>
            </div>

            {/* Orientation */}
            <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800">
              <span className="text-[11px] font-semibold text-slate-400 block uppercase">회전 방위각 (Angle)</span>
              <span className="text-sm font-mono font-bold text-amber-400 mt-1 block">
                {cal.orientation.toFixed(1)}°
              </span>
              <span className="text-[10px] text-slate-500">북쪽 기준 동향 (E of N)</span>
            </div>

            {/* Parity & Job ID */}
            <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800">
              <span className="text-[11px] font-semibold text-slate-400 block uppercase">패리티 (Parity)</span>
              <span className="text-sm font-mono font-bold text-purple-400 mt-1 block">
                {cal.parity > 0 ? '+1 (정방향)' : '-1 (반전)'}
              </span>
              <span className="text-[10px] text-slate-500 font-mono">Job #{data.jobId}</span>
            </div>
          </div>
        ) : (
          <p className="text-xs text-slate-400">좌표 보정 데이터를 불러오는 중...</p>
        )}
      </div>

      {/* Dual-Index Architecture (Tycho-2 Wide-Field vs Gaia DR3 Deep-Sky) Telemetry Panel */}
      <div className="bg-slate-900/80 rounded-2xl p-4 sm:p-5 border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-br from-amber-500/20 to-indigo-500/20 border border-amber-500/30">
              <Sparkles className="w-4 h-4 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-sm font-bold text-white tracking-wide">
                  듀얼 인덱스 대조 엔진 (Dual-Index Comparison Engine)
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-sky-950 text-sky-300 border border-sky-800">
                  {data.dualIndexTelemetry?.selectedCatalog === 'Gaia DR3'
                    ? '딥스카이 모드 (< 2.0° FOV)'
                    : '광각 모드 (≥ 2.0° FOV)'}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                광각은 Tycho-2 (4100-시리즈) · 딥스카이는 Gaia DR3 (5200-시리즈) 자동 교차 검증 및 로컬 인덱스 적용
              </p>
            </div>
          </div>

          {/* Action buttons: Download Local Index JSON files & CDS Tile */}
          <div className="flex flex-wrap items-center gap-2">
            <a
              href="/indexes/tycho2_wide_index.json"
              download="tycho2_wide_index.json"
              className="text-xs px-2.5 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80 flex items-center space-x-1.5 transition-colors cursor-pointer"
              title="로컬 Tycho-2 광각 인덱스 파일(1,800개 전천 항성) JSON 다운로드"
            >
              <Download className="w-3.5 h-3.5 text-indigo-400" />
              <span>Tycho-2 인덱스 ({dualIndexStats.tycho2TotalStars}개)</span>
            </a>

            <a
              href="/indexes/gaia_dr3_deepsky_index.json"
              download="gaia_dr3_deepsky_index.json"
              className="text-xs px-2.5 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80 flex items-center space-x-1.5 transition-colors cursor-pointer"
              title="로컬 Gaia DR3 딥스카이 인덱스 파일(1,010개 항성 / 35개 영역) JSON 다운로드"
            >
              <Download className="w-3.5 h-3.5 text-amber-400" />
              <span>Gaia DR3 인덱스 ({dualIndexStats.gaiaTotalStars}개)</span>
            </a>

            {cal && (
              <button
                disabled={isDownloadingTile}
                onClick={async () => {
                  setIsDownloadingTile(true);
                  setTileDownloadNotice(null);
                  try {
                    const res = await downloadLiveDualIndexTileFromVizier(
                      cal.ra,
                      cal.dec,
                      Math.max(0.6, cal.radius),
                      data.title || '현재 관측 화각',
                      data.matchedConstellations?.[0]?.code || 'Sky'
                    );
                    setTileDownloadNotice(
                      `현재 화각의 Gaia DR3 (${res.gaiaStars.length}개) 및 Tycho-2 (${res.tycho2Stars.length}개) 타일 다운로드 및 로컬 캐시 완료!`
                    );
                  } catch (e: any) {
                    setTileDownloadNotice(`타일 다운로드 오류: ${e.message}`);
                  } finally {
                    setIsDownloadingTile(false);
                    setTimeout(() => setTileDownloadNotice(null), 5000);
                  }
                }}
                className="text-xs px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white flex items-center space-x-1.5 transition-colors cursor-pointer shadow-sm"
                title="CDS VizieR에서 현재 천구 좌표의 Gaia DR3 및 Tycho-2 정밀 타일을 즉시 다운로드하여 로컬 브라우저에 저장"
              >
                <Compass className={`w-3.5 h-3.5 ${isDownloadingTile ? 'animate-spin' : ''}`} />
                <span>{isDownloadingTile ? '타일 다운로드 중...' : '현 위치 타일 다운로드'}</span>
              </button>
            )}

            {onOpenDualIndexModal && (
              <button
                onClick={onOpenDualIndexModal}
                className="text-xs px-2.5 py-1.5 rounded-lg bg-sky-950/90 hover:bg-sky-900 text-sky-300 hover:text-white border border-sky-700/80 flex items-center space-x-1.5 transition-colors cursor-pointer shadow-sm"
                title="듀얼 인덱스 상세 대조 관리자, 알고리즘 사양 및 통합 번들 다운로드 열기"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>듀얼 인덱스 상세 관리자</span>
              </button>
            )}
          </div>
        </div>

        {tileDownloadNotice && (
          <div className="p-2.5 bg-emerald-950/60 border border-emerald-600/40 rounded-xl text-xs text-emerald-300 flex items-center space-x-2">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{tileDownloadNotice}</span>
          </div>
        )}

        {/* Comparison Grid: Tycho-2 vs Gaia DR3 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {/* Box 1: Tycho-2 Wide-Field Index */}
          <div
            className={`p-3.5 rounded-xl border transition-all ${
              data.dualIndexTelemetry?.selectedCatalog === 'Tycho-2'
                ? 'bg-indigo-950/40 border-indigo-500 shadow-md ring-1 ring-indigo-500/50'
                : 'bg-slate-950/60 border-slate-800'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-400" />
                <span className="text-xs font-bold text-white">Tycho-2 광각 인덱스 (4100-시리즈)</span>
              </div>
              {data.dualIndexTelemetry?.selectedCatalog === 'Tycho-2' && (
                <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500 text-white font-bold">
                  선택 채택됨 (Wide-Field)
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 mb-2.5">
              CDS VizieR <code className="text-indigo-300 font-mono">I/259/tyc2</code> 기반 · 화각 ≥ 2.0° 광각 성야 및 별자리 대조
            </p>
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="bg-slate-900/90 p-2 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-400 block">일치 기준성</span>
                <span className="font-mono font-bold text-indigo-300">
                  {data.dualIndexTelemetry?.tycho2Inliers ?? 0} 개
                </span>
              </div>
              <div className="bg-slate-900/90 p-2 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-400 block">RMS 정합 오차</span>
                <span className="font-mono font-bold text-indigo-300">
                  {data.dualIndexTelemetry?.tycho2RmsPx ? `${data.dualIndexTelemetry.tycho2RmsPx}px` : 'N/A'}
                </span>
              </div>
              <div className="bg-slate-900/90 p-2 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-400 block">로그-오즈 점수</span>
                <span className="font-mono font-bold text-indigo-300">
                  {data.dualIndexTelemetry?.tycho2LogOdds ?? 0}
                </span>
              </div>
            </div>
          </div>

          {/* Box 2: Gaia DR3 Deep-Sky Index */}
          <div
            className={`p-3.5 rounded-xl border transition-all ${
              data.dualIndexTelemetry?.selectedCatalog === 'Gaia DR3'
                ? 'bg-amber-950/40 border-amber-500 shadow-md ring-1 ring-amber-500/50'
                : 'bg-slate-950/60 border-slate-800'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                <span className="text-xs font-bold text-white">Gaia DR3 딥스카이 인덱스 (5200-시리즈)</span>
              </div>
              {data.dualIndexTelemetry?.selectedCatalog === 'Gaia DR3' && (
                <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500 text-slate-950 font-bold">
                  선택 채택됨 (Deep-Sky)
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 mb-2.5">
              ESA / CDS VizieR <code className="text-amber-300 font-mono">I/355/gaiadr3</code> 서브밀리초각 정밀 성표 · 화각 &lt; 2.0° 망원 정합
            </p>
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="bg-slate-900/90 p-2 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-400 block">일치 기준성</span>
                <span className="font-mono font-bold text-amber-300">
                  {data.dualIndexTelemetry?.gaiaDr3Inliers ?? 0} 개
                </span>
              </div>
              <div className="bg-slate-900/90 p-2 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-400 block">RMS 정합 오차</span>
                <span className="font-mono font-bold text-amber-300">
                  {data.dualIndexTelemetry?.gaiaDr3RmsPx ? `${data.dualIndexTelemetry.gaiaDr3RmsPx}px` : 'N/A'}
                </span>
              </div>
              <div className="bg-slate-900/90 p-2 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-400 block">로그-오즈 점수</span>
                <span className="font-mono font-bold text-amber-300">
                  {data.dualIndexTelemetry?.gaiaDr3LogOdds ?? 0}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Astrometry.net Equal-Density Downsampling & Seeing De-blending Indicators */}
        <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800/80 text-[11px] text-slate-300 space-y-1.5">
          <div className="flex items-center space-x-2 text-slate-200 font-medium">
            <Target className="w-3.5 h-3.5 text-sky-400" />
            <span>오인식 방지 및 공간 밀도 균일화(Equal-Density Downsampling) 적용 사양</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-slate-400">
            <div className="flex items-start space-x-1.5">
              <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
              <span>
                <strong className="text-slate-300">시상(Seeing) 2.5" 근접쌍 디블렌딩:</strong> 해상도 한계로 뭉개지는 2~3 arcsec 이하 동반성을 사전 병합하여 위조 사각 쿼드 오인식 차단
              </span>
            </div>
            <div className="flex items-start space-x-1.5">
              <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
              <span>
                <strong className="text-slate-300">HEALPix 서브셀 동적 컷오프 (G ≤ 15.8 mag):</strong> 은하수 영역은 13~14등급 자동 컷으로 비대화 방지, 처녀자리 등 희소 영역은 16등급까지 긁어모아 공백 방지
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Objects In Field Tags */}
      {objectsInField.length > 0 && (
        <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800/80">
          <div className="flex items-center space-x-2 mb-2">
            <Sparkles className="w-4 h-4 text-sky-400" />
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wide">
              시야 내 식별된 천체 &amp; 별자리 (Objects in Field)
            </h4>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {objectsInField.map((obj, i) => (
              <button
                key={`tag-${i}`}
                onClick={() => onSelectObject(obj)}
                className="text-xs px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors flex items-center space-x-1"
              >
                <span>{obj}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Astrometry / Browser Direct Analysis Output & Data Artifacts */}
      {data.jobId && (
        <div className="bg-slate-950/60 rounded-xl border border-slate-800 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Layers className="w-4 h-4 text-sky-400" />
              <h4 className="text-sm font-bold text-white">
                {isLocalJob
                  ? '웹브라우저 직접 계산 산출물 및 데이터 파일 (Browser Direct WCS Artifacts)'
                  : 'Astrometry.net 원본 분석 산출물 및 데이터 파일'}
              </h4>
            </div>
            <span className="text-xs font-mono text-slate-400">
              {isLocalJob ? `웹브라우저 직접 계산 · #${data.jobId}` : `Job #${data.jobId}`}
            </span>
          </div>

          {isLocalJob ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              <button
                type="button"
                onClick={() => downloadLocalSolverArtifact(data, 'wcs_file')}
                className="p-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-left transition-colors group flex flex-col justify-between cursor-pointer"
              >
                <div className="flex items-center justify-between text-slate-400 group-hover:text-sky-400 mb-1">
                  <span className="text-[11px] font-bold">WCS FITS</span>
                  <Download className="w-3.5 h-3.5" />
                </div>
                <span className="text-[10px] text-slate-400">브라우저 천구 보정 헤더</span>
              </button>

              <button
                type="button"
                onClick={() => downloadLocalSolverArtifact(data, 'new_fits_file')}
                className="p-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-left transition-colors group flex flex-col justify-between cursor-pointer"
              >
                <div className="flex items-center justify-between text-slate-400 group-hover:text-sky-400 mb-1">
                  <span className="text-[11px] font-bold">보정 WCS JSON</span>
                  <Download className="w-3.5 h-3.5" />
                </div>
                <span className="text-[10px] text-slate-400">CD 행렬 &amp; 보정 데이터</span>
              </button>

              <button
                type="button"
                onClick={() => downloadLocalSolverArtifact(data, 'kml_file')}
                className="p-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-left transition-colors group flex flex-col justify-between cursor-pointer"
              >
                <div className="flex items-center justify-between text-slate-400 group-hover:text-emerald-400 mb-1">
                  <span className="text-[11px] font-bold">Google Earth</span>
                  <Download className="w-3.5 h-3.5" />
                </div>
                <span className="text-[10px] text-slate-400">KML 스카이 오버레이</span>
              </button>

              <button
                type="button"
                onClick={() => downloadLocalSolverArtifact(data, 'rdls_file')}
                className="p-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-left transition-colors group flex flex-col justify-between cursor-pointer"
              >
                <div className="flex items-center justify-between text-slate-400 group-hover:text-indigo-400 mb-1">
                  <span className="text-[11px] font-bold">RDLS 항성목록</span>
                  <Download className="w-3.5 h-3.5" />
                </div>
                <span className="text-[10px] text-slate-400">검출 별 RA/Dec 좌표</span>
              </button>

              <button
                type="button"
                onClick={() => downloadLocalSolverArtifact(data, 'axy_file')}
                className="p-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-left transition-colors group flex flex-col justify-between cursor-pointer"
              >
                <div className="flex items-center justify-between text-slate-400 group-hover:text-amber-400 mb-1">
                  <span className="text-[11px] font-bold">AXY 픽셀좌표</span>
                  <Download className="w-3.5 h-3.5" />
                </div>
                <span className="text-[10px] text-slate-400">추출 항성 X/Y 좌표</span>
              </button>

              <button
                type="button"
                onClick={() => downloadLocalSolverArtifact(data, 'corr_file')}
                className="p-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-left transition-colors group flex flex-col justify-between cursor-pointer"
              >
                <div className="flex items-center justify-between text-slate-400 group-hover:text-violet-400 mb-1">
                  <span className="text-[11px] font-bold">Corr 대응표</span>
                  <Download className="w-3.5 h-3.5" />
                </div>
                <span className="text-[10px] text-slate-400">카탈로그 매칭표</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              <a
                href={`/api/astrometry/files/${data.jobId}/wcs_file`}
                download
                className="p-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-left transition-colors group flex flex-col justify-between"
              >
                <div className="flex items-center justify-between text-slate-400 group-hover:text-sky-400 mb-1">
                  <span className="text-[11px] font-bold">WCS FITS</span>
                  <Download className="w-3.5 h-3.5" />
                </div>
                <span className="text-[10px] text-slate-400">천구 보정 헤더</span>
              </a>

              <a
                href={`/api/astrometry/files/${data.jobId}/new_fits_file`}
                download
                className="p-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-left transition-colors group flex flex-col justify-between"
              >
                <div className="flex items-center justify-between text-slate-400 group-hover:text-sky-400 mb-1">
                  <span className="text-[11px] font-bold">보정 FITS</span>
                  <Download className="w-3.5 h-3.5" />
                </div>
                <span className="text-[10px] text-slate-400">WCS 삽입 이미지</span>
              </a>

              <a
                href={`/api/astrometry/files/${data.jobId}/kml_file`}
                download
                className="p-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-left transition-colors group flex flex-col justify-between"
              >
                <div className="flex items-center justify-between text-slate-400 group-hover:text-emerald-400 mb-1">
                  <span className="text-[11px] font-bold">Google Earth</span>
                  <Download className="w-3.5 h-3.5" />
                </div>
                <span className="text-[10px] text-slate-400">KML 스카이 오버레이</span>
              </a>

              <a
                href={`/api/astrometry/files/${data.jobId}/rdls_file`}
                download
                className="p-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-left transition-colors group flex flex-col justify-between"
              >
                <div className="flex items-center justify-between text-slate-400 group-hover:text-indigo-400 mb-1">
                  <span className="text-[11px] font-bold">RDLS 항성목록</span>
                  <Download className="w-3.5 h-3.5" />
                </div>
                <span className="text-[10px] text-slate-400">검출 별 RA/Dec FITS</span>
              </a>

              <a
                href={`/api/astrometry/files/${data.jobId}/axy_file`}
                download
                className="p-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-left transition-colors group flex flex-col justify-between"
              >
                <div className="flex items-center justify-between text-slate-400 group-hover:text-amber-400 mb-1">
                  <span className="text-[11px] font-bold">AXY 픽셀좌표</span>
                  <Download className="w-3.5 h-3.5" />
                </div>
                <span className="text-[10px] text-slate-400">추출 항성 X/Y 좌표</span>
              </a>

              <a
                href={`/api/astrometry/files/${data.jobId}/corr_file`}
                download
                className="p-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-left transition-colors group flex flex-col justify-between"
              >
                <div className="flex items-center justify-between text-slate-400 group-hover:text-violet-400 mb-1">
                  <span className="text-[11px] font-bold">Corr 대응표</span>
                  <Download className="w-3.5 h-3.5" />
                </div>
                <span className="text-[10px] text-slate-400">카탈로그 매칭표</span>
              </a>
            </div>
          )}

          {/* Web Star Chart Layers Section */}
          <div className="pt-3 border-t border-slate-800/80 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-1.5">
              <span className="text-slate-300 text-xs font-bold flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-sky-400" />
                웹성도 레이어 (클릭하여 큰 이미지 보기):
                {isLocalJob && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-950/90 text-sky-300 border border-sky-700/70 font-semibold">
                    웹브라우저 직접 계산 기반 합성
                  </span>
                )}
              </span>
              <span className="text-[11px] text-slate-400">
                {isLocalJob
                  ? '웹브라우저에서 직접 계산된 TAN WCS 좌표 및 Simplexy 항성 검출 결과로 생성된 5종 성도 레이어입니다'
                  : '원하는 레이어를 클릭하면 고해상도 확대 뷰어로 크게 볼 수 있습니다'}
              </span>
            </div>

            {/* Small Thumbnails Grid: 5 Layer Images */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5 pt-1">
              {STAR_CHART_LAYERS.map((layer) => {
                const localUrl = localLayerUrls?.[layer.id];
                const imgProxyUrl = isLocalJob
                  ? localUrl || data.rawImageUrl || data.imageUrl
                  : layer.id === 'original' && data.rawImageUrl && !data.rawImageUrl.startsWith('blob:')
                  ? data.rawImageUrl
                  : `/api/astrometry/image-proxy/${data.jobId}/${layer.id}`;
                const fallbackUrl = isLocalJob
                  ? localUrl || data.rawImageUrl || data.imageUrl
                  : layer.id === 'annotated'
                  ? `https://nova.astrometry.net/annotated_display/${data.jobId}`
                  : layer.id === 'red_green'
                  ? `https://nova.astrometry.net/red_green_image_display/${data.jobId}/`
                  : layer.id === 'extraction'
                  ? `https://nova.astrometry.net/extraction_image_display/${data.jobId}/`
                  : layer.id === 'grid'
                  ? `https://nova.astrometry.net/grid_display/${data.jobId}`
                  : `https://nova.astrometry.net/image/${data.jobId}`;

                return (
                  <div
                    key={layer.id}
                    onClick={() => setSelectedLayerModal(layer.id)}
                    className="group relative rounded-xl border border-slate-800 hover:border-sky-500/80 bg-slate-950/80 overflow-hidden cursor-pointer transition-all hover:shadow-lg hover:shadow-sky-500/10 flex flex-col"
                    title={`${layer.titleKo} 크게 보기`}
                  >
                    {/* Small Thumbnail Image */}
                    <div className="aspect-[4/3] w-full bg-slate-950 relative overflow-hidden flex items-center justify-center">
                      <img
                        src={imgProxyUrl}
                        alt={layer.titleKo}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          const target = e.currentTarget as HTMLImageElement;
                          if (localUrl && target.src !== localUrl) {
                            target.src = localUrl;
                          } else if (!isLocalJob && !target.src.includes('nova.astrometry.net')) {
                            target.src = fallbackUrl;
                          }
                        }}
                      />
                      {/* Magnifier Hover Overlay */}
                      <div className="absolute inset-0 bg-sky-950/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[1px]">
                        <span className="px-2 py-1 rounded-md bg-black/80 text-white text-[10px] font-bold flex items-center gap-1 shadow-lg border border-sky-500/50">
                          <Maximize2 className="w-3 h-3 text-sky-400" />
                          큰 이미지 보기
                        </span>
                      </div>
                    </div>

                    {/* Card Footer Info */}
                    <div className="p-2 bg-slate-900/90 border-t border-slate-800/80 flex items-center justify-between">
                      <div className="min-w-0">
                        <span className={`text-[11px] font-bold block truncate ${layer.badgeText}`}>
                          {layer.titleKo}
                        </span>
                        <span className="text-[9px] text-slate-500 font-mono block truncate">
                          {layer.titleEn}
                        </span>
                      </div>
                      <Maximize2 className="w-3 h-3 text-slate-500 group-hover:text-sky-400 transition-colors shrink-0" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Detected Annotations / Stars Table */}
      <div className="bg-slate-950/60 rounded-xl border border-slate-800 overflow-hidden">
        {/* Table Controls Header */}
        <div className="p-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <Database className="w-4 h-4 text-indigo-400" />
            <span className="text-xs font-bold text-white uppercase tracking-wider">
              검출된 천체 카탈로그 ({filteredAnnotations.length})
            </span>
          </div>

          <div className="flex items-center space-x-2">
            {/* Filter Buttons */}
            <div className="bg-slate-900 rounded-lg p-0.5 border border-slate-800 flex text-xs">
              <button
                onClick={() => setFilterType('all')}
                className={`px-2.5 py-1 rounded ${
                  filterType === 'all' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                전체
              </button>
              <button
                onClick={() => setFilterType('star')}
                className={`px-2.5 py-1 rounded ${
                  filterType === 'star' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                항성만
              </button>
              <button
                onClick={() => setFilterType('dso')}
                className={`px-2.5 py-1 rounded ${
                  filterType === 'dso' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                성운/은하 (DSO)
              </button>
            </div>

            {/* Search Box */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="천체명/바이어 기호 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="text-xs pl-8 pr-3 py-1 bg-slate-900 border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 w-44"
              />
            </div>

            {/* CSV Export Button for Catalog Table */}
            <button
              onClick={handleDownloadCSV}
              className="text-xs px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80 flex items-center space-x-1.5 transition-colors cursor-pointer"
              title="검출된 천체 카탈로그를 CSV 파일로 저장"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span>CSV 내보내기</span>
            </button>
          </div>
        </div>

        {/* Scrollable Table */}
        <div className="max-h-64 overflow-y-auto divide-y divide-slate-800/60">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900/80 sticky top-0 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-2.5">천체명 / 식별자</th>
                <th className="px-3 py-2.5">분류</th>
                <th className="px-3 py-2.5">사진 픽셀 좌표 (X, Y)</th>
                <th className="px-3 py-2.5">실시등급 (Vmag)</th>
                <th className="px-3 py-2.5 text-right">실시간 데이터베이스</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50 font-mono">
              {filteredAnnotations.length > 0 ? (
                filteredAnnotations.map((item, idx) => {
                  const primaryName = item.names[0] || 'Unknown';
                  const type = (item.type || '').toLowerCase();
                  const isStar =
                    type === 'bright' ||
                    type === 'hd' ||
                    type === 'star' ||
                    type === 'tycho2' ||
                    type === 'gaia';
                  return (
                    <tr key={`row-${idx}`} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-2 font-semibold text-white font-sans">
                        {primaryName}
                        {item.names.length > 1 && (
                          <span className="text-[10px] text-slate-400 block font-normal">
                            {item.names.slice(1).join(', ')}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-sans font-medium ${
                            isStar
                              ? 'bg-sky-950 text-sky-300 border border-sky-800'
                              : 'bg-rose-950 text-rose-300 border border-rose-800'
                          }`}
                        >
                          {isStar ? '항성 (Star)' : '심우주 천체'}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-slate-400">
                        ({Math.round(item.pixelx)}, {Math.round(item.pixely)})
                      </td>
                      <td className="px-3 py-2">
                        {item.vmag !== undefined ? (
                          <span className="text-amber-300 font-medium">{item.vmag.toFixed(2)}m</span>
                        ) : (
                          <span className="text-slate-600">-</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <button
                          onClick={() => onSelectObject(primaryName)}
                          className="text-[11px] font-sans px-2.5 py-1 rounded bg-slate-800 hover:bg-sky-600 text-sky-300 hover:text-white transition-colors inline-flex items-center space-x-1"
                        >
                          <span>SIMBAD 조회</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-slate-500 font-sans">
                    검색 결과와 일치하는 천체가 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CDS Aladin Lite Real-time Survey Inspector Modal */}
      <AladinSurveyModal
        isOpen={isAladinOpen}
        onClose={() => setIsAladinOpen(false)}
        data={data}
      />

      {/* High-Resolution Large Web Star Chart Layer Viewer Modal */}
      <StarChartLayerModal
        isOpen={selectedLayerModal !== null}
        onClose={() => setSelectedLayerModal(null)}
        jobId={data.jobId}
        initialLayer={selectedLayerModal || 'annotated'}
        title={data.title}
        rawImageUrl={data.rawImageUrl}
        localLayerUrls={localLayerUrls}
      />
    </div>
  );
};
