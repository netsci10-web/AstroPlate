import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import {
  Compass,
  Globe,
  Sparkles,
  ExternalLink,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Eye,
  EyeOff,
  Sliders,
  Maximize2,
  Minimize2,
  Crosshair,
  ChevronDown,
  Search,
  Filter,
  Tag,
  GitCommit,
  Check,
} from 'lucide-react';
import { SolvedAstroData } from '../types/astronomy';
import { degToRA_HMS, degToDec_DMS, computeFieldCorners, angularSeparation as angularSeparationDeg } from '../utils/coordinateMath';
import { IAU_CONSTELLATIONS } from '../utils/constellations';
import { AladinSurveyModal } from './AladinSurveyModal';
import {
  BRIGHT_STARS,
  CONSTELLATION_FIGURES,
  MILKY_WAY_COORDINATES,
  DEEP_SKY_OBJECTS,
  CatalogStar,
  ConstellationFigure,
  DeepSkyCatalogObject,
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
  const [showConstellationLines, setShowConstellationLines] = useState(true);
  const [lineStyle, setLineStyle] = useState<LineBrightness>('glow');
  const [lineWidth, setLineWidth] = useState<'thin' | 'normal' | 'thick'>('thin');
  const [showConstellationNames, setShowConstellationNames] = useState(true);
  const [constellationFilter, setConstellationFilter] = useState<ConstellationFilter>('all');
  const [showStarNames, setShowStarNames] = useState(true);
  const [showStars, setShowStars] = useState(true);
  const [showDeepSkyObjects, setShowDeepSkyObjects] = useState(true);
  const [showDsoLabels, setShowDsoLabels] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [showMilkyWay, setShowMilkyWay] = useState(true);
  const [theme, setTheme] = useState<ChartTheme>('deep_navy');
  const [showControlsMenu, setShowControlsMenu] = useState(false);

  // Per-constellation visibility state (allows hiding specific constellation lines and/or labels)
  const [hiddenConstellationLines, setHiddenConstellationLines] = useState<Set<string>>(new Set());
  const [hiddenConstellationLabels, setHiddenConstellationLabels] = useState<Set<string>>(new Set());
  const [showConstellationSelector, setShowConstellationSelector] = useState(false);
  const [constellationSearchQuery, setConstellationSearchQuery] = useState('');

  // Hover & selection inspection
  const [hoveredCoords, setHoveredCoords] = useState<{ ra: string; dec: string; rawRa: number; rawDec: number } | null>(null);
  const [hoveredConstellation, setHoveredConstellation] = useState<ConstellationFigure | null>(null);
  const [hoveredStar, setHoveredStar] = useState<CatalogStar | null>(null);
  const [hoveredDso, setHoveredDso] = useState<DeepSkyCatalogObject | null>(null);
  const [selectedConstCode, setSelectedConstCode] = useState<string | null>(null);

  const cal = data.calibration;
  const centerRa = cal?.ra || 0;
  const centerDec = cal?.dec || 0;
  const fieldRadiusDeg = cal?.radius || 1.5;
  const widthArcsec = cal?.width_arcsec || (cal?.radius ? cal.radius * 7200 : 3600);
  const heightArcsec = cal?.height_arcsec || widthArcsec;
  const orientation = cal?.orientation || 0;
  const parity = cal?.parity || 1.0;

  // Primary matched constellation
  const primaryConstellation = data.matchedConstellations[0];

  // All available constellation codes (union of CONSTELLATION_FIGURES and IAU_CONSTELLATIONS)
  const allConstellationCodes = useMemo(() => {
    const codes = new Set<string>();
    CONSTELLATION_FIGURES.forEach((f) => codes.add(f.code));
    Object.keys(IAU_CONSTELLATIONS).forEach((c) => codes.add(c));
    return Array.from(codes);
  }, []);

  // Per-constellation visibility helpers
  const isConstellationLineVisible = useCallback(
    (code: string) => {
      if (!showConstellationLines || lineStyle === 'off') return false;
      if (constellationFilter === 'matched_only' && !data.matchedConstellations.some((m) => m.code === code)) {
        return false;
      }
      return !hiddenConstellationLines.has(code);
    },
    [showConstellationLines, lineStyle, constellationFilter, data.matchedConstellations, hiddenConstellationLines]
  );

  const isConstellationLabelVisible = useCallback(
    (code: string) => {
      if (!showConstellationNames) return false;
      if (constellationFilter === 'matched_only' && !data.matchedConstellations.some((m) => m.code === code)) {
        return false;
      }
      return !hiddenConstellationLabels.has(code);
    },
    [showConstellationNames, constellationFilter, data.matchedConstellations, hiddenConstellationLabels]
  );

  const isConstellationVisible = useCallback(
    (code: string) => {
      return !hiddenConstellationLines.has(code) || !hiddenConstellationLabels.has(code);
    },
    [hiddenConstellationLines, hiddenConstellationLabels]
  );

  const toggleSingleConstellation = useCallback((code: string) => {
    const currentlyHidden = hiddenConstellationLines.has(code) && hiddenConstellationLabels.has(code);
    setHiddenConstellationLines((prev) => {
      const next = new Set(prev);
      if (currentlyHidden) next.delete(code);
      else next.add(code);
      return next;
    });
    setHiddenConstellationLabels((prev) => {
      const next = new Set(prev);
      if (currentlyHidden) next.delete(code);
      else next.add(code);
      return next;
    });
  }, [hiddenConstellationLines, hiddenConstellationLabels]);

  const toggleSingleConstellationLine = useCallback((code: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setHiddenConstellationLines((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }, []);

  const toggleSingleConstellationLabel = useCallback((code: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setHiddenConstellationLabels((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }, []);

  // Presets for quick DSO / Constellation filtering
  const handleShowAllConstellations = () => {
    setShowConstellationLines(true);
    if (lineStyle === 'off') setLineStyle('glow');
    setShowConstellationNames(true);
    setConstellationFilter('all');
    setHiddenConstellationLines(new Set());
    setHiddenConstellationLabels(new Set());
  };

  const handleHideAllConstellationsForDso = () => {
    setShowConstellationLines(false);
    setShowConstellationNames(false);
    setShowDeepSkyObjects(true);
    setShowDsoLabels(true);
  };

  const handleShowOnlyMatchedConstellations = () => {
    setShowConstellationLines(true);
    if (lineStyle === 'off') setLineStyle('glow');
    setShowConstellationNames(true);
    const matchedCodes = new Set(data.matchedConstellations.map((m) => m.code));
    const toHide = allConstellationCodes.filter((c) => !matchedCodes.has(c));
    setHiddenConstellationLines(new Set(toHide));
    setHiddenConstellationLabels(new Set(toHide));
  };

  const handleHideMatchedConstellationsForFovDso = () => {
    setShowConstellationLines(true);
    if (lineStyle === 'off') setLineStyle('glow');
    setShowConstellationNames(true);
    setShowDeepSkyObjects(true);
    setShowDsoLabels(true);
    const matchedCodes = data.matchedConstellations.map((m) => m.code);
    setHiddenConstellationLines(new Set(matchedCodes));
    setHiddenConstellationLabels(new Set(matchedCodes));
  };

  const isDsoCleanModeActive = !showConstellationLines && !showConstellationNames && showDeepSkyObjects;

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

  // Line stroke width based on setting
  const strokeWidthPx = lineWidth === 'thick' ? 2.6 : lineWidth === 'normal' ? 1.8 : 1.2;

  // Filtered constellations for rendering lines
  const activeConstellations = useMemo(() => {
    return CONSTELLATION_FIGURES.filter((fig) => isConstellationLineVisible(fig.code));
  }, [isConstellationLineVisible]);

  // Combined list of constellations for the per-constellation selector panel
  const selectorConstellationList = useMemo(() => {
    const matchedCodes = new Set(data.matchedConstellations.map((m) => m.code));
    const items = CONSTELLATION_FIGURES.map((fig) => {
      const dsoList = DEEP_SKY_OBJECTS.filter((d) => d.constellation === fig.code);
      return {
        code: fig.code,
        nameKo: fig.nameKo,
        nameEn: fig.nameEn,
        family: fig.family,
        isMatched: matchedCodes.has(fig.code),
        isPrimary: primaryConstellation?.code === fig.code,
        dsoCount: dsoList.length,
        dsoNames: dsoList.map((d) => d.catalogId).join(', '),
      };
    });

    // Sort: primary first, then matched, then by DSO count descending, then alphabetically
    items.sort((a, b) => {
      if (a.isPrimary !== b.isPrimary) return a.isPrimary ? -1 : 1;
      if (a.isMatched !== b.isMatched) return a.isMatched ? -1 : 1;
      if (b.dsoCount !== a.dsoCount) return b.dsoCount - a.dsoCount;
      return a.nameKo.localeCompare(b.nameKo, 'ko');
    });

    if (!constellationSearchQuery.trim()) return items;
    const q = constellationSearchQuery.trim().toLowerCase();
    return items.filter(
      (item) =>
        item.nameKo.toLowerCase().includes(q) ||
        item.nameEn.toLowerCase().includes(q) ||
        item.code.toLowerCase().includes(q) ||
        item.dsoNames.toLowerCase().includes(q)
    );
  }, [data.matchedConstellations, primaryConstellation, constellationSearchQuery]);

  // Count of visible constellations
  const visibleConstellationCount = useMemo(() => {
    if (!showConstellationLines && !showConstellationNames) return 0;
    return CONSTELLATION_FIGURES.filter(
      (f) => isConstellationLineVisible(f.code) || isConstellationLabelVisible(f.code)
    ).length;
  }, [showConstellationLines, showConstellationNames, isConstellationLineVisible, isConstellationLabelVisible]);

  // Milky way SVG path generator
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
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3 pb-3 border-b border-slate-800">
        <div>
          <div className="flex items-center space-x-2">
            <Globe className="w-5 h-5 text-sky-400 animate-pulse" />
            <h3 className="text-base font-bold text-white tracking-tight flex items-center space-x-2">
              <span>실시간 전천 성도 (Celestial Star Chart)</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-sky-950 text-sky-300 border border-sky-800 font-medium">
                고선명 별자리 & 딥스카이 성도
              </span>
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            별자리 선·라벨 개별 표시/숨김 및 메시에·NGC·IC 딥스카이 천체(DSO) 시인성 제어 지원
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

          {/* Direct Quick Visibility Toggles for Lines, Labels, DSOs, and Per-Constellation Selector */}
          <div className="bg-slate-950 rounded-xl p-1 flex flex-wrap items-center gap-1 border border-slate-800">
            {/* 1. Constellation Lines Toggle */}
            <button
              type="button"
              onClick={() => {
                const next = !(showConstellationLines && lineStyle !== 'off');
                setShowConstellationLines(next);
                if (next && lineStyle === 'off') setLineStyle('glow');
              }}
              title="별자리 선(Asterism Lines) 전체 표시/숨김 토글"
              className={`text-xs px-2.5 py-1.5 rounded-lg font-medium transition-all flex items-center space-x-1.5 ${
                showConstellationLines && lineStyle !== 'off'
                  ? 'bg-sky-950/90 text-sky-300 border border-sky-700/70 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 border border-transparent'
              }`}
            >
              <GitCommit className="w-3.5 h-3.5" />
              <span>별자리 선</span>
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  showConstellationLines && lineStyle !== 'off' ? 'bg-sky-400' : 'bg-slate-600'
                }`}
              />
            </button>

            {/* 2. Constellation Labels Toggle */}
            <button
              type="button"
              onClick={() => setShowConstellationNames((v) => !v)}
              title="별자리 이름 라벨(Constellation Labels) 전체 표시/숨김 토글"
              className={`text-xs px-2.5 py-1.5 rounded-lg font-medium transition-all flex items-center space-x-1.5 ${
                showConstellationNames
                  ? 'bg-indigo-950/90 text-indigo-300 border border-indigo-700/70 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 border border-transparent'
              }`}
            >
              <Tag className="w-3.5 h-3.5" />
              <span>별자리 라벨</span>
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  showConstellationNames ? 'bg-indigo-400' : 'bg-slate-600'
                }`}
              />
            </button>

            {/* 3. Deep Sky Objects (DSO) Toggle */}
            <button
              type="button"
              onClick={() => setShowDeepSkyObjects((v) => !v)}
              title="딥스카이 천체(성운·은하·성단) 마커 및 라벨 표시/숨김"
              className={`text-xs px-2.5 py-1.5 rounded-lg font-medium transition-all flex items-center space-x-1.5 ${
                showDeepSkyObjects
                  ? 'bg-emerald-950/90 text-emerald-300 border border-emerald-700/70 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 border border-transparent'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>딥스카이(DSO)</span>
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  showDeepSkyObjects ? 'bg-emerald-400' : 'bg-slate-600'
                }`}
              />
            </button>

            {/* 4. DSO Clean View Quick Toggle (Hides constellation lines/labels for unobstructed DSO view) */}
            <button
              type="button"
              onClick={() => {
                if (isDsoCleanModeActive) {
                  handleShowAllConstellations();
                } else {
                  handleHideAllConstellationsForDso();
                }
              }}
              title="별자리 선과 라벨을 일시 숨기고 딥스카이 천체(DSO)만 선명하게 관측"
              className={`text-xs px-2.5 py-1.5 rounded-lg font-semibold transition-all flex items-center space-x-1.5 ${
                isDsoCleanModeActive
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/60 shadow-sm'
                  : 'text-slate-400 hover:text-amber-300 border border-transparent'
              }`}
            >
              {isDsoCleanModeActive ? <EyeOff className="w-3.5 h-3.5 text-amber-400" /> : <Eye className="w-3.5 h-3.5" />}
              <span>DSO 클린 뷰</span>
            </button>

            {/* 5. Specific Constellation Filter Drawer Toggle */}
            <button
              type="button"
              onClick={() => setShowConstellationSelector((v) => !v)}
              title="특정 별자리만 선택적으로 표시하거나 숨겨 딥스카이 천체 시야 확보"
              className={`text-xs px-2.5 py-1.5 rounded-lg font-semibold transition-all flex items-center space-x-1.5 ${
                showConstellationSelector || hiddenConstellationLines.size > 0 || hiddenConstellationLabels.size > 0
                  ? 'bg-purple-950/90 text-purple-200 border border-purple-600/70 shadow-sm'
                  : 'text-slate-300 hover:text-white bg-slate-900 border border-slate-800'
              }`}
            >
              <Filter className="w-3.5 h-3.5 text-purple-400" />
              <span>별자리 선택</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-950 text-purple-300 border border-purple-800/60">
                {visibleConstellationCount}/{CONSTELLATION_FIGURES.length}
              </span>
            </button>
          </div>

          {/* Quick Visibility Settings Menu Button */}
          <div className="relative">
            <button
              onClick={() => setShowControlsMenu(!showControlsMenu)}
              className="text-xs px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center space-x-1.5 transition-all shadow-sm"
              title="별자리 선, 밝기, 이름, 별 표시 상세 설정"
            >
              <Sliders className="w-3.5 h-3.5 text-sky-400" />
              <span>성도 세부 설정</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {/* Dropdown Menu for Visual Clarity */}
            {showControlsMenu && (
              <div className="absolute right-0 mt-2 w-80 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-4 z-40 space-y-3.5 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <span className="font-bold text-white flex items-center space-x-1.5">
                    <Eye className="w-4 h-4 text-sky-400" />
                    <span>별자리 및 딥스카이 시인성 설정</span>
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
                      { id: 'subtle', label: '🔹 은은한 보라 (DSO 강조)' },
                      { id: 'off', label: '❌ 별자리 선 숨김' },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() => {
                          setLineStyle(opt.id as LineBrightness);
                          setShowConstellationLines(opt.id !== 'off');
                        }}
                        className={`px-2 py-1.5 rounded-lg text-left text-[11px] font-medium transition-all ${
                          (showConstellationLines ? lineStyle : 'off') === opt.id
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
                      { id: 'thin', label: '보통 (1.2px)' },
                      { id: 'normal', label: '선명 (1.8px)' },
                      { id: 'thick', label: '굵게 (2.6px)' },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() => setLineWidth(opt.id as 'thin' | 'normal' | 'thick')}
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

                {/* 3. Constellation Scope Filter */}
                <div className="space-y-1.5">
                  <label className="text-slate-300 font-medium block">별자리 표시 범위</label>
                  <div className="grid grid-cols-2 gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
                    <button
                      type="button"
                      onClick={() => setConstellationFilter('all')}
                      className={`py-1.5 rounded-lg text-center text-[11px] font-medium transition-all ${
                        constellationFilter === 'all'
                          ? 'bg-sky-600 text-white shadow'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      전천 별자리 (선택 반영)
                    </button>
                    <button
                      type="button"
                      onClick={() => setConstellationFilter('matched_only')}
                      className={`py-1.5 rounded-lg text-center text-[11px] font-medium transition-all ${
                        constellationFilter === 'matched_only'
                          ? 'bg-sky-600 text-white shadow'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      사진 매칭 별자리만
                    </button>
                  </div>
                </div>

                {/* 4. Layer Visibility Checkboxes */}
                <div className="space-y-2 pt-1 border-t border-slate-800">
                  <label className="flex items-center justify-between text-slate-300 cursor-pointer">
                    <span>별자리 선 (Asterism Lines) 표시</span>
                    <input
                      type="checkbox"
                      checked={showConstellationLines && lineStyle !== 'off'}
                      onChange={(e) => {
                        setShowConstellationLines(e.target.checked);
                        if (e.target.checked && lineStyle === 'off') setLineStyle('glow');
                      }}
                      className="rounded bg-slate-800 border-slate-700 text-sky-500 focus:ring-0"
                    />
                  </label>

                  <label className="flex items-center justify-between text-slate-300 cursor-pointer">
                    <span>별자리 이름 라벨 (한글/IAU) 표시</span>
                    <input
                      type="checkbox"
                      checked={showConstellationNames}
                      onChange={(e) => setShowConstellationNames(e.target.checked)}
                      className="rounded bg-slate-800 border-slate-700 text-sky-500 focus:ring-0"
                    />
                  </label>

                  <label className="flex items-center justify-between text-emerald-300 font-medium cursor-pointer">
                    <span>딥스카이 천체 (M/NGC/IC) 마커 표시</span>
                    <input
                      type="checkbox"
                      checked={showDeepSkyObjects}
                      onChange={(e) => setShowDeepSkyObjects(e.target.checked)}
                      className="rounded bg-slate-800 border-slate-700 text-emerald-500 focus:ring-0"
                    />
                  </label>

                  {showDeepSkyObjects && (
                    <label className="flex items-center justify-between text-slate-300 pl-3 cursor-pointer">
                      <span>↳ 딥스카이 천체 이름 라벨 표시</span>
                      <input
                        type="checkbox"
                        checked={showDsoLabels}
                        onChange={(e) => setShowDsoLabels(e.target.checked)}
                        className="rounded bg-slate-800 border-slate-700 text-emerald-500 focus:ring-0"
                      />
                    </label>
                  )}

                  <label className="flex items-center justify-between text-slate-300 cursor-pointer">
                    <span>주요 밝은 별 (Bright Stars) 표시</span>
                    <input
                      type="checkbox"
                      checked={showStars}
                      onChange={(e) => setShowStars(e.target.checked)}
                      className="rounded bg-slate-800 border-slate-700 text-sky-500 focus:ring-0"
                    />
                  </label>

                  {showStars && (
                    <label className="flex items-center justify-between text-slate-300 pl-3 cursor-pointer">
                      <span>↳ 주요 별 이름 라벨 표시</span>
                      <input
                        type="checkbox"
                        checked={showStarNames}
                        onChange={(e) => setShowStarNames(e.target.checked)}
                        className="rounded bg-slate-800 border-slate-700 text-sky-500 focus:ring-0"
                      />
                    </label>
                  )}

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

                {/* 5. Background Theme */}
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

      {/* Collapsible Per-Constellation Visibility Selector Drawer */}
      {showConstellationSelector && (
        <div className="mb-3 p-3.5 rounded-2xl bg-slate-950/90 border border-slate-800 space-y-3 animate-in fade-in duration-200">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800/80">
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-purple-400" />
              <span className="text-xs font-bold text-white">
                개별 별자리 선 · 라벨 표시/숨김 제어 (딥스카이 천체 시야 확보)
              </span>
              <span className="text-[11px] text-slate-400 hidden sm:inline">
                — 특정 별자리의 선이나 라벨이 성운·은하·성단을 가릴 때 개별적으로 켜고 끌 수 있습니다.
              </span>
            </div>

            {/* Preset Action Buttons */}
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={handleShowAllConstellations}
                className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
              >
                전체 표시
              </button>
              <button
                type="button"
                onClick={handleShowOnlyMatchedConstellations}
                className="text-[11px] px-2.5 py-1 rounded-lg bg-sky-950/80 hover:bg-sky-900 text-sky-300 border border-sky-800/70 transition-colors"
              >
                매칭 별자리만 표시
              </button>
              <button
                type="button"
                onClick={handleHideMatchedConstellationsForFovDso}
                className="text-[11px] px-2.5 py-1 rounded-lg bg-amber-950/80 hover:bg-amber-900 text-amber-300 border border-amber-800/70 transition-colors"
                title="사진 화각 내부의 딥스카이 천체를 가리는 매칭 별자리 선/라벨만 숨김"
              >
                화각 내 별자리만 숨김 (DSO 강조)
              </button>
              <button
                type="button"
                onClick={handleHideAllConstellationsForDso}
                className="text-[11px] px-2.5 py-1 rounded-lg bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-800/70 transition-colors"
              >
                전체 별자리 숨김 (DSO 전용)
              </button>
            </div>
          </div>

          {/* Search & Matched Constellation Quick Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="relative flex-1 min-w-[220px] max-w-xs">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={constellationSearchQuery}
                onChange={(e) => setConstellationSearchQuery(e.target.value)}
                placeholder="별자리명(오리온, Ori) 또는 DSO(M42, M31) 검색..."
                className="w-full bg-slate-900 border border-slate-800 focus:border-purple-500 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center space-x-3 text-[11px] text-slate-400">
              <span>
                현재 표시 중: <strong className="text-sky-300">{visibleConstellationCount}</strong> / {CONSTELLATION_FIGURES.length}개 별자리
              </span>
              {(hiddenConstellationLines.size > 0 || hiddenConstellationLabels.size > 0) && (
                <button
                  type="button"
                  onClick={() => {
                    setHiddenConstellationLines(new Set());
                    setHiddenConstellationLabels(new Set());
                  }}
                  className="text-purple-300 hover:text-purple-200 underline"
                >
                  개별 숨김 초기화
                </button>
              )}
            </div>
          </div>

          {/* Constellation Toggle Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 max-h-48 overflow-y-auto pr-1">
            {selectorConstellationList.map((item) => {
              const lineOn = isConstellationLineVisible(item.code);
              const labelOn = isConstellationLabelVisible(item.code);
              const anyOn = lineOn || labelOn;

              return (
                <div
                  key={`selector-${item.code}`}
                  onClick={() => toggleSingleConstellation(item.code)}
                  className={`p-2 rounded-xl border text-xs cursor-pointer transition-all flex flex-col justify-between ${
                    anyOn
                      ? item.isPrimary
                        ? 'bg-sky-950/60 border-sky-500/70 text-white shadow-sm'
                        : item.isMatched
                        ? 'bg-indigo-950/50 border-indigo-500/60 text-slate-100'
                        : 'bg-slate-900/90 border-slate-800 text-slate-200 hover:border-slate-700'
                      : 'bg-slate-950/50 border-slate-800/50 text-slate-500 opacity-65 hover:opacity-100'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center space-x-1.5 truncate">
                      {anyOn ? (
                        <Eye className={`w-3.5 h-3.5 shrink-0 ${item.isPrimary ? 'text-sky-400' : 'text-emerald-400'}`} />
                      ) : (
                        <EyeOff className="w-3.5 h-3.5 shrink-0 text-slate-500" />
                      )}
                      <span className="font-bold truncate">{item.nameKo}</span>
                    </div>
                    <span className="text-[10px] font-mono px-1 rounded bg-slate-950 text-slate-400 border border-slate-800 shrink-0">
                      {item.code}
                    </span>
                  </div>

                  {/* DSOs in this constellation + individual Line / Label mini-toggles */}
                  <div className="mt-2 flex items-center justify-between gap-1 pt-1.5 border-t border-slate-800/60">
                    <span
                      className="text-[10px] text-emerald-400/90 truncate max-w-[90px]"
                      title={item.dsoNames ? `주요 DSO: ${item.dsoNames}` : '주요 DSO 없음'}
                    >
                      {item.dsoCount > 0 ? `✦ ${item.dsoNames}` : '일반 성야'}
                    </span>
                    <div className="flex items-center space-x-1 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => toggleSingleConstellationLine(item.code, e)}
                        title={`${item.nameKo} 별자리 선 ${lineOn ? '숨기기' : '표시'}`}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors ${
                          lineOn
                            ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                            : 'bg-slate-950 text-slate-500 border border-slate-800'
                        }`}
                      >
                        선
                      </button>
                      <button
                        type="button"
                        onClick={(e) => toggleSingleConstellationLabel(item.code, e)}
                        title={`${item.nameKo} 별자리 라벨 ${labelOn ? '숨기기' : '표시'}`}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors ${
                          labelOn
                            ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                            : 'bg-slate-950 text-slate-500 border border-slate-800'
                        }`}
                      >
                        라벨
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Interactive Status Banner with Matched Constellation Quick Visibility Pills */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1 mb-2 text-xs text-slate-400">
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex items-center space-x-1.5 text-sky-400 font-semibold">
            <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping" />
            <span>화각 별자리 빠른 토글:</span>
          </span>
          {data.matchedConstellations.map((mc) => {
            const visible = isConstellationLineVisible(mc.code) || isConstellationLabelVisible(mc.code);
            return (
              <button
                key={`quick-pill-${mc.code}`}
                type="button"
                onClick={() => toggleSingleConstellation(mc.code)}
                title={`클릭하여 ${mc.nameKo}(${mc.code}) 별자리 선과 라벨을 ${visible ? '숨기기 (DSO 시야 확보)' : '다시 표시'}`}
                className={`inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-lg border text-xs font-semibold transition-all ${
                  visible
                    ? mc.isPrimary
                      ? 'bg-sky-950/80 text-white border-sky-500/60 hover:bg-sky-900'
                      : 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700'
                    : 'bg-slate-950 text-slate-500 border-slate-800 line-through hover:text-slate-300'
                }`}
              >
                {visible ? (
                  <Eye className="w-3 h-3 text-sky-400" />
                ) : (
                  <EyeOff className="w-3 h-3 text-slate-500" />
                )}
                <span>
                  {mc.nameKo} ({mc.code})
                </span>
              </button>
            );
          })}
          <span className="text-slate-400 hidden lg:inline ml-1">
            화각: {cal?.radius ? `${(cal.radius * 2).toFixed(2)}°` : 'N/A'} (RA: {degToRA_HMS(centerRa)}, Dec: {degToDec_DMS(centerDec)})
          </span>
        </div>

        <div className="flex items-center space-x-3 text-[11px] text-slate-400">
          <div className="flex items-center space-x-2.5">
            <span className="inline-flex items-center space-x-1">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-400 inline-block" />
              <span className="text-sky-300">별자리 선</span>
            </span>
            <span className="inline-flex items-center space-x-1">
              <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
              <span className="text-amber-300">주요 별</span>
            </span>
            <span className="inline-flex items-center space-x-1">
              <span className="w-2 h-2 rotate-45 bg-emerald-400 inline-block" />
              <span className="text-emerald-300">딥스카이(DSO)</span>
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
            setHoveredDso(null);
          }}
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
                      fontSize={isEquator ? '13' : '12'}
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
                      fontSize="12"
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
          {showConstellationLines && lineStyle !== 'off' && (
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
                    onMouseLeave={() => setHoveredConstellation(null)}
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

          {/* Deep Sky Objects (DSO: Nebulae, Galaxies, Star Clusters) Layer */}
          {showDeepSkyObjects && (
            <g className="deep-sky-objects-layer">
              {DEEP_SKY_OBJECTS.map((dso) => {
                const dx = raToX(dso.raDeg);
                const dy = decToY(dso.decDeg);

                if (dx < -30 || dx > width + 30 || dy < -30 || dy > height + 30) return null;

                const distFromPhotoCenter = angularSeparationDeg(centerRa, centerDec, dso.raDeg, dso.decDeg);
                const isInsidePhotoFov = distFromPhotoCenter <= Math.max(1.8, fieldRadiusDeg * 1.35);
                const isHovered = hoveredDso?.id === dso.id;
                const parentConstHidden =
                  !isConstellationLineVisible(dso.constellation) && !isConstellationLabelVisible(dso.constellation);

                // Distinct color palette per DSO category
                const colorMap: Record<DeepSkyCatalogObject['type'], string> = {
                  nebula: '#34d399', // Emerald green
                  galaxy: '#fb7185', // Rose pink
                  cluster: '#fde047', // Warm yellow
                  planetary_nebula: '#2dd4bf', // Teal cyan
                  supernova_remnant: '#c084fc', // Violet
                };
                const dsoColor = isHovered ? '#ffffff' : colorMap[dso.type] || '#34d399';
                const markerSize = isInsidePhotoFov || isHovered ? 7.5 : parentConstHidden ? 6.5 : 5.2;

                return (
                  <g
                    key={`dso-${dso.id}`}
                    className="cursor-pointer group"
                    onMouseEnter={() => setHoveredDso(dso)}
                    onMouseLeave={() => setHoveredDso(null)}
                    onClick={(e) => {
                      e.stopPropagation();
                      setHoveredDso(dso);
                    }}
                  >
                    {/* Outer glowing halo if inside current photo FOV or if parent constellation is hidden for DSO clarity */}
                    {(isInsidePhotoFov || isHovered || parentConstHidden) && (
                      <circle
                        cx={dx}
                        cy={dy}
                        r={isInsidePhotoFov ? markerSize * 2.4 : markerSize * 1.9}
                        fill={`${dsoColor}22`}
                        stroke={dsoColor}
                        strokeWidth={isInsidePhotoFov ? '1.2' : '0.8'}
                        strokeDasharray="2 2"
                        filter="url(#line-glow)"
                      />
                    )}

                    {/* Astronomical Symbol by DSO Type */}
                    {dso.type === 'galaxy' ? (
                      <ellipse
                        cx={dx}
                        cy={dy}
                        rx={markerSize * 1.35}
                        ry={markerSize * 0.7}
                        transform={`rotate(-28 ${dx} ${dy})`}
                        fill={`${dsoColor}33`}
                        stroke={dsoColor}
                        strokeWidth={isHovered || isInsidePhotoFov ? '1.8' : '1.3'}
                      />
                    ) : dso.type === 'cluster' ? (
                      <circle
                        cx={dx}
                        cy={dy}
                        r={markerSize}
                        fill={`${dsoColor}25`}
                        stroke={dsoColor}
                        strokeWidth="1.6"
                        strokeDasharray="2 1.5"
                      />
                    ) : dso.type === 'planetary_nebula' ? (
                      <g>
                        <circle
                          cx={dx}
                          cy={dy}
                          r={markerSize * 0.9}
                          fill="none"
                          stroke={dsoColor}
                          strokeWidth="1.5"
                        />
                        <circle cx={dx} cy={dy} r="1.8" fill={dsoColor} />
                      </g>
                    ) : (
                      /* Nebula / Supernova Remnant diamond box */
                      <rect
                        x={dx - markerSize * 0.85}
                        y={dy - markerSize * 0.85}
                        width={markerSize * 1.7}
                        height={markerSize * 1.7}
                        rx="2"
                        transform={`rotate(45 ${dx} ${dy})`}
                        fill={`${dsoColor}30`}
                        stroke={dsoColor}
                        strokeWidth={isHovered || isInsidePhotoFov ? '1.8' : '1.3'}
                      />
                    )}

                    {/* DSO Catalog & Name Label */}
                    {(showDsoLabels || isInsidePhotoFov || isHovered || parentConstHidden) && (
                      <text
                        x={dx + markerSize + 5}
                        y={dy + 3}
                        fill={isInsidePhotoFov || isHovered ? '#ecfdf5' : '#6ee7b7'}
                        fontSize={isInsidePhotoFov || isHovered ? '11' : parentConstHidden ? '10.5' : '9.5'}
                        fontWeight={isInsidePhotoFov || isHovered || parentConstHidden ? 'bold' : '600'}
                        paintOrder="stroke"
                        stroke="#020617"
                        strokeWidth="3"
                        strokeLinejoin="round"
                      >
                        {dso.catalogId} {chartMode === 'focused' || isInsidePhotoFov || isHovered ? `· ${dso.nameKo}` : ''}
                      </text>
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
                if (!isConstellationLabelVisible(code)) return null;

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
                    onMouseLeave={() => setHoveredConstellation(null)}
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

            {/* Connecting Guide Line to Primary Constellation (shown only when primary constellation label is visible) */}
            {primaryConstellation && isConstellationLabelVisible(primaryConstellation.code) && (
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

        {/* Interactive Hover Card for DSO, Star, or Constellation */}
        {(hoveredDso || hoveredStar || hoveredConstellation) && (
          <div className="absolute bottom-3 left-3 bg-slate-900/95 backdrop-blur-md border border-sky-500/60 rounded-xl px-3.5 py-2.5 shadow-2xl z-30 max-w-md pointer-events-none">
            {hoveredDso ? (
              <div>
                <div className="flex items-center space-x-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="font-bold text-white text-xs">
                    {hoveredDso.nameKo} ({hoveredDso.nameEn})
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                    {hoveredDso.catalogId}
                  </span>
                </div>
                <div className="text-[11px] text-slate-300 mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                  <span>분류: <strong className="text-emerald-300">{hoveredDso.typeKo}</strong></span>
                  <span>등급: <strong>{hoveredDso.mag} mag</strong></span>
                  <span>시직경: <strong>{hoveredDso.sizeArcmin}&apos;</strong></span>
                  <span>별자리: <strong>{hoveredDso.constellation}</strong></span>
                </div>
              </div>
            ) : hoveredStar ? (
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
          {isDsoCleanModeActive && (
            <div className="bg-emerald-950/90 backdrop-blur-md border border-emerald-600/70 rounded-xl px-2.5 py-1 text-[11px] text-emerald-300 font-semibold shadow-lg flex items-center space-x-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>DSO 클린 뷰 (별자리 숨김)</span>
            </div>
          )}
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

      {/* Matched Constellations Information Cards with Individual Line/Label Visibility Toggles */}
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {data.matchedConstellations.map((constellation, idx) => {
          const lineVisible = isConstellationLineVisible(constellation.code);
          const labelVisible = isConstellationLabelVisible(constellation.code);
          const anyVisible = lineVisible || labelVisible;
          const constellationDsos = DEEP_SKY_OBJECTS.filter((d) => d.constellation === constellation.code);

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
              <div className="flex items-center justify-between gap-2">
                <span
                  className={`text-xs uppercase font-bold tracking-wider ${
                    constellation.isPrimary ? 'text-sky-300' : 'text-slate-400'
                  }`}
                >
                  {constellation.isPrimary ? '🎯 주요 매칭 별자리' : '경계 인접 별자리'}
                </span>
                <div className="flex items-center space-x-1">
                  {/* Individual Line Toggle on Card */}
                  <button
                    type="button"
                    onClick={(e) => toggleSingleConstellationLine(constellation.code, e)}
                    title={`${constellation.nameKo} 별자리 선 ${lineVisible ? '숨기기' : '표시'}`}
                    className={`text-[10px] px-1.5 py-0.5 rounded font-semibold border transition-colors ${
                      lineVisible
                        ? 'bg-sky-950 text-sky-300 border-sky-700/80 hover:bg-sky-900'
                        : 'bg-slate-900 text-slate-500 border-slate-800 hover:text-slate-300'
                    }`}
                  >
                    선 {lineVisible ? 'ON' : 'OFF'}
                  </button>
                  {/* Individual Label Toggle on Card */}
                  <button
                    type="button"
                    onClick={(e) => toggleSingleConstellationLabel(constellation.code, e)}
                    title={`${constellation.nameKo} 별자리 라벨 ${labelVisible ? '숨기기' : '표시'}`}
                    className={`text-[10px] px-1.5 py-0.5 rounded font-semibold border transition-colors ${
                      labelVisible
                        ? 'bg-indigo-950 text-indigo-300 border-indigo-700/80 hover:bg-indigo-900'
                        : 'bg-slate-900 text-slate-500 border-slate-800 hover:text-slate-300'
                    }`}
                  >
                    라벨 {labelVisible ? 'ON' : 'OFF'}
                  </button>
                  {/* Both Toggle Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSingleConstellation(constellation.code);
                    }}
                    title={`${constellation.nameKo} 전체 ${anyVisible ? '숨기기 (DSO 시야 확보)' : '표시'}`}
                    className={`p-1 rounded border transition-colors ${
                      anyVisible
                        ? 'bg-slate-800 text-sky-300 border-slate-700 hover:bg-slate-700'
                        : 'bg-slate-950 text-slate-500 border-slate-800 hover:text-slate-300'
                    }`}
                  >
                    {anyVisible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between mt-1.5">
                <h4 className="text-base font-bold text-white flex items-center space-x-1.5">
                  <span>{constellation.nameKo}</span>
                  <span className="text-xs text-slate-400 font-normal">({constellation.nameEn})</span>
                </h4>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-800 text-sky-300 border border-slate-700">
                  {constellation.code}
                </span>
              </div>

              <div className="mt-2.5 text-xs text-slate-300 space-y-1.5">
                <p className="flex justify-between">
                  <span className="text-slate-400">대표 밝은 별:</span>
                  <span className="font-semibold text-amber-300">{constellation.brightestStar}</span>
                </p>
                {constellationDsos.length > 0 && (
                  <p className="flex justify-between items-center gap-2">
                    <span className="text-slate-400 shrink-0">소속 딥스카이(DSO):</span>
                    <span className="font-medium text-emerald-300 truncate">
                      {constellationDsos.map((d) => `${d.catalogId}(${d.nameKo})`).join(', ')}
                    </span>
                  </p>
                )}
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

