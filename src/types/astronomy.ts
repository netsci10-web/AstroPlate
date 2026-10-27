export interface AstrometryCalibration {
  ra: number; // Center RA in degrees (0..360)
  dec: number; // Center Dec in degrees (-90..+90)
  radius: number; // Field radius in degrees
  pixscale: number; // Pixel scale in arcsec/pixel
  orientation: number; // Orientation angle in degrees (up is east of north)
  parity: number; // Parity: 1.0 or -1.0
  width_arcsec?: number;
  height_arcsec?: number;
}

export interface AstrometryAnnotationItem {
  type: string; // 'bright', 'ngc', 'ic', 'messier', 'hd', etc.
  names: string[];
  pixelx: number;
  pixely: number;
  radius?: number;
  vmag?: number;
}

export interface AstrometryJobInfo {
  status: string;
  objects_in_field: string[];
  machine_tags: string[];
  tags: string[];
  original_filename?: string;
  calibration?: AstrometryCalibration;
}

export interface DetectedStarItem {
  x: number;
  y: number;
  flux: number;
  peak?: number;
  radius: number;
  instMag?: number;
  fwhm?: number;
  ellipticity?: number;
  axisRatio?: number;
  snr?: number;
}

export interface NebulaPipelineTelemetry {
  hotPixelsRemoved: number;
  topHatKernelRadiusPx: number;
  meanNebulaSuppressed: number;
  meshGridSize: string;
  medianSkyBg: number;
  medianLocalSigma: number;
  dogSigma1: number;
  dogSigma2: number;
  rawConnectedComponents: number;
  rejectedFwhmBlobs: number;
  rejectedElongatedFilaments: number;
  verifiedPointStars: number;
  quadBuildingTopK: number;
  meanStarFwhmPx: number;
  meanStarAxisRatio: number;
  executionTimeMs: number;
}

export interface DualIndexComparisonTelemetry {
  selectedCatalog: 'Tycho-2' | 'Gaia DR3';
  fovClass: 'wide_field' | 'deep_sky';
  matchedIndexSeries: string;
  tycho2Inliers: number;
  tycho2RmsPx: number | null;
  tycho2LogOdds: number;
  tycho2PoolCount: number;
  gaiaDr3Inliers: number;
  gaiaDr3RmsPx: number | null;
  gaiaDr3LogOdds: number;
  gaiaDr3PoolCount: number;
  localIndexFilesLoaded: string[];
  initialPatternStars?: number;
  verificationThresholdStars?: number;
  distortionModelTargetStars?: number;
  solvingGrade?: 'high_precision_sip' | 'verified_standard' | 'sparse_field';
  magnitudeCutoffDesc?: string;
}

export interface SolvedAstroData {
  jobId: number | string;
  solverType?: 'local' | 'astrometry';
  title?: string;
  imageUrl: string;
  rawImageUrl?: string;
  imageWidth?: number;
  imageHeight?: number;
  calibration: AstrometryCalibration;
  annotations: AstrometryAnnotationItem[];
  info: AstrometryJobInfo;
  matchedConstellations: ConstellationMatch[];
  detectedStars?: DetectedStarItem[];
  dualIndexTelemetry?: DualIndexComparisonTelemetry;
  nebulaPipelineTelemetry?: NebulaPipelineTelemetry;
}

export interface ConstellationMatch {
  code: string; // e.g. "Cas"
  nameKo: string; // "카시오페이아자리"
  nameEn: string; // "Cassiopeia"
  genitive: string; // "Cassiopeiae"
  family: string; // "Perseus family"
  brightestStar: string; // "Shedar (α Cas)"
  isPrimary: boolean;
  starsCountInField: number;
}

export interface ConstellationDefinition {
  code: string;
  nameEn: string;
  nameKo: string;
  raCenter: number; // in hours (0..24)
  decCenter: number; // in degrees
  lines: [string, string][]; // Pairs of star identifiers or Bayer letters e.g. ['alpha', 'beta']
  stars: {
    bayer: string;
    greek: string;
    flamsteed?: number;
    name?: string;
    ra: number; // degrees
    dec: number; // degrees
    mag: number;
  }[];
}

export interface SimbadObjectData {
  query: string;
  standardName: string;
  objectType: string;
  objectTypeDescKo?: string | null;
  coordinatesHMS: string | null;
  raDeg: number | null;
  decDeg: number | null;
  vMag: number | null;
  bMag?: number | null;
  gMag?: number | null;
  jMag?: number | null;
  spectralType?: string | null;
  parallaxMas?: number | null;
  radialVelocityKms?: number | null;
  properMotionMasYr?: number | null;
  source: string;
}

export interface AnalysisHistoryItem {
  id: string;
  jobId: number | string;
  title: string;
  imageUrl: string;
  rawImageUrl?: string;
  timestamp: number;
  raDeg: number;
  decDeg: number;
  radiusDeg: number;
  primaryConstellationKo: string;
  primaryConstellationCode: string;
  starsCount: number;
  dsosCount: number;
  objects?: string[];
  solvedData?: SolvedAstroData;
}

