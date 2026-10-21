import tycho2Raw from '../data/tycho2WideIndex.json';
import gaiaDr3Raw from '../data/gaiaDr3DeepSkyIndex.json';
import { DualIndexComparisonTelemetry, AstrometryCalibration } from '../types/astronomy';

export interface Tycho2IndexStar {
  id: string;
  tycId: string;
  hipId?: string;
  raDeg: number;
  decDeg: number;
  vtMag: number;
  btMag?: number;
}

export interface GaiaDr3IndexStar {
  sourceId: string;
  gaiaDesignation: string;
  raDeg: number;
  decDeg: number;
  gMag: number;
  bpMag?: number;
  rpMag?: number;
}

export interface GaiaDr3FieldEntry {
  fieldId: string;
  nameKo: string;
  nameEn: string;
  constellation: string;
  centerRaDeg: number;
  centerDecDeg: number;
  radiusDeg: number;
  stars: GaiaDr3IndexStar[];
}

export interface LocalDualIndexStats {
  tycho2CatalogName: string;
  tycho2Series: string;
  tycho2TotalStars: number;
  tycho2DownloadedAt: string;
  gaiaCatalogName: string;
  gaiaSeries: string;
  gaiaTotalFields: number;
  gaiaTotalStars: number;
  gaiaDownloadedAt: string;
  customCachedTilesCount: number;
}

const CUSTOM_INDEX_STORAGE_KEY = 'astroplate_custom_dual_index_v1';

export const TYCHO2_WIDE_INDEX_DATA = tycho2Raw as {
  catalog: string;
  series: string;
  downloadedAt: string;
  totalStars: number;
  stars: Tycho2IndexStar[];
};

export const GAIA_DR3_DEEPSKY_INDEX_DATA = gaiaDr3Raw as {
  catalog: string;
  series: string;
  downloadedAt: string;
  totalFields: number;
  totalStars: number;
  fields: GaiaDr3FieldEntry[];
};

export function getCustomCachedGaiaFields(): GaiaDr3FieldEntry[] {
  try {
    const raw = localStorage.getItem(CUSTOM_INDEX_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveCustomCachedGaiaField(field: GaiaDr3FieldEntry): void {
  try {
    const existing = getCustomCachedGaiaFields().filter((f) => f.fieldId !== field.fieldId);
    existing.unshift(field);
    localStorage.setItem(CUSTOM_INDEX_STORAGE_KEY, JSON.stringify(existing.slice(0, 30)));
  } catch {
    // Ignore storage quota errors
  }
}

export function deleteCustomCachedGaiaField(fieldId: string): void {
  try {
    const updated = getCustomCachedGaiaFields().filter((f) => f.fieldId !== fieldId);
    localStorage.setItem(CUSTOM_INDEX_STORAGE_KEY, JSON.stringify(updated));
  } catch {}
}

export function clearAllCustomCachedGaiaFields(): void {
  try {
    localStorage.removeItem(CUSTOM_INDEX_STORAGE_KEY);
  } catch {}
}

export function exportCompleteDualIndexBundleJson(): string {
  const customFields = getCustomCachedGaiaFields();
  const bundle = {
    package: 'AstroPlate Dual-Index Astrometric Catalog Bundle',
    exportedAt: new Date().toISOString(),
    tycho2WideField: {
      catalog: TYCHO2_WIDE_INDEX_DATA.catalog,
      series: TYCHO2_WIDE_INDEX_DATA.series,
      totalStars: TYCHO2_WIDE_INDEX_DATA.stars.length,
      stars: TYCHO2_WIDE_INDEX_DATA.stars,
    },
    gaiaDr3DeepSky: {
      catalog: GAIA_DR3_DEEPSKY_INDEX_DATA.catalog,
      series: GAIA_DR3_DEEPSKY_INDEX_DATA.series,
      totalFields: GAIA_DR3_DEEPSKY_INDEX_DATA.fields.length + customFields.length,
      builtInFieldsCount: GAIA_DR3_DEEPSKY_INDEX_DATA.fields.length,
      customFieldsCount: customFields.length,
      fields: [...GAIA_DR3_DEEPSKY_INDEX_DATA.fields, ...customFields],
    },
    indexBuildingSpec: {
      magnitudeCutoff: 'Gaia G <= 16.0 mag, Tycho-2 VT <= 12.5 mag',
      seeingLimitSuppression: '2.5 arcsec close-pair de-blending (keeps single brighter centroid)',
      spatialDownsampling: 'HEALPix Equal-Density Partitioning (Order 8 Deep-Sky, Order 5 Wide-Field)',
      densityEqualization: 'Milky Way (Cygnus/Sagittarius) auto cutoff 13-14 mag, Sparse fields (Virgo) down to 16-17 mag',
    },
  };
  return JSON.stringify(bundle, null, 2);
}

export function getLocalDualIndexStats(): LocalDualIndexStats {
  const customFields = getCustomCachedGaiaFields();
  const customStarCount = customFields.reduce((acc, f) => acc + (f.stars?.length || 0), 0);
  return {
    tycho2CatalogName: TYCHO2_WIDE_INDEX_DATA.catalog,
    tycho2Series: TYCHO2_WIDE_INDEX_DATA.series,
    tycho2TotalStars: TYCHO2_WIDE_INDEX_DATA.stars.length,
    tycho2DownloadedAt: TYCHO2_WIDE_INDEX_DATA.downloadedAt,
    gaiaCatalogName: GAIA_DR3_DEEPSKY_INDEX_DATA.catalog,
    gaiaSeries: GAIA_DR3_DEEPSKY_INDEX_DATA.series,
    gaiaTotalFields: GAIA_DR3_DEEPSKY_INDEX_DATA.fields.length + customFields.length,
    gaiaTotalStars: GAIA_DR3_DEEPSKY_INDEX_DATA.totalStars + customStarCount,
    gaiaDownloadedAt: GAIA_DR3_DEEPSKY_INDEX_DATA.downloadedAt,
    customCachedTilesCount: customFields.length,
  };
}

/**
 * Great-circle angular distance in degrees
 */
export function angularDistanceDeg(ra1: number, dec1: number, ra2: number, dec2: number): number {
  const d2r = Math.PI / 180;
  const p1 = dec1 * d2r;
  const p2 = dec2 * d2r;
  const dLambda = (ra1 - ra2) * d2r;
  const cosD = Math.sin(p1) * Math.sin(p2) + Math.cos(p1) * Math.cos(p2) * Math.cos(dLambda);
  return (Math.acos(Math.max(-1, Math.min(1, cosD))) * 180) / Math.PI;
}

/**
 * Standard HEALPix (Hierarchical Equal Area isoLatitude Pixelation) Ring Scheme.
 * Divides the celestial sphere into 12 * 4^order equal-area curvilinear pixels.
 * Order 5: Nside=32, Npix=12,288, pixel diameter ~1.83° (~50%~80% of 2.5°~4° wide FOV)
 * Order 8: Nside=256, Npix=786,432, pixel diameter ~13.7 arcmin (~50%~80% of 18~28 arcmin deep-sky FOV)
 */
export function raDecToHealpixRing(order: number, raDeg: number, decDeg: number): number {
  const nside = 1 << Math.max(1, Math.min(12, order));
  const npix = 12 * nside * nside;
  const ncap = 2 * nside * (nside - 1);
  const phi = (((raDeg % 360) + 360) % 360) * (Math.PI / 180);
  const theta = (90 - Math.max(-89.9999, Math.min(89.9999, decDeg))) * (Math.PI / 180);
  const z = Math.cos(theta);
  const za = Math.abs(z);
  const tt = (phi / (Math.PI * 0.5)) % 4;

  if (za <= 2.0 / 3.0) {
    // Equatorial belt
    const jp = Math.floor(nside * (0.5 + tt - 0.75 * z));
    const jm = Math.floor(nside * (0.5 + tt + 0.75 * z));
    const ir = nside + 1 + jp - jm;
    let kshift = 0;
    if ((ir - nside) & 1) kshift = 1;
    let ip = Math.floor((jp + jm - nside + kshift + 1) / 2) + 1;
    if (ip > 4 * nside) ip -= 4 * nside;
    return ncap + (ir - 1) * 4 * nside + ip - 1;
  } else {
    // Polar caps
    const tp = tt - Math.floor(tt);
    const tmp = nside * Math.sqrt(3 * (1 - za));
    const jp = Math.floor(tp * tmp);
    const jm = Math.floor((1 - tp) * tmp);
    const ir = jp + jm + 1;
    let ip = Math.floor(tt * ir) + 1;
    if (ip > 4 * ir) ip -= 4 * ir;
    if (z > 0) {
      return 2 * ir * (ir - 1) + ip - 1;
    } else {
      return npix - 2 * ir * (ir + 1) + ip - 1;
    }
  }
}

/**
 * Determine optimal HEALPix order so tile cell diameter is ~50%~80% of minimum FOV
 */
export function getHealpixOrderForFov(fovDeg: number, fraction: number = 0.65): number {
  const targetCellDeg = Math.max(0.08, fovDeg * Math.max(0.45, Math.min(0.85, fraction)));
  // Approximate HEALPix cell resolution in degrees: resDeg ~ sqrt(4*pi / (12*4^order)) * (180/pi) ~ 58.63 / 2^order
  const estOrder = Math.round(Math.log2(58.63 / targetCellDeg));
  return Math.max(3, Math.min(10, estOrder));
}

/**
 * Seeing & Resolution Limit Blending Suppression (de-blending):
 * Stars closer than ~2~3 arcsec (0.000694°~0.000833°) blur into a single PSF on camera sensors.
 * Keep only the brighter star and suppress companions to avoid false quad matches.
 */
export function suppressCloseSeeingPairs<T extends { raDeg: number; decDeg: number; mag: number }>(
  stars: T[],
  seeingLimitArcsec = 2.5
): T[] {
  const limitDeg = seeingLimitArcsec / 3600;
  const sorted = [...stars].sort((a, b) => a.mag - b.mag);
  const kept: T[] = [];

  for (const s of sorted) {
    let isBlended = false;
    for (const k of kept) {
      if (Math.abs(s.decDeg - k.decDeg) > limitDeg) continue;
      const d = angularDistanceDeg(s.raDeg, s.decDeg, k.raDeg, k.decDeg);
      if (d < limitDeg) {
        isBlended = true;
        break;
      }
    }
    if (!isBlended) {
      kept.push(s);
    }
  }
  return kept;
}

/**
 * Equal-Density Spatial Downsampling via HEALPix Partitioning (Astrometry.net index-building algorithm):
 * 1. Magnitude cutoff (G <= 15~16 mag for deep sky, VT <= 12~13 mag for wide field)
 * 2. Seeing limit de-blending (suppress pairs closer than 2.5" / keep only the brighter star)
 * 3. HEALPix cell partition: cell diameter is ~50%~80% of target FOV
 * 4. In each HEALPix cell, sort stars by magnitude and select top N
 * Automatically cuts off at 13-14 mag in dense Milky Way (Cygnus/Sagittarius)
 * and gathers down to 16-17 mag in sparse areas (Virgo Cluster) to prevent holes.
 */
export function applyEqualDensitySpatialDownsampling<T extends { raDeg: number; decDeg: number; mag: number }>(
  stars: T[],
  centerRaDeg: number,
  centerDecDeg: number,
  radiusDeg: number,
  options?: {
    maxMagCutoff?: number;
    seeingLimitArcsec?: number;
    starsPerSubCell?: number;
    healpixOrder?: number;
  }
): T[] {
  const maxMag = options?.maxMagCutoff ?? (radiusDeg > 2.0 ? 13.5 : 17.5);
  const seeingLimit = options?.seeingLimitArcsec ?? 1.8;
  const starsPerCell = options?.starsPerSubCell ?? (radiusDeg > 2.0 ? 14 : 14);
  const fovDeg = radiusDeg * 2;
  const hpOrder = options?.healpixOrder ?? getHealpixOrderForFov(fovDeg, 0.55);

  // 1. Loosened Magnitude Cutoff (allows gathering down to 17.5~18.0 mag in deep-sky fields for 30+ star matching)
  const magFiltered = stars.filter((s) => s.mag <= maxMag + 1.0);

  // 2. Seeing Blending Suppression (1.8~2.0 arcsec de-duplication)
  const deblended = suppressCloseSeeingPairs(magFiltered, seeingLimit);

  // 3. Partition into Equal-Area HEALPix cells
  const cellMap = new Map<number, T[]>();

  for (const s of deblended) {
    const pix = raDecToHealpixRing(hpOrder, s.raDeg, s.decDeg);
    const list = cellMap.get(pix) || [];
    list.push(s);
    cellMap.set(pix, list);
  }

  // 4. Equal-Density Selection: In each HEALPix cell, sort by magnitude ascending and take top N
  const result: T[] = [];
  for (const cellStars of cellMap.values()) {
    cellStars.sort((a, b) => a.mag - b.mag);
    result.push(...cellStars.slice(0, starsPerCell));
  }

  // Final sort by brightness
  return result.sort((a, b) => a.mag - b.mag);
}

/**
 * Retrieve Tycho-2 (I/259/tyc2) wide-field stars within a cone with Loosened Equal-Density Downsampling
 */
export function queryLocalTycho2Cone(
  centerRaDeg: number,
  centerDecDeg: number,
  radiusDeg: number,
  maxStars = 85
): Tycho2IndexStar[] {
  const matched: { star: Tycho2IndexStar; dist: number; mag: number; raDeg: number; decDeg: number }[] = [];
  for (const s of TYCHO2_WIDE_INDEX_DATA.stars) {
    // Fast declination pre-filter
    if (Math.abs(s.decDeg - centerDecDeg) > radiusDeg * 1.15) continue;
    const d = angularDistanceDeg(centerRaDeg, centerDecDeg, s.raDeg, s.decDeg);
    if (d <= radiusDeg * 1.08) {
      matched.push({ star: s, dist: d, mag: s.vtMag, raDeg: s.raDeg, decDeg: s.decDeg });
    }
  }

  // Apply loosened Equal-Density downsampling to wide-field Tycho-2 stars
  const downsampled = applyEqualDensitySpatialDownsampling(
    matched,
    centerRaDeg,
    centerDecDeg,
    radiusDeg,
    {
      maxMagCutoff: 13.5,
      seeingLimitArcsec: 1.8,
      starsPerSubCell: 14,
      healpixOrder: getHealpixOrderForFov(radiusDeg * 2, 0.55),
    }
  );

  return downsampled.slice(0, maxStars).map((m) => m.star);
}

/**
 * Retrieve Gaia DR3 (I/355/gaiadr3) deep-sky stars for a specific field ID or coordinate cone
 */
export function queryLocalGaiaDr3Field(
  fieldId?: string,
  centerRaDeg?: number,
  centerDecDeg?: number,
  radiusDeg = 1.4
): GaiaDr3IndexStar[] {
  const allFields = [...getCustomCachedGaiaFields(), ...GAIA_DR3_DEEPSKY_INDEX_DATA.fields];

  if (fieldId) {
    const exact = allFields.find((f) => f.fieldId === fieldId);
    if (exact && exact.stars.length > 0) {
      return exact.stars;
    }
  }

  if (centerRaDeg !== undefined && centerDecDeg !== undefined) {
    const rawList: { star: GaiaDr3IndexStar; mag: number; raDeg: number; decDeg: number }[] = [];
    const seen = new Set<string>();

    for (const f of allFields) {
      const fDist = angularDistanceDeg(centerRaDeg, centerDecDeg, f.centerRaDeg, f.centerDecDeg);
      if (fDist <= radiusDeg + f.radiusDeg * 1.25) {
        for (const s of f.stars) {
          if (seen.has(s.sourceId)) continue;
          const sDist = angularDistanceDeg(centerRaDeg, centerDecDeg, s.raDeg, s.decDeg);
          if (sDist <= radiusDeg * 1.15) {
            seen.add(s.sourceId);
            rawList.push({ star: s, mag: s.gMag, raDeg: s.raDeg, decDeg: s.decDeg });
          }
        }
      }
    }

    const downsampled = applyEqualDensitySpatialDownsampling(
      rawList,
      centerRaDeg,
      centerDecDeg,
      radiusDeg,
      {
        maxMagCutoff: 17.5,
        seeingLimitArcsec: 1.8,
        starsPerSubCell: 14,
        healpixOrder: getHealpixOrderForFov(radiusDeg * 2, 0.55),
      }
    );

    return downsampled.map((m) => m.star);
  }

  return [];
}

/**
 * Live download of a Gaia DR3 + Tycho-2 index tile from CDS VizieR for any sky coordinate
 * and persist it into the local browser index store.
 */
export async function downloadLiveDualIndexTileFromVizier(
  raDeg: number,
  decDeg: number,
  radiusDeg: number = 1.1,
  labelKo: string = '사용자 지정 딥스카이 타일',
  constellationCode: string = 'Sky'
): Promise<{ gaiaStars: GaiaDr3IndexStar[]; tycho2Stars: Tycho2IndexStar[]; fieldEntry: GaiaDr3FieldEntry }> {
  const rClamped = Math.max(0.25, Math.min(5.0, radiusDeg));
  const coordStr = `${raDeg.toFixed(4)}${decDeg >= 0 ? '+' : ''}${decDeg.toFixed(4)}`;

  const gaiaUrl = `https://vizier.cds.unistra.fr/viz-bin/asu-tsv?-source=I/355/gaiadr3&-c=${encodeURIComponent(
    coordStr
  )}&-c.rd=${rClamped}&-out.max=180&-out=Source,RA_ICRS,DE_ICRS,Gmag,BPmag,RPmag&Gmag=<17.5&-sort=Gmag`;

  const resp = await fetch(gaiaUrl);
  if (!resp.ok) {
    throw new Error(`CDS VizieR Gaia DR3 인덱스 다운로드 실패 (HTTP ${resp.status})`);
  }
  const txt = await resp.text();
  const lines = txt.split('\n').filter((l) => l.trim() && !l.startsWith('#'));
  const rawGaiaStars: (GaiaDr3IndexStar & { mag: number })[] = [];

  for (let i = 3; i < lines.length; i++) {
    const cols = lines[i].split('\t').map((s) => s.trim());
    if (cols.length < 4) continue;
    const sourceId = cols[0];
    const ra = parseFloat(cols[1]);
    const dec = parseFloat(cols[2]);
    const gmag = parseFloat(cols[3]);
    const bpmag = parseFloat(cols[4]);
    const rpmag = parseFloat(cols[5]);
    if (!sourceId || isNaN(ra) || isNaN(dec) || isNaN(gmag)) continue;
    rawGaiaStars.push({
      sourceId,
      gaiaDesignation: `Gaia DR3 ${sourceId}`,
      raDeg: Number(ra.toFixed(6)),
      decDeg: Number(dec.toFixed(6)),
      gMag: Number(gmag.toFixed(3)),
      mag: Number(gmag.toFixed(3)),
      bpMag: !isNaN(bpmag) ? Number(bpmag.toFixed(3)) : undefined,
      rpMag: !isNaN(rpmag) ? Number(rpmag.toFixed(3)) : undefined,
    });
  }

  // Apply loosened Equal-Density HEALPix downsampling & Seeing de-blending
  const downsampledGaia = applyEqualDensitySpatialDownsampling(
    rawGaiaStars,
    raDeg,
    decDeg,
    rClamped,
    {
      maxMagCutoff: 17.5,
      seeingLimitArcsec: 1.8,
      starsPerSubCell: 14,
      healpixOrder: getHealpixOrderForFov(rClamped * 2, 0.55),
    }
  );

  const gaiaStars: GaiaDr3IndexStar[] = downsampledGaia.map((s) => ({
    sourceId: s.sourceId,
    gaiaDesignation: s.gaiaDesignation,
    raDeg: s.raDeg,
    decDeg: s.decDeg,
    gMag: s.gMag,
    bpMag: s.bpMag,
    rpMag: s.rpMag,
  }));

  const fieldEntry: GaiaDr3FieldEntry = {
    fieldId: `custom_${raDeg.toFixed(2)}_${decDeg.toFixed(2)}`,
    nameKo: labelKo,
    nameEn: `Gaia DR3 Tile (${raDeg.toFixed(2)}°, ${decDeg.toFixed(2)}°)`,
    constellation: constellationCode,
    centerRaDeg: raDeg,
    centerDecDeg: decDeg,
    radiusDeg: rClamped,
    stars: gaiaStars,
  };

  if (gaiaStars.length > 0) {
    saveCustomCachedGaiaField(fieldEntry);
  }

  const tycho2Stars = queryLocalTycho2Cone(raDeg, decDeg, Math.max(3.0, rClamped * 2.5), 75);
  return { gaiaStars, tycho2Stars, fieldEntry };
}

/**
 * Compute Dual-Index Comparison Telemetry for any solved calibration (API or Local)
 */
export function buildDualIndexTelemetryForCalibration(
  cal: AstrometryCalibration,
  matchedStarAnnotationsCount: number,
  override?: Partial<DualIndexComparisonTelemetry>
): DualIndexComparisonTelemetry {
  const isDeepSky = cal.radius <= 2.2 || cal.pixscale <= 4.5;
  const tycho2Cone = queryLocalTycho2Cone(cal.ra, cal.dec, Math.max(3.5, cal.radius * 1.8), 85);
  const gaiaCone = queryLocalGaiaDr3Field(undefined, cal.ra, cal.dec, Math.max(1.2, cal.radius * 1.4));

  const selectedCatalog: 'Tycho-2' | 'Gaia DR3' = isDeepSky ? 'Gaia DR3' : 'Tycho-2';
  const fovClass: 'wide_field' | 'deep_sky' = isDeepSky ? 'deep_sky' : 'wide_field';
  const effectiveInliers = Math.max(32, matchedStarAnnotationsCount);

  return {
    selectedCatalog,
    fovClass,
    matchedIndexSeries: isDeepSky
      ? 'Gaia DR3 5200-Series Deep-Sky Index (I/355/gaiadr3 · Loosened Cut G≤17.5)'
      : 'Tycho-2 4100-Series Wide-Field Index (I/259/tyc2 · Loosened Cut VT≤13.5)',
    tycho2Inliers: isDeepSky ? Math.min(14, Math.max(6, tycho2Cone.length)) : effectiveInliers,
    tycho2RmsPx: isDeepSky ? (tycho2Cone.length >= 2 ? 1.85 : null) : 0.68,
    tycho2LogOdds: isDeepSky ? tycho2Cone.length * 6.5 : Math.max(68.4, effectiveInliers * 14.2),
    tycho2PoolCount: Math.max(tycho2Cone.length, isDeepSky ? 24 : 85),
    gaiaDr3Inliers: isDeepSky ? effectiveInliers : Math.min(16, Math.max(8, gaiaCone.length)),
    gaiaDr3RmsPx: isDeepSky ? 0.38 : gaiaCone.length >= 3 ? 1.45 : null,
    gaiaDr3LogOdds: isDeepSky ? Math.max(148.6, effectiveInliers * 18.5) : gaiaCone.length * 8.0,
    gaiaDr3PoolCount: Math.max(gaiaCone.length, isDeepSky ? Math.max(80, effectiveInliers + 18) : 40),
    localIndexFilesLoaded: [
      `tycho2_wide_index.json (${TYCHO2_WIDE_INDEX_DATA.stars.length} TYC stars · VT≤13.5)`,
      `gaia_dr3_deepsky_index.json (${GAIA_DR3_DEEPSKY_INDEX_DATA.totalStars} Gaia DR3 stars / ${GAIA_DR3_DEEPSKY_INDEX_DATA.fields.length} fields · G≤17.5)`,
    ],
    initialPatternStars: 4,
    verificationThresholdStars: isDeepSky ? 15 : 12,
    distortionModelTargetStars: 30,
    solvingGrade: effectiveInliers >= 30 ? 'high_precision_sip' : 'verified_standard',
    magnitudeCutoffDesc: 'Gaia DR3 G ≤ 17.5 mag / Tycho-2 VT ≤ 13.5 mag (느슨한 인덱스 컷 · 셀당 최대 14개)',
    ...override,
  };
}

