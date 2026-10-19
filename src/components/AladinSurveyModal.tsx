import React, { useState } from 'react';
import {
  X,
  ExternalLink,
  Layers,
  Sparkles,
  Compass,
  Maximize2,
  Minimize2,
  RefreshCw,
  Info,
} from 'lucide-react';
import { SolvedAstroData } from '../types/astronomy';
import { degToRA_HMS, degToDec_DMS } from '../utils/coordinateMath';

interface AladinSurveyModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: SolvedAstroData;
}

const SURVEY_OPTIONS = [
  { id: 'P/DSS2/color', name: 'DSS2 컬러 (가시광/광학)', badge: 'Optical' },
  { id: 'P/2MASS/color', name: '2MASS (근적외선)', badge: 'Infrared' },
  { id: 'CDS/P/PanSTARRS/DR1/color-z-zg-g', name: 'PanSTARRS DR1 (고해상도)', badge: 'Survey' },
  { id: 'P/allWISE/color', name: 'AllWISE (중/원적외선)', badge: 'WISE' },
];

export const AladinSurveyModal: React.FC<AladinSurveyModalProps> = ({
  isOpen,
  onClose,
  data,
}) => {
  const [selectedSurvey, setSelectedSurvey] = useState('P/DSS2/color');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  if (!isOpen) return null;

  const cal = data.calibration;
  const centerRa = cal?.ra ?? 0;
  const centerDec = cal?.dec ?? 0;
  const fovDeg = Math.max(0.1, Math.min(60, cal?.radius ? cal.radius * 2 : 1.5));
  const fovStr = fovDeg.toFixed(2);

  // Correct Aladin Lite URL format using direct ra & dec parameters so CDS Aladin centers precisely
  const aladinUrl = `https://aladin.cds.unistra.fr/AladinLite/?ra=${centerRa.toFixed(
    5
  )}&dec=${centerDec.toFixed(5)}&fov=${fovStr}&survey=${encodeURIComponent(selectedSurvey)}`;

  const primaryConst = data.matchedConstellations[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-2 sm:p-4 animate-in fade-in">
      <div
        className={`bg-slate-900 border border-slate-700 rounded-2xl flex flex-col shadow-2xl overflow-hidden transition-all duration-200 ${
          isFullscreen
            ? 'w-full h-full rounded-none border-none'
            : 'w-full max-w-5xl h-[88vh] max-h-[850px]'
        }`}
      >
        {/* Modal Header */}
        <div className="p-3.5 sm:p-4 bg-slate-950/80 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center space-x-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-indigo-950 border border-indigo-700/60 flex items-center justify-center shrink-0">
              <Compass className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-2">
                <h3 className="text-sm sm:text-base font-bold text-white tracking-tight truncate">
                  CDS Aladin Lite 우주 서베이 분석
                </h3>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800 shrink-0">
                  Job #{data.jobId}
                </span>
                {primaryConst && (
                  <span className="hidden sm:inline-flex text-[10px] px-1.5 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-800 font-medium">
                    {primaryConst.nameKo} ({primaryConst.code})
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-2 text-[11px] text-slate-400 font-mono mt-0.5">
                <span>RA: <strong className="text-sky-300">{degToRA_HMS(centerRa)}</strong> ({centerRa.toFixed(4)}°)</span>
                <span>•</span>
                <span>Dec: <strong className="text-sky-300">{degToDec_DMS(centerDec)}</strong> ({centerDec.toFixed(4)}°)</span>
                <span>•</span>
                <span>화각: <strong className="text-indigo-300">{fovStr}°</strong></span>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center space-x-2">
            {/* Survey layer dropdown */}
            <div className="flex items-center space-x-1.5 bg-slate-800/80 border border-slate-700 rounded-xl px-2.5 py-1">
              <Layers className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <select
                value={selectedSurvey}
                onChange={(e) => {
                  setSelectedSurvey(e.target.value);
                  setReloadKey((k) => k + 1);
                }}
                className="bg-transparent text-xs text-slate-200 focus:outline-none cursor-pointer"
                aria-label="서베이 레이어 선택"
              >
                {SURVEY_OPTIONS.map((s) => (
                  <option key={s.id} value={s.id} className="bg-slate-900 text-white">
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Refresh iframe */}
            <button
              onClick={() => setReloadKey((k) => k + 1)}
              title="서베이 화면 새로고침"
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            {/* Open in external new tab */}
            <a
              href={aladinUrl}
              target="_blank"
              rel="noopener noreferrer"
              title="새 탭에서 Aladin Lite 전체 화면으로 열기"
              className="text-xs px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium flex items-center space-x-1 transition-colors shadow-sm"
            >
              <span className="hidden sm:inline">새 탭에서 열기</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>

            {/* Fullscreen toggle */}
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              title={isFullscreen ? '창 모드로 축소' : '모달 최대화'}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors hidden sm:block"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            {/* Close button */}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="닫기"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Real-time coordinates guidance notice */}
        <div className="bg-slate-950 px-4 py-1.5 border-b border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center space-x-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>
              솔빙된 천체 정밀 좌표(RA: {centerRa.toFixed(4)}°, Dec: {centerDec.toFixed(4)}°)로 자동 조준되었습니다. 마우스 드래그로 천구 이동, 휠로 줌인/줌아웃이 가능합니다.
            </span>
          </div>
          <span className="hidden md:inline text-slate-500">
            출처: Strasbourg Astronomical Data Center (CDS)
          </span>
        </div>

        {/* Embedded Aladin Lite iFrame */}
        <div className="flex-1 w-full h-full bg-black relative">
          <iframe
            key={reloadKey}
            src={aladinUrl}
            title="CDS Aladin Lite Astronomical Survey"
            className="w-full h-full border-0"
            allow="fullscreen"
          />
        </div>
      </div>
    </div>
  );
};
