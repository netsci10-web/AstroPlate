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
} from 'lucide-react';
import { SolvedAstroData, AstrometryAnnotationItem } from '../types/astronomy';
import { degToRA_HMS, degToDec_DMS } from '../utils/coordinateMath';
import { getConstellationLinesForImage } from '../utils/constellations';

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
    badgeBg: '#450a0acc',
    badgeBorder: '#ef4444',
    badgeText: '#fecaca',
    starReticle: '#ef4444',
    starText: '#fca5a5',
    activeClass: 'ring-2 ring-red-400 bg-red-500/25 text-red-200 border-red-500 font-bold',
  },
  yellow: {
    id: 'yellow',
    label: '노랑',
    dotColor: '#eab308',
    glowColor: '#eab308',
    primary: '#facc15',
    halo: '#fde047',
    badgeBg: '#422006cc',
    badgeBorder: '#eab308',
    badgeText: '#fef08a',
    starReticle: '#eab308',
    starText: '#fef08a',
    activeClass: 'ring-2 ring-amber-400 bg-amber-500/25 text-amber-200 border-amber-500 font-bold',
  },
  green: {
    id: 'green',
    label: '녹색',
    dotColor: '#22c55e',
    glowColor: '#22c55e',
    primary: '#4ade80',
    halo: '#86efac',
    badgeBg: '#052e16cc',
    badgeBorder: '#22c55e',
    badgeText: '#bbf7d0',
    starReticle: '#22c55e',
    starText: '#86efac',
    activeClass: 'ring-2 ring-green-400 bg-green-500/25 text-green-200 border-green-500 font-bold',
  },
  white: {
    id: 'white',
    label: '흰색',
    dotColor: '#ffffff',
    glowColor: '#ffffff',
    primary: '#ffffff',
    halo: '#e2e8f0',
    badgeBg: '#1e293bcc',
    badgeBorder: '#ffffff',
    badgeText: '#ffffff',
    starReticle: '#ffffff',
    starText: '#f8fafc',
    activeClass: 'ring-2 ring-white bg-white/20 text-white border-white font-bold',
  },
};

interface StarPhotoViewerProps {
  data: SolvedAstroData;
  onSelectObject: (objectName: string) => void;
}

type ViewMode = 'vector' | 'annotated' | 'red_green' | 'raw';

export const StarPhotoViewer: React.FC<StarPhotoViewerProps> = ({ data, onSelectObject }) => {
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [viewMode, setViewMode] = useState<ViewMode>('vector');
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Overlay layer toggles
  const [showConstellationLines, setShowConstellationLines] = useState(true);
  const [showStarLabels, setShowStarLabels] = useState(true);
  const [showDSO, setShowDSO] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [showCenterFov, setShowCenterFov] = useState(true);
  const [overlayOpacity, setOverlayOpacity] = useState(0.9);

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

  const cal = data.calibration;
  const calWidth =
    cal?.width_arcsec && cal?.pixscale && cal.pixscale > 0
      ? Math.round(cal.width_arcsec / cal.pixscale)
      : data.imageWidth || naturalSize.width || 1920;
  const calHeight =
    cal?.height_arcsec && cal?.pixscale && cal.pixscale > 0
      ? Math.round(cal.height_arcsec / cal.pixscale)
      : data.imageHeight || naturalSize.height || 1080;
  const orientation = cal?.orientation || 0;

  // Reset imgLoadError, zoom/pan and synchronize coordinates when job changes
  useEffect(() => {
    setImgLoadError(false);
    setScale(1);
    setTranslate({ x: 0, y: 0 });
    setIsDragging(false);
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

      if (type === 'bright' || type === 'hd' || type === 'star') {
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

    return { stars: starsList, dsos: dsosList };
  }, [data.annotations]);

  // Current image source based on viewMode
  const getImageSource = () => {
    if (imgLoadError) {
      if (viewMode === 'raw') {
        return data.rawImageUrl || `https://nova.astrometry.net/image/${data.jobId}`;
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
            title="Astrometry 라벨 없는 순수 원본 사진"
          >
            원본 사진
          </button>
        </div>

        {/* Right: Quick Action Controls (+/- Zoom only, Reset, Fullscreen) */}
        <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-xl p-1 flex items-center space-x-1 shadow-lg pointer-events-auto">
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

            {/* SVG Interactive Overlay Layer (When viewMode === 'vector') */}
            {viewMode === 'vector' && (
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
                    {data.matchedConstellations.map((c, i) => (
                      <g key={`cname-${c.code}-${i}`}>
                        <rect
                          x={calWidth * 0.04}
                          y={calHeight * 0.05 + i * 36}
                          width={240}
                          height={28}
                          rx={6}
                          fill={currentColorConfig.badgeBg}
                          stroke={currentColorConfig.badgeBorder}
                          strokeWidth="1.2"
                        />
                        <text
                          x={calWidth * 0.04 + 12}
                          y={calHeight * 0.05 + i * 36 + 18}
                          fill={currentColorConfig.badgeText}
                          fontSize="13"
                          fontWeight="bold"
                          fontFamily="sans-serif"
                        >
                          ✦ {c.nameKo} ({c.nameEn})
                        </text>
                      </g>
                    ))}
                  </g>
                )}

                {/* 2. Deep Sky Objects (Messier, NGC, IC) */}
                {showDSO && (
                  <g className="dsos">
                    {dsos.map((dso, idx) => {
                      const radius = Math.max(14, dso.radius || 18);
                      const primaryName = dso.names[0] || 'DSO';
                      return (
                        <g
                          key={`dso-${idx}`}
                          className="cursor-pointer group"
                          onClick={() => onSelectObject(primaryName)}
                          onMouseEnter={() => setHoveredAnnotation(dso)}
                          onMouseLeave={() => setHoveredAnnotation(null)}
                        >
                          {/* Outer dashed DSO target circle */}
                          <circle
                            cx={dso.pixelx}
                            cy={dso.pixely}
                            r={radius}
                            fill="none"
                            stroke="#f43f5e"
                            strokeWidth="1.8"
                            strokeDasharray="5 3"
                            filter="url(#dso-glow)"
                          />
                          {/* Inner cross reticle */}
                          <line
                            x1={dso.pixelx - radius - 4}
                            y1={dso.pixely}
                            x2={dso.pixelx - radius + 5}
                            y2={dso.pixely}
                            stroke="#fb7185"
                            strokeWidth="1.5"
                          />
                          <line
                            x1={dso.pixelx + radius - 5}
                            y1={dso.pixely}
                            x2={dso.pixelx + radius + 4}
                            y2={dso.pixely}
                            stroke="#fb7185"
                            strokeWidth="1.5"
                          />
                          <line
                            x1={dso.pixelx}
                            y1={dso.pixely - radius - 4}
                            x2={dso.pixelx}
                            y2={dso.pixely - radius + 5}
                            stroke="#fb7185"
                            strokeWidth="1.5"
                          />
                          <line
                            x1={dso.pixelx}
                            y1={dso.pixely + radius - 5}
                            x2={dso.pixelx}
                            y2={dso.pixely + radius + 4}
                            stroke="#fb7185"
                            strokeWidth="1.5"
                          />
                          {/* DSO Label */}
                          <text
                            x={dso.pixelx + radius + 8}
                            y={dso.pixely + 4}
                            fill="#fda4af"
                            fontSize="13"
                            fontWeight="bold"
                            filter="drop-shadow(0 2px 4px rgba(0,0,0,0.8))"
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
                      return (
                        <g
                          key={`star-${idx}`}
                          className="cursor-pointer group"
                          onClick={() => onSelectObject(name)}
                          onMouseEnter={() => setHoveredAnnotation(star)}
                          onMouseLeave={() => setHoveredAnnotation(null)}
                        >
                          {/* Star reticle circle */}
                          <circle
                            cx={star.pixelx}
                            cy={star.pixely}
                            r={isBright ? 9 : 6}
                            fill={`${currentColorConfig.dotColor}25`}
                            stroke={currentColorConfig.starReticle}
                            strokeWidth={isBright ? '2.2' : '1.3'}
                            filter="url(#celestial-glow)"
                          />
                          {/* Star center dot */}
                          <circle
                            cx={star.pixelx}
                            cy={star.pixely}
                            r={isBright ? 2.5 : 1.5}
                            fill={currentColorConfig.primary}
                          />
                          {/* Name Text */}
                          <text
                            x={star.pixelx + 10}
                            y={star.pixely - 6}
                            fill={currentColorConfig.starText}
                            fontSize={isBright ? '12' : '10'}
                            fontWeight={isBright ? 'bold' : 'normal'}
                            filter="drop-shadow(0 2px 4px rgba(0,0,0,0.95))"
                          >
                            {name}
                            {star.vmag !== undefined && (
                              <tspan fill="#cbd5e1" fontSize="9" dx="4">
                                {star.vmag.toFixed(1)}m
                              </tspan>
                            )}
                          </text>
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
                      <circle r="16" fill="none" stroke="#e0e7ff" strokeWidth="1.2" strokeDasharray="3 3" />
                      <line x1="-24" y1="0" x2="-6" y2="0" stroke="#e0e7ff" strokeWidth="1.5" />
                      <line x1="6" y1="0" x2="24" y2="0" stroke="#e0e7ff" strokeWidth="1.5" />
                      <line x1="0" y1="-24" x2="0" y2="-6" stroke="#e0e7ff" strokeWidth="1.5" />
                      <line x1="0" y1="6" x2="0" y2="24" stroke="#e0e7ff" strokeWidth="1.5" />
                      <text x="18" y="-18" fill="#e0e7ff" fontSize="11" fontWeight="bold">
                        화각 중심 (Center)
                      </text>
                    </g>

                    {/* Celestial North / East Compass Reticle */}
                    <g
                      transform={`translate(${calWidth - 70}, 70) rotate(${orientation})`}
                      className="cursor-default"
                    >
                      <circle r="36" fill="#0f172acc" stroke="#6366f1" strokeWidth="1.5" />
                      {/* North Arrow */}
                      <line x1="0" y1="0" x2="0" y2="-28" stroke="#38bdf8" strokeWidth="2.5" />
                      <polygon points="0,-33 -4,-24 4,-24" fill="#38bdf8" />
                      <text x="0" y="-36" fill="#38bdf8" fontSize="11" fontWeight="bold" textAnchor="middle">
                        N
                      </text>
                      {/* East Arrow */}
                      <line x1="0" y1="0" x2="-26" y2="0" stroke="#a855f7" strokeWidth="2" />
                      <polygon points="-30,0 -22,-3.5 -22,3.5" fill="#a855f7" />
                      <text x="-36" y="4" fill="#a855f7" fontSize="11" fontWeight="bold" textAnchor="middle">
                        E
                      </text>
                      <circle r="3" fill="#ffffff" />
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
          <div className="flex items-center space-x-3">
            <span className="font-semibold text-slate-400 flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-sky-400" />
              레이어:
            </span>

            <button
              onClick={() => setShowConstellationLines(!showConstellationLines)}
              className={`px-2 py-1 rounded transition-colors flex items-center space-x-1 ${
                showConstellationLines ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sparkles className="w-3 h-3" />
              <span>별자리 선 ({constellationLines.length})</span>
            </button>

            <button
              onClick={() => setShowStarLabels(!showStarLabels)}
              className={`px-2 py-1 rounded transition-colors flex items-center space-x-1 ${
                showStarLabels ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>항성 라벨 ({stars.length})</span>
            </button>

            <button
              onClick={() => setShowDSO(!showDSO)}
              className={`px-2 py-1 rounded transition-colors flex items-center space-x-1 ${
                showDSO ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>심우주 천체 DSO ({dsos.length})</span>
            </button>

            <button
              onClick={() => setShowCenterFov(!showCenterFov)}
              className={`px-2 py-1 rounded transition-colors flex items-center space-x-1 ${
                showCenterFov ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40' : 'text-slate-400 hover:text-slate-200'
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
