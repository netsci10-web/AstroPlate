import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import {
  Compass,
  Globe,
  Sparkles,
  MapPin,
  ExternalLink,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Eye,
  Sliders,
  Maximize2,
  Minimize2,
  Crosshair,
  Layers,
  Palette,
  Check,
  ChevronDown,
  Info,
} from 'lucide-react';
import { SolvedAstroData } from '../types/astronomy';
import { degToRA_HMS, degToDec_DMS, computeFieldCorners } from '../utils/coordinateMath';
import { IAU_CONSTELLATIONS } from '../utils/constellations';
import { AladinSurveyModal } from './AladinSurveyModal';
import {
  BRIGHT_STARS,
  CONSTELLATION_FIGURES,
  MILKY_WAY_COORDINATES,
  CatalogStar,
  ConstellationFigure,
} from '../data/celestialCatalog';

interface CelestialStarChartProps {
  data: SolvedAstroData;
  onSelectConstellation?: (code: string) => void;
}

type ChartTheme = 'deep_navy' | 'true_black' | 'blueprint';
type LineBrightness = 'glow' | 'sharp' | 'amber' | 'subtle' | 'off';
type ConstellationFilter = 'all' | 'major' | 'matched_only';

export const CelestialStarChart: React.FC<CelestialStarChartProps> = ({
  data,
  onSelectConstellation,
}) => {
  // Mode & Navigation State
  const [chartMode, setChartMode] = useState<'all_sky' | 'focused'>('focused');
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [panOffset, setPanOffset] = useState<{ raDeg: number; decDeg: number }>({ raDeg: 0, decDeg: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Drag Pan state
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef<{ x: number; y: number; initRa: number; initDec: number }>({
    x: 0,
    y: 0,
    initRa: 0,
    initDec: 0,
  });

  // Display & Visibility Controls
  const [lineStyle, setLineStyle] = useState<LineBrightness>('glow');
  const [lineWidth, setLineWidth] = useState<'thin' | 'normal' | 'thick'>('thin');
  const [showConstellationNames, setShowConstellationNames] = useState(true);
  const [constellationFilter, setConstellationFilter] = useState<ConstellationFilter>('all');
  const [showStarNames, setShowStarNames] = useState(true);
  const [showStars, setShowStars] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [showMilkyWay, setShowMilkyWay] = useState(true);
  const [theme, setTheme] = useState<ChartTheme>('deep_navy');
  const [showControlsMenu, setShowControlsMenu] = useState(false);

  // Hover & selection inspection
  const [hoveredCoords, setHoveredCoords] = useState<{ ra: string; dec: string; rawRa: number; rawDec: number } | null>(null);
  const [hoveredConstellation, setHoveredConstellation] = useState<ConstellationFigure | null>(null);
  const [hoveredStar, setHoveredStar] = useState<CatalogStar | null>(null);
  const [selectedConstCode, setSelectedConstCode] = useState<string | null>(null);

  const cal = data.calibration;
  const centerRa = cal?.ra || 0;
  const centerDec = cal?.dec || 0;
  const widthArcsec = cal?.width_arcsec || (cal?.radius ? cal.radius * 7200 : 3600);
  const heightArcsec = cal?.height_arcsec || widthArcsec;
  const orientation = cal?.orientation || 0;
  const parity = cal?.parity || 1.0;

  // Primary matched constellation
  const primaryConstellation = data.matchedConstellations[0];

  // SVG dimensions for celestial projection
  const width = 1000;
  const height = 540;

  // Effective center considering user pan
  const currentCenterRa = (centerRa + panOffset.raDeg + 360) % 360;
  const currentCenterDec = Math.max(-85, Math.min(85, centerDec + panOffset.decDeg));

  // Field spans based on mode and zoom
  const fovSpan = chartMode === 'all_sky' ? 360 / zoomLevel : 75 / zoomLevel;
  const decSpan = chartMode === 'all_sky' ? 180 / zoomLevel : 45 / zoomLevel;

  // All-sky center offset for panning in all-sky mode
  const allSkyCenterRa = ((180 + panOffset.raDeg) % 360 + 360) % 360;

  // Project RA & Dec into SVG coordinate space
  const raToX = useCallback(
    (raDeg: number): number => {
      let normalized = raDeg % 360;
      if (normalized < 0) normalized += 360;

      if (chartMode === 'all_sky' && zoomLevel === 1 && panOffset.raDeg === 0) {
        // Standard RA 0..360 -> X 0..width
        return (normalized / 360) * width;
      }

      // Projection centered at current view center
      const targetCenter = chartMode === 'all_sky' ? allSkyCenterRa : currentCenterRa;
      let diff = normalized - targetCenter;
      if (diff > 180) diff -= 360;
      if (diff < -180) diff += 360;

      // In celestial sphere, East is to the left (increasing RA moves left)
      return width / 2 - (diff / fovSpan) * width;
    },
    [chartMode, zoomLevel, panOffset.raDeg, allSkyCenterRa, currentCenterRa, fovSpan]
  );

  const decToY = useCallback(
    (decDeg: number): number => {
      if (chartMode === 'all_sky' && zoomLevel === 1 && panOffset.decDeg === 0) {
        // Dec +90 at top (y=0), -90 at bottom (y=height)
        return ((90 - decDeg) / 180) * height;
      }

      const targetCenter = chartMode === 'all_sky' ? panOffset.decDeg : currentCenterDec;
      const diff = decDeg - targetCenter;
      return height / 2 - (diff / decSpan) * height;
    },
    [chartMode, zoomLevel, panOffset.decDeg, currentCenterDec, decSpan]
  );

  // Convert SVG mouse position to celestial coordinates
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * width;
    const y = ((e.clientY - rect.top) / rect.height) * height;

    // Handle drag panning
    if (isDraggingRef.current) {
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;

      const raDelta = (dx / rect.width) * fovSpan;
      const decDelta = (dy / rect.height) * decSpan;

      setPanOffset({
        raDeg: dragStartRef.current.initRa + raDelta,
        decDeg: dragStartRef.current.initDec - decDelta,
      });
      return;
    }

    // Coordinate readout
    let ra = 0;
    let dec = 0;

    if (chartMode === 'all_sky' && zoomLevel === 1 && panOffset.raDeg === 0 && panOffset.decDeg === 0) {
      ra = (x / width) * 360;
      dec = 90 - (y / height) * 180;
    } else {
      const targetCenterRa = chartMode === 'all_sky' ? allSkyCenterRa : currentCenterRa;
      const targetCenterDec = chartMode === 'all_sky' ? panOffset.decDeg : currentCenterDec;

      const relX = (x - width / 2) / width;
      const relY = (y - height / 2) / height;
      ra = targetCenterRa - relX * fovSpan;
      dec = targetCenterDec - relY * decSpan;
    }

    if (ra < 0) ra += 360;
    if (ra >= 360) ra -= 360;

    setHoveredCoords({
      ra: degToRA_HMS(ra),
      dec: degToDec_DMS(dec),
      rawRa: ra,
      rawDec: dec,
    });
  };

  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    isDraggingRef.current = true;
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      initRa: panOffset.raDeg,
      initDec: panOffset.decDeg,
    };
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  // Wheel zoom
  const handleWheel = (e: React.WheelEvent<SVGSVGElement>) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.25 : -0.25;
    setZoomLevel((prev) => Math.max(0.6, Math.min(6, parseFloat((prev + delta).toFixed(2)))));
  };

  // Reset to Photo FOV location
  const handleResetToFOV = () => {
    setPanOffset({ raDeg: 0, decDeg: 0 });
    setZoomLevel(1);
    setChartMode('focused');
  };

  // Reset to default All-Sky
  const handleResetAllSky = () => {
    setPanOffset({ raDeg: 0, decDeg: 0 });
    setZoomLevel(1);
    setChartMode('all_sky');
  };

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  // 4 corners of photo's Field of View on the celestial sphere
  const fovCorners = useMemo(() => {
    return computeFieldCorners(centerRa, centerDec, widthArcsec, heightArcsec, orientation, parity);
  }, [centerRa, centerDec, widthArcsec, heightArcsec, orientation, parity]);

  // SVG points string for photo FOV polygon
  const fovPolygonPoints = fovCorners.map((c) => `${raToX(c.ra)},${decToY(c.dec)}`).join(' ');

  const [isAladinOpen, setIsAladinOpen] = useState(false);

  // Direct external URL to CDS Aladin Lite with explicit ra & dec parameters for exact celestial targeting
  const aladinFov = Math.max(0.1, Math.min(60, typeof cal?.radius === 'number' && !isNaN(cal.radius) ? cal.radius * 2 : 1.5)).toFixed(2);
  const safeCenterRa = typeof centerRa === 'number' && !isNaN(centerRa) ? centerRa : 0;
  const safeCenterDec = typeof centerDec === 'number' && !isNaN(centerDec) ? centerDec : 0;
  const aladinUrl = `https://aladin.cds.unistra.fr/AladinLite/?ra=${safeCenterRa.toFixed(
    5
  )}&dec=${safeCenterDec.toFixed(5)}&fov=${aladinFov}&survey=P%2FDSS2%2Fcolor`;

  // Line stroke width based on setting
  const strokeWidthPx = lineWidth === 'thick' ? 2.6 : lineWidth === 'normal' ? 1.8 : 1.2;

  // Filtered constellations for rendering
  const activeConstellations = useMemo(() => {
    return CONSTELLATION_FIGURES.filter((fig) => {
      if (constellationFilter === 'matched_only') {
        return data.matchedConstellations.some((m) => m.code === fig.code);
      }
      return true;
    });
  }, [constellationFilter, data.matchedConstellations]);

  // Milky way SVG path generator with meridian safety
  const milkyWayPath = useMemo(() => {
    if (MILKY_WAY_COORDINATES.length === 0) return '';
    const points = MILKY_WAY_COORDINATES.map(([ra, dec]) => `${raToX(ra)},${decToY(dec)}`);
    return `M ${points.join(' L ')}`;
  }, [raToX, decToY]);

  // Helper to split lines across meridian in All-sky mode
  const renderConstellationLine = (
    [ra1, dec1, ra2, dec2]: [number, number, number, number],
    key: string,
    isPrimary: boolean,
    isMatched: boolean,
    isHovered: boolean
  ) => {
    // Check if line wraps around 0h/24h meridian in all_sky mode
    const isWrapping = Math.abs(ra1 - ra2) > 180 && chartMode === 'all_sky' && zoomLevel === 1;

    let strokeColor = '#38bdf8'; // Default electric sky blue
    let strokeOpacity = 0.85;

    if (lineStyle === 'amber') {
      strokeColor = '#fbbf24';
    } else if (lineStyle === 'sharp') {
      strokeColor = '#f8fafc';
      strokeOpacity = 0.95;
    } else if (lineStyle === 'subtle') {
      strokeColor = '#818cf8';
      strokeOpacity = 0.6;
    }

    if (isPrimary) {
      strokeColor = '#38bdf8'; // Glowing neon cyan for solved constellation
      strokeOpacity = 1.0;
    } else if (isMatched) {
      strokeColor = '#a855f7'; // Purple-indigo for adjacent matched
      strokeOpacity = 0.9;
    }

    if (isHovered) {
      strokeColor = '#facc15'; // Brilliant gold on hover
      strokeOpacity = 1.0;
    }

    const currentWidth = isPrimary || isHovered ? strokeWidthPx * 1.4 : strokeWidthPx;

    if (isWrapping) {
      // Split into two segments to avoid ugly horizontal streaks across the map
      const [leftRa, leftDec, rightRa, rightDec] = ra1 < ra2 ? [ra1, dec1, ra2, dec2] : [ra2, dec2, ra1, dec1];
      const midDec = (dec1 + dec2) / 2;

      return (
        <g key={key}>
          <line
            x1={raToX(leftRa)}
            y1={decToY(leftDec)}
            x2={raToX(0)}
            y2={decToY(midDec)}
            stroke={strokeColor}
            strokeWidth={currentWidth}
            strokeOpacity={strokeOpacity}
            strokeLinecap="round"
            filter={lineStyle === 'glow' || isPrimary ? 'url(#line-glow)' : undefined}
          />
          <line
            x1={raToX(360)}
            y1={decToY(midDec)}
            x2={raToX(rightRa)}
            y2={decToY(rightDec)}
            stroke={strokeColor}
            strokeWidth={currentWidth}
            strokeOpacity={strokeOpacity}
            strokeLinecap="round"
            filter={lineStyle === 'glow' || isPrimary ? 'url(#line-glow)' : undefined}
          />
        </g>
      );
    }

    const x1 = raToX(ra1);
    const y1 = decToY(dec1);
    const x2 = raToX(ra2);
    const y2 = decToY(dec2);

    // Skip if totally outside viewport in focused mode
    if (chartMode === 'focused') {
      const margin = 100;
      if (
        (x1 < -margin && x2 < -margin) ||
        (x1 > width + margin && x2 > width + margin) ||
        (y1 < -margin && y2 < -margin) ||
        (y1 > height + margin && y2 > height + margin)
      ) {
        return null;
      }
    }

    return (
      <line
        key={key}
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={strokeColor}
        strokeWidth={currentWidth}
        strokeOpacity={strokeOpacity}
        strokeLinecap="round"
        filter={lineStyle === 'glow' || isPrimary || isHovered ? 'url(#line-glow)' : undefined}
      />
    );
  };

  return (
    <div
      ref={containerRef}
      className={`rounded-2xl border transition-all duration-300 flex flex-col shadow-2xl ${
        isFullscreen ? 'fixed inset-0 z-50 bg-slate-950 p-6 rounded-none' : 'bg-slate-900 border-slate-800 p-5'
      }`}
    >
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-800">
        <div>
          <div className="flex items-center space-x-2">
            <Globe className="w-5 h-5 text-sky-400 animate-pulse" />
            <h3 className="text-base font-bold text-white tracking-tight flex items-center space-x-2">
              <span>실시간 전천 성도 (Celestial Star Chart)</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-sky-950 text-sky-300 border border-sky-800 font-medium">
                고선명 별자리 성도
              </span>
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            전천 88개 별자리 선(Asterisms)과 주요 밝은 별, 천구 좌표계(J2000) 및 촬영 사진 정밀 화각(FOV) 연동
          </p>
        </div>

        {/* View Mode Controls & Quick Toggles */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Chart Mode Toggle */}
          <div className="bg-slate-950 rounded-xl p-1 flex items-center space-x-1 border border-slate-800 shadow-inner">
            <button
              onClick={() => {
                setChartMode('focused');
                setZoomLevel(1);
                setPanOffset({ raDeg: 0, decDeg: 0 });
              }}
              className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center space-x-1.5 ${
                chartMode === 'focused'
                  ? 'bg-gradient-to-r from-sky-500 to-indigo-600 text-white shadow-md shadow-sky-500/25'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Crosshair className="w-3.5 h-3.5" />
              <span>화각 집중 모드</span>
            </button>
            <button
              onClick={() => {
                setChartMode('all_sky');
                setZoomLevel(1);
                setPanOffset({ raDeg: 0, decDeg: 0 });
              }}
              className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center space-x-1.5 ${
                chartMode === 'all_sky'
                  ? 'bg-gradient-to-r from-sky-500 to-indigo-600 text-white shadow-md shadow-sky-500/25'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>전천 (All-Sky 360°)</span>
            </button>
          </div>

          {/* Quick Visibility Settings Menu Button */}
          <div className="relative">
            <button
              onClick={() => setShowControlsMenu(!showControlsMenu)}
              className="text-xs px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center space-x-1.5 transition-all shadow-sm"
              title="별자리 선, 밝기, 이름, 별 표시 설정"
            >
              <Sliders className="w-3.5 h-3.5 text-sky-400" />
              <span>성도 시인성 조절</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {/* Dropdown Menu for Visual Clarity */}
            {showControlsMenu && (
              <div className="absolute right-0 mt-2 w-72 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-4 z-40 space-y-3.5 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <span className="font-bold text-white flex items-center space-x-1.5">
                    <Eye className="w-4 h-4 text-sky-400" />
                    <span>별자리 및 성도 시인성 설정</span>
                  </span>
                  <button
                    onClick={() => setShowControlsMenu(false)}
                    className="text-slate-400 hover:text-white text-xs px-1.5 py-0.5 rounded"
                  >
                    닫기
                  </button>
                </div>

                {/* 1. Constellation Line Brightness/Style */}
                <div className="space-y-1.5">
                  <label className="text-slate-300 font-medium block">별자리 선 스타일 & 밝기</label>
                  <div className="grid grid-cols-2 gap-1.5 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
                    {[
                      { id: 'glow', label: '✨ 네온 발광 (추천)' },
                      { id: 'sharp', label: '⚪ 고선명 화이트' },
                      { id: 'amber', label: '🌟 황금빛 클래식' },
                      { id: 'off', label: '❌ 선 숨김' },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() => setLineStyle(opt.id as LineBrightness)}
                        className={`px-2 py-1.5 rounded-lg text-left text-[11px] font-medium transition-all ${
                          lineStyle === opt.id
                            ? 'bg-sky-600 text-white shadow'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Line Thickness */}
                <div className="space-y-1.5">
                  <label className="text-slate-300 font-medium block">별자리 선 굵기</label>
                  <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-800">
                    {[
                      { id: 'thin', label: '보통 (기본 1.2px)' },
                      { id: 'normal', label: '선명 (1.8px)' },
                      { id: 'thick', label: '굵게 (2.6px)' },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() => setLineWidth(opt.id as any)}
                        className={`flex-1 py-1 rounded-lg text-center text-[11px] font-medium transition-all ${
                          lineWidth === opt.id
                            ? 'bg-indigo-600 text-white shadow'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3. Constellation Names & Stars Toggles */}
                <div className="space-y-2 pt-1 border-t border-slate-800">
                  <label className="flex items-center justify-between text-slate-300 cursor-pointer">
                    <span>별자리 이름 표시 (한글)</span>
                    <input
                      type="checkbox"
                      checked={showConstellationNames}
                      onChange={(e) => setShowConstellationNames(e.target.checked)}
                      className="rounded bg-slate-800 border-slate-700 text-sky-500 focus:ring-0"
                    />
                  </label>

                  <label className="flex items-center justify-between text-slate-300 cursor-pointer">
                    <span>주요 밝은 별 및 이름 표시</span>
                    <input
                      type="checkbox"
                      checked={showStarNames}
                      onChange={(e) => setShowStarNames(e.target.checked)}
                      className="rounded bg-slate-800 border-slate-700 text-sky-500 focus:ring-0"
                    />
                  </label>

                  <label className="flex items-center justify-between text-slate-300 cursor-pointer">
                    <span>적경/적위 천구 좌표 격자선</span>
                    <input
                      type="checkbox"
                      checked={showGrid}
                      onChange={(e) => setShowGrid(e.target.checked)}
                      className="rounded bg-slate-800 border-slate-700 text-sky-500 focus:ring-0"
                    />
                  </label>

                  <label className="flex items-center justify-between text-slate-300 cursor-pointer">
                    <span>은하수(Milky Way) 띠 표시</span>
                    <input
                      type="checkbox"
                      checked={showMilkyWay}
                      onChange={(e) => setShowMilkyWay(e.target.checked)}
                      className="rounded bg-slate-800 border-slate-700 text-sky-500 focus:ring-0"
                    />
                  </label>
                </div>

                {/* 4. Background Theme */}
                <div className="space-y-1.5 pt-1 border-t border-slate-800">
                  <label className="text-slate-300 font-medium block">성도 배경 테마</label>
                  <div className="grid grid-cols-3 gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                    {[
                      { id: 'deep_navy', label: '🌌 심우주' },
                      { id: 'true_black', label: '🌑 트루블랙' },
                      { id: 'blueprint', label: '🗺️ 청사진' },
                    ].map((th) => (
                      <button
                        key={th.id}
                        onClick={() => setTheme(th.id as ChartTheme)}
                        className={`py-1 text-center rounded-lg text-[11px] font-medium transition-all ${
                          theme === th.id ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {th.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Zoom Buttons */}
          <div className="flex items-center space-x-1 bg-slate-950 rounded-xl p-1 border border-slate-800">
            <button
              onClick={() => setZoomLevel((z) => Math.min(6, parseFloat((z + 0.5).toFixed(2))))}
              title="성도 확대 (+)"
              className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <span className="text-[11px] font-mono text-slate-400 px-1 min-w-[34px] text-center">
              {zoomLevel}x
            </span>
            <button
              onClick={() => setZoomLevel((z) => Math.max(0.6, parseFloat((z - 0.5).toFixed(2))))}
              title="성도 축소 (-)"
              className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={chartMode === 'focused' ? handleResetToFOV : handleResetAllSky}
              title="위치 및 배율 초기화"
              className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors ml-0.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Center to FOV Button */}
          <button
            onClick={handleResetToFOV}
            className="text-xs px-3 py-1.5 rounded-xl bg-sky-950/80 hover:bg-sky-900 text-sky-300 border border-sky-800/80 flex items-center space-x-1.5 transition-all shadow-sm"
            title="촬영된 사진 화각 중심 좌표로 이동"
          >
            <Crosshair className="w-3.5 h-3.5 text-sky-400" />
            <span>사진 위치로</span>
          </button>

          {/* Fullscreen Expansion */}
          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors"
            title={isFullscreen ? '전체화면 종료' : '성도 전체화면 확대'}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>

          {/* External Survey / Aladin Modal Button */}
          <button
            type="button"
            onClick={() => setIsAladinOpen(true)}
            title="CDS Aladin Lite 실시간 위성/망원경 서베이 열기 (정밀 조준)"
            className="text-xs px-3 py-1.5 rounded-xl bg-indigo-950/80 hover:bg-indigo-900 text-indigo-300 hover:text-white border border-indigo-800 flex items-center space-x-1.5 transition-colors cursor-pointer shadow-sm"
          >
            <Compass className="w-3.5 h-3.5 text-indigo-400" />
            <span>Aladin 서베이</span>
            <ExternalLink className="w-3 h-3 text-indigo-400" />
          </button>
        </div>
      </div>

      {/* Interactive Status Banner */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1 mb-2 text-xs text-slate-400">
        <div className="flex items-center space-x-2">
          <span className="flex items-center space-x-1.5 text-sky-400 font-semibold">
            <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping" />
            <span>솔빙 매칭 별자리:</span>
          </span>
          <span className="text-white font-bold bg-slate-800 px-2 py-0.5 rounded-md border border-slate-700">
            {primaryConstellation?.nameKo} ({primaryConstellation?.code})
          </span>
          <span className="text-slate-400 hidden sm:inline">
            화각: {cal?.radius ? `${(cal.radius * 2).toFixed(2)}°` : 'N/A'} (RA: {degToRA_HMS(centerRa)}, Dec: {degToDec_DMS(centerDec)})
          </span>
        </div>

        <div className="flex items-center space-x-3 text-[11px] text-slate-400">
          <span className="hidden md:inline">💡 마우스 드래그로 성도 자유 이동 / 휠로 줌 조절</span>
          <div className="flex items-center space-x-2">
            <span className="inline-flex items-center space-x-1">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-400 inline-block" />
              <span className="text-sky-300">별자리 선</span>
            </span>
            <span className="inline-flex items-center space-x-1">
              <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
              <span className="text-amber-300">주요 별</span>
            </span>
            <span className="inline-flex items-center space-x-1">
              <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
              <span className="text-rose-300">사진 화각</span>
            </span>
          </div>
        </div>
      </div>

      {/* Star Chart SVG Canvas */}
      <div className="relative bg-slate-950 rounded-2xl border border-slate-800/90 overflow-hidden shadow-2xl flex-1 flex flex-col min-h-[380px] lg:min-h-[460px]">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className={`w-full flex-1 select-none block cursor-grab active:cursor-grabbing ${
            isFullscreen ? 'h-full' : 'h-[380px] lg:h-[460px]'
          }`}
          onMouseMove={handleMouseMove}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={() => {
            isDraggingRef.current = false;
            setHoveredCoords(null);
            setHoveredConstellation(null);
            setHoveredStar(null);
          }}
          onWheel={handleWheel}
        >
          <defs>
            {/* Background Theme Gradients */}
            <radialGradient id="sky-gradient-navy" cx="50%" cy="50%" r="60%">
              <stop offset="0%" stopColor="#0b1329" />
              <stop offset="60%" stopColor="#060a17" />
              <stop offset="100%" stopColor="#02040a" />
            </radialGradient>
            <radialGradient id="sky-gradient-black" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#050505" />
              <stop offset="100%" stopColor="#000000" />
            </radialGradient>
            <radialGradient id="sky-gradient-blueprint" cx="50%" cy="50%" r="60%">
              <stop offset="0%" stopColor="#082f49" />
              <stop offset="60%" stopColor="#0c1d37" />
              <stop offset="100%" stopColor="#030712" />
            </radialGradient>

            {/* Glowing filter for high-visibility constellation lines */}
            <filter id="line-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Intense glow for primary matched constellation and FOV */}
            <filter id="fov-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur1" />
              <feGaussianBlur in="SourceGraphic" stdDeviation="1.5" result="blur2" />
              <feMerge>
                <feMergeNode in="blur1" />
                <feMergeNode in="blur2" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Star radiant sparkle filter */}
            <filter id="star-sparkle" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Milky Way Nebula Gradient */}
            <linearGradient id="milkyway-grad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#6366f1" stopOpacity="0.25" />
              <stop offset="30%" stopColor="#a855f7" stopOpacity="0.35" />
              <stop offset="65%" stopColor="#38bdf8" stopOpacity="0.30" />
              <stop offset="100%" stopColor="#6366f1" stopOpacity="0.25" />
            </linearGradient>
          </defs>

          {/* Background Canvas */}
          <rect
            width={width}
            height={height}
            fill={
              theme === 'true_black'
                ? 'url(#sky-gradient-black)'
                : theme === 'blueprint'
                ? 'url(#sky-gradient-blueprint)'
                : 'url(#sky-gradient-navy)'
            }
          />

          {/* Milky Way Band */}
          {showMilkyWay && (
            <g className="milky-way-band" pointerEvents="none">
              <path
                d={milkyWayPath}
                fill="none"
                stroke="url(#milkyway-grad)"
                strokeWidth={chartMode === 'all_sky' ? 44 * zoomLevel : 80 * zoomLevel}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity="0.3"
                filter="url(#line-glow)"
              />
              <path
                d={milkyWayPath}
                fill="none"
                stroke="#c084fc"
                strokeWidth={chartMode === 'all_sky' ? 14 * zoomLevel : 30 * zoomLevel}
                strokeDasharray="4 6"
                opacity="0.2"
              />
            </g>
          )}

          {/* Celestial Coordinate Grid (RA & Dec) */}
          {showGrid && (
            <g className="celestial-grid" stroke="#475569" strokeWidth="0.8" strokeDasharray="3 3">
              {/* Dec Parallels (-60, -30, 0, +30, +60, +80, -80) */}
              {[-80, -60, -30, 0, 30, 60, 80].map((d) => {
                const y = decToY(d);
                if (y < 0 || y > height) return null;
                const isEquator = d === 0;

                return (
                  <g key={`dec-${d}`}>
                    <line
                      x1="0"
                      y1={y}
                      x2={width}
                      y2={y}
                      stroke={isEquator ? '#06b6d4' : '#475569'}
                      strokeWidth={isEquator ? '1.5' : '0.8'}
                      strokeDasharray={isEquator ? 'none' : '3 3'}
                      opacity={isEquator ? 0.9 : 0.6}
                    />
                    <text
                      x="10"
                      y={y - 4}
                      fill={isEquator ? '#22d3ee' : '#94a3b8'}
                      fontSize={isEquator ? '11' : '10'}
                      fontWeight={isEquator ? 'bold' : 'normal'}
                      fontFamily="monospace"
                      filter="drop-shadow(0 1px 2px rgba(0,0,0,0.8))"
                    >
                      {isEquator ? '적도 (Celestial Equator 0°)' : `${d > 0 ? '+' : ''}${d}°`}
                    </text>
                  </g>
                );
              })}

              {/* RA Meridians (Every 2 hours = 30°) */}
              {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((raDeg) => {
                const x = raToX(raDeg);
                if (x < 0 || x > width) return null;
                const h = Math.round(raDeg / 15);

                return (
                  <g key={`ra-${raDeg}`}>
                    <line x1={x} y1="0" x2={x} y2={height} opacity="0.6" />
                    <text
                      x={x + 4}
                      y={height - 10}
                      fill="#94a3b8"
                      fontSize="10"
                      fontFamily="monospace"
                      filter="drop-shadow(0 1px 2px rgba(0,0,0,0.8))"
                    >
                      {h}h
                    </text>
                  </g>
                );
              })}
            </g>
          )}

          {/* Constellation Stick-Figure Lines (별자리 선들) */}
          {lineStyle !== 'off' && (
            <g className="constellation-asterism-lines">
              {activeConstellations.map((figure) => {
                const isPrimary = primaryConstellation?.code === figure.code;
                const isMatched = data.matchedConstellations.some((m) => m.code === figure.code);
                const isHovered = hoveredConstellation?.code === figure.code || selectedConstCode === figure.code;

                return (
                  <g
                    key={`lines-${figure.code}`}
                    className="cursor-pointer"
                    onMouseEnter={() => setHoveredConstellation(figure)}
                    onClick={() => {
                      setSelectedConstCode(figure.code);
                      onSelectConstellation?.(figure.code);
                    }}
                  >
                    {figure.lines.map((lineCoords, idx) =>
                      renderConstellationLine(
                        lineCoords,
                        `${figure.code}-line-${idx}`,
                        isPrimary,
                        isMatched,
                        isHovered
                      )
                    )}
                  </g>
                );
              })}
            </g>
          )}

          {/* Bright Naked-Eye Stars (주요 밝은 별들) */}
          {showStars && (
            <g className="bright-stars-layer">
              {BRIGHT_STARS.map((star) => {
                const sx = raToX(star.raDeg);
                const sy = decToY(star.decDeg);

                // Skip if out of viewport
                if (sx < -20 || sx > width + 20 || sy < -20 || sy > height + 20) return null;

                // Magnitude based radius (Mag 0: 5px, Mag 1: 4.2px, Mag 2: 3.5px, Mag 3+: 2.8px)
                const baseRadius = Math.max(2.4, 5.2 - star.mag * 0.9);
                const isHovered = hoveredStar?.id === star.id;

                return (
                  <g
                    key={star.id}
                    className="cursor-pointer group"
                    onMouseEnter={() => setHoveredStar(star)}
                    onMouseLeave={() => setHoveredStar(null)}
                  >
                    {/* Outer stellar glow halo */}
                    <circle
                      cx={sx}
                      cy={sy}
                      r={baseRadius * 2.4}
                      fill={star.color || '#bae6fd'}
                      opacity={isHovered ? 0.6 : 0.25}
                      filter="url(#star-sparkle)"
                    />

                    {/* Star core dot */}
                    <circle
                      cx={sx}
                      cy={sy}
                      r={baseRadius}
                      fill={star.color || '#ffffff'}
                      stroke="#ffffff"
                      strokeWidth={isHovered ? '2' : '0.5'}
                    />

                    {/* Star Name Label */}
                    {showStarNames && (
                      <text
                        x={sx + baseRadius + 4}
                        y={sy + 3}
                        fill={isHovered ? '#fde047' : '#e2e8f0'}
                        fontSize="10"
                        fontWeight={star.mag < 1.5 ? 'bold' : 'normal'}
                        paintOrder="stroke"
                        stroke="#090d16"
                        strokeWidth="2.5"
                        strokeLinejoin="round"
                        className="transition-colors"
                      >
                        {star.nameKo}
                      </text>
                    )}
                  </g>
                );
              })}
            </g>
          )}

          {/* Constellation Centers & Prominent Name Labels */}
          {showConstellationNames && (
            <g className="constellation-labels-layer">
              {Object.entries(IAU_CONSTELLATIONS).map(([code, info]) => {
                const cx = raToX(info.raHours * 15);
                const cy = decToY(info.decDeg);

                if (cx < -40 || cx > width + 40 || cy < -40 || cy > height + 40) return null;

                const isMatched = data.matchedConstellations.some((m) => m.code === code);
                const isPrimary = primaryConstellation?.code === code;
                const isHovered = hoveredConstellation?.code === code || selectedConstCode === code;

                return (
                  <g
                    key={`label-${code}`}
                    className="cursor-pointer group"
                    onClick={() => {
                      setSelectedConstCode(code);
                      onSelectConstellation?.(code);
                    }}
                    onMouseEnter={() => {
                      const fig = CONSTELLATION_FIGURES.find((f) => f.code === code);
                      if (fig) setHoveredConstellation(fig);
                    }}
                  >
                    {/* Glowing Aura if matched or hovered */}
                    {(isMatched || isHovered) && (
                      <circle
                        cx={cx}
                        cy={cy}
                        r={isPrimary ? '36' : '24'}
                        fill={isPrimary ? '#38bdf820' : isHovered ? '#facc1525' : '#818cf815'}
                        stroke={isPrimary ? '#38bdf8' : isHovered ? '#facc15' : '#818cf8'}
                        strokeWidth={isPrimary ? '1.8' : '1.2'}
                        strokeDasharray={isPrimary ? '4 2' : 'none'}
                        filter="url(#fov-glow)"
                      />
                    )}

                    {/* Constellation Center Marker */}
                    <circle
                      cx={cx}
                      cy={cy}
                      r={isPrimary ? 5 : isHovered ? 4.5 : isMatched ? 4 : 2.5}
                      fill={isPrimary ? '#38bdf8' : isHovered ? '#facc15' : isMatched ? '#c084fc' : '#94a3b8'}
                      stroke="#ffffff"
                      strokeWidth={isPrimary || isMatched ? '1.2' : '0.5'}
                    />

                    {/* High-Contrast Bold Text Label */}
                    <text
                      x={cx + 7}
                      y={cy + 4}
                      fill={
                        isPrimary
                          ? '#38bdf8'
                          : isHovered
                          ? '#facc15'
                          : isMatched
                          ? '#e0e7ff'
                          : '#cbd5e1'
                      }
                      fontSize={isPrimary ? '13' : isMatched ? '11.5' : '10'}
                      fontWeight={isPrimary || isMatched || isHovered ? 'bold' : '600'}
                      paintOrder="stroke"
                      stroke="#090d16"
                      strokeWidth="3.2"
                      strokeLinejoin="round"
                      className="transition-colors group-hover:fill-sky-300"
                    >
                      {info.nameKo} ({code})
                    </text>
                  </g>
                );
              })}
            </g>
          )}

          {/* Photographed Field of View (FOV) Box Plotted on Star Chart */}
          <g className="photo-fov-marker">
            {/* FOV Polygon outline */}
            <polygon
              points={fovPolygonPoints}
              fill="#38bdf830"
              stroke="#38bdf8"
              strokeWidth="2.5"
              filter="url(#fov-glow)"
            />

            {/* Corner Crosshairs for Photographic Precision */}
            {fovCorners.map((corner, i) => {
              const x = raToX(corner.ra);
              const y = decToY(corner.dec);
              return (
                <circle
                  key={`corner-${i}`}
                  cx={x}
                  cy={y}
                  r="3.5"
                  fill="#ffffff"
                  stroke="#0284c7"
                  strokeWidth="1.5"
                />
              );
            })}

            {/* Photo Center Reticle */}
            <circle
              cx={raToX(centerRa)}
              cy={decToY(centerDec)}
              r="6"
              fill="#f43f5e"
              stroke="#ffffff"
              strokeWidth="2"
              filter="url(#fov-glow)"
            />
            <circle
              cx={raToX(centerRa)}
              cy={decToY(centerDec)}
              r="14"
              fill="none"
              stroke="#f43f5e"
              strokeWidth="1.2"
              strokeDasharray="3 3"
            />

            {/* Connecting Guide Line to Primary Constellation */}
            {primaryConstellation && (
              <line
                x1={raToX(centerRa)}
                y1={decToY(centerDec)}
                x2={raToX(IAU_CONSTELLATIONS[primaryConstellation.code]?.raHours * 15 || centerRa)}
                y2={decToY(IAU_CONSTELLATIONS[primaryConstellation.code]?.decDeg || centerDec)}
                stroke="#38bdf8"
                strokeWidth="2"
                strokeDasharray="4 3"
                opacity="0.9"
                filter="url(#line-glow)"
              />
            )}

            {/* High-Contrast FOV Callout Label */}
            <g
              transform={`translate(${raToX(centerRa) + 12}, ${decToY(centerDec) - 12})`}
              className="pointer-events-none select-none"
            >
              <rect
                x="0"
                y="-18"
                width="165"
                height="26"
                rx="6"
                fill="#0f172ae8"
                stroke="#38bdf8"
                strokeWidth="1.2"
                filter="drop-shadow(0 4px 6px rgba(0,0,0,0.6))"
              />
              <text x="8" y="-1" fill="#38bdf8" fontSize="11" fontWeight="bold">
                🎯 사진 화각 (FOV {((widthArcsec / 3600)).toFixed(2)}° × {((heightArcsec / 3600)).toFixed(2)}°)
              </text>
            </g>
          </g>
        </svg>

        {/* Live Coordinate Readout under Mouse */}
        <div className="absolute top-3 left-3 bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-xl px-3 py-1.5 text-[11px] font-mono text-slate-200 flex items-center space-x-2.5 shadow-lg">
          <Compass className="w-4 h-4 text-sky-400" />
          <span>
            {hoveredCoords
              ? `마우스: RA ${hoveredCoords.ra} | Dec ${hoveredCoords.dec}`
              : `사진 중심: RA ${degToRA_HMS(centerRa)} | Dec ${degToDec_DMS(centerDec)}`}
          </span>
        </div>

        {/* Interactive Hover Card for Constellation or Star */}
        {(hoveredConstellation || hoveredStar) && (
          <div className="absolute bottom-3 left-3 bg-slate-900/95 backdrop-blur-md border border-sky-500/60 rounded-xl px-3.5 py-2 shadow-2xl z-30 max-w-sm pointer-events-none">
            {hoveredStar ? (
              <div>
                <div className="flex items-center space-x-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span className="font-bold text-white text-xs">{hoveredStar.nameKo} ({hoveredStar.nameEn})</span>
                  <span className="text-[10px] font-mono px-1 rounded bg-slate-800 text-amber-300">{hoveredStar.bayer}</span>
                </div>
                <div className="text-[11px] text-slate-300 mt-1 flex space-x-3">
                  <span>밝기: <strong>{hoveredStar.mag}등급</strong></span>
                  <span>소속: <strong>{hoveredStar.constellation}자리</strong></span>
                  <span>RA: {degToRA_HMS(hoveredStar.raDeg)}</span>
                </div>
              </div>
            ) : hoveredConstellation ? (
              <div>
                <div className="flex items-center space-x-1.5">
                  <Globe className="w-3.5 h-3.5 text-sky-400" />
                  <span className="font-bold text-white text-xs">
                    {hoveredConstellation.nameKo} ({hoveredConstellation.nameEn})
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-sky-950 text-sky-300 border border-sky-800">
                    {hoveredConstellation.code}
                  </span>
                </div>
                <div className="text-[11px] text-slate-300 mt-1 flex space-x-3">
                  <span>성족: {hoveredConstellation.family}</span>
                  <span>별자리 선: {hoveredConstellation.lines.length}개 세그먼트</span>
                </div>
              </div>
            ) : null}
          </div>
        )}

        {/* Mode badge & view indicator */}
        <div className="absolute top-3 right-3 flex items-center space-x-2">
          <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-xl px-3 py-1.5 text-[11px] text-slate-300 shadow-lg flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>
              {chartMode === 'focused'
                ? `화각 확대 (Zoom ${zoomLevel}x, Span ${fovSpan.toFixed(0)}°)`
                : `전천 투영 (All-Sky 360°, J2000)`}
            </span>
          </div>
        </div>
      </div>

      {/* Matched Constellations Information Cards */}
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {data.matchedConstellations.map((constellation, idx) => {
          const info = IAU_CONSTELLATIONS[constellation.code];
          return (
            <div
              key={`card-${constellation.code}-${idx}`}
              onClick={() => {
                setSelectedConstCode(constellation.code);
                onSelectConstellation?.(constellation.code);
              }}
              className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                constellation.isPrimary
                  ? 'bg-gradient-to-br from-sky-950/60 via-slate-900 to-indigo-950/60 border-sky-400/60 shadow-lg shadow-sky-500/10 hover:border-sky-300'
                  : 'bg-slate-800/40 border-slate-800 hover:border-slate-700 hover:bg-slate-800/70'
              }`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`text-xs uppercase font-bold tracking-wider ${
                    constellation.isPrimary ? 'text-sky-300' : 'text-slate-400'
                  }`}
                >
                  {constellation.isPrimary ? '🎯 주요 매칭 별자리' : '경계 인접 별자리'}
                </span>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-800 text-sky-300 border border-slate-700">
                  {constellation.code}
                </span>
              </div>
              <h4 className="text-base font-bold text-white mt-1.5 flex items-center space-x-1.5">
                <span>{constellation.nameKo}</span>
                <span className="text-xs text-slate-400 font-normal">({constellation.nameEn})</span>
              </h4>
              <div className="mt-2.5 text-xs text-slate-300 space-y-1.5">
                <p className="flex justify-between">
                  <span className="text-slate-400">대표 밝은 별:</span>
                  <span className="font-semibold text-amber-300">{constellation.brightestStar}</span>
                </p>
                <p className="flex justify-between">
                  <span className="text-slate-400">성족 분류:</span>
                  <span className="text-slate-300">{constellation.family}</span>
                </p>
                <p className="flex justify-between">
                  <span className="text-slate-400">화각 내 검출 점수:</span>
                  <span className="text-sky-300 font-bold">{constellation.starsCountInField} pts</span>
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* CDS Aladin Lite Real-time Survey Inspector Modal */}
      <AladinSurveyModal
        isOpen={isAladinOpen}
        onClose={() => setIsAladinOpen(false)}
        data={data}
      />
    </div>
  );
};
