import React, { useState, useRef } from 'react';
import { Compass, Globe, Sparkles, MapPin, ExternalLink, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { SolvedAstroData } from '../types/astronomy';
import { degToRA_HMS, degToDec_DMS, computeFieldCorners } from '../utils/coordinateMath';
import { IAU_CONSTELLATIONS } from '../utils/constellations';

interface CelestialStarChartProps {
  data: SolvedAstroData;
  onSelectConstellation?: (code: string) => void;
}

export const CelestialStarChart: React.FC<CelestialStarChartProps> = ({ data, onSelectConstellation }) => {
  const [zoomLevel, setZoomLevel] = useState(1);
  const [chartMode, setChartMode] = useState<'all_sky' | 'focused'>('focused');
  const [hoveredCoords, setHoveredCoords] = useState<{ ra: string; dec: string } | null>(null);

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
  const width = 800;
  const height = 450;

  // Projection math:
  // In 'all_sky' mode: RA 0..360° mapped to X 0..width, Dec -90..+90° mapped to Y height..0 (Equirectangular)
  // In 'focused' mode: Centered around centerRa, centerDec with ±40° range (or adjustable by zoomLevel)
  const fovSpan = chartMode === 'all_sky' ? 360 : 70 / zoomLevel;
  const decSpan = chartMode === 'all_sky' ? 180 : 45 / zoomLevel;

  const raToX = (raDeg: number): number => {
    let normalized = raDeg % 360;
    if (normalized < 0) normalized += 360;

    if (chartMode === 'all_sky') {
      // Standard RA 0..360 -> X 0..width
      return (normalized / 360) * width;
    }

    // Focused mode: center is centerRa
    let diff = normalized - centerRa;
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;

    // In astronomy, RA increases to the left (East is Left when looking up)
    return width / 2 - (diff / fovSpan) * width;
  };

  const decToY = (decDeg: number): number => {
    if (chartMode === 'all_sky') {
      // Dec +90 at top, -90 at bottom
      return ((90 - decDeg) / 180) * height;
    }

    // Focused mode
    const diff = decDeg - centerDec;
    return height / 2 - (diff / decSpan) * height;
  };

  // Convert SVG mouse position to celestial coordinates
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    let ra = 0;
    let dec = 0;

    if (chartMode === 'all_sky') {
      ra = (x / width) * 360;
      dec = 90 - (y / height) * 180;
    } else {
      const relX = (x - width / 2) / width;
      const relY = (y - height / 2) / height;
      ra = centerRa - relX * fovSpan;
      dec = centerDec - relY * decSpan;
    }

    if (ra < 0) ra += 360;
    if (ra >= 360) ra -= 360;

    setHoveredCoords({
      ra: degToRA_HMS(ra),
      dec: degToDec_DMS(dec),
    });
  };

  // 4 corners of photo's Field of View on the celestial sphere
  const fovCorners = React.useMemo(() => {
    return computeFieldCorners(centerRa, centerDec, widthArcsec, heightArcsec, orientation, parity);
  }, [centerRa, centerDec, widthArcsec, heightArcsec, orientation, parity]);

  // SVG points string for photo FOV polygon
  const fovPolygonPoints = fovCorners
    .map((c) => `${raToX(c.ra)},${decToY(c.dec)}`)
    .join(' ');

  // Direct external URL to CDS Aladin Lite with exact coordinates
  const aladinUrl = `https://aladin.cds.unistra.fr/AladinLite/?target=${encodeURIComponent(
    `${degToRA_HMS(centerRa)} ${degToDec_DMS(centerDec)}`
  )}&fov=${(cal?.radius ? cal.radius * 2 : 1).toFixed(2)}&survey=P%2FDSS2%2Fcolor`;

  return (
    <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 shadow-xl flex flex-col">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-800">
        <div>
          <div className="flex items-center space-x-2">
            <Globe className="w-5 h-5 text-indigo-400" />
            <h3 className="text-base font-bold text-white tracking-tight">
              실시간 전천 성도 연동 (Celestial Star Chart)
            </h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-800 font-medium">
              IAU 88 Constellations
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            천체 사진의 정밀 화각(FOV) 위치를 성도 좌표계와 별자리에 자동 투영 및 연동
          </p>
        </div>

        {/* View Mode Toggle & Actions */}
        <div className="flex items-center space-x-2">
          <div className="bg-slate-800 rounded-lg p-1 flex items-center space-x-1 border border-slate-700">
            <button
              onClick={() => setChartMode('focused')}
              className={`text-xs px-2.5 py-1 rounded-md font-medium transition-all ${
                chartMode === 'focused' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              화각 집중 모드
            </button>
            <button
              onClick={() => setChartMode('all_sky')}
              className={`text-xs px-2.5 py-1 rounded-md font-medium transition-all ${
                chartMode === 'all_sky' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              전천 (All-Sky) 360°
            </button>
          </div>

          {chartMode === 'focused' && (
            <div className="flex items-center space-x-1 bg-slate-800 rounded-lg p-1 border border-slate-700">
              <button
                onClick={() => setZoomLevel((z) => Math.min(4, z + 0.5))}
                title="성도 확대"
                className="p-1 text-slate-300 hover:text-white rounded"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setZoomLevel((z) => Math.max(0.5, z - 0.5))}
                title="성도 축소"
                className="p-1 text-slate-300 hover:text-white rounded"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setZoomLevel(1)}
                title="초기화"
                className="p-1 text-slate-300 hover:text-white rounded"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <a
            href={aladinUrl}
            target="_blank"
            rel="noopener noreferrer"
            title="CDS Aladin Lite 실시간 위성/망원경 서베이 열기"
            className="text-xs px-3 py-1.5 rounded-lg bg-sky-950/80 hover:bg-sky-900 text-sky-300 border border-sky-800 flex items-center space-x-1.5 transition-colors"
          >
            <span>Aladin 서베이</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      {/* Star Chart SVG Canvas */}
      <div className="relative bg-slate-950 rounded-xl border border-slate-800/80 overflow-hidden">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-[320px] select-none block"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoveredCoords(null)}
        >
          <defs>
            {/* Grid Pattern */}
            <radialGradient id="sky-vignette" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#0c1222" />
              <stop offset="100%" stopColor="#020617" />
            </radialGradient>
            <filter id="fov-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Background Sky Canvas */}
          <rect width={width} height={height} fill="url(#sky-vignette)" />

          {/* Celestial Grid (RA & Dec Lines) */}
          <g className="grid-lines" stroke="#334155" strokeWidth="0.75" strokeDasharray="3 3">
            {/* Dec Circles (-60, -30, 0, +30, +60) */}
            {[-60, -30, 0, 30, 60].map((d) => {
              const y = decToY(d);
              if (y < 0 || y > height) return null;
              return (
                <g key={`dec-${d}`}>
                  <line x1="0" y1={y} x2={width} y2={y} stroke={d === 0 ? '#38bdf8' : '#334155'} strokeWidth={d === 0 ? '1.2' : '0.75'} />
                  <text x="8" y={y - 3} fill="#64748b" fontSize="9" fontFamily="monospace">
                    {d === 0 ? '적도 (Equator 0°)' : `${d > 0 ? '+' : ''}${d}°`}
                  </text>
                </g>
              );
            })}

            {/* RA Lines (every 2 hours = 30°) */}
            {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((raDeg) => {
              const x = raToX(raDeg);
              if (x < 0 || x > width) return null;
              const h = raDeg / 15;
              return (
                <g key={`ra-${raDeg}`}>
                  <line x1={x} y1="0" x2={x} y2={height} />
                  <text x={x + 3} y={height - 8} fill="#64748b" fontSize="9" fontFamily="monospace">
                    {h}h
                  </text>
                </g>
              );
            })}
          </g>

          {/* Milky Way Galactic Plane Indicator */}
          <path
            d={`M 0,${decToY(20)} Q ${width / 4},${decToY(60)} ${width / 2},${decToY(25)} T ${width},${decToY(-20)}`}
            fill="none"
            stroke="#6366f1"
            strokeWidth="1"
            strokeDasharray="6 4"
            opacity="0.3"
          />

          {/* Constellations Representation */}
          {Object.entries(IAU_CONSTELLATIONS).map(([code, info]) => {
            const cx = raToX(info.raHours * 15);
            const cy = decToY(info.decDeg);

            // Skip if out of viewport in focused mode
            if (cx < -40 || cx > width + 40 || cy < -40 || cy > height + 40) return null;

            const isMatched = data.matchedConstellations.some((m) => m.code === code);
            const isPrimary = primaryConstellation?.code === code;

            return (
              <g
                key={`const-${code}`}
                className="cursor-pointer group"
                onClick={() => onSelectConstellation?.(code)}
              >
                {/* Constellation Glow Aura if matched */}
                {isMatched && (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={isPrimary ? '32' : '20'}
                    fill={isPrimary ? '#38bdf815' : '#818cf810'}
                    stroke={isPrimary ? '#38bdf8' : '#818cf8'}
                    strokeWidth="1.2"
                    strokeDasharray={isPrimary ? '4 2' : 'none'}
                  />
                )}

                {/* Constellation Center Dot */}
                <circle
                  cx={cx}
                  cy={cy}
                  r={isPrimary ? 4 : isMatched ? 3 : 2}
                  fill={isPrimary ? '#38bdf8' : isMatched ? '#818cf8' : '#64748b'}
                />

                {/* Constellation Name Label */}
                <text
                  x={cx + 6}
                  y={cy + 3}
                  fill={isPrimary ? '#38bdf8' : isMatched ? '#c7d2fe' : '#64748b'}
                  fontSize={isPrimary ? '12' : isMatched ? '10' : '8'}
                  fontWeight={isMatched ? 'bold' : 'normal'}
                  className="transition-colors group-hover:fill-sky-300"
                >
                  {info.nameKo} ({code})
                </text>
              </g>
            );
          })}

          {/* Photo Field of View (FOV) Box Plotted on Star Chart */}
          <g className="photo-fov-marker">
            {/* FOV Polygon outline */}
            <polygon
              points={fovPolygonPoints}
              fill="#38bdf825"
              stroke="#38bdf8"
              strokeWidth="2"
              filter="url(#fov-glow)"
            />

            {/* Photo Center Reticle */}
            <circle
              cx={raToX(centerRa)}
              cy={decToY(centerDec)}
              r="5"
              fill="#f43f5e"
              stroke="#ffffff"
              strokeWidth="1.5"
            />

            {/* Connecting Guide Line to Primary Constellation */}
            {primaryConstellation && (
              <line
                x1={raToX(centerRa)}
                y1={decToY(centerDec)}
                x2={raToX(IAU_CONSTELLATIONS[primaryConstellation.code]?.raHours * 15 || centerRa)}
                y2={decToY(IAU_CONSTELLATIONS[primaryConstellation.code]?.decDeg || centerDec)}
                stroke="#38bdf8"
                strokeWidth="1.5"
                strokeDasharray="4 3"
                opacity="0.8"
              />
            )}

            {/* FOV Label */}
            <text
              x={raToX(centerRa) + 8}
              y={decToY(centerDec) - 8}
              fill="#ffffff"
              fontSize="11"
              fontWeight="bold"
              filter="drop-shadow(0 2px 4px rgba(0,0,0,0.8))"
            >
              🎯 사진 화각 (FOV 영역)
            </text>
          </g>
        </svg>

        {/* Live Coordinate Readout under Mouse */}
        <div className="absolute top-2 left-2 bg-slate-900/85 backdrop-blur border border-slate-800 rounded-md px-2.5 py-1 text-[11px] font-mono text-slate-300 flex items-center space-x-2">
          <Compass className="w-3.5 h-3.5 text-sky-400" />
          <span>
            {hoveredCoords
              ? `RA: ${hoveredCoords.ra} | Dec: ${hoveredCoords.dec}`
              : `사진 중심 RA: ${degToRA_HMS(centerRa)} | Dec: ${degToDec_DMS(centerDec)}`}
          </span>
        </div>

        {/* Mode info badge */}
        <div className="absolute top-2 right-2 bg-slate-900/85 backdrop-blur border border-slate-800 rounded-md px-2.5 py-1 text-[11px] text-slate-400">
          {chartMode === 'focused' ? `화각 확대 (Zoom ${zoomLevel}x)` : '전천 투영 (All-Sky J2000)'}
        </div>
      </div>

      {/* Matched Constellations Information Cards */}
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {data.matchedConstellations.map((constellation, idx) => {
          const info = IAU_CONSTELLATIONS[constellation.code];
          return (
            <div
              key={`card-${constellation.code}-${idx}`}
              className={`p-3 rounded-xl border transition-all ${
                constellation.isPrimary
                  ? 'bg-gradient-to-br from-sky-950/40 via-slate-900 to-indigo-950/40 border-sky-500/40 shadow-md'
                  : 'bg-slate-800/40 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase font-bold tracking-wider text-sky-400">
                  {constellation.isPrimary ? '주요 매칭 별자리' : '경계 인접 별자리'}
                </span>
                <span className="text-xs font-mono font-semibold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                  {constellation.code}
                </span>
              </div>
              <h4 className="text-sm font-bold text-white mt-1">
                {constellation.nameKo} ({constellation.nameEn})
              </h4>
              <div className="mt-2 text-xs text-slate-300 space-y-1">
                <p className="flex justify-between">
                  <span className="text-slate-400">대표 밝은 별:</span>
                  <span className="font-medium text-amber-300">{constellation.brightestStar}</span>
                </p>
                <p className="flex justify-between">
                  <span className="text-slate-400">성족 분류:</span>
                  <span>{constellation.family}</span>
                </p>
                <p className="flex justify-between">
                  <span className="text-slate-400">화각 내 검출 점수:</span>
                  <span className="text-sky-300 font-semibold">{constellation.starsCountInField} pts</span>
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
