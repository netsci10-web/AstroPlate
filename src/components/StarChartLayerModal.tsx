import React, { useState, useEffect } from 'react';
import {
  X,
  ExternalLink,
  Download,
  Layers,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Info,
  Sparkles,
} from 'lucide-react';

export type StarChartLayerType = 'annotated' | 'red_green' | 'extraction' | 'grid' | 'original';

export interface StarChartLayerDef {
  id: StarChartLayerType;
  titleKo: string;
  titleEn: string;
  badgeLabel: string;
  description: string;
  accentColor: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
}

export const STAR_CHART_LAYERS: StarChartLayerDef[] = [
  {
    id: 'annotated',
    titleKo: '주석 성도',
    titleEn: 'Annotated Display',
    badgeLabel: '주석 성도',
    description: 'Astrometry.net이 식별한 주요 항성, 성운, 성단, 은하 및 천체 주석 라벨과 별자리 경계가 오버레이된 대표 성도입니다.',
    accentColor: '#38bdf8',
    badgeBg: 'bg-sky-950/80',
    badgeBorder: 'border-sky-800/80',
    badgeText: 'text-sky-300',
  },
  {
    id: 'red_green',
    titleKo: '적/녹 매칭',
    titleEn: 'Red-Green Matching',
    badgeLabel: '적/녹 매칭',
    description: '초록색 원은 사용자의 사진에서 검출된 항성, 빨간색 원은 기준 카탈로그(USNO/Gaia)의 표준 별입니다. 두 원이 포개질수록 정밀 솔빙 성공도가 높습니다.',
    accentColor: '#34d399',
    badgeBg: 'bg-emerald-950/80',
    badgeBorder: 'border-emerald-800/80',
    badgeText: 'text-emerald-300',
  },
  {
    id: 'extraction',
    titleKo: '항성 검출 맵',
    titleEn: 'Extraction Map',
    badgeLabel: '항성 검출',
    description: '사진 속 배경 노이즈와 분리하여 Astrometry 알고리즘이 소스로 추출한 모든 개별 항성 포인트 검출 맵입니다.',
    accentColor: '#fbbf24',
    badgeBg: 'bg-amber-950/80',
    badgeBorder: 'border-amber-800/80',
    badgeText: 'text-amber-300',
  },
  {
    id: 'grid',
    titleKo: '천구 좌표 격자',
    titleEn: 'Equatorial Grid',
    badgeLabel: '좌표 격자',
    description: 'J2000 천구 좌표계의 적경(RA: Right Ascension)과 적위(Dec: Declination) 격자선 및 각도 눈금이 사진에 정밀 합성된 성도입니다.',
    accentColor: '#a78bfa',
    badgeBg: 'bg-indigo-950/80',
    badgeBorder: 'border-indigo-800/80',
    badgeText: 'text-indigo-300',
  },
  {
    id: 'original',
    titleKo: '원본 천체 사진',
    titleEn: 'Original Photo',
    badgeLabel: '원본 사진',
    description: '솔빙 분석 전 사용자가 업로드한 원본 촬영 천체 이미지입니다.',
    accentColor: '#cbd5e1',
    badgeBg: 'bg-slate-900',
    badgeBorder: 'border-slate-700',
    badgeText: 'text-slate-300',
  },
];

interface StarChartLayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobId: number | string;
  initialLayer?: StarChartLayerType;
  title?: string;
  rawImageUrl?: string;
  localLayerUrls?: Partial<Record<StarChartLayerType, string>> | null;
}

export const StarChartLayerModal: React.FC<StarChartLayerModalProps> = ({
  isOpen,
  onClose,
  jobId,
  initialLayer = 'annotated',
  title = '',
  rawImageUrl,
  localLayerUrls,
}) => {
  const [activeLayer, setActiveLayer] = useState<StarChartLayerType>(initialLayer);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [imgError, setImgError] = useState(false);
  const isLocalJob = String(jobId).startsWith('local_');

  useEffect(() => {
    if (isOpen) {
      setActiveLayer(initialLayer);
      setZoomLevel(1);
      setImgError(false);
    }
  }, [isOpen, initialLayer]);

  // Keyboard navigation: Escape to close, Left/Right to change layer
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft') {
        const idx = STAR_CHART_LAYERS.findIndex((l) => l.id === activeLayer);
        const prevIdx = (idx - 1 + STAR_CHART_LAYERS.length) % STAR_CHART_LAYERS.length;
        setActiveLayer(STAR_CHART_LAYERS[prevIdx].id);
        setZoomLevel(1);
        setImgError(false);
      } else if (e.key === 'ArrowRight') {
        const idx = STAR_CHART_LAYERS.findIndex((l) => l.id === activeLayer);
        const nextIdx = (idx + 1) % STAR_CHART_LAYERS.length;
        setActiveLayer(STAR_CHART_LAYERS[nextIdx].id);
        setZoomLevel(1);
        setImgError(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, activeLayer, onClose]);

  if (!isOpen) return null;

  const currentDef = STAR_CHART_LAYERS.find((l) => l.id === activeLayer) || STAR_CHART_LAYERS[0];

  const getLayerImageUrl = (type: StarChartLayerType) => {
    if (isLocalJob && localLayerUrls?.[type]) {
      return localLayerUrls[type]!;
    }
    if (type === 'original' && rawImageUrl && !rawImageUrl.startsWith('blob:')) {
      return rawImageUrl;
    }
    if (isLocalJob) {
      return rawImageUrl || '';
    }
    return `/api/astrometry/image-proxy/${jobId}/${type}`;
  };

  const getFallbackUrl = (type: StarChartLayerType) => {
    if (localLayerUrls?.[type]) {
      return localLayerUrls[type]!;
    }
    if (isLocalJob) {
      return rawImageUrl || '';
    }
    switch (type) {
      case 'annotated':
        return `https://nova.astrometry.net/annotated_display/${jobId}`;
      case 'red_green':
        return `https://nova.astrometry.net/red_green_image_display/${jobId}/`;
      case 'extraction':
        return `https://nova.astrometry.net/extraction_image_display/${jobId}/`;
      case 'grid':
        return `https://nova.astrometry.net/grid_display/${jobId}`;
      case 'original':
        return `https://nova.astrometry.net/image/${jobId}`;
      default:
        return `https://nova.astrometry.net/annotated_display/${jobId}`;
    }
  };

  const currentImgUrl = imgError ? getFallbackUrl(activeLayer) : getLayerImageUrl(activeLayer);

  const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev - 0.25, 0.5));
  const handleResetZoom = () => setZoomLevel(1);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-3 sm:p-5 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-6xl max-h-[95vh] flex flex-col shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-3.5 sm:p-4 border-b border-slate-800 bg-slate-950/80 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-950 border border-sky-800 flex items-center justify-center">
              <Layers className="w-4 h-4 text-sky-400" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
                  {currentDef.titleKo} ({currentDef.titleEn})
                </h3>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${currentDef.badgeBg} ${currentDef.badgeBorder} ${currentDef.badgeText}`}>
                  {isLocalJob ? '웹브라우저 직접 계산' : `Job #${jobId}`}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 truncate max-w-md mt-0.5">
                {title || `Plate Solve #${jobId}`}
              </p>
            </div>
          </div>

          {/* Layer Selector Pills */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-slate-950 border border-slate-800">
            {STAR_CHART_LAYERS.map((layer) => {
              const isSelected = layer.id === activeLayer;
              return (
                <button
                  key={layer.id}
                  onClick={() => {
                    setActiveLayer(layer.id);
                    setZoomLevel(1);
                    setImgError(false);
                  }}
                  className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-sky-500 text-white font-bold shadow-md shadow-sky-500/25'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/70'
                  }`}
                >
                  {layer.badgeLabel}
                </button>
              );
            })}
          </div>

          {/* Action & Close Controls */}
          <div className="flex items-center space-x-2">
            <div className="hidden sm:flex items-center space-x-1 bg-slate-950 border border-slate-800 rounded-lg p-0.5">
              <button
                onClick={handleZoomIn}
                disabled={zoomLevel >= 3}
                className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors disabled:opacity-40 cursor-pointer"
                title="확대"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleZoomOut}
                disabled={zoomLevel <= 0.5}
                className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors disabled:opacity-40 cursor-pointer"
                title="축소"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleResetZoom}
                className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer text-[10px] font-mono px-1.5"
                title="원본 배율 (100%)"
              >
                {(zoomLevel * 100).toFixed(0)}%
              </button>
            </div>

            {!isLocalJob && (
              <a
                href={currentImgUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 rounded-lg text-slate-400 hover:text-sky-300 hover:bg-slate-800 transition-colors"
                title="새 탭에서 원본 해상도로 보기"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            )}

            <a
              href={currentImgUrl}
              download={`astroplate_${jobId}_${activeLayer}.jpg`}
              className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-slate-800 transition-colors"
              title="이미지 파일 다운로드"
            >
              <Download className="w-4 h-4" />
            </a>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title="닫기 (ESC)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Main Image Viewport */}
        <div className="flex-1 overflow-auto bg-slate-950/90 relative flex items-center justify-center p-4 min-h-[400px]">
          {/* Previous / Next Navigation Arrows */}
          <button
            onClick={() => {
              const idx = STAR_CHART_LAYERS.findIndex((l) => l.id === activeLayer);
              const prevIdx = (idx - 1 + STAR_CHART_LAYERS.length) % STAR_CHART_LAYERS.length;
              setActiveLayer(STAR_CHART_LAYERS[prevIdx].id);
              setZoomLevel(1);
              setImgError(false);
            }}
            className="absolute left-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-slate-900/80 hover:bg-sky-600 text-slate-300 hover:text-white border border-slate-700/80 flex items-center justify-center transition-all shadow-lg cursor-pointer"
            title="이전 레이어 (←)"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <button
            onClick={() => {
              const idx = STAR_CHART_LAYERS.findIndex((l) => l.id === activeLayer);
              const nextIdx = (idx + 1) % STAR_CHART_LAYERS.length;
              setActiveLayer(STAR_CHART_LAYERS[nextIdx].id);
              setZoomLevel(1);
              setImgError(false);
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-slate-900/80 hover:bg-sky-600 text-slate-300 hover:text-white border border-slate-700/80 flex items-center justify-center transition-all shadow-lg cursor-pointer"
            title="다음 레이어 (→)"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          {/* Large Image display */}
          <div
            className="transition-transform duration-150 flex items-center justify-center max-w-full max-h-full"
            style={{ transform: `scale(${zoomLevel})` }}
          >
            <img
              src={currentImgUrl}
              alt={`${currentDef.titleKo} (Job #${jobId})`}
              className="max-h-[68vh] w-auto max-w-full object-contain rounded-lg border border-slate-800 shadow-2xl selection:bg-none"
              onError={() => {
                if (!imgError) {
                  setImgError(true);
                }
              }}
            />
          </div>
        </div>

        {/* Bottom Thumbnail Gallery: Click small image to show large view */}
        <div className="px-3 sm:px-4 py-2.5 bg-slate-950/95 border-t border-slate-800 flex items-center space-x-3 overflow-x-auto shrink-0">
          <div className="flex items-center space-x-1.5 text-slate-400 shrink-0 pr-1">
            <Layers className="w-3.5 h-3.5 text-sky-400" />
            <span className="text-xs font-bold text-slate-300">레이어 썸네일:</span>
          </div>
          <div className="flex items-center space-x-2 shrink-0 py-0.5">
            {STAR_CHART_LAYERS.map((layer) => {
              const isSelected = layer.id === activeLayer;
              const thumbUrl = getLayerImageUrl(layer.id);
              const fallbackThumbUrl = getFallbackUrl(layer.id);

              return (
                <button
                  key={layer.id}
                  type="button"
                  onClick={() => {
                    setActiveLayer(layer.id);
                    setZoomLevel(1);
                    setImgError(false);
                  }}
                  className={`group relative rounded-xl overflow-hidden border-2 transition-all p-1 text-left flex items-center space-x-2 cursor-pointer ${
                    isSelected
                      ? 'border-sky-400 bg-sky-950/80 shadow-lg shadow-sky-500/25 ring-1 ring-sky-400'
                      : 'border-slate-800/80 bg-slate-900/90 hover:border-slate-600 hover:bg-slate-800'
                  }`}
                  title={`${layer.titleKo} 크게 보기`}
                >
                  <div className="w-14 h-10 bg-slate-950 rounded-lg overflow-hidden shrink-0 relative flex items-center justify-center border border-slate-800">
                    <img
                      src={thumbUrl}
                      alt={layer.titleKo}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-200"
                      onError={(e) => {
                        const target = e.currentTarget as HTMLImageElement;
                        if (!target.src.includes('nova.astrometry.net')) {
                          target.src = fallbackThumbUrl;
                        }
                      }}
                    />
                    {isSelected && (
                      <div className="absolute inset-0 bg-sky-500/20 flex items-center justify-center">
                        <span className="w-2 h-2 rounded-full bg-sky-400 shadow-[0_0_8px_#38bdf8]" />
                      </div>
                    )}
                  </div>
                  <div className="pr-1.5 min-w-0">
                    <span
                      className={`text-[11px] font-bold block truncate ${
                        isSelected ? 'text-sky-300' : 'text-slate-300 group-hover:text-white'
                      }`}
                    >
                      {layer.badgeLabel}
                    </span>
                    <span className="text-[9px] text-slate-500 font-mono block truncate">
                      {layer.id}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Modal Footer: Explanation Banner */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center space-x-2 text-slate-300">
            <Info className="w-3.5 h-3.5 text-sky-400 shrink-0" />
            <span className="text-[11px] text-slate-300">{currentDef.description}</span>
          </div>
          <span className="text-[10px] text-slate-500 hidden sm:inline">
            키보드 좌우 방향키(←, →)로 레이어 전환 가능 / ESC로 닫기
          </span>
        </div>
      </div>
    </div>
  );
};
