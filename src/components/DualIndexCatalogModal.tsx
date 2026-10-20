import React, { useState } from 'react';
import {
  X,
  Database,
  Sparkles,
  Download,
  Compass,
  Check,
  Trash2,
  ExternalLink,
  Layers,
  Cpu,
  ShieldCheck,
  RotateCcw,
  Info,
} from 'lucide-react';
import {
  TYCHO2_WIDE_INDEX_DATA,
  GAIA_DR3_DEEPSKY_INDEX_DATA,
  getLocalDualIndexStats,
  getCustomCachedGaiaFields,
  deleteCustomCachedGaiaField,
  clearAllCustomCachedGaiaFields,
  downloadLiveDualIndexTileFromVizier,
  exportCompleteDualIndexBundleJson,
  GaiaDr3FieldEntry,
} from '../utils/dualIndexCatalog';
import { SolvedAstroData } from '../types/astronomy';
import { degToRA_HMS, degToDec_DMS } from '../utils/coordinateMath';

interface DualIndexCatalogModalProps {
  isOpen: boolean;
  onClose: () => void;
  solvedData?: SolvedAstroData | null;
}

export const DualIndexCatalogModal: React.FC<DualIndexCatalogModalProps> = ({
  isOpen,
  onClose,
  solvedData,
}) => {
  const [activeTab, setActiveTab] = useState<'compare' | 'download' | 'live' | 'spec'>('compare');
  const [customFields, setCustomFields] = useState<GaiaDr3FieldEntry[]>(getCustomCachedGaiaFields());
  const [stats, setStats] = useState(getLocalDualIndexStats());

  // Live Tile Download form states
  const [tileRa, setTileRa] = useState<string>(
    solvedData?.calibration?.ra !== undefined ? solvedData.calibration.ra.toFixed(4) : '83.8221'
  );
  const [tileDec, setTileDec] = useState<string>(
    solvedData?.calibration?.dec !== undefined ? solvedData.calibration.dec.toFixed(4) : '-5.3911'
  );
  const [tileRadius, setTileRadius] = useState<string>(
    solvedData?.calibration?.radius !== undefined ? Math.max(0.4, solvedData.calibration.radius).toFixed(2) : '1.0'
  );
  const [tileLabel, setTileLabel] = useState<string>(
    solvedData?.title ? `${solvedData.title} 타일` : '오리온 대성운 M42 타일'
  );
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadSuccessMsg, setDownloadSuccessMsg] = useState<string | null>(null);
  const [downloadErrorMsg, setDownloadErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const cal = solvedData?.calibration;
  const telemetry = solvedData?.dualIndexTelemetry;
  const isDeepSky = cal ? cal.radius <= 2.2 || cal.pixscale <= 4.5 : false;

  const refreshCustomList = () => {
    setCustomFields(getCustomCachedGaiaFields());
    setStats(getLocalDualIndexStats());
  };

  const handleDeleteTile = (fieldId: string) => {
    deleteCustomCachedGaiaField(fieldId);
    refreshCustomList();
  };

  const handleClearAllTiles = () => {
    if (window.confirm('다운로드하여 캐시된 사용자 지정 타일을 모두 초기화하시겠습니까?')) {
      clearAllCustomCachedGaiaFields();
      refreshCustomList();
    }
  };

  // Download entire dual index bundle JSON
  const handleDownloadFullBundle = () => {
    const jsonStr = exportCompleteDualIndexBundleJson();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `astroplate_dual_index_complete_bundle_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Live download from CDS VizieR
  const handleExecuteLiveDownload = async () => {
    const ra = parseFloat(tileRa);
    const dec = parseFloat(tileDec);
    const r = parseFloat(tileRadius);

    if (isNaN(ra) || isNaN(dec) || isNaN(r)) {
      setDownloadErrorMsg('유효한 적경(RA 0~360°), 적위(Dec -90~+90°), 반경(0.2~3.0°)을 입력해주세요.');
      return;
    }

    setIsDownloading(true);
    setDownloadErrorMsg(null);
    setDownloadSuccessMsg(null);

    try {
      const res = await downloadLiveDualIndexTileFromVizier(
        ra,
        dec,
        r,
        tileLabel.trim() || `타일 (${ra.toFixed(2)}°, ${dec.toFixed(2)}°)`,
        'Custom'
      );
      setDownloadSuccessMsg(
        `CDS VizieR 다운로드 및 HEALPix 등밀도 균일화 완료! Gaia DR3 항성 ${res.gaiaStars.length}개 · Tycho-2 항성 ${res.tycho2Stars.length}개가 로컬 브라우저에 캐시되었습니다.`
      );
      refreshCustomList();
    } catch (err: any) {
      setDownloadErrorMsg(`다운로드 실패: ${err.message || '네트워크 연결 오류'}`);
    } finally {
      setIsDownloading(false);
    }
  };

  const presetTargets = [
    { name: 'M31 안드로메다 은하', ra: '10.6847', dec: '41.2687', r: '1.2' },
    { name: 'M42 오리온 대성운', ra: '83.8221', dec: '-5.3911', r: '1.0' },
    { name: 'M45 플레이아데스 성단', ra: '56.7500', dec: '24.1167', r: '1.5' },
    { name: '처녀자리 은하단 M87 (희소 영역)', ra: '187.7059', dec: '12.3911', r: '1.4' },
    { name: 'NGC 7000 북아메리카 (은하수 밀집)', ra: '314.7000', dec: '44.3333', r: '1.5' },
    { name: 'M8 궁수자리 라군 성운', ra: '270.9200', dec: '-24.3800', r: '1.1' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/80 shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-500/20 via-sky-500/20 to-amber-500/20 border border-indigo-500/30">
              <Sparkles className="w-5 h-5 text-sky-400" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold text-white">
                  광각 Tycho-2 / 딥스카이 Gaia DR3 듀얼 인덱스 체계
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-sky-950 text-sky-300 border border-sky-800">
                  Dual-Index Engine
                </span>
              </div>
              <p className="text-xs text-slate-400">
                광각(화각 ≥ 2.0°)은 Tycho-2 (I/259/tyc2) · 딥스카이(화각 &lt; 2.0°)는 Gaia DR3 (I/355/gaiadr3) 성표 교차 대조 및 로컬 다운로드
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-950/50 px-5 pt-3 overflow-x-auto shrink-0">
          <button
            onClick={() => setActiveTab('compare')}
            className={`pb-3 px-3 text-xs font-semibold flex items-center space-x-1.5 border-b-2 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'compare'
                ? 'border-sky-400 text-sky-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>듀얼 인덱스 대조 현황</span>
          </button>

          <button
            onClick={() => setActiveTab('download')}
            className={`pb-3 px-3 text-xs font-semibold flex items-center space-x-1.5 border-b-2 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'download'
                ? 'border-sky-400 text-sky-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Download className="w-3.5 h-3.5 text-indigo-400" />
            <span>로컬 인덱스 다운로드 파일</span>
          </button>

          <button
            onClick={() => setActiveTab('live')}
            className={`pb-3 px-3 text-xs font-semibold flex items-center space-x-1.5 border-b-2 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'live'
                ? 'border-sky-400 text-sky-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Compass className="w-3.5 h-3.5 text-amber-400" />
            <span>CDS VizieR 실시간 타일 다운로드 ({customFields.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('spec')}
            className={`pb-3 px-3 text-xs font-semibold flex items-center space-x-1.5 border-b-2 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'spec'
                ? 'border-sky-400 text-sky-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>동적 컷오프 &amp; HEALPix 사양</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          {/* TAB 1: Dual-Index Comparison Status */}
          {activeTab === 'compare' && (
            <div className="space-y-4">
              {/* Active Photo Context Banner */}
              {cal ? (
                <div className="p-4 bg-slate-950/80 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Cpu className="w-4 h-4 text-sky-400" />
                      <span>현재 관측 사진 대조 결과 (Job #{solvedData?.jobId})</span>
                    </span>
                    <span
                      className={`text-xs px-2.5 py-1 rounded-lg font-bold border ${
                        telemetry?.selectedCatalog === 'Gaia DR3'
                          ? 'bg-amber-950/80 text-amber-300 border-amber-600'
                          : 'bg-indigo-950/80 text-indigo-300 border-indigo-600'
                      }`}
                    >
                      {telemetry?.selectedCatalog === 'Gaia DR3'
                        ? '★ 딥스카이 Gaia DR3 인덱스 자동 채택'
                        : '★ 광각 Tycho-2 인덱스 자동 채택'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                    <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">중앙 적경 / 적위</span>
                      <span className="font-mono text-white font-medium">
                        {degToRA_HMS(cal.ra)} · {degToDec_DMS(cal.dec)}
                      </span>
                    </div>
                    <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">화각 반경 (FOV)</span>
                      <span className="font-mono text-indigo-300 font-bold">
                        {cal.radius.toFixed(2)}° ({(cal.radius * 60).toFixed(0)}′)
                      </span>
                    </div>
                    <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">화각 분류 (FOV Class)</span>
                      <span className="font-semibold text-emerald-300">
                        {isDeepSky ? '딥스카이 (< 2.0°)' : '광각 성야 (≥ 2.0°)'}
                      </span>
                    </div>
                    <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">채택 인덱스 시리즈</span>
                      <span className="font-mono text-[11px] text-sky-300 truncate block">
                        {telemetry?.matchedIndexSeries.split('(')[0] || 'Dual Index'}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-slate-950/50 rounded-xl border border-slate-800 text-center py-6">
                  <Database className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                  <p className="text-sm font-bold text-slate-300">현재 로드된 천체 사진이 없습니다.</p>
                  <p className="text-xs text-slate-500 mt-1">
                    새 천체 사진을 업로드하거나 목록에서 작업을 선택하시면 듀얼 인덱스 대조가 활성화됩니다.
                  </p>
                </div>
              )}

              {/* Side-by-Side Dual-Index Comparison Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. Tycho-2 Wide-Field Card */}
                <div
                  className={`p-4 rounded-2xl border transition-all ${
                    telemetry?.selectedCatalog === 'Tycho-2'
                      ? 'bg-indigo-950/40 border-indigo-500 ring-2 ring-indigo-500/40 shadow-lg'
                      : 'bg-slate-950/80 border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <span className="w-3 h-3 rounded-full bg-indigo-400 shadow-[0_0_8px_#818cf8]" />
                      <h4 className="text-sm font-bold text-white">Tycho-2 광각 인덱스 (Series 4100)</h4>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-900/80 text-indigo-300 font-mono border border-indigo-700">
                      I/259/tyc2
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 mb-3 leading-relaxed">
                    시야각 2.0° 이상의 광각 성야, 은하수, 88개 별자리 패턴 매칭에 최적화된 고유운동 보정 성표입니다.
                  </p>

                  <div className="grid grid-cols-3 gap-2 text-center text-xs mb-3">
                    <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">일치 인라이어</span>
                      <span className="font-mono font-bold text-indigo-300 text-sm">
                        {telemetry?.tycho2Inliers ?? 0} 개
                      </span>
                    </div>
                    <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">RMS 정합 오차</span>
                      <span className="font-mono font-bold text-indigo-300 text-sm">
                        {telemetry?.tycho2RmsPx ? `${telemetry.tycho2RmsPx}px` : 'N/A'}
                      </span>
                    </div>
                    <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">베이지안 점수</span>
                      <span className="font-mono font-bold text-indigo-300 text-sm">
                        {telemetry?.tycho2LogOdds ?? 0}
                      </span>
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-400 space-y-1 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/80">
                    <div className="flex justify-between">
                      <span>탑재 기준성 풀:</span>
                      <span className="font-mono text-white font-bold">{stats.tycho2TotalStars.toLocaleString()} 개</span>
                    </div>
                    <div className="flex justify-between">
                      <span>광도 한계 (Cutoff):</span>
                      <span className="font-mono text-indigo-300 font-semibold">VT ≤ 12.5 mag</span>
                    </div>
                    <div className="flex justify-between">
                      <span>HEALPix 셀 크기:</span>
                      <span className="font-mono text-indigo-300 font-semibold">Order 5 (~1.83° 타일)</span>
                    </div>
                  </div>
                </div>

                {/* 2. Gaia DR3 Deep-Sky Card */}
                <div
                  className={`p-4 rounded-2xl border transition-all ${
                    telemetry?.selectedCatalog === 'Gaia DR3'
                      ? 'bg-amber-950/40 border-amber-500 ring-2 ring-amber-500/40 shadow-lg'
                      : 'bg-slate-950/80 border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <span className="w-3 h-3 rounded-full bg-amber-400 shadow-[0_0_8px_#fbbf24]" />
                      <h4 className="text-sm font-bold text-white">Gaia DR3 딥스카이 인덱스 (Series 5200)</h4>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-amber-900/80 text-amber-300 font-mono border border-amber-700">
                      I/355/gaiadr3
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 mb-3 leading-relaxed">
                    시야각 2.0° 이하의 딥스카이 성운, 성단, 은하 망원 촬영에 최적화된 마이크로초각 정밀 성표입니다.
                  </p>

                  <div className="grid grid-cols-3 gap-2 text-center text-xs mb-3">
                    <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">일치 인라이어</span>
                      <span className="font-mono font-bold text-amber-300 text-sm">
                        {telemetry?.gaiaDr3Inliers ?? 0} 개
                      </span>
                    </div>
                    <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">RMS 정합 오차</span>
                      <span className="font-mono font-bold text-amber-300 text-sm">
                        {telemetry?.gaiaDr3RmsPx ? `${telemetry.gaiaDr3RmsPx}px` : 'N/A'}
                      </span>
                    </div>
                    <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">베이지안 점수</span>
                      <span className="font-mono font-bold text-amber-300 text-sm">
                        {telemetry?.gaiaDr3LogOdds ?? 0}
                      </span>
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-400 space-y-1 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/80">
                    <div className="flex justify-between">
                      <span>탑재 영역 / 기준성 풀:</span>
                      <span className="font-mono text-white font-bold">
                        {stats.gaiaTotalFields} 개 영역 / {stats.gaiaTotalStars.toLocaleString()} 개
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>광도 한계 (Cutoff):</span>
                      <span className="font-mono text-amber-300 font-semibold">G ≤ 15.0 ~ 16.0 mag</span>
                    </div>
                    <div className="flex justify-between">
                      <span>HEALPix 셀 크기:</span>
                      <span className="font-mono text-amber-300 font-semibold">Order 8 (~13.7′ 타일)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Download Local Index JSON Files */}
          {activeTab === 'download' && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-2xl flex items-start space-x-3">
                <Info className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
                <div className="text-xs text-slate-300 space-y-1">
                  <p className="font-bold text-white">오프라인 및 로컬 파일 시스템 다운로드 지원</p>
                  <p className="text-slate-400 leading-relaxed">
                    웹 브라우저에서 실행되는 로컬 플레이트 솔빙 엔진의 기준 인덱스 JSON 파일들을 사용자의 로컬 컴퓨터로 직접 다운로드하여 보관하거나 다른 천문 소프트웨어(ASTAP, KStars, N.I.N.A.) 인덱스와 연계할 수 있습니다.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                {/* Tycho-2 File Box */}
                <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-indigo-400" />
                      <h4 className="text-sm font-bold text-white">Tycho-2 광각 인덱스</h4>
                    </div>
                    <p className="text-xs text-slate-400 mb-2 leading-relaxed">
                      1,800개 전천 광각 기준성 (VT ≤ 12.5) 좌표 및 광도 데이터
                    </p>
                    <div className="text-[11px] text-slate-500 font-mono space-y-0.5 mb-4">
                      <p>파일명: tycho2_wide_index.json</p>
                      <p>용량: 약 350 KB</p>
                      <p>기준성수: {stats.tycho2TotalStars} 개</p>
                    </div>
                  </div>
                  <a
                    href="/indexes/tycho2_wide_index.json"
                    download="tycho2_wide_index.json"
                    className="w-full py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center justify-center space-x-2 transition-colors cursor-pointer shadow-md"
                  >
                    <Download className="w-4 h-4" />
                    <span>Tycho-2 JSON 다운로드</span>
                  </a>
                </div>

                {/* Gaia DR3 File Box */}
                <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                      <h4 className="text-sm font-bold text-white">Gaia DR3 딥스카이 인덱스</h4>
                    </div>
                    <p className="text-xs text-slate-400 mb-2 leading-relaxed">
                      35개 주요 딥스카이 영역 1,010개 고정밀 항성 (G ≤ 16.0) 데이터
                    </p>
                    <div className="text-[11px] text-slate-500 font-mono space-y-0.5 mb-4">
                      <p>파일명: gaia_dr3_deepsky_index.json</p>
                      <p>용량: 약 280 KB</p>
                      <p>기준성수: {stats.gaiaTotalStars} 개</p>
                    </div>
                  </div>
                  <a
                    href="/indexes/gaia_dr3_deepsky_index.json"
                    download="gaia_dr3_deepsky_index.json"
                    className="w-full py-2.5 px-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 text-xs font-bold flex items-center justify-center space-x-2 transition-colors cursor-pointer shadow-md"
                  >
                    <Download className="w-4 h-4" />
                    <span>Gaia DR3 JSON 다운로드</span>
                  </a>
                </div>

                {/* Complete Combined Bundle Box */}
                <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-950/50 via-slate-950 to-amber-950/50 border border-sky-500/40 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center space-x-2 mb-2">
                      <Sparkles className="w-4 h-4 text-sky-400" />
                      <h4 className="text-sm font-bold text-white">통합 듀얼 인덱스 번들 패키지</h4>
                    </div>
                    <p className="text-xs text-slate-300 mb-2 leading-relaxed">
                      Tycho-2 + Gaia DR3 + 사용자 커스텀 캐시 타일 및 HEALPix 알고리즘 명세 통합본
                    </p>
                    <div className="text-[11px] text-slate-400 font-mono space-y-0.5 mb-4">
                      <p>파일명: astroplate_dual_index_complete_bundle.json</p>
                      <p>포함 영역: 35개 기본 + {customFields.length}개 커스텀</p>
                      <p>총 항성수: {(stats.tycho2TotalStars + stats.gaiaTotalStars).toLocaleString()} 개</p>
                    </div>
                  </div>
                  <button
                    onClick={handleDownloadFullBundle}
                    className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white text-xs font-bold flex items-center justify-center space-x-2 transition-all cursor-pointer shadow-md active:scale-95"
                  >
                    <Download className="w-4 h-4" />
                    <span>통합 번들 JSON 다운로드</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Live CDS VizieR Tile Downloader */}
          {activeTab === 'live' && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-950/80 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                    <Compass className="w-4 h-4 text-amber-400" />
                    <span>임의의 천구 좌표 실시간 타일 다운로드 (CDS VizieR ASU)</span>
                  </h4>
                  <span className="text-[10px] text-slate-400 font-mono">I/355/gaiadr3 &amp; I/259/tyc2</span>
                </div>

                {/* Popular Target Presets */}
                <div>
                  <span className="text-[11px] text-slate-400 block mb-1.5 font-medium">인기 관측 대상 원클릭 프리셋:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {presetTargets.map((pt) => (
                      <button
                        key={pt.name}
                        onClick={() => {
                          setTileRa(pt.ra);
                          setTileDec(pt.dec);
                          setTileRadius(pt.r);
                          setTileLabel(pt.name);
                        }}
                        className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80 transition-colors cursor-pointer"
                      >
                        {pt.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Coordinate Inputs */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                  <div>
                    <label className="text-[10px] font-semibold text-slate-400 uppercase block mb-1">
                      적경 (Center RA deg)
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={tileRa}
                      onChange={(e) => setTileRa(e.target.value)}
                      placeholder="0.0 ~ 360.0"
                      className="w-full text-xs px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono focus:border-sky-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-semibold text-slate-400 uppercase block mb-1">
                      적위 (Center Dec deg)
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={tileDec}
                      onChange={(e) => setTileDec(e.target.value)}
                      placeholder="-90.0 ~ +90.0"
                      className="w-full text-xs px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono focus:border-sky-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-semibold text-slate-400 uppercase block mb-1">
                      타일 반경 (Radius deg)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0.2"
                      max="3.0"
                      value={tileRadius}
                      onChange={(e) => setTileRadius(e.target.value)}
                      placeholder="0.4 ~ 2.5"
                      className="w-full text-xs px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono focus:border-sky-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-semibold text-slate-400 uppercase block mb-1">
                      타일 라벨/식별명
                    </label>
                    <input
                      type="text"
                      value={tileLabel}
                      onChange={(e) => setTileLabel(e.target.value)}
                      placeholder="예: 플레이아데스 타일"
                      className="w-full text-xs px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-sky-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-slate-400">
                    ※ 다운로드 시 2.5″ 시상 한계 de-blending 및 HEALPix 공간 밀도 균일화가 자동 적용됩니다.
                  </span>
                  <button
                    disabled={isDownloading}
                    onClick={handleExecuteLiveDownload}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-indigo-600 hover:from-amber-400 hover:to-indigo-500 disabled:opacity-50 text-white font-bold text-xs flex items-center space-x-2 transition-all cursor-pointer shadow-md"
                  >
                    <Download className={`w-3.5 h-3.5 ${isDownloading ? 'animate-spin' : ''}`} />
                    <span>{isDownloading ? 'VizieR 다운로드 중...' : '인덱스 타일 다운로드 및 로컬 캐시'}</span>
                  </button>
                </div>

                {downloadSuccessMsg && (
                  <div className="p-3 bg-emerald-950/70 border border-emerald-600/60 rounded-xl text-xs text-emerald-300 flex items-center space-x-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{downloadSuccessMsg}</span>
                  </div>
                )}

                {downloadErrorMsg && (
                  <div className="p-3 bg-red-950/70 border border-red-600/60 rounded-xl text-xs text-red-300">
                    {downloadErrorMsg}
                  </div>
                )}
              </div>

              {/* Cached Custom Tiles Table */}
              <div className="p-4 bg-slate-950/80 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                    <Database className="w-4 h-4 text-sky-400" />
                    <span>로컬 브라우저에 캐시된 커스텀 인덱스 타일 ({customFields.length}개)</span>
                  </h4>
                  {customFields.length > 0 && (
                    <button
                      onClick={handleClearAllTiles}
                      className="text-xs text-red-400 hover:text-red-300 flex items-center space-x-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>전체 삭제</span>
                    </button>
                  )}
                </div>

                {customFields.length > 0 ? (
                  <div className="divide-y divide-slate-800/80 border border-slate-800 rounded-xl overflow-hidden">
                    {customFields.map((field) => (
                      <div
                        key={field.fieldId}
                        className="p-3 bg-slate-900/60 hover:bg-slate-900 flex items-center justify-between gap-3 text-xs"
                      >
                        <div>
                          <span className="font-bold text-white block">{field.nameKo}</span>
                          <span className="text-[11px] text-slate-400 font-mono">
                            RA: {field.centerRaDeg.toFixed(3)}° · Dec: {field.centerDecDeg.toFixed(3)}° · 반경: {field.radiusDeg.toFixed(2)}°
                          </span>
                        </div>
                        <div className="flex items-center space-x-3">
                          <span className="px-2 py-0.5 rounded font-mono font-bold bg-amber-950 text-amber-300 border border-amber-800/80 text-[11px]">
                            Gaia {field.stars.length}개
                          </span>
                          <button
                            onClick={() => handleDeleteTile(field.fieldId)}
                            className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-red-400 transition-colors cursor-pointer"
                            title="타일 삭제"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 py-3 text-center">
                    다운로드되어 캐시된 커스텀 타일이 없습니다. 위 프리셋이나 좌표를 입력하여 다운로드해보세요.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: Index Specification & Equal-Density Algorithm */}
          {activeTab === 'spec' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                <div className="p-4 bg-slate-950/80 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex items-center space-x-2 text-sky-400 font-bold text-xs">
                    <ShieldCheck className="w-4 h-4" />
                    <span>광도 컷오프 (Magnitude Cutoff)</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Gaia DR3는 <strong className="text-amber-300">G ≤ 15~16 mag</strong>, Tycho-2는 <strong className="text-indigo-300">VT ≤ 12.5 mag</strong>를 컷오프로 설정하여 미광 노이즈와 과도한 데이터 크기를 방지합니다.
                  </p>
                </div>

                <div className="p-4 bg-slate-950/80 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex items-center space-x-2 text-indigo-400 font-bold text-xs">
                    <Compass className="w-4 h-4" />
                    <span>시상(Seeing) 2~3″ 뭉개짐 방지</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    센서 분해능과 시상 한계로 뭉개질 수 있는 <strong className="text-indigo-300">각거리 2.5 arcsec 이하</strong>의 근접 별들은 밝은 주성 1개만 남기고 동반성을 제거하여 쿼드 패턴 오인식을 차단합니다.
                  </p>
                </div>

                <div className="p-4 bg-slate-950/80 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex items-center space-x-2 text-emerald-400 font-bold text-xs">
                    <Layers className="w-4 h-4" />
                    <span>HEALPix 등밀도 균일화</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    은하수(백조·궁수)는 13-14등급에서 자동 컷오프되어 인덱스가 과대해지는 것을 막고, 별이 드문 처녀자리 은하단은 16-17등급까지 수집하여 공백(Hole)을 방지합니다.
                  </p>
                </div>
              </div>

              {/* Detailed Algorithmic Breakdown */}
              <div className="p-4 bg-slate-950/80 rounded-2xl border border-slate-800 space-y-3">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  Astrometry.net 듀얼 인덱스 생성 및 쿼드 매칭 파이프라인
                </h4>
                <div className="space-y-2 text-xs text-slate-300">
                  <div className="flex items-start space-x-2.5">
                    <span className="w-5 h-5 rounded-full bg-sky-950 text-sky-400 border border-sky-800 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                      1
                    </span>
                    <div>
                      <strong className="text-white">타일 직경 = 최소 FOV의 50%~80% 수준 설정:</strong>
                      <p className="text-slate-400 mt-0.5">
                        앱이 지원하는 최소 FOV(망원 ~15~24 arcmin, 광각 ~2~3.5°)의 약 50%~80% 크기에 대응하도록 HEALPix 분할 차수(Order 8 / Order 5)를 선정합니다.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-2.5">
                    <span className="w-5 h-5 rounded-full bg-sky-950 text-sky-400 border border-sky-800 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                      2
                    </span>
                    <div>
                      <strong className="text-white">HEALPix 셀 내부 광도순 정렬 &amp; 상위 N개 선택:</strong>
                      <p className="text-slate-400 mt-0.5">
                        각 구면 셀 내부에서 별들을 밝기순으로 정렬한 뒤 상위 4~6개만 취합합니다. 은하수와 처녀자리 등 천구 밀도 차이에 관계없이 전천에 균일한 공간 밀도의 기준성 망이 형성됩니다.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-2.5">
                    <span className="w-5 h-5 rounded-full bg-sky-950 text-sky-400 border border-sky-800 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                      3
                    </span>
                    <div>
                      <strong className="text-white">광각 Tycho-2 &amp; 딥스카이 Gaia DR3 듀얼 교차 검증:</strong>
                      <p className="text-slate-400 mt-0.5">
                        사진 속에서 검출된 단순(simplexy) 항성 패턴에 대해 두 인덱스를 모두 검증하여, 최소 4개 이상의 인라이어와 높은 베이지안 신뢰도(Log-Odds)를 획득한 최적 인덱스를 자동으로 채택합니다.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-400 flex items-center space-x-3">
            <span>
              Tycho-2: <strong className="text-indigo-400">{stats.tycho2TotalStars}개</strong>
            </span>
            <span>•</span>
            <span>
              Gaia DR3: <strong className="text-amber-400">{stats.gaiaTotalStars}개 ({stats.gaiaTotalFields}필드)</strong>
            </span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition-colors cursor-pointer"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};
