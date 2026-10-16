import React, { useState } from 'react';
import {
  Compass,
  Maximize,
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
} from 'lucide-react';
import { SolvedAstroData, AstrometryAnnotationItem } from '../types/astronomy';
import { degToRA_HMS, degToDec_DMS, formatAngularSize } from '../utils/coordinateMath';

interface AstroTelemetryPanelProps {
  data: SolvedAstroData;
  onSelectObject: (objectName: string) => void;
}

export const AstroTelemetryPanel: React.FC<AstroTelemetryPanelProps> = ({ data, onSelectObject }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'star' | 'dso'>('all');
  const [copiedCoords, setCopiedCoords] = useState(false);

  const cal = data.calibration;
  const annotations = data.annotations || [];
  const objectsInField = data.info?.objects_in_field || [];

  const copyCoordinates = () => {
    if (!cal) return;
    const str = `RA: ${degToRA_HMS(cal.ra)} (${cal.ra.toFixed(5)}°), Dec: ${degToDec_DMS(cal.dec)} (${cal.dec.toFixed(5)}°)`;
    navigator.clipboard.writeText(str);
    setCopiedCoords(true);
    setTimeout(() => setCopiedCoords(false), 2000);
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
          <button
            onClick={copyCoordinates}
            className="text-xs px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center space-x-1.5 transition-colors"
          >
            {copiedCoords ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedCoords ? '복사 완료' : '좌표 복사'}</span>
          </button>
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

      {/* Astrometry Analysis Output & Data Artifacts */}
      {data.jobId && (
        <div className="bg-slate-950/60 rounded-xl border border-slate-800 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Layers className="w-4 h-4 text-sky-400" />
              <h4 className="text-sm font-bold text-white">
                Astrometry.net 원본 분석 산출물 및 데이터 파일
              </h4>
            </div>
            <span className="text-xs font-mono text-slate-400">Job #{data.jobId}</span>
          </div>

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

          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800/60 text-xs">
            <span className="text-slate-400 text-[11px] font-semibold">웹 성도 레이어:</span>
            <a
              href={`/api/astrometry/image-proxy/${data.jobId}/annotated`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-2 py-1 rounded bg-slate-850 hover:bg-slate-700 text-sky-300 hover:text-white transition-colors inline-flex items-center space-x-1 border border-slate-800"
            >
              <span>주석 성도 (Annotated)</span>
              <ExternalLink className="w-3 h-3" />
            </a>
            <a
              href={`/api/astrometry/image-proxy/${data.jobId}/red_green`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-2 py-1 rounded bg-slate-850 hover:bg-slate-700 text-emerald-300 hover:text-white transition-colors inline-flex items-center space-x-1 border border-slate-800"
            >
              <span>적/녹 매칭 (Red-Green)</span>
              <ExternalLink className="w-3 h-3" />
            </a>
            <a
              href={`/api/astrometry/image-proxy/${data.jobId}/extraction`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-2 py-1 rounded bg-slate-850 hover:bg-slate-700 text-amber-300 hover:text-white transition-colors inline-flex items-center space-x-1 border border-slate-800"
            >
              <span>항성 검출 맵 (Extraction)</span>
              <ExternalLink className="w-3 h-3" />
            </a>
            <a
              href={`/api/astrometry/image-proxy/${data.jobId}/grid`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-2 py-1 rounded bg-slate-850 hover:bg-slate-700 text-indigo-300 hover:text-white transition-colors inline-flex items-center space-x-1 border border-slate-800"
            >
              <span>천구 좌표 격자 (Grid)</span>
              <ExternalLink className="w-3 h-3" />
            </a>
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
                  const isBright = item.type === 'bright';
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
                            isBright
                              ? 'bg-sky-950 text-sky-300 border border-sky-800'
                              : 'bg-rose-950 text-rose-300 border border-rose-800'
                          }`}
                        >
                          {isBright ? '항성 (Star)' : '심우주 천체'}
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
    </div>
  );
};
