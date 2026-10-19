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

export interface SolvedAstroData {
  jobId: number | string;
  title?: string;
  imageUrl: string;
  rawImageUrl?: string;
  imageWidth?: number;
  imageHeight?: number;
  calibration: AstrometryCalibration;
  annotations: AstrometryAnnotationItem[];
  info: AstrometryJobInfo;
  matchedConstellations: ConstellationMatch[];
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
  coordinatesHMS: string | null;
  raDeg: number | null;
  decDeg: number | null;
  vMag: number | null;
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

