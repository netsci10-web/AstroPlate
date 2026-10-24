import React, { useState, useRef, useEffect } from 'react';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  RotateCcw,
  Layers,
  Eye,
  EyeOff,
  Crosshair,
  Compass,
  Sparkles,
  Info,
  Sliders,
  ExternalLink,
  Upload,
  X,
  Ruler,
  Navigation,
  Star,
} from 'lucide-react';
import { SolvedAstroData, AstrometryAnnotationItem } from '../types/astronomy';
import { degToRA_HMS, degToDec_DMS } from '../utils/coordinateMath';
import {
  getConstellationLinesForImage,
  extractPrimaryObjectIdentifier,
  formatTitleWithCatalogPriority,
} from '../utils/constellations';
import { extractStarsImage2XY, verifyAndSnapAnnotationsToDetectedStars } from '../utils/localPlateSolver';
import { resolveCelestialPhysicalSummary } from '../utils/celestialObjectInfo';

export type OverlayColor = 'red' | 'yellow' | 'green' | 'white';

export const STORAGE_OVERLAY_COLOR_KEY = 'astro_overlay_color';

export interface OverlayColorConfig {
  id: OverlayColor;
  label: string;
  dotColor: string;
  glowColor: string;
  primary: string;
  halo: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  starReticle: string;
  starText: string;
  dsoStroke: string;
  dsoCross: string;
  dsoText: string;
  dsoPillBg: string;
  dsoPillBorder: string;
  activeClass: string;
}

export const OVERLAY_COLORS: Record<OverlayColor, OverlayColorConfig> = {
  red: {
    id: 'red',
    label: '빨강',
    dotColor: '#ef4444',
    glowColor: '#ef4444',
    primary: '#ff4d4d',
    halo: '#f87171',
    badgeBg: 'rgba(50, 10, 15, 0.88)',
    badgeBorder: '#ef4444',
    badgeText: '#fecaca',
    starReticle: '#ef4444',
    starText: '#fca5a5',
    dsoStroke: '#f43f5e',
    dsoCross: '#fb7185',
    dsoText: '#fda4af',
    dsoPillBg: 'rgba(40, 10, 15, 0.85)',
    dsoPillBorder: '#f43f5e',
    activeClass: 'ring-2 ring-red-400 bg-red-500/25 text-red-200 border-red-500 font-bold',
  },
  yellow: {
    id: 'yellow',
    label: '노랑',
    dotColor: '#eab308',
    glowColor: '#facc15',
    primary: '#facc15',
    halo: '#fef08a',
    badgeBg: 'rgba(45, 25, 0, 0.88)',
    badgeBorder: '#facc15',
    badgeText: '#fef08a',
    starReticle: '#facc15',
    starText: '#fef08a',
    dsoStroke: '#facc15',
    dsoCross: '#fef08a',
    dsoText: '#fef08a',
    dsoPillBg: 'rgba(35, 20, 0, 0.88)',
    dsoPillBorder: '#facc15',
    activeClass: 'ring-2 ring-amber-400 bg-amber-500/25 text-amber-200 border-amber-500 font-bold',
  },
  green: {
    id: 'green',
    label: '녹색',
    dotColor: '#22c55e',
    glowColor: '#22c55e',
    primary: '#4ade80',
    halo: '#86efac',
    badgeBg: 'rgba(5, 35, 18, 0.88)',
    badgeBorder: '#22c55e',
    badgeText: '#bbf7d0',
    starReticle: '#22c55e',
    starText: '#86efac',
    dsoStroke: '#22c55e',
    dsoCross: '#86efac',
    dsoText: '#bbf7d0',
    dsoPillBg: 'rgba(5, 30, 15, 0.85)',
    dsoPillBorder: '#22c55e',
    activeClass: 'ring-2 ring-green-400 bg-green-500/25 text-green-200 border-green-500 font-bold',
  },
  white: {
    id: 'white',
    label: '흰색',
    dotColor: '#ffffff',
    glowColor: '#ffffff',
    primary: '#ffffff',
    halo: '#e2e8f0',
    badgeBg: 'rgba(15, 23, 42, 0.88)',
    badgeBorder: '#ffffff',
    badgeText: '#ffffff',
    starReticle: '#ffffff',
    starText: '#f8fafc',
    dsoStroke: '#ffffff',
    dsoCross: '#e2e8f0',
    dsoText: '#ffffff',
    dsoPillBg: 'rgba(15, 23, 42, 0.85)',
    dsoPillBorder: '#94a3b8',
    activeClass: 'ring-2 ring-white bg-white/20 text-white border-white font-bold',
  },
};

interface StarPhotoViewerProps {
  data: SolvedAstroData;
  onSelectObject: (objectName: string) => void;
  onReAnalyze?: () => void;
  onOpenUploadModal?: () => void;
  isReAnalyzing?: boolean;
}

type ViewMode = 'vector' | 'annotated' | 'red_green' | 'raw';

export const StarPhotoViewer: React.FC<StarPhotoViewerProps> = ({
  data,
  onSelectObject,
  onReAnalyze,
  onOpenUploadModal,
  isReAnalyzing = false,
}) => {
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [viewMode, setViewMode] = useState<ViewMode>('vector');
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Overlay layer toggles
  const [showConstellationLines, setShowConstellationLines] = useState(true);
  const [showStarLabels, setShowStarLabels] = useState(false);
  const [showDSO, setShowDSO] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [showCenterFov, setShowCenterFov] = useState(true);
  const [showDetectedCircles, setShowDetectedCircles] = useState(false);
  const [overlayOpacity, setOverlayOpacity] = useState(0.85);

  // Astrometry.net Simplexy + 7-Stage Nebula Pipeline detected stars state
  const [extractedStars, setExtractedStars] = useState<
    {
      x: number;
      y: number;
      flux: number;
      radius: number;
      instMag?: number;
      fwhm?: number;
      ellipticity?: number;
      axisRatio?: number;
      snr?: number;
    }[]
  >([]);
  const [hoveredDetectedStar, setHoveredDetectedStar] = useState<{
    x: number;
    y: number;
    idx: number;
    instMag?: number;
    flux: number;
    fwhm?: number;
    ellipticity?: number;
    axisRatio?: number;
    snr?: number;
  } | null>(null);

  // Memoized detected stars (prefer data.detectedStars, fallback to client-extracted stars)
  const effectiveDetectedStars = React.useMemo(() => {
    if (data.detectedStars && data.detectedStars.length > 0) return data.detectedStars;
    return extractedStars;
  }, [data.detectedStars, extractedStars]);

  // Extract stars if not already present on data (e.g. Astrometry server jobs or legacy items)
  useEffect(() => {
    if (data.detectedStars && data.detectedStars.length > 0) {
      setExtractedStars(data.detectedStars);
      return;
    }
    const rawSrc =
      data.rawImageUrl ||
      (typeof data.imageUrl === 'string' && data.imageUrl.startsWith('data:')
        ? data.imageUrl
        : `/api/astrometry/image-proxy/${data.jobId}/original`);

    if (rawSrc) {
      extractStarsImage2XY(rawSrc, { keepOriginalCoords: true })
        .then((res) => {
          if (res.stars && res.stars.length > 0) {
            setExtractedStars(res.stars);
          }
        })
        .catch(() => {});
    }
  }, [data.jobId, data.detectedStars, data.rawImageUrl, data.imageUrl]);

  // Overlay color: red, yellow, green, white (stored in localStorage, default: red)
  const [overlayColor, setOverlayColor] = useState<OverlayColor>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_OVERLAY_COLOR_KEY);
      if (saved && (saved === 'red' || saved === 'yellow' || saved === 'green' || saved === 'white')) {
        return saved as OverlayColor;
      }
    } catch (e) {}
    return 'red';
  });

  const handleSelectOverlayColor = (color: OverlayColor) => {
    setOverlayColor(color);
    try {
      localStorage.setItem(STORAGE_OVERLAY_COLOR_KEY, color);
    } catch (e) {}
  };

  const currentColorConfig = OVERLAY_COLORS[overlayColor] || OVERLAY_COLORS.red;

  // Hovered item for tooltip
  const [hoveredAnnotation, setHoveredAnnotation] = useState<AstrometryAnnotationItem | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [naturalSize, setNaturalSize] = useState({ width: 1920, height: 1080 });
  const [imgLoadError, setImgLoadError] = useState(false);
  const isLocalJob = String(data.jobId).startsWith('local_');

  const cal = data.calibration;
  const calWidth =
    cal?.width_arcsec && cal?.pixscale && cal.pixscale > 0
      ? Math.round(cal.width_arcsec / cal.pixscale)
      : naturalSize.width || data.imageWidth || 1920;
  const calHeight =
    cal?.height_arcsec && cal?.pixscale && cal.pixscale > 0
      ? Math.round(cal.height_arcsec / cal.pixscale)
      : naturalSize.height || data.imageHeight || 1080;
  const orientation = cal?.orientation || 0;
  // Dynamic scale factor for label sizes based on coordinate dimensions
  const fontScale = Math.max(1, Math.min(2.5, calWidth / 1400));

  // Reset imgLoadError, zoom/pan and synchronize coordinates when job changes
  useEffect(() => {
    setImgLoadError(false);
    setScale(1);
    setTranslate({ x: 0, y: 0 });
    setIsDragging(false);
    if (String(data.jobId).startsWith('local_') && viewMode === 'annotated') {
      setViewMode('vector');
    }
    if (cal?.width_arcsec && cal?.height_arcsec && cal?.pixscale && cal.pixscale > 0) {
      setNaturalSize({
        width: Math.round(cal.width_arcsec / cal.pixscale),
        height: Math.round(cal.height_arcsec / cal.pixscale),
      });
    } else if (data.imageWidth && data.imageHeight) {
      setNaturalSize({ width: data.imageWidth, height: data.imageHeight });
    }
  }, [data.jobId]);

  // On image load, get natural dimensions
  const handleImageLoaded = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setNaturalSize({
      width: img.naturalWidth || 1920,
      height: img.naturalHeight || 1080,
    });
  };

  // Reset zoom & pan
  const resetView = () => {
    setScale(1);
    setTranslate({ x: 0, y: 0 });
  };

  // Zoom handlers (+ / - buttons only, no wheel)
  const handleZoom = (delta: number) => {
    setScale((prev) => Math.max(0.4, Math.min(6, prev + delta)));
  };

  // Drag pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only primary mouse button
    setIsDragging(true);
    setDragStart({ x: e.clientX - translate.x, y: e.clientY - translate.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setTranslate({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }

    if (containerRef.current && imgRef.current) {
      const rect = imgRef.current.getBoundingClientRect();
      const relX = ((e.clientX - rect.left) / rect.width) * calWidth;
      const relY = ((e.clientY - rect.top) / rect.height) * calHeight;
      setMousePos({ x: Math.round(relX), y: Math.round(relY) });
    }
  };

  const handleMouseUp = () => setIsDragging(false);

  // Toggle fullscreen
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // Compute constellation lines connecting detected stars
  const constellationLines = React.useMemo(() => {
    if (!data.annotations || data.annotations.length === 0) return [];
    return getConstellationLinesForImage(data.annotations, data.matchedConstellations);
  }, [data.annotations, data.matchedConstellations]);

  // Separate stars and DSOs
  const { stars, dsos } = React.useMemo(() => {
    const starsList: AstrometryAnnotationItem[] = [];
    const dsosList: AstrometryAnnotationItem[] = [];

    (data.annotations || []).forEach((ann) => {
      const type = (ann.type || '').toLowerCase();
      const name = (ann.names?.[0] || '').toLowerCase();

      if (type === 'bright' || type === 'hd' || type === 'star' || type === 'tycho2' || type === 'gaia') {
        starsList.push(ann);
      } else if (
        type === 'ngc' ||
        type === 'ic' ||
        type === 'messier' ||
        name.startsWith('m ') ||
        name.startsWith('ngc') ||
        name.startsWith('ic')
      ) {
        dsosList.push(ann);
      } else {
        starsList.push(ann);
      }
    });

    const verifiedStars =
      effectiveDetectedStars.length > 0
        ? verifyAndSnapAnnotationsToDetectedStars(
            starsList,
            effectiveDetectedStars,
            calWidth,
            calHeight,
            data.imageWidth || calWidth,
            data.imageHeight || calHeight
          )
        : [];

    return { stars: verifiedStars, dsos: dsosList };
  }, [data.annotations, data.imageWidth, data.imageHeight, effectiveDetectedStars, calWidth, calHeight]);

  // Selectable targets in field (DSOs first, then named bright stars, or fallback from objects_in_field)
  const selectableTargets = React.useMemo<AstrometryAnnotationItem[]>(() => {
    const namedStars = stars.filter(
      (s) => s.names?.[0] && !s.names[0].startsWith('검출 항성')
    );
    const combined = [...dsos, ...namedStars.slice(0, 8)];
    if (combined.length > 0) return combined;

    const fallbackObj = extractPrimaryObjectIdentifier(
      [...(data.info?.objects_in_field || []), ...(data.info?.tags || [])],
      data.info?.original_filename,
      data.title
    );
    if (fallbackObj) {
      return [
        {
          type: /^(M\d+|C\d+|NGC|IC)/i.test(fallbackObj) ? 'dso' : 'bright',
          names: [fallbackObj],
          pixelx: calWidth / 2,
          pixely: calHeight / 2,
          radius: 24,
        },
      ];
    }
    if (stars.length > 0) return [stars[0]];
    return [];
  }, [dsos, stars, data.info, data.title, calWidth, calHeight]);

  const [selectedTarget, setSelectedTarget] = useState<AstrometryAnnotationItem | null>(null);
  const [isPhysicalCardOpen, setIsPhysicalCardOpen] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 768 : true
  );

  // Auto-select primary target when photo or selectableTargets change
  // Default: closed (false) on mobile phones (< 768px), open (true) on desktop computers (>= 768px)
  useEffect(() => {
    if (selectableTargets.length > 0) {
      setSelectedTarget(selectableTargets[0]);
      setIsPhysicalCardOpen(typeof window !== 'undefined' ? window.innerWidth >= 768 : true);
    } else {
      setSelectedTarget(null);
    }
  }, [data.jobId, selectableTargets]);

  const selectedPhysicalSummary = React.useMemo(() => {
    if (!selectedTarget) return null;
    return resolveCelestialPhysicalSummary(selectedTarget, cal);
  }, [selectedTarget, cal]);

  // Reset imgLoadError when switching viewMode or jobId
  useEffect(() => {
    setImgLoadError(false);
  }, [viewMode, data.jobId]);

  // Current image source based on viewMode
  const getImageSource = () => {
    const isLocalJob = String(data.jobId).startsWith('local_');
    if (isLocalJob) {
      // For vector, red_green, raw: show clean unannotated photo in background so our SVG overlay renders crisp circles
      return data.rawImageUrl || data.imageUrl || '';
    }

    if (imgLoadError) {
      if (viewMode === 'raw' || viewMode === 'vector') {
        return `/api/astrometry/sky-image/${data.jobId}`;
      }
      return `https://nova.astrometry.net/annotated_display/${data.jobId}`;
    }
    if (viewMode === 'raw') {
      // Pure original unannotated photo without Astrometry labels
      return data.rawImageUrl || `/api/astrometry/image-proxy/${data.jobId}/original`;
    }
    if (viewMode === 'annotated') {
      // Official Astrometry labels overlay rendering
      return `/api/astrometry/image-proxy/${data.jobId}/annotated`;
    }
    if (viewMode === 'red_green') {
      // Catalog star detection match rendering (red/green)
      return `/api/astrometry/image-proxy/${data.jobId}/red_green`;
    }
    // 'vector' mode (별자리 정밀 오버레이):
    // Clean unannotated photo in background, so our custom overlay shines cleanly
    return data.rawImageUrl || `/api/astrometry/image-proxy/${data.jobId}/original`;
  };

  return (
    <div
      ref={containerRef}
      className={`relative bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden flex flex-col ${
        isFullscreen ? 'h-screen w-screen rounded-none' : 'h-[620px]'
      }`}
    >
      {/* Top Controls Overlay Header */}
      <div className="absolute top-3 left-3 right-3 z-20 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        {/* Left: View Mode Tabs */}
        <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-xl p-1 flex items-center space-x-1 shadow-lg pointer-events-auto">
          <button
            onClick={() => setViewMode('vector')}
            className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all flex items-center space-x-1.5 ${
              viewMode === 'vector'
                ? 'bg-sky-500 text-white shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>별자리 정밀 오버레이</span>
          </button>
          {!isLocalJob && (
            <button
              onClick={() => setViewMode('annotated')}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${
                viewMode === 'annotated'
                  ? 'bg-sky-500 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
              title="Astrometry.net 공식 라벨 렌더링"
            >
              Astrometry 공식 라벨
            </button>
          )}
          <button
            onClick={() => setViewMode('red_green')}
            className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${
              viewMode === 'red_green'
                ? 'bg-sky-500 text-white shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
            title="항성 카탈로그 매칭 (적색/녹색)"
          >
            항성 검출 매칭
          </button>
          <button
            onClick={() => setViewMode('raw')}
            className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${
              viewMode === 'raw'
                ? 'bg-sky-500 text-white shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
            title="라벨 없는 순수 원본 사진"
          >
            원본 사진
          </button>
        </div>

        {/* Center / Action: 천체사진 다시 분석 (Re-analyze Astrophoto) */}
        {onReAnalyze && (
          <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-xl p-1 flex items-center space-x-1 shadow-lg pointer-events-auto">
            <button
              type="button"
              onClick={onReAnalyze}
              disabled={isReAnalyzing}
              className="text-xs px-3.5 py-1.5 rounded-lg font-bold transition-all flex items-center space-x-1.5 bg-gradient-to-r from-sky-500 via-indigo-600 to-purple-600 hover:from-sky-400 hover:to-indigo-500 text-white shadow-md shadow-sky-500/30 border border-sky-400/50 cursor-pointer hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed whitespace-nowrap"
              title="현재 천체사진으로 플레이트 솔빙 분석을 다시 수행합니다 (항성 검출 및 성도 매칭 갱신)"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${isReAnalyzing ? 'animate-spin text-white' : 'text-sky-200'}`} />
              <span>{isReAnalyzing ? '천체사진 분석 중...' : '천체사진 다시 분석'}</span>
            </button>
            {onOpenUploadModal && (
              <button
                type="button"
                onClick={onOpenUploadModal}
                className="text-xs px-2.5 py-1.5 rounded-lg font-medium transition-all flex items-center space-x-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 hover:border-slate-600 cursor-pointer whitespace-nowrap"
                title="새 천체사진을 업로드하거나 분석 설정을 변경합니다"
              >
                <Upload className="w-3.5 h-3.5 text-slate-400" />
                <span className="hidden sm:inline">새 사진/설정</span>
              </button>
            )}
          </div>
        )}

        {/* Right: Physical Summary Popover Toggle + Quick Action Controls (+/- Zoom, Reset, Fullscreen) */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {selectedPhysicalSummary && (
            <button
              type="button"
              onClick={() => setIsPhysicalCardOpen((prev) => !prev)}
              className={`text-xs px-3 py-1.5 rounded-xl font-bold transition-all flex items-center space-x-1.5 border shadow-lg cursor-pointer ${
                isPhysicalCardOpen
                  ? 'bg-sky-500/25 text-sky-200 border-sky-400/70 ring-1 ring-sky-400/40'
                  : 'bg-slate-900/90 text-slate-300 hover:text-white border-slate-700/80 hover:bg-slate-800'
              }`}
              title="선택된 주요천체의 상세 정보(겉보기 등급, 크기, 거리) 팝오버 열기/닫기"
            >
              <Info className="w-3.5 h-3.5 text-sky-400" />
              <span>주요천체 상세</span>
              <span className="text-[11px] font-mono px-1.5 py-0.2 rounded bg-slate-950/80 text-sky-300 border border-sky-800/60 max-w-[130px] truncate">
                {selectedPhysicalSummary.displayName}
              </span>
            </button>
          )}

          <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-xl p-1 flex items-center space-x-1 shadow-lg">
            <button
              onClick={() => handleZoom(0.25)}
              title="확대 (Zoom In) - 버튼 클릭으로만 조절"
              className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleZoom(-0.25)}
              title="축소 (Zoom Out) - 버튼 클릭으로만 조절"
              className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              onClick={resetView}
              title="화면 맞춤 (Reset)"
              className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <div className="w-px h-4 bg-slate-700 mx-0.5" />
            <button
              onClick={toggleFullscreen}
              title={isFullscreen ? '전체화면 종료' : '전체화면 (Fullscreen)'}
              className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Top Popover Card: Selected Celestial Object (DSO / Star) Key Physical Quantities (겉보기 등급, 크기, 거리) */}
      {selectedPhysicalSummary && isPhysicalCardOpen && (
        <div
          onMouseDown={(e) => e.stopPropagation()}
          className="absolute top-14 right-3 z-30 w-[calc(100%-1.5rem)] sm:w-[430px] bg-slate-900/95 backdrop-blur-xl border border-sky-500/40 rounded-2xl p-3.5 shadow-2xl shadow-black/80 pointer-events-auto animate-in fade-in slide-in-from-top-2 duration-150"
        >
          {/* Popover Header: Target Title & Category Badge */}
          <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-slate-800/90">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                    selectedPhysicalSummary.isDSO
                      ? 'bg-purple-950/80 text-purple-300 border-purple-700/60'
                      : 'bg-amber-950/80 text-amber-300 border-amber-700/60'
                  }`}
                >
                  {selectedPhysicalSummary.categoryBadge}
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  픽셀 {selectedPhysicalSummary.pixelCoords}
                </span>
              </div>
              <h4 className="text-sm sm:text-base font-extrabold text-white tracking-tight mt-1 truncate">
                {selectedPhysicalSummary.displayName}
              </h4>
              <p className="text-[11px] text-slate-300 truncate">
                {selectedPhysicalSummary.subtitleKo}
              </p>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => onSelectObject(selectedPhysicalSummary.rawTargetQuery)}
                className="text-[11px] px-2.5 py-1 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/40 font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                title="CDS SIMBAD 실시간 데이터베이스 상세 조회"
              >
                <span>SIMBAD</span>
                <ExternalLink className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={() => setIsPhysicalCardOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                title="주요천체 상세 카드 닫기"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* 3-Column Physical Quantities Summary: 겉보기 등급, 크기, 거리 */}
          <div className="grid grid-cols-3 gap-2 mt-2.5">
            {/* 1. 겉보기 등급 (Apparent Magnitude) */}
            <div className="bg-slate-950/90 border border-slate-800/90 rounded-xl p-2.5 flex flex-col justify-between">
              <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
                <span>겉보기 등급</span>
                <Star className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              </div>
              <div className="mt-1">
                <p className="text-sm font-extrabold font-mono text-amber-300 tracking-tight">
                  {selectedPhysicalSummary.apparentMagnitude}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1" title={selectedPhysicalSummary.apparentMagnitudeSub}>
                  {selectedPhysicalSummary.apparentMagnitudeSub}
                </p>
              </div>
            </div>

            {/* 2. 크기 / 시직경 (Size / Angular Size) */}
            <div className="bg-slate-950/90 border border-slate-800/90 rounded-xl p-2.5 flex flex-col justify-between">
              <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
                <span>크기 (시직경)</span>
                <Ruler className="w-3.5 h-3.5 text-sky-400 shrink-0" />
              </div>
              <div className="mt-1">
                <p className="text-sm font-extrabold font-mono text-sky-300 tracking-tight truncate" title={selectedPhysicalSummary.sizeText}>
                  {selectedPhysicalSummary.sizeText}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1" title={selectedPhysicalSummary.sizeSub}>
                  {selectedPhysicalSummary.sizeSub}
                </p>
              </div>
            </div>

            {/* 3. 거리 (Distance) */}
            <div className="bg-slate-950/90 border border-slate-800/90 rounded-xl p-2.5 flex flex-col justify-between">
              <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
                <span>거리</span>
                <Navigation className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              </div>
              <div className="mt-1">
                <p className="text-sm font-extrabold font-mono text-indigo-300 tracking-tight truncate" title={selectedPhysicalSummary.distanceText}>
                  {selectedPhysicalSummary.distanceText}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1" title={selectedPhysicalSummary.distanceSub}>
                  {selectedPhysicalSummary.distanceSub}
                </p>
              </div>
            </div>
          </div>

          {/* Target Quick Selector Pills if multiple DSOs / Bright Stars are in field */}
          {selectableTargets.length > 1 && (
            <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
              <span className="text-[10px] text-slate-400 font-semibold shrink-0">천체 선택:</span>
              {selectableTargets.map((item, idx) => {
                const rawArr = Array.isArray(item.names) ? item.names : [];
                const label =
                  extractPrimaryObjectIdentifier(rawArr) ||
                  formatTitleWithCatalogPriority(rawArr[0] || `천체 #${idx + 1}`);
                const isCurrent = selectedTarget === item;
                return (
                  <button
                    key={`sel-target-${idx}`}
                    type="button"
                    onClick={() => setSelectedTarget(item)}
                    className={`text-[11px] px-2 py-0.5 rounded-lg font-medium whitespace-nowrap transition-all cursor-pointer border ${
                      isCurrent
                        ? 'bg-sky-500 text-white border-sky-400 font-bold shadow-sm'
                        : 'bg-slate-950/80 text-slate-300 hover:text-white border-slate-800 hover:border-slate-600'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Main Interactive Canvas Area (Zoom via +/- buttons only, no wheel) */}
      <div
        className="relative flex-1 w-full h-full overflow-hidden cursor-grab active:cursor-grabbing select-none"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div
          style={{
            transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
            transformOrigin: 'center center',
            transition: isDragging ? 'none' : 'transform 0.08s ease-out',
          }}
          className="absolute inset-0 flex items-center justify-center"
        >
          {/* Base Photograph */}
          <div className="relative inline-block">
            <img
              key={`${data.jobId}_${viewMode}`}
              ref={imgRef}
              src={getImageSource()}
              alt="Astrometry Astronomical Target"
              onLoad={handleImageLoaded}
              onError={() => {
                if (!imgLoadError) {
                  setImgLoadError(true);
                }
              }}
              className="max-h-[580px] w-auto object-contain block pointer-events-none rounded shadow-2xl"
            />

            {/* SVG Interactive Overlay Layer (When viewMode === 'vector' or 'red_green' on local) */}
            {(viewMode === 'vector' || (viewMode === 'red_green' && isLocalJob)) && (
              <svg
                className="absolute inset-0 w-full h-full pointer-events-auto"
                viewBox={`0 0 ${calWidth} ${calHeight}`}
                preserveAspectRatio="none"
                style={{ opacity: overlayOpacity }}
              >
                <defs>
                  {/* Dynamic glow filter based on selected overlay color */}
                  <filter id="celestial-glow" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="0" stdDeviation="3.5" floodColor={currentColorConfig.glowColor} floodOpacity="0.85" />
                  </filter>
                  <filter id="dso-glow" x="-30%" y="-30%" width="160%" height="160%">
                    <feGaussianBlur stdDeviation="4" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
                </defs>

                {/* Astrometry.net Simplexy Detected Stars Layer (Red Circles) */}
                {((viewMode === 'vector' && showDetectedCircles) || viewMode === 'red_green') && (
                  <g className="astrometry-detected-stars-red" opacity={viewMode === 'red_green' ? 0.95 : 0.88}>
                    {effectiveDetectedStars.map((ds, idx) => {
                      const detScaleX = data.imageWidth && data.imageWidth > 0 ? calWidth / data.imageWidth : 1;
                      const detScaleY = data.imageHeight && data.imageHeight > 0 ? calHeight / data.imageHeight : 1;
                      const sx = ds.x * detScaleX;
                      const sy = ds.y * detScaleY;
                      const r = Math.max(3.5, Math.min(13, (ds.radius || 2) * 2.2 * Math.min(detScaleX, detScaleY)));
                      const isHovered = hoveredDetectedStar?.idx === idx;
                      return (
                        <circle
                          key={`ds-circle-${idx}`}
                          cx={sx}
                          cy={sy}
                          r={r}
                          fill={isHovered ? 'rgba(239, 68, 68, 0.45)' : 'none'}
                          stroke="#ef4444"
                          strokeWidth={isHovered ? '2.4' : '1.5'}
                          className="cursor-pointer transition-all"
                          onMouseEnter={() => setHoveredDetectedStar({ ...ds, idx })}
                          onMouseLeave={() => setHoveredDetectedStar(null)}
                        />
                      );
                    })}
                  </g>
                )}

                {/* In red_green mode: Catalog Matched Stars Green Rings & Top Badge */}
                {viewMode === 'red_green' && (
                  <>
                    <g className="astrometry-matched-stars-green">
                      {stars.map((star, idx) => {
                        const r = Math.max(7, (star.radius || 9) * 1.35);
                        return (
                          <circle
                            key={`rg-cat-${idx}`}
                            cx={star.pixelx}
                            cy={star.pixely}
                            r={r}
                            fill="none"
                            stroke="#22c55e"
                            strokeWidth="2.2"
                          />
                        );
                      })}
                    </g>
                    {/* Red/Green Detection Mode Badge */}
                    <g transform={`translate(${calWidth * 0.04}, ${calHeight * 0.05})`}>
                      <rect
                        width={Math.max(340, 320 * fontScale)}
                        height={36 * fontScale}
                        rx={8 * fontScale}
                        fill="rgba(15, 23, 42, 0.92)"
                        stroke="#ef4444"
                        strokeWidth={1.5 * fontScale}
                        filter="drop-shadow(0 4px 8px rgba(0,0,0,0.8))"
                      />
                      <circle cx={20 * fontScale} cy={18 * fontScale} r={6 * fontScale} fill="none" stroke="#ef4444" strokeWidth={2 * fontScale} />
                      <circle cx={42 * fontScale} cy={18 * fontScale} r={6 * fontScale} fill="none" stroke="#22c55e" strokeWidth={2 * fontScale} />
                      <text
                        x={56 * fontScale}
                        y={23 * fontScale}
                        fill="#f8fafc"
                        fontSize={13 * fontScale}
                        fontWeight="bold"
                        fontFamily="sans-serif"
                      >
                        {isLocalJob ? '웹브라우저 항성 검출' : 'Astrometry 항성 검출'}: {effectiveDetectedStars.length}개 (적색) / 매칭: {stars.length}개 (녹색)
                      </text>
                    </g>
                  </>
                )}

                {/* 1. Constellation Asterism Lines */}
                {showConstellationLines && (
                  <g className="constellation-lines">
                    {constellationLines.map((line, idx) => (
                      <g key={`cline-${idx}`}>
                        {/* Glow halo line */}
                        <line
                          x1={line.x1}
                          y1={line.y1}
                          x2={line.x2}
                          y2={line.y2}
                          stroke={currentColorConfig.halo}
                          strokeWidth="5.5"
                          strokeOpacity="0.45"
                          strokeLinecap="round"
                        />
                        {/* Core sharp line */}
                        <line
                          x1={line.x1}
                          y1={line.y1}
                          x2={line.x2}
                          y2={line.y2}
                          stroke={currentColorConfig.primary}
                          strokeWidth="2.2"
                          strokeDasharray="4 2"
                          strokeLinecap="round"
                        />
                      </g>
                    ))}

                    {/* Constellation Name Badges at top-left of photo */}
                    {data.matchedConstellations.map((c, i) => {
                      const badgeW = Math.max(260, 240 * fontScale);
                      const badgeH = 34 * fontScale;
                      return (
                        <g key={`cname-${c.code}-${i}`}>
                          <rect
                            x={calWidth * 0.04}
                            y={calHeight * 0.05 + i * (badgeH + 8 * fontScale)}
                            width={badgeW}
                            height={badgeH}
                            rx={6 * fontScale}
                            fill={currentColorConfig.badgeBg}
                            stroke={currentColorConfig.badgeBorder}
                            strokeWidth={1.5 * fontScale}
                            filter="drop-shadow(0 3px 6px rgba(0,0,0,0.6))"
                          />
                          <text
                            x={calWidth * 0.04 + 14 * fontScale}
                            y={calHeight * 0.05 + i * (badgeH + 8 * fontScale) + 22 * fontScale}
                            fill={currentColorConfig.badgeText}
                            fontSize={15 * fontScale}
                            fontWeight="bold"
                            fontFamily="sans-serif"
                          >
                            ✦ {c.nameKo} ({c.nameEn})
                          </text>
                        </g>
                      );
                    })}
                  </g>
                )}

                {/* 2. Deep Sky Objects (Messier, NGC, IC) */}
                {showDSO && (
                  <g className="dsos">
                    {dsos.map((dso, idx) => {
                      const radius = Math.max(16 * fontScale, (dso.radius || 18) * fontScale);
                      const safeNames = Array.isArray(dso.names) ? dso.names : [];
                      const primaryName =
                        extractPrimaryObjectIdentifier(safeNames) ||
                        formatTitleWithCatalogPriority(safeNames[0] || 'DSO');
                      const textWidth = Math.max(48 * fontScale, primaryName.length * (10 * fontScale) + 16 * fontScale);
                      const textHeight = 22 * fontScale;
                      const textX = dso.pixelx + radius + 8 * fontScale;
                      const textY = dso.pixely;

                      return (
                        <g
                          key={`dso-${idx}`}
                          className="cursor-pointer group"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTarget(dso);
                            setIsPhysicalCardOpen(true);
                          }}
                          onDoubleClick={() => onSelectObject(primaryName)}
                          onMouseEnter={() => setHoveredAnnotation(dso)}
                          onMouseLeave={() => setHoveredAnnotation(null)}
                        >
                          {/* Outer dashed DSO target circle - dynamically colored */}
                          <circle
                            cx={dso.pixelx}
                            cy={dso.pixely}
                            r={radius}
                            fill="none"
                            stroke={currentColorConfig.dsoStroke}
                            strokeWidth={2.2 * fontScale}
                            strokeDasharray="6 3.5"
                            filter="url(#celestial-glow)"
                          />
                          {/* Inner cross reticle */}
                          <line
                            x1={dso.pixelx - radius - 5 * fontScale}
                            y1={dso.pixely}
                            x2={dso.pixelx - radius + 5 * fontScale}
                            y2={dso.pixely}
                            stroke={currentColorConfig.dsoCross}
                            strokeWidth={1.8 * fontScale}
                          />
                          <line
                            x1={dso.pixelx + radius - 5 * fontScale}
                            y1={dso.pixely}
                            x2={dso.pixelx + radius + 5 * fontScale}
                            y2={dso.pixely}
                            stroke={currentColorConfig.dsoCross}
                            strokeWidth={1.8 * fontScale}
                          />
                          <line
                            x1={dso.pixelx}
                            y1={dso.pixely - radius - 5 * fontScale}
                            x2={dso.pixelx}
                            y2={dso.pixely - radius + 5 * fontScale}
                            stroke={currentColorConfig.dsoCross}
                            strokeWidth={1.8 * fontScale}
                          />
                          <line
                            x1={dso.pixelx}
                            y1={dso.pixely + radius - 5 * fontScale}
                            x2={dso.pixelx}
                            y2={dso.pixely + radius + 5 * fontScale}
                            stroke={currentColorConfig.dsoCross}
                            strokeWidth={1.8 * fontScale}
                          />

                          {/* High-contrast background pill for DSO label */}
                          <rect
                            x={textX}
                            y={textY - textHeight / 2}
                            width={textWidth}
                            height={textHeight}
                            rx={4 * fontScale}
                            fill={currentColorConfig.dsoPillBg}
                            stroke={currentColorConfig.dsoPillBorder}
                            strokeWidth={1 * fontScale}
                            filter="drop-shadow(0 2px 4px rgba(0,0,0,0.85))"
                          />
                          {/* DSO Label Text - Large & bold */}
                          <text
                            x={textX + 8 * fontScale}
                            y={textY + 5 * fontScale}
                            fill={currentColorConfig.dsoText}
                            fontSize={15 * fontScale}
                            fontWeight="bold"
                            fontFamily="sans-serif"
                            filter="drop-shadow(0 1px 2px rgba(0,0,0,0.9))"
                          >
                            {primaryName}
                          </text>
                        </g>
                      );
                    })}
                  </g>
                )}

                {/* 3. Star Labels & Target Markers */}
                {showStarLabels && (
                  <g className="stars">
                    {stars.map((star, idx) => {
                      const name = star.names[0] || '';
                      const isBright = star.vmag !== undefined && star.vmag < 4.0;
                      const starRadius = (isBright ? 10 : 7) * fontScale;
                      const textWidth = name ? Math.max(38 * fontScale, name.length * (9 * fontScale) + (star.vmag !== undefined ? 44 * fontScale : 14 * fontScale)) : 0;
                      const textHeight = (isBright ? 24 : 20) * fontScale;
                      const textX = star.pixelx + starRadius + 6 * fontScale;
                      const textY = star.pixely;

                      return (
                        <g
                          key={`star-${idx}`}
                          className="cursor-pointer group"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTarget(star);
                            setIsPhysicalCardOpen(true);
                          }}
                          onDoubleClick={() => onSelectObject(name)}
                          onMouseEnter={() => setHoveredAnnotation(star)}
                          onMouseLeave={() => setHoveredAnnotation(null)}
                        >
                          {/* Star reticle circle */}
                          <circle
                            cx={star.pixelx}
                            cy={star.pixely}
                            r={starRadius}
                            fill={`${currentColorConfig.dotColor}25`}
                            stroke={currentColorConfig.starReticle}
                            strokeWidth={(isBright ? 2.4 : 1.6) * fontScale}
                            filter="url(#celestial-glow)"
                          />
                          {/* Star center dot */}
                          <circle
                            cx={star.pixelx}
                            cy={star.pixely}
                            r={(isBright ? 3 : 2) * fontScale}
                            fill={currentColorConfig.primary}
                          />

                          {/* Star Name Pill & Text - Only show full pill if named catalog star or hovered to prevent visual clutter */}
                          {name && (!name.startsWith('검출 항성') || hoveredAnnotation === star) && (
                            <>
                              <rect
                                x={textX}
                                y={textY - textHeight / 2}
                                width={textWidth}
                                height={textHeight}
                                rx={4 * fontScale}
                                fill={currentColorConfig.dsoPillBg}
                                stroke={currentColorConfig.dsoPillBorder}
                                strokeWidth={0.8 * fontScale}
                                strokeOpacity="0.8"
                                filter="drop-shadow(0 2px 4px rgba(0,0,0,0.85))"
                              />
                              <text
                                x={textX + 7 * fontScale}
                                y={textY + 4 * fontScale}
                                fill={currentColorConfig.starText}
                                fontSize={(isBright ? 15 : 12.5) * fontScale}
                                fontWeight={isBright ? 'bold' : '600'}
                                fontFamily="sans-serif"
                                filter="drop-shadow(0 1px 2px rgba(0,0,0,0.95))"
                              >
                                {name}
                                {star.vmag !== undefined && (
                                  <tspan fill="#cbd5e1" fontSize={(isBright ? 11.5 : 9.5) * fontScale} dx="4">
                                    {star.vmag.toFixed(1)}m
                                  </tspan>
                                )}
                              </text>
                            </>
                          )}
                        </g>
                      );
                    })}
                  </g>
                )}

                {/* 4. Center Crosshair & Celestial Orientation Compass */}
                {showCenterFov && cal && (
                  <g className="center-fov">
                    {/* Image center crosshair */}
                    <g transform={`translate(${calWidth / 2}, ${calHeight / 2})`}>
                      <circle r={18 * fontScale} fill="none" stroke={currentColorConfig.starReticle} strokeWidth={1.5 * fontScale} strokeDasharray="4 3" />
                      <line x1={-26 * fontScale} y1="0" x2={-8 * fontScale} y2="0" stroke={currentColorConfig.primary} strokeWidth={1.8 * fontScale} />
                      <line x1={8 * fontScale} y1="0" x2={26 * fontScale} y2="0" stroke={currentColorConfig.primary} strokeWidth={1.8 * fontScale} />
                      <line x1="0" y1={-26 * fontScale} x2="0" y2={-8 * fontScale} stroke={currentColorConfig.primary} strokeWidth={1.8 * fontScale} />
                      <line x1="0" y1={8 * fontScale} x2="0" y2={26 * fontScale} stroke={currentColorConfig.primary} strokeWidth={1.8 * fontScale} />
                      <rect
                        x={20 * fontScale}
                        y={-28 * fontScale}
                        width={125 * fontScale}
                        height={22 * fontScale}
                        rx={4 * fontScale}
                        fill={currentColorConfig.dsoPillBg}
                        stroke={currentColorConfig.dsoPillBorder}
                        strokeWidth={0.8 * fontScale}
                      />
                      <text x={26 * fontScale} y={-13 * fontScale} fill={currentColorConfig.starText} fontSize={12 * fontScale} fontWeight="bold">
                        화각 중심 (Center)
                      </text>
                    </g>

                    {/* Celestial North / East Compass Reticle */}
                    <g
                      transform={`translate(${calWidth - 70 * fontScale}, ${70 * fontScale}) rotate(${orientation})`}
                      className="cursor-default"
                    >
                      <circle r={36 * fontScale} fill="#0f172acc" stroke="#6366f1" strokeWidth={1.5 * fontScale} />
                      {/* North Arrow */}
                      <line x1="0" y1="0" x2="0" y2={-28 * fontScale} stroke="#38bdf8" strokeWidth={2.5 * fontScale} />
                      <polygon points={`0,${-33 * fontScale} ${-4 * fontScale},${-24 * fontScale} ${4 * fontScale},${-24 * fontScale}`} fill="#38bdf8" />
                      <text x="0" y={-36 * fontScale} fill="#38bdf8" fontSize={12 * fontScale} fontWeight="bold" textAnchor="middle">
                        N
                      </text>
                      {/* East Arrow */}
                      <line x1="0" y1="0" x2={-26 * fontScale} y2="0" stroke="#a855f7" strokeWidth={2 * fontScale} />
                      <polygon points={`${-30 * fontScale},0 ${-22 * fontScale},${-3.5 * fontScale} ${-22 * fontScale},${3.5 * fontScale}`} fill="#a855f7" />
                      <text x={-36 * fontScale} y={4 * fontScale} fill="#a855f7" fontSize={12 * fontScale} fontWeight="bold" textAnchor="middle">
                        E
                      </text>
                      <circle r={3 * fontScale} fill="#ffffff" />
                    </g>
                  </g>
                )}
              </svg>
            )}
          </div>
        </div>

        {/* Floating Tooltip when hovering an object */}
        {hoveredAnnotation && (
          <div className="absolute bottom-4 left-4 z-20 bg-slate-900/95 border border-sky-500/40 rounded-xl p-3 shadow-xl backdrop-blur-md max-w-xs animate-in fade-in">
            <div className="flex items-center justify-between space-x-2">
              <span className="text-xs uppercase font-bold text-sky-400">
                {hoveredAnnotation.type === 'bright' ? '항성 (Star)' : '심우주 천체 (DSO)'}
              </span>
              <span className="text-[10px] text-slate-400">클릭하여 실시간 SIMBAD 조회</span>
            </div>
            <p className="text-sm font-semibold text-white mt-0.5">
              {hoveredAnnotation.names?.join(', ') || 'Unnamed'}
            </p>
            <div className="text-xs text-slate-300 mt-1 flex items-center space-x-3">
              {hoveredAnnotation.vmag !== undefined && (
                <span>등급: <strong className="text-sky-300">{hoveredAnnotation.vmag.toFixed(2)}m</strong></span>
              )}
              <span>픽셀: ({Math.round(hoveredAnnotation.pixelx)}, {Math.round(hoveredAnnotation.pixely)})</span>
            </div>
          </div>
        )}

        {/* Floating Tooltip when hovering a detected star (Simplexy / Nebula Pipeline red circle) */}
        {hoveredDetectedStar && !hoveredAnnotation && (
          <div className="absolute bottom-4 left-4 z-20 bg-slate-900/95 border border-red-500/60 rounded-xl p-3 shadow-2xl backdrop-blur-md max-w-xs animate-in fade-in">
            <div className="flex items-center justify-between space-x-2">
              <span className="text-xs uppercase font-bold text-red-400 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                {isLocalJob ? '정제된 점상 항성' : 'Astrometry 검출 항성'} #{hoveredDetectedStar.idx + 1}
              </span>
              <span className="text-[10px] text-emerald-300 font-mono bg-emerald-950/70 px-1.5 py-0.5 rounded border border-emerald-800/60">
                Top-Hat + 2차 모멘트 검증
              </span>
            </div>
            <div className="text-xs text-slate-200 mt-1.5 space-y-1 font-mono">
              <div className="flex justify-between gap-4">
                <span className="text-slate-400">서브픽셀 좌표:</span>
                <span className="text-white font-bold">
                  X={hoveredDetectedStar.x.toFixed(1)}, Y={hoveredDetectedStar.y.toFixed(1)}
                </span>
              </div>
              {hoveredDetectedStar.instMag !== undefined && (
                <div className="flex justify-between gap-4">
                  <span className="text-slate-400">추정 등급 / 광량:</span>
                  <span className="text-amber-300 font-bold">
                    {hoveredDetectedStar.instMag.toFixed(1)}m ({Math.round(hoveredDetectedStar.flux)} ADU)
                  </span>
                </div>
              )}
              <div className="flex justify-between gap-4">
                <span className="text-slate-400">반치폭 (FWHM):</span>
                <span className="text-sky-300 font-bold">
                  {(hoveredDetectedStar.fwhm ?? 2.8).toFixed(2)} px
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-slate-400">진원도(a/b) / 비원형도(e):</span>
                <span className="text-emerald-300 font-bold">
                  {(hoveredDetectedStar.axisRatio ?? 1.08).toFixed(2)} / {(hoveredDetectedStar.ellipticity ?? 0.07).toFixed(2)}
                </span>
              </div>
              {hoveredDetectedStar.snr !== undefined && (
                <div className="flex justify-between gap-4">
                  <span className="text-slate-400">국소 SNR (Peak/σ_local):</span>
                  <span className="text-indigo-300 font-bold">{hoveredDetectedStar.snr.toFixed(1)}σ</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Live Coordinate Inspector Overlay (Bottom Right) */}
        {mousePos && (
          <div className="absolute bottom-4 right-4 z-20 bg-slate-900/80 backdrop-blur-md border border-slate-700/80 rounded-lg px-2.5 py-1 text-[11px] font-mono text-slate-300 pointer-events-none">
            Pixel: ({mousePos.x}, {mousePos.y}) | Zoom: {(scale * 100).toFixed(0)}%
          </div>
        )}
      </div>

      {/* Bottom Layer Controls Toolbar (Only active in 'vector' viewMode) */}
      {viewMode === 'vector' && (
        <div className="bg-slate-900/95 border-t border-slate-800 px-4 py-2 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-300 z-10">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="font-semibold text-slate-400 flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-sky-400" />
              레이어:
            </span>

            <button
              onClick={() => setShowDSO(!showDSO)}
              className={`px-2.5 py-1 rounded transition-colors flex items-center space-x-1.5 ${
                showDSO
                  ? `${currentColorConfig.activeClass} shadow-sm`
                  : 'text-slate-400 hover:text-slate-200 border border-transparent'
              }`}
            >
              <span
                className="w-2 h-2 rounded-full inline-block"
                style={{ backgroundColor: showDSO ? currentColorConfig.dsoStroke : '#64748b' }}
              />
              <span>심우주 천체 DSO ({dsos.length})</span>
            </button>

            <button
              onClick={() => setShowConstellationLines(!showConstellationLines)}
              className={`px-2.5 py-1 rounded transition-colors flex items-center space-x-1 ${
                showConstellationLines
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                  : 'text-slate-400 hover:text-slate-200 border border-transparent'
              }`}
            >
              <Sparkles className="w-3 h-3" />
              <span>별자리 선 ({constellationLines.length})</span>
            </button>

            <button
              onClick={() => setShowStarLabels(!showStarLabels)}
              className={`px-2.5 py-1 rounded transition-colors flex items-center space-x-1 ${
                showStarLabels
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                  : 'text-slate-400 hover:text-slate-200 border border-transparent'
              }`}
            >
              <span>항성 라벨 ({stars.length})</span>
            </button>

            <button
              onClick={() => setShowCenterFov(!showCenterFov)}
              className={`px-2.5 py-1 rounded transition-colors flex items-center space-x-1 ${
                showCenterFov
                  ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                  : 'text-slate-400 hover:text-slate-200 border border-transparent'
              }`}
            >
              <Compass className="w-3 h-3" />
              <span>방위각 &amp; 화각 중심</span>
            </button>
          </div>

          {/* Right Group: Overlay Color Selector (Left of Opacity) + Opacity slider */}
          <div className="flex items-center space-x-3">
            {/* Overlay Color Selector (Left of Opacity) */}
            <div className="flex items-center space-x-1.5">
              <span className="text-[11px] text-slate-400 font-medium whitespace-nowrap">오버레이 색:</span>
              <div className="flex items-center space-x-1 bg-slate-950/80 p-0.5 rounded-lg border border-slate-700/80">
                {(['red', 'yellow', 'green', 'white'] as OverlayColor[]).map((cKey) => {
                  const c = OVERLAY_COLORS[cKey];
                  const isSelected = overlayColor === cKey;
                  return (
                    <button
                      key={cKey}
                      type="button"
                      onClick={() => handleSelectOverlayColor(cKey)}
                      title={`오버레이 색상: ${c.label} (${isSelected ? '현재 선택됨' : '선택'})`}
                      className={`px-2 py-0.5 rounded-md text-[11px] flex items-center space-x-1 transition-all border ${
                        isSelected
                          ? `${c.activeClass} shadow-sm`
                          : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                      }`}
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full inline-block shadow-sm"
                        style={{
                          backgroundColor: c.dotColor,
                          boxShadow: isSelected ? `0 0 6px ${c.dotColor}` : 'none',
                        }}
                      />
                      <span>{c.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="w-px h-4 bg-slate-700 hidden sm:block" />

            {/* Opacity slider */}
            <div className="flex items-center space-x-2">
              <span className="text-[11px] text-slate-400 whitespace-nowrap">투명도:</span>
              <input
                type="range"
                min="0.1"
                max="1"
                step="0.05"
                value={overlayOpacity}
                onChange={(e) => setOverlayOpacity(parseFloat(e.target.value))}
                className="w-20 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-sky-400"
              />
              <span className="font-mono text-[11px] text-slate-300 w-8">
                {(overlayOpacity * 100).toFixed(0)}%
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
