import { SolvedAstroData, DetectedStarItem } from '../types/astronomy';
import { StarChartLayerType } from '../components/StarChartLayerModal';
import {
  degToRA_HMS,
  degToDec_DMS,
  pixelToSkyCoords,
} from './coordinateMath';
import { getConstellationLinesForImage } from './constellations';
import { CONSTELLATION_FIGURES } from '../data/celestialCatalog';
import {
  skyCoordsToPixel,
  extractStarsImage2XY,
  verifyAndSnapAnnotationsToDetectedStars,
} from './localPlateSolver';

export type LocalLayerImageMap = Record<StarChartLayerType, string>;

/**
 * Load an image from URL or DataURL into an HTMLImageElement
 */
function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (!src.startsWith('data:') && !src.startsWith('blob:')) {
      img.crossOrigin = 'anonymous';
    }
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
    img.src = src;
  });
}

/**
 * Draw Celestial North / East Compass on a 2D Canvas
 */
function drawCompassOnCanvas(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  orientationDeg: number,
  parity: number,
  scaleFactor: number
) {
  ctx.save();
  ctx.translate(cx, cy);
  const r = 34 * scaleFactor;

  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(99, 102, 241, 0.9)';
  ctx.lineWidth = 1.6 * scaleFactor;
  ctx.stroke();

  const rotRad = ((orientationDeg || 0) * Math.PI) / 180;
  const p = parity || 1;

  // North vector in image coordinates: (xi=0, eta=+1)
  // dx = -p * (-eta * sin(theta)) = p * sin(theta)
  // dy = -eta * cos(theta) = -cos(theta)
  const nx = p * Math.sin(rotRad);
  const ny = -Math.cos(rotRad);

  // East vector in image coordinates: (xi=+1, eta=0)
  // dx = -p * cos(theta)
  // dy = -sin(theta)
  const ex = -p * Math.cos(rotRad);
  const ey = -Math.sin(rotRad);

  const arrowLen = 24 * scaleFactor;

  // Draw North Arrow
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(nx * arrowLen, ny * arrowLen);
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 2.4 * scaleFactor;
  ctx.stroke();

  ctx.fillStyle = '#38bdf8';
  ctx.font = `bold ${Math.round(11 * scaleFactor)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('N', nx * (arrowLen + 8 * scaleFactor), ny * (arrowLen + 8 * scaleFactor));

  // Draw East Arrow
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(ex * (arrowLen * 0.85), ey * (arrowLen * 0.85));
  ctx.strokeStyle = '#a855f7';
  ctx.lineWidth = 2.0 * scaleFactor;
  ctx.stroke();

  ctx.fillStyle = '#a855f7';
  ctx.fillText('E', ex * (arrowLen * 0.85 + 8 * scaleFactor), ey * (arrowLen * 0.85 + 8 * scaleFactor));

  ctx.beginPath();
  ctx.arc(0, 0, 2.5 * scaleFactor, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();

  ctx.restore();
}

/**
 * Draw a top-left header stamp on the canvas
 */
function drawHeaderBadge(
  ctx: CanvasRenderingContext2D,
  title: string,
  subtitle: string,
  accentColor: string,
  scaleFactor: number
) {
  ctx.save();
  const padX = 14 * scaleFactor;
  const padY = 12 * scaleFactor;
  ctx.font = `bold ${Math.round(13 * scaleFactor)}px sans-serif`;
  const w1 = ctx.measureText(title).width;
  ctx.font = `${Math.round(11 * scaleFactor)}px monospace`;
  const w2 = ctx.measureText(subtitle).width;
  const boxW = Math.max(w1, w2) + 28 * scaleFactor;
  const boxH = 44 * scaleFactor;

  ctx.fillStyle = 'rgba(2, 6, 23, 0.88)';
  ctx.strokeStyle = accentColor;
  ctx.lineWidth = 1.5 * scaleFactor;

  ctx.beginPath();
  ctx.roundRect(padX, padY, boxW, boxH, 8 * scaleFactor);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#f8fafc';
  ctx.font = `bold ${Math.round(13 * scaleFactor)}px sans-serif`;
  ctx.textBaseline = 'top';
  ctx.fillText(title, padX + 12 * scaleFactor, padY + 8 * scaleFactor);

  ctx.fillStyle = '#94a3b8';
  ctx.font = `${Math.round(11 * scaleFactor)}px monospace`;
  ctx.fillText(subtitle, padX + 12 * scaleFactor, padY + 26 * scaleFactor);
  ctx.restore();
}

/**
 * Render all 5 Web Star Chart Layers directly in the browser from SolvedAstroData
 */
export async function generateBrowserStarChartLayers(
  data: SolvedAstroData
): Promise<LocalLayerImageMap> {
  const rawSrc =
    data.rawImageUrl ||
    data.imageUrl ||
    `/api/astrometry/image-proxy/${data.jobId}/original`;

  let detectedStars: DetectedStarItem[] = data.detectedStars || [];
  if (detectedStars.length === 0 && rawSrc) {
    try {
      const ext = await extractStarsImage2XY(rawSrc);
      if (ext.stars && ext.stars.length > 0) {
        detectedStars = ext.stars;
      }
    } catch (e) {}
  }

  let img: HTMLImageElement | null = null;
  try {
    img = await loadImageElement(rawSrc);
  } catch (e) {
    try {
      if (data.imageUrl && data.imageUrl !== rawSrc) {
        img = await loadImageElement(data.imageUrl);
      }
    } catch (e2) {}
  }

  const cal = data.calibration;
  const origW =
    cal?.width_arcsec && cal?.pixscale && cal.pixscale > 0
      ? Math.round(cal.width_arcsec / cal.pixscale)
      : data.imageWidth || img?.naturalWidth || 1920;
  const origH =
    cal?.height_arcsec && cal?.pixscale && cal.pixscale > 0
      ? Math.round(cal.height_arcsec / cal.pixscale)
      : data.imageHeight || img?.naturalHeight || 1080;

  const maxDim = 1440;
  const scale = Math.min(1, maxDim / Math.max(origW, origH));
  const cw = Math.max(320, Math.round(origW * scale));
  const ch = Math.max(240, Math.round(origH * scale));
  const uiScale = Math.max(0.85, Math.min(1.6, cw / 1100));

  const createBaseCanvas = (darkenAlpha = 0): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } => {
    const canvas = document.createElement('canvas');
    canvas.width = cw;
    canvas.height = ch;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#020617';
    ctx.fillRect(0, 0, cw, ch);
    if (img) {
      ctx.drawImage(img, 0, 0, cw, ch);
    }
    if (darkenAlpha > 0) {
      ctx.fillStyle = `rgba(2, 6, 23, ${darkenAlpha})`;
      ctx.fillRect(0, 0, cw, ch);
    }
    return { canvas, ctx };
  };

  const rawAnnotations = data.annotations || [];
  const annotations =
    detectedStars.length > 0
      ? verifyAndSnapAnnotationsToDetectedStars(rawAnnotations, detectedStars, origW, origH)
      : rawAnnotations;

  const stars = annotations.filter((a) => {
    const t = (a.type || '').toLowerCase();
    return t === 'bright' || t === 'hd' || t === 'star' || t === 'tycho2' || t === 'gaia';
  });
  const dsos = annotations.filter((a) => {
    const t = (a.type || '').toLowerCase();
    return t !== 'bright' && t !== 'hd' && t !== 'star' && t !== 'tycho2' && t !== 'gaia';
  });

  const primaryConst = data.matchedConstellations?.[0];
  const constLabel = primaryConst
    ? `${primaryConst.nameKo} (${primaryConst.code})`
    : 'WCS Plate Solved';
  const coordSubtitle = cal
    ? `RA ${degToRA_HMS(cal.ra)} · Dec ${degToDec_DMS(cal.dec)} · Scale ${cal.pixscale.toFixed(2)}"/px`
    : '';

  // =========================================================================
  // 1. ANNOTATED LAYER (주석 성도 - Browser WCS Constellation & Object Overlay)
  // =========================================================================
  const annotatedUrl = (() => {
    const { canvas, ctx } = createBaseCanvas(0.08);

    // Draw constellation lines from matched constellations + sky projection
    const imageLines = getConstellationLinesForImage(annotations, data.matchedConstellations || []);
    ctx.save();
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.72)';
    ctx.lineWidth = 2.0 * uiScale;
    ctx.setLineDash([6 * uiScale, 4 * uiScale]);

    if (imageLines.length > 0) {
      for (const l of imageLines) {
        ctx.beginPath();
        ctx.moveTo(l.x1 * scale, l.y1 * scale);
        ctx.lineTo(l.x2 * scale, l.y2 * scale);
        ctx.stroke();
      }
    } else if (cal) {
      for (const fig of CONSTELLATION_FIGURES) {
        for (const [ra1, dec1, ra2, dec2] of fig.lines) {
          const p1 = skyCoordsToPixel(ra1, dec1, origW, origH, cal);
          const p2 = skyCoordsToPixel(ra2, dec2, origW, origH, cal);
          if (
            p1 &&
            p2 &&
            p1.x >= -100 &&
            p1.x <= origW + 100 &&
            p1.y >= -100 &&
            p1.y <= origH + 100
          ) {
            ctx.beginPath();
            ctx.moveTo(p1.x * scale, p1.y * scale);
            ctx.lineTo(p2.x * scale, p2.y * scale);
            ctx.stroke();
          }
        }
      }
    }
    ctx.restore();

    // Draw DSOs
    ctx.save();
    for (const dso of dsos) {
      const x = dso.pixelx * scale;
      const y = dso.pixely * scale;
      const r = Math.max(14 * uiScale, (dso.radius || 18) * scale);
      const name = dso.names?.[0] || 'DSO';

      ctx.beginPath();
      ctx.setLineDash([5 * uiScale, 3 * uiScale]);
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 2.0 * uiScale;
      ctx.stroke();
      ctx.setLineDash([]);

      // Crosshair ticks
      ctx.beginPath();
      ctx.moveTo(x - r - 4 * uiScale, y);
      ctx.lineTo(x - r + 4 * uiScale, y);
      ctx.moveTo(x + r - 4 * uiScale, y);
      ctx.lineTo(x + r + 4 * uiScale, y);
      ctx.moveTo(x, y - r - 4 * uiScale);
      ctx.lineTo(x, y - r + 4 * uiScale);
      ctx.moveTo(x, y + r - 4 * uiScale);
      ctx.lineTo(x, y + r + 4 * uiScale);
      ctx.strokeStyle = '#fef08a';
      ctx.lineWidth = 1.5 * uiScale;
      ctx.stroke();

      // Label pill
      ctx.font = `bold ${Math.round(12 * uiScale)}px sans-serif`;
      const tw = ctx.measureText(name).width;
      const lx = Math.min(cw - tw - 16 * uiScale, x + r + 6 * uiScale);
      const ly = Math.max(14 * uiScale, Math.min(ch - 14 * uiScale, y));
      ctx.fillStyle = 'rgba(30, 20, 4, 0.88)';
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 1 * uiScale;
      ctx.beginPath();
      ctx.roundRect(lx, ly - 10 * uiScale, tw + 12 * uiScale, 20 * uiScale, 4 * uiScale);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#fef08a';
      ctx.textBaseline = 'middle';
      ctx.fillText(name, lx + 6 * uiScale, ly);
    }
    ctx.restore();

    // Draw Catalog Matched Stars
    ctx.save();
    for (const star of stars) {
      const x = star.pixelx * scale;
      const y = star.pixely * scale;
      const isBright = star.vmag !== undefined && star.vmag < 5.0;
      const r = (isBright ? 10 : 7.5) * uiScale;
      const name = star.names?.[0] || '';

      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = (isBright ? 2.2 : 1.6) * uiScale;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(x, y, 2.2 * uiScale, 0, Math.PI * 2);
      ctx.fillStyle = '#7dd3fc';
      ctx.fill();

      if (name && !name.startsWith('검출 항성')) {
        const label = star.vmag !== undefined ? `${name} (${star.vmag.toFixed(1)}m)` : name;
        ctx.font = `bold ${Math.round(11 * uiScale)}px sans-serif`;
        const tw = ctx.measureText(label).width;
        const lx = Math.min(cw - tw - 14 * uiScale, x + r + 5 * uiScale);
        const ly = Math.max(12 * uiScale, Math.min(ch - 12 * uiScale, y));

        ctx.fillStyle = 'rgba(2, 6, 23, 0.85)';
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.65)';
        ctx.lineWidth = 1 * uiScale;
        ctx.beginPath();
        ctx.roundRect(lx, ly - 9 * uiScale, tw + 10 * uiScale, 18 * uiScale, 4 * uiScale);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#e0f2fe';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, lx + 5 * uiScale, ly);
      }
    }
    ctx.restore();

    if (cal) {
      drawCompassOnCanvas(
        ctx,
        cw - 52 * uiScale,
        52 * uiScale,
        cal.orientation,
        cal.parity,
        uiScale
      );
    }
    drawHeaderBadge(
      ctx,
      `주석 성도 (WCS Annotated) · ${constLabel}`,
      coordSubtitle,
      '#38bdf8',
      uiScale
    );

    return canvas.toDataURL('image/jpeg', 0.92);
  })();

  // =========================================================================
  // 2. RED-GREEN LAYER (적/녹 매칭 - Detected Red + Catalog Matched Green)
  // =========================================================================
  const redGreenUrl = (() => {
    const { canvas, ctx } = createBaseCanvas(0.22);

    // 1. Detected Stars in RED (#ef4444)
    ctx.save();
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.92)';
    ctx.lineWidth = 1.6 * uiScale;
    for (const ds of detectedStars) {
      const x = ds.x * scale;
      const y = ds.y * scale;
      const r = Math.max(3.5 * uiScale, Math.min(12 * uiScale, (ds.radius || 2) * 2.1 * scale));
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();

    // 2. Catalog Matched Stars in GREEN (#22c55e)
    ctx.save();
    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 2.3 * uiScale;
    for (const star of stars) {
      const x = star.pixelx * scale;
      const y = star.pixely * scale;
      const r = Math.max(8 * uiScale, (star.radius || 9) * 1.25 * scale);
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.stroke();

      // Small green crosshair tick for matched catalog star
      ctx.beginPath();
      ctx.moveTo(x - r - 3 * uiScale, y);
      ctx.lineTo(x - r + 2 * uiScale, y);
      ctx.moveTo(x + r - 2 * uiScale, y);
      ctx.lineTo(x + r + 3 * uiScale, y);
      ctx.stroke();
    }
    ctx.restore();

    drawHeaderBadge(
      ctx,
      `적/녹 항성 매칭 (Red-Green Match)`,
      `브라우저 검출 항성(적색): ${detectedStars.length}개 · 성표 일치(녹색): ${stars.length}개`,
      '#22c55e',
      uiScale
    );

    return canvas.toDataURL('image/jpeg', 0.92);
  })();

  // =========================================================================
  // 3. EXTRACTION LAYER (항성 검출 맵 - Simplexy Star Source Extraction Map)
  // =========================================================================
  const extractionUrl = (() => {
    const { canvas, ctx } = createBaseCanvas(0.32);

    ctx.save();
    detectedStars.forEach((ds, idx) => {
      const x = ds.x * scale;
      const y = ds.y * scale;
      const isTopBright = idx < 25;
      const r = Math.max(3.5 * uiScale, Math.min(13 * uiScale, (ds.radius || 2) * 2.2 * scale));

      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.strokeStyle = isTopBright ? '#fbbf24' : 'rgba(239, 68, 68, 0.92)';
      ctx.lineWidth = (isTopBright ? 2.0 : 1.4) * uiScale;
      ctx.stroke();

      if (isTopBright) {
        // Draw centroid crosshair for top 25 quad index stars
        ctx.beginPath();
        ctx.moveTo(x - 3 * uiScale, y);
        ctx.lineTo(x + 3 * uiScale, y);
        ctx.moveTo(x, y - 3 * uiScale);
        ctx.lineTo(x, y + 3 * uiScale);
        ctx.strokeStyle = '#fde047';
        ctx.lineWidth = 1.2 * uiScale;
        ctx.stroke();

        if (idx < 15) {
          ctx.fillStyle = '#fde047';
          ctx.font = `bold ${Math.round(10 * uiScale)}px monospace`;
          const fwhmLabel = ds.fwhm ? ` (${ds.fwhm.toFixed(1)}px)` : '';
          ctx.fillText(`#${idx + 1}${fwhmLabel}`, x + r + 3 * uiScale, y + 3 * uiScale);
        }
      }
    });
    ctx.restore();

    const rejected =
      (data.nebulaPipelineTelemetry?.rejectedFwhmBlobs || 0) +
      (data.nebulaPipelineTelemetry?.rejectedElongatedFilaments || 0);
    drawHeaderBadge(
      ctx,
      `항성 검출 맵 (White Top-Hat + 2D Mesh + 2차 모멘트 검증)`,
      `점상 항성: ${detectedStars.length}개${rejected > 0 ? ` (성운/가짜별 ${rejected}개 제거)` : ''} · 황색(#1~#25): Top-K Quad 기준성`,
      '#fbbf24',
      uiScale
    );

    return canvas.toDataURL('image/jpeg', 0.92);
  })();

  // =========================================================================
  // 4. EQUATORIAL GRID LAYER (천구 좌표 격자 - J2000 RA/Dec WCS Grid)
  // =========================================================================
  const gridUrl = (() => {
    const { canvas, ctx } = createBaseCanvas(0.15);

    if (cal) {
      // Sample pixels across the image to find min/max RA & Dec
      const samplePts = [
        { x: 0, y: 0 },
        { x: origW / 2, y: 0 },
        { x: origW, y: 0 },
        { x: 0, y: origH / 2 },
        { x: origW / 2, y: origH / 2 },
        { x: origW, y: origH / 2 },
        { x: 0, y: origH },
        { x: origW / 2, y: origH },
        { x: origW, y: origH },
      ].map((p) =>
        pixelToSkyCoords(
          p.x,
          p.y,
          origW,
          origH,
          cal.ra,
          cal.dec,
          cal.pixscale,
          cal.orientation,
          cal.parity
        )
      );

      const decValues = samplePts.map((s) => s.dec);
      const minDec = Math.max(-89.5, Math.min(...decValues) - cal.radius * 0.4);
      const maxDec = Math.min(89.5, Math.max(...decValues) + cal.radius * 0.4);

      // Choose adaptive step in degrees based on field radius
      const fovDeg = Math.max(0.2, cal.radius * 2);
      const rawStep = fovDeg / 5;
      const stepCandidates = [0.05, 0.1, 0.2, 0.25, 0.5, 1, 2, 5, 10, 15];
      const decStep =
        stepCandidates.find((s) => s >= rawStep) || stepCandidates[stepCandidates.length - 1];
      const cosDec = Math.max(0.15, Math.cos((cal.dec * Math.PI) / 180));
      const raStep =
        stepCandidates.find((s) => s >= rawStep / cosDec) || decStep;

      ctx.save();
      ctx.strokeStyle = 'rgba(129, 140, 248, 0.68)';
      ctx.lineWidth = 1.4 * uiScale;
      ctx.font = `bold ${Math.round(12.5 * uiScale)}px monospace`;
      ctx.fillStyle = '#c7d2fe';

      // Draw Constant-Dec Parallels
      const startDec = Math.floor(minDec / decStep) * decStep;
      const endDec = Math.ceil(maxDec / decStep) * decStep;
      const raSpan = Math.min(60, (fovDeg * 1.6) / cosDec);

      for (let dec = startDec; dec <= endDec + 1e-6; dec += decStep) {
        if (dec < -89.5 || dec > 89.5) continue;
        ctx.beginPath();
        let started = false;
        let labelPos: { x: number; y: number } | null = null;

        const numSamples = 60;
        for (let i = 0; i <= numSamples; i++) {
          const ra = (((cal.ra - raSpan / 2 + (raSpan * i) / numSamples) % 360) + 360) % 360;
          const pt = skyCoordsToPixel(ra, dec, origW, origH, cal);
          if (pt && pt.x >= -50 && pt.x <= origW + 50 && pt.y >= -50 && pt.y <= origH + 50) {
            const sx = pt.x * scale;
            const sy = pt.y * scale;
            if (!started) {
              ctx.moveTo(sx, sy);
              started = true;
            } else {
              ctx.lineTo(sx, sy);
            }
            if (!labelPos && sx > 30 * uiScale && sx < cw - 105 * uiScale && sy > 55 * uiScale && sy < ch - 20 * uiScale) {
              labelPos = { x: sx, y: sy };
            }
          } else {
            started = false;
          }
        }
        ctx.stroke();

        if (labelPos) {
          const decText = `Dec ${dec >= 0 ? '+' : ''}${dec.toFixed(decStep < 1 ? 2 : 1)}°`;
          ctx.fillStyle = 'rgba(15, 23, 42, 0.82)';
          const tw = ctx.measureText(decText).width;
          ctx.fillRect(labelPos.x - 2, labelPos.y - 14 * uiScale, tw + 8, 17 * uiScale);
          ctx.fillStyle = '#a5b4fc';
          ctx.fillText(decText, labelPos.x + 2, labelPos.y - 2 * uiScale);
        }
      }

      // Draw Constant-RA Meridians
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.65)';
      const startRaOffset = Math.floor((-raSpan / 2) / raStep) * raStep;
      const endRaOffset = Math.ceil((raSpan / 2) / raStep) * raStep;
      const baseRa = Math.round(cal.ra / raStep) * raStep;

      for (let dRa = startRaOffset; dRa <= endRaOffset + 1e-6; dRa += raStep) {
        const ra = (((baseRa + dRa) % 360) + 360) % 360;
        ctx.beginPath();
        let started = false;
        let labelPos: { x: number; y: number } | null = null;

        const numSamples = 60;
        for (let i = 0; i <= numSamples; i++) {
          const dec = minDec + ((maxDec - minDec) * i) / numSamples;
          const pt = skyCoordsToPixel(ra, dec, origW, origH, cal);
          if (pt && pt.x >= -50 && pt.x <= origW + 50 && pt.y >= -50 && pt.y <= origH + 50) {
            const sx = pt.x * scale;
            const sy = pt.y * scale;
            if (!started) {
              ctx.moveTo(sx, sy);
              started = true;
            } else {
              ctx.lineTo(sx, sy);
            }
            if (!labelPos && sx > 30 * uiScale && sx < cw - 120 * uiScale && sy > ch * 0.25 && sy < ch - 25 * uiScale) {
              labelPos = { x: sx, y: sy };
            }
          } else {
            started = false;
          }
        }
        ctx.stroke();

        if (labelPos) {
          const raText = `RA ${ra.toFixed(raStep < 1 ? 2 : 1)}°`;
          ctx.fillStyle = 'rgba(15, 23, 42, 0.82)';
          const tw = ctx.measureText(raText).width;
          ctx.fillRect(labelPos.x + 3, labelPos.y - 13 * uiScale, tw + 8, 17 * uiScale);
          ctx.fillStyle = '#7dd3fc';
          ctx.fillText(raText, labelPos.x + 7, labelPos.y - 1 * uiScale);
        }
      }

      // Draw Image Center Crosshair
      const cx = cw / 2;
      const cy = ch / 2;
      ctx.strokeStyle = '#f43f5e';
      ctx.lineWidth = 1.8 * uiScale;
      ctx.beginPath();
      ctx.arc(cx, cy, 14 * uiScale, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx - 22 * uiScale, cy);
      ctx.lineTo(cx - 6 * uiScale, cy);
      ctx.moveTo(cx + 6 * uiScale, cy);
      ctx.lineTo(cx + 22 * uiScale, cy);
      ctx.moveTo(cx, cy - 22 * uiScale);
      ctx.lineTo(cx, cy - 6 * uiScale);
      ctx.moveTo(cx, cy + 6 * uiScale);
      ctx.lineTo(cx, cy + 22 * uiScale);
      ctx.stroke();

      ctx.restore();

      drawCompassOnCanvas(
        ctx,
        cw - 52 * uiScale,
        52 * uiScale,
        cal.orientation,
        cal.parity,
        uiScale
      );
    }

    drawHeaderBadge(
      ctx,
      `천구 좌표 격자 (J2000 Equatorial WCS Grid)`,
      coordSubtitle,
      '#818cf8',
      uiScale
    );

    return canvas.toDataURL('image/jpeg', 0.92);
  })();

  // =========================================================================
  // 5. ORIGINAL LAYER (원본 천체 사진)
  // =========================================================================
  const originalUrl = (() => {
    if (rawSrc && rawSrc.startsWith('data:')) return rawSrc;
    const { canvas } = createBaseCanvas(0);
    return canvas.toDataURL('image/jpeg', 0.92);
  })();

  return {
    annotated: annotatedUrl,
    red_green: redGreenUrl,
    extraction: extractionUrl,
    grid: gridUrl,
    original: originalUrl,
  };
}

/**
 * Generate & trigger browser download for local WCS artifacts (WCS FITS header, KML, RDLS, AXY, CORR)
 */
export function downloadLocalSolverArtifact(
  data: SolvedAstroData,
  artifactType: 'wcs_file' | 'new_fits_file' | 'kml_file' | 'rdls_file' | 'axy_file' | 'corr_file'
) {
  const cal = data.calibration;
  if (!cal) return;

  const imgW =
    cal.width_arcsec && cal.pixscale && cal.pixscale > 0
      ? Math.round(cal.width_arcsec / cal.pixscale)
      : data.imageWidth || 1920;
  const imgH =
    cal.height_arcsec && cal.pixscale && cal.pixscale > 0
      ? Math.round(cal.height_arcsec / cal.pixscale)
      : data.imageHeight || 1080;

  const safeJob = String(data.jobId).replace(/[^a-zA-Z0-9_-]/g, '_');
  const deg2rad = Math.PI / 180;
  const rotRad = (cal.orientation || 0) * deg2rad;
  const p = cal.parity || 1;
  const scaleDeg = cal.pixscale / 3600;

  // CD matrix matching Astrometry.net TAN convention
  const cd11 = -p * scaleDeg * Math.cos(rotRad);
  const cd12 = scaleDeg * Math.sin(rotRad);
  const cd21 = -p * scaleDeg * Math.sin(rotRad);
  const cd22 = -scaleDeg * Math.cos(rotRad);

  let content = '';
  let mimeType = 'text/plain;charset=utf-8;';
  let filename = `${safeJob}_${artifactType}.txt`;

  if (artifactType === 'wcs_file') {
    const padCard = (key: string, val: string, comment: string) => {
      const line = `${key.padEnd(8, ' ')}= ${val.padStart(20, ' ')} / ${comment}`;
      return line.padEnd(80, ' ').slice(0, 80);
    };
    const cards = [
      padCard('SIMPLE', 'T', 'Standard FITS WCS Header (Browser Direct Solve)'),
      padCard('BITPIX', '8', '8-bit ASCII header'),
      padCard('NAXIS', '0', 'WCS header only'),
      padCard('WCSAXES', '2', 'Two celestial axes'),
      `CTYPE1  = 'RA---TAN'           / TAN (Gnomonic) projection                      `.slice(0, 80),
      `CTYPE2  = 'DEC--TAN'           / TAN (Gnomonic) projection                      `.slice(0, 80),
      `CUNIT1  = 'deg     '           / Angles in degrees                              `.slice(0, 80),
      `CUNIT2  = 'deg     '           / Angles in degrees                              `.slice(0, 80),
      padCard('CRPIX1', (imgW / 2 + 0.5).toFixed(4), 'Reference pixel X'),
      padCard('CRPIX2', (imgH / 2 + 0.5).toFixed(4), 'Reference pixel Y'),
      padCard('CRVAL1', cal.ra.toFixed(7), 'RA at reference pixel (deg J2000)'),
      padCard('CRVAL2', cal.dec.toFixed(7), 'Dec at reference pixel (deg J2000)'),
      padCard('CD1_1', cd11.toExponential(6), 'CD matrix (1,1)'),
      padCard('CD1_2', cd12.toExponential(6), 'CD matrix (1,2)'),
      padCard('CD2_1', cd21.toExponential(6), 'CD matrix (2,1)'),
      padCard('CD2_2', cd22.toExponential(6), 'CD matrix (2,2)'),
      padCard('IMAGEW', String(imgW), 'Image width in pixels'),
      padCard('IMAGEH', String(imgH), 'Image height in pixels'),
      'END'.padEnd(80, ' '),
    ];
    content = cards.join('\r\n');
    filename = `${safeJob}_wcs.fits.txt`;
  } else if (artifactType === 'new_fits_file') {
    content = JSON.stringify(
      {
        jobId: data.jobId,
        title: data.title,
        solver: 'AstroPlate Browser Direct WCS Engine (dstndstn/astrometry.net)',
        imageWidth: imgW,
        imageHeight: imgH,
        calibration: cal,
        cdMatrix: { cd11, cd12, cd21, cd22 },
        matchedConstellations: data.matchedConstellations,
        annotationsCount: data.annotations?.length || 0,
        detectedStarsCount: data.detectedStars?.length || 0,
      },
      null,
      2
    );
    mimeType = 'application/json;charset=utf-8;';
    filename = `${safeJob}_wcs_calibration.json`;
  } else if (artifactType === 'kml_file') {
    const halfW = ((cal.width_arcsec || imgW * cal.pixscale) / 3600) / 2;
    const halfH = ((cal.height_arcsec || imgH * cal.pixscale) / 3600) / 2;
    const lon = cal.ra - 180;
    content = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2" hint="target=sky">
  <Document>
    <name>${(data.title || safeJob).replace(/[<>&]/g, '')}</name>
    <GroundOverlay>
      <name>Browser WCS Solved Sky Overlay (#${data.jobId})</name>
      <LatLonBox>
        <north>${Math.min(90, cal.dec + halfH).toFixed(5)}</north>
        <south>${Math.max(-90, cal.dec - halfH).toFixed(5)}</south>
        <east>${(lon + halfW).toFixed(5)}</east>
        <west>${(lon - halfW).toFixed(5)}</west>
        <rotation>${cal.orientation.toFixed(2)}</rotation>
      </LatLonBox>
    </GroundOverlay>
  </Document>
</kml>`;
    mimeType = 'application/vnd.google-earth.kml+xml;charset=utf-8;';
    filename = `${safeJob}_sky_overlay.kml`;
  } else if (artifactType === 'rdls_file') {
    const rows = [
      'Index,Name,Type,RA_deg,Dec_deg,RA_HMS,Dec_DMS,Vmag',
      ...(data.annotations || []).map((a, idx) => {
        const sky = pixelToSkyCoords(
          a.pixelx,
          a.pixely,
          imgW,
          imgH,
          cal.ra,
          cal.dec,
          cal.pixscale,
          cal.orientation,
          cal.parity
        );
        return `${idx + 1},"${(a.names?.[0] || '').replace(/"/g, '""')}",${a.type},${sky.ra.toFixed(6)},${sky.dec.toFixed(6)},"${degToRA_HMS(sky.ra)}","${degToDec_DMS(sky.dec)}",${a.vmag ?? ''}`;
      }),
    ];
    content = '\uFEFF' + rows.join('\r\n');
    mimeType = 'text/csv;charset=utf-8;';
    filename = `${safeJob}_rdls_sky_coords.csv`;
  } else if (artifactType === 'axy_file') {
    const dsList = data.detectedStars || [];
    const rows = [
      'Rank,X_px,Y_px,Flux,Peak,Radius_px,InstMag',
      ...dsList.map(
        (s, idx) =>
          `${idx + 1},${s.x.toFixed(2)},${s.y.toFixed(2)},${s.flux.toFixed(1)},${(s.peak || 0).toFixed(1)},${s.radius.toFixed(2)},${s.instMag !== undefined ? s.instMag.toFixed(2) : ''}`
      ),
    ];
    content = '\uFEFF' + rows.join('\r\n');
    mimeType = 'text/csv;charset=utf-8;';
    filename = `${safeJob}_axy_detected_stars.csv`;
  } else if (artifactType === 'corr_file') {
    const rows = [
      'Index,CatalogName,Pixel_X,Pixel_Y,RA_deg,Dec_deg,RA_HMS,Dec_DMS,Vmag',
      ...(data.annotations || []).map((a, idx) => {
        const sky = pixelToSkyCoords(
          a.pixelx,
          a.pixely,
          imgW,
          imgH,
          cal.ra,
          cal.dec,
          cal.pixscale,
          cal.orientation,
          cal.parity
        );
        return `${idx + 1},"${(a.names?.[0] || '').replace(/"/g, '""')}",${a.pixelx.toFixed(2)},${a.pixely.toFixed(2)},${sky.ra.toFixed(6)},${sky.dec.toFixed(6)},"${degToRA_HMS(sky.ra)}","${degToDec_DMS(sky.dec)}",${a.vmag ?? ''}`;
      }),
    ];
    content = '\uFEFF' + rows.join('\r\n');
    mimeType = 'text/csv;charset=utf-8;';
    filename = `${safeJob}_corr_correspondences.csv`;
  }

  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
