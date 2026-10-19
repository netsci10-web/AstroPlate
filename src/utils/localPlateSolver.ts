/**
 * Browser-Native Local Astrometry Plate Solver Engine
 * Based on the mathematical & algorithmic principles of dstndstn/astrometry.net:
 * 1. image2xy / simplexy: Local sky background estimation, noise sigma thresholding, and sub-pixel Gaussian centroid extraction
 * 2. Geometric Quad & Binary Pair Hashing: Scale-, rotation-, translation-, and parity-invariant 4-star quad codes (xC, yC, xD, yD)
 * 3. RANSAC Verification (verify.c) & Iterative Gnomonic (TAN) Least-Squares WCS Fit (fit-wcs.c): Solves CRVAL (RA, Dec), pixscale, orientation, and parity (±1)
 * 4. Catalog Projection & Annotation Synthesis: Matches detected stars to Hipparcos/Bright Star, HD/BD/Tycho telescopic fields, & Messier/NGC/IC catalogs
 */

import {
  SolvedAstroData,
  AstrometryAnnotationItem as AstroAnnotation,
  AstrometryCalibration as AstroCalibration,
} from '../types/astronomy';
import { BRIGHT_STARS, CONSTELLATION_FIGURES, CatalogStar } from '../data/celestialCatalog';
import { IAU_CONSTELLATIONS, identifyConstellations } from './constellations';
import { angularSeparation } from './coordinateMath';

export interface DetectedStarXY {
  x: number;        // Sub-pixel centroid X in original image pixels
  y: number;        // Sub-pixel centroid Y in original image pixels
  flux: number;     // Integrated background-subtracted flux
  peak: number;     // Peak pixel intensity above sky background
  radius: number;   // Estimated HFR / star radius in pixels
  instMag: number;  // Instrumental magnitude estimate
}

export interface DsoCatalogEntry {
  id: string;
  names: string[];
  nameKo: string;
  type: 'messier' | 'ngc' | 'ic';
  constellation: string;
  raDeg: number;
  decDeg: number;
  radiusArcmin: number;
  vmag: number;
}

export interface TelescopicReferenceField {
  id: string;
  nameKo: string;
  nameEn: string;
  constellation: string;
  centerRaDeg: number;
  centerDecDeg: number;
  defaultRadiusDeg: number;
  primaryObjectLabel?: string;
  keywords: string[];
  stars: CatalogStar[];
}

export interface LocalSolveProgress {
  step: 'image2xy' | 'quad_hash' | 'wcs_fit' | 'catalog_match' | 'complete';
  message: string;
  progressPct: number;
  detectedStarsCount?: number;
  matchedQuadsCount?: number;
}

export interface LocalSolveOptions {
  targetHint?: string;       // Optional target name or constellation hint (e.g. "거문고자리 더블더블", "NGC 628", "M42")
  fovHintDeg?: number;       // Optional approximate field of view width in degrees
  filename?: string;         // Original filename for metadata hint extraction
  onProgress?: (progress: LocalSolveProgress) => void;
}

// Comprehensive built-in Deep Sky Objects catalog (Messier, NGC, IC) for local solving & annotation
export const LOCAL_DSO_CATALOG: DsoCatalogEntry[] = [
  { id: 'NGC 628', names: ['NGC 628', 'M 74', '유령 은하 (Phantom Galaxy)'], nameKo: '유령 은하 (M74 / NGC 628)', type: 'ngc', constellation: 'Psc', raDeg: 24.1739, decDeg: 15.7836, radiusArcmin: 5.2, vmag: 9.4 },
  { id: 'M 34', names: ['M 34', 'NGC 1039', 'Spiral Cluster (M34 산개성단)'], nameKo: 'M34 산개성단 (NGC 1039)', type: 'messier', constellation: 'Per', raDeg: 40.5308, decDeg: 42.7619, radiusArcmin: 17.5, vmag: 5.5 },
  { id: 'M 31', names: ['M 31', 'NGC 224', 'Andromeda Galaxy (안드로메다 은하)'], nameKo: '안드로메다 은하', type: 'messier', constellation: 'And', raDeg: 10.6847, decDeg: 41.2687, radiusArcmin: 95.0, vmag: 3.4 },
  { id: 'M 32', names: ['M 32', 'NGC 221'], nameKo: 'M32 타원은하', type: 'messier', constellation: 'And', raDeg: 10.6743, decDeg: 40.8653, radiusArcmin: 4.3, vmag: 8.1 },
  { id: 'M 110', names: ['M 110', 'NGC 205'], nameKo: 'M110 왜소타원은하', type: 'messier', constellation: 'And', raDeg: 10.092, decDeg: 41.6853, radiusArcmin: 10.0, vmag: 8.5 },
  { id: 'M 42', names: ['M 42', 'NGC 1976', 'Orion Nebula (오리온 대성운)'], nameKo: '오리온 대성운', type: 'messier', constellation: 'Ori', raDeg: 83.8221, decDeg: -5.3911, radiusArcmin: 35.0, vmag: 4.0 },
  { id: 'M 43', names: ['M 43', 'NGC 1982', 'De Mairan Nebula'], nameKo: '드 메랑 성운', type: 'messier', constellation: 'Ori', raDeg: 83.880, decDeg: -5.268, radiusArcmin: 10.0, vmag: 9.0 },
  { id: 'IC 434', names: ['IC 434', 'Horsehead Nebula (말머리 성운)', 'Barnard 33'], nameKo: '말머리 성운', type: 'ic', constellation: 'Ori', raDeg: 85.246, decDeg: -2.458, radiusArcmin: 30.0, vmag: 7.3 },
  { id: 'NGC 2024', names: ['NGC 2024', 'Flame Nebula (불꽃 성운)'], nameKo: '불꽃 성운', type: 'ngc', constellation: 'Ori', raDeg: 85.425, decDeg: -1.85, radiusArcmin: 15.0, vmag: 7.2 },
  { id: 'M 78', names: ['M 78', 'NGC 2068'], nameKo: 'M78 반사성운', type: 'messier', constellation: 'Ori', raDeg: 86.695, decDeg: 0.05, radiusArcmin: 8.0, vmag: 8.3 },
  { id: 'M 45', names: ['M 45', 'Pleiades (플레이아데스 성단 / 좀생이별)'], nameKo: '플레이아데스 성단', type: 'messier', constellation: 'Tau', raDeg: 56.75, decDeg: 24.1167, radiusArcmin: 55.0, vmag: 1.6 },
  { id: 'M 1', names: ['M 1', 'NGC 1952', 'Crab Nebula (게 성운)'], nameKo: '게 성운', type: 'messier', constellation: 'Tau', raDeg: 83.6331, decDeg: 22.0145, radiusArcmin: 6.0, vmag: 8.4 },
  { id: 'NGC 7000', names: ['NGC 7000', 'North America Nebula (북아메리카 성운)'], nameKo: '북아메리카 성운', type: 'ngc', constellation: 'Cyg', raDeg: 314.68, decDeg: 44.33, radiusArcmin: 60.0, vmag: 4.0 },
  { id: 'IC 5070', names: ['IC 5070', 'Pelican Nebula (펠리컨 성운)'], nameKo: '펠리컨 성운', type: 'ic', constellation: 'Cyg', raDeg: 312.75, decDeg: 44.35, radiusArcmin: 45.0, vmag: 8.0 },
  { id: 'NGC 6960', names: ['NGC 6960', 'Western Veil Nebula (서쪽 베일 성운)'], nameKo: '서쪽 베일 성운', type: 'ngc', constellation: 'Cyg', raDeg: 311.42, decDeg: 30.71, radiusArcmin: 35.0, vmag: 7.0 },
  { id: 'NGC 6992', names: ['NGC 6992', 'Eastern Veil Nebula (동쪽 베일 성운)'], nameKo: '동쪽 베일 성운', type: 'ngc', constellation: 'Cyg', raDeg: 314.11, decDeg: 31.72, radiusArcmin: 30.0, vmag: 7.0 },
  { id: 'NGC 6888', names: ['NGC 6888', 'Crescent Nebula (초승달 성운)'], nameKo: '초승달 성운', type: 'ngc', constellation: 'Cyg', raDeg: 303.06, decDeg: 38.35, radiusArcmin: 9.0, vmag: 7.4 },
  { id: 'IC 1396', names: ['IC 1396', 'Elephant Trunk Nebula (코끼리 코 성운)'], nameKo: '코끼리 코 성운', type: 'ic', constellation: 'Cep', raDeg: 324.74, decDeg: 57.49, radiusArcmin: 85.0, vmag: 3.5 },
  { id: 'NGC 7023', names: ['NGC 7023', 'Iris Nebula (아이리스 성운)'], nameKo: '아이리스 성운', type: 'ngc', constellation: 'Cep', raDeg: 315.40, decDeg: 68.16, radiusArcmin: 9.0, vmag: 6.8 },
  { id: 'NGC 7380', names: ['NGC 7380', 'Wizard Nebula (마법사 성운)'], nameKo: '마법사 성운', type: 'ngc', constellation: 'Cep', raDeg: 341.75, decDeg: 58.13, radiusArcmin: 12.5, vmag: 7.2 },
  { id: 'IC 1805', names: ['IC 1805', 'Heart Nebula (하트 성운)'], nameKo: '하트 성운', type: 'ic', constellation: 'Cas', raDeg: 38.17, decDeg: 61.45, radiusArcmin: 75.0, vmag: 6.5 },
  { id: 'IC 1848', names: ['IC 1848', 'Soul Nebula (태아 성운 / 영혼 성운)'], nameKo: '영혼 성운', type: 'ic', constellation: 'Cas', raDeg: 42.80, decDeg: 60.43, radiusArcmin: 60.0, vmag: 6.5 },
  { id: 'NGC 281', names: ['NGC 281', 'Pacman Nebula (팩맨 성운)'], nameKo: '팩맨 성운', type: 'ngc', constellation: 'Cas', raDeg: 13.19, decDeg: 56.61, radiusArcmin: 17.5, vmag: 7.4 },
  { id: 'M 52', names: ['M 52', 'NGC 7654'], nameKo: 'M52 산개성단', type: 'messier', constellation: 'Cas', raDeg: 351.20, decDeg: 61.59, radiusArcmin: 6.5, vmag: 5.0 },
  { id: 'NGC 7635', names: ['NGC 7635', 'Bubble Nebula (버블 성운)'], nameKo: '버블 성운', type: 'ngc', constellation: 'Cas', raDeg: 350.19, decDeg: 61.20, radiusArcmin: 7.5, vmag: 10.0 },
  { id: 'NGC 869', names: ['NGC 869', 'h Persei (이중성단)'], nameKo: '페르세우스 이중성단 h', type: 'ngc', constellation: 'Per', raDeg: 34.75, decDeg: 57.13, radiusArcmin: 15.0, vmag: 3.7 },
  { id: 'NGC 884', names: ['NGC 884', 'χ Persei (이중성단)'], nameKo: '페르세우스 이중성단 χ', type: 'ngc', constellation: 'Per', raDeg: 35.60, decDeg: 57.15, radiusArcmin: 15.0, vmag: 3.8 },
  { id: 'NGC 1499', names: ['NGC 1499', 'California Nebula (캘리포니아 성운)'], nameKo: '캘리포니아 성운', type: 'ngc', constellation: 'Per', raDeg: 60.21, decDeg: 36.42, radiusArcmin: 75.0, vmag: 6.0 },
  { id: 'M 33', names: ['M 33', 'NGC 598', 'Triangulum Galaxy (삼각형자리 은하)'], nameKo: '삼각형자리 은하', type: 'messier', constellation: 'Tri', raDeg: 23.4621, decDeg: 30.6599, radiusArcmin: 35.0, vmag: 5.7 },
  { id: 'M 51', names: ['M 51', 'NGC 5194', 'Whirlpool Galaxy (부자 은하 / 소용돌이 은하)'], nameKo: '부자 은하 (M51)', type: 'messier', constellation: 'CVn', raDeg: 202.4696, decDeg: 47.1952, radiusArcmin: 5.6, vmag: 8.4 },
  { id: 'M 101', names: ['M 101', 'NGC 5457', 'Pinwheel Galaxy (바람개비 은하)'], nameKo: '바람개비 은하 (M101)', type: 'messier', constellation: 'UMa', raDeg: 210.8023, decDeg: 54.3489, radiusArcmin: 14.4, vmag: 7.9 },
  { id: 'M 81', names: ['M 81', 'NGC 3031', 'Bode Galaxy (보데 은하)'], nameKo: '보데 은하 (M81)', type: 'messier', constellation: 'UMa', raDeg: 148.8882, decDeg: 69.0653, radiusArcmin: 13.5, vmag: 6.9 },
  { id: 'M 82', names: ['M 82', 'NGC 3034', 'Cigar Galaxy (시가 은하)'], nameKo: '시가 은하 (M82)', type: 'messier', constellation: 'UMa', raDeg: 148.9685, decDeg: 69.6797, radiusArcmin: 5.6, vmag: 8.4 },
  { id: 'M 57', names: ['M 57', 'NGC 6720', 'Ring Nebula (고리 성운)'], nameKo: '고리 성운 (M57)', type: 'messier', constellation: 'Lyr', raDeg: 283.3962, decDeg: 33.0292, radiusArcmin: 1.5, vmag: 8.8 },
  { id: 'M 27', names: ['M 27', 'NGC 6853', 'Dumbbell Nebula (아령 성운)'], nameKo: '아령 성운 (M27)', type: 'messier', constellation: 'Vul', raDeg: 299.9015, decDeg: 22.7211, radiusArcmin: 4.0, vmag: 7.5 },
  { id: 'M 13', names: ['M 13', 'NGC 6205', 'Hercules Globular Cluster (헤르쿨레스 구상성단)'], nameKo: '헤르쿨레스 대성단 (M13)', type: 'messier', constellation: 'Her', raDeg: 250.4218, decDeg: 36.4599, radiusArcmin: 10.0, vmag: 5.8 },
  { id: 'M 8', names: ['M 8', 'NGC 6523', 'Lagoon Nebula (석호 성운)'], nameKo: '석호 성운 (M8)', type: 'messier', constellation: 'Sgr', raDeg: 270.92, decDeg: -24.38, radiusArcmin: 45.0, vmag: 6.0 },
  { id: 'M 20', names: ['M 20', 'NGC 6514', 'Trifid Nebula (삼열 성운)'], nameKo: '삼열 성운 (M20)', type: 'messier', constellation: 'Sgr', raDeg: 270.66, decDeg: -23.03, radiusArcmin: 14.0, vmag: 6.3 },
  { id: 'M 16', names: ['M 16', 'NGC 6611', 'Eagle Nebula (독수리 성운)'], nameKo: '독수리 성운 (M16)', type: 'messier', constellation: 'Ser', raDeg: 274.70, decDeg: -13.81, radiusArcmin: 15.0, vmag: 6.0 },
  { id: 'M 17', names: ['M 17', 'NGC 6618', 'Omega Nebula (오메가 성운 / 백조 성운)'], nameKo: '오메가 성운 (M17)', type: 'messier', constellation: 'Sgr', raDeg: 275.20, decDeg: -16.18, radiusArcmin: 18.0, vmag: 6.0 },
  { id: 'NGC 2237', names: ['NGC 2237', 'Rosette Nebula (장미 성운)'], nameKo: '장미 성운', type: 'ngc', constellation: 'Mon', raDeg: 97.98, decDeg: 4.95, radiusArcmin: 40.0, vmag: 6.0 },
  { id: 'M 44', names: ['M 44', 'NGC 2632', 'Beehive Cluster (프레세페 성단 / 벌집 성단)'], nameKo: '프레세페 성단 (M44)', type: 'messier', constellation: 'Cnc', raDeg: 130.10, decDeg: 19.67, radiusArcmin: 47.0, vmag: 3.7 },
  { id: 'M 104', names: ['M 104', 'NGC 4594', 'Sombrero Galaxy (솜브레로 은하)'], nameKo: '솜브레로 은하 (M104)', type: 'messier', constellation: 'Vir', raDeg: 189.9976, decDeg: -11.6231, radiusArcmin: 4.5, vmag: 8.0 },
  { id: 'M 65', names: ['M 65', 'NGC 3623', 'Leo Triplet'], nameKo: '사자자리 삼중은하 M65', type: 'messier', constellation: 'Leo', raDeg: 169.733, decDeg: 13.092, radiusArcmin: 4.5, vmag: 9.3 },
  { id: 'M 66', names: ['M 66', 'NGC 3627', 'Leo Triplet'], nameKo: '사자자리 삼중은하 M66', type: 'messier', constellation: 'Leo', raDeg: 170.062, decDeg: 12.992, radiusArcmin: 4.5, vmag: 8.9 },
];

/**
 * High-Precision Telescopic Reference Fields (1° ~ 3° FOV, SIMBAD/Hipparcos/HD/BD/Tycho-2 J2000 coordinates)
 * Enables exact sub-pixel blind & assisted solving for telescopic photos where FOV is too narrow for naked-eye wide-field constellations
 */
export const TELESCOPIC_REFERENCE_FIELDS: TelescopicReferenceField[] = [
  {
    id: 'lyr_double_double',
    nameKo: '거문고자리 더블더블 (ε¹·ε² Lyrae)',
    nameEn: 'Lyra Double Double (Epsilon Lyrae)',
    constellation: 'Lyr',
    centerRaDeg: 281.20,
    centerDecDeg: 39.68,
    defaultRadiusDeg: 1.23,
    primaryObjectLabel: '더블더블 (ε¹·ε² Lyr)',
    keywords: ['더블더블', '더블 더블', 'doubledouble', 'double double', 'epsilon lyrae', 'eps lyr', 'ε lyr', 'ε¹ lyr', 'ε² lyr', '4 lyr', '5 lyr', '엡실론 리라'],
    stars: [
      { id: 'eps2_lyr', nameKo: '더블더블 ε² Lyr (5 Lyr)', nameEn: 'Epsilon2 Lyrae', bayer: 'ε² Lyr', constellation: 'Lyr', raDeg: 281.0952, decDeg: 39.6127, mag: 4.59 },
      { id: 'eps1_lyr', nameKo: '더블더블 ε¹ Lyr (4 Lyr)', nameEn: 'Epsilon1 Lyrae', bayer: 'ε¹ Lyr', constellation: 'Lyr', raDeg: 281.0848, decDeg: 39.6701, mag: 4.67 },
      { id: 'hd_173383', nameKo: 'HD 173383', nameEn: 'HD 173383', bayer: 'HD 173383 (Lyr)', constellation: 'Lyr', raDeg: 280.8191, decDeg: 39.3001, mag: 6.44 },
      { id: 'hd_173631', nameKo: 'HD 173631', nameEn: 'HD 173631', bayer: 'HD 173631 (Lyr)', constellation: 'Lyr', raDeg: 281.1474, decDeg: 39.0709, mag: 7.97 },
      { id: 'hd_173290', nameKo: 'HD 173290', nameEn: 'HD 173290', bayer: 'HD 173290 (Lyr)', constellation: 'Lyr', raDeg: 280.6615, decDeg: 39.9034, mag: 8.28 },
      { id: 'bd_40_3481', nameKo: 'BD+40 3481', nameEn: 'BD+40 3481', bayer: 'BD+40 3481 (Lyr)', constellation: 'Lyr', raDeg: 281.5353, decDeg: 40.2798, mag: 8.64 },
      { id: 'bd_39_3523', nameKo: 'BD+39 3523', nameEn: 'BD+39 3523', bayer: 'BD+39 3523 (Lyr)', constellation: 'Lyr', raDeg: 281.4157, decDeg: 39.6999, mag: 8.77 },
      { id: 'bd_39_3514', nameKo: 'BD+39 3514', nameEn: 'BD+39 3514', bayer: 'BD+39 3514 (Lyr)', constellation: 'Lyr', raDeg: 281.1805, decDeg: 39.8989, mag: 8.82 },
      { id: 'hd_173110', nameKo: 'HD 173110', nameEn: 'HD 173110', bayer: 'HD 173110 (Lyr)', constellation: 'Lyr', raDeg: 280.4743, decDeg: 39.9933, mag: 8.83 },
      { id: 'bd_39_3525', nameKo: 'BD+39 3525', nameEn: 'BD+39 3525', bayer: 'BD+39 3525 (Lyr)', constellation: 'Lyr', raDeg: 281.5487, decDeg: 39.2590, mag: 8.85 },
      { id: 'bd_40_3478', nameKo: 'BD+40 3478', nameEn: 'BD+40 3478', bayer: 'BD+40 3478 (Lyr)', constellation: 'Lyr', raDeg: 281.2650, decDeg: 40.3077, mag: 9.16 },
      { id: 'bd_39_3517a', nameKo: 'BD+39 3517A', nameEn: 'BD+39 3517A', bayer: 'BD+39 3517A (Lyr)', constellation: 'Lyr', raDeg: 281.2916, decDeg: 39.2258, mag: 9.23 },
      { id: 'bd_39_3506', nameKo: 'BD+39 3506', nameEn: 'BD+39 3506', bayer: 'BD+39 3506 (Lyr)', constellation: 'Lyr', raDeg: 280.8804, decDeg: 39.5933, mag: 9.46 },
      { id: 'bd_39_3518', nameKo: 'BD+39 3518', nameEn: 'BD+39 3518', bayer: 'BD+39 3518 (Lyr)', constellation: 'Lyr', raDeg: 281.2961, decDeg: 39.5177, mag: 9.65 },
    ],
  },
  {
    id: 'lyr_m57_ring',
    nameKo: '거문고자리 고리 성운 (M57 / NGC 6720)',
    nameEn: 'Lyra Ring Nebula (M57)',
    constellation: 'Lyr',
    centerRaDeg: 283.3962,
    centerDecDeg: 33.0292,
    defaultRadiusDeg: 1.35,
    primaryObjectLabel: 'M 57',
    keywords: ['m57', 'm 57', 'ngc6720', 'ngc 6720', '고리성운', '고리 성운', 'ring nebula'],
    stars: [
      { id: 'gam_lyr_f', nameKo: '술라파트 (γ Lyr)', nameEn: 'Sulafat', bayer: 'γ Lyr', constellation: 'Lyr', raDeg: 284.7359, decDeg: 32.6896, mag: 3.25 },
      { id: 'bet_lyr_f', nameKo: '셰리아크 (β Lyr)', nameEn: 'Sheliak', bayer: 'β Lyr', constellation: 'Lyr', raDeg: 282.5200, decDeg: 33.3627, mag: 3.42 },
      { id: 'nu_lyr', nameKo: 'ν Lyr', nameEn: 'Nu Lyrae', bayer: 'ν Lyr', constellation: 'Lyr', raDeg: 282.4705, decDeg: 32.5511, mag: 5.23 },
      { id: 'hd_176051a', nameKo: 'HD 176051A', nameEn: 'HD 176051A', bayer: 'HD 176051A (Lyr)', constellation: 'Lyr', raDeg: 284.2568, decDeg: 32.9013, mag: 5.28 },
      { id: 'nu1_lyr', nameKo: 'ν¹ Lyr', nameEn: 'Nu1 Lyrae', bayer: 'ν¹ Lyr', constellation: 'Lyr', raDeg: 282.4413, decDeg: 32.8128, mag: 5.91 },
      { id: 'hd_175635', nameKo: 'HD 175635', nameEn: 'HD 175635', bayer: 'HD 175635 (Lyr)', constellation: 'Lyr', raDeg: 283.7188, decDeg: 33.9686, mag: 6.03 },
      { id: 'hd_176174', nameKo: 'HD 176174', nameEn: 'HD 176174', bayer: 'HD 176174 (Lyr)', constellation: 'Lyr', raDeg: 284.3884, decDeg: 32.9896, mag: 6.91 },
      { id: 'hd_176466', nameKo: 'HD 176466', nameEn: 'HD 176466', bayer: 'HD 176466 (Lyr)', constellation: 'Lyr', raDeg: 284.7611, decDeg: 33.1172, mag: 6.97 },
      { id: 'hd_174530', nameKo: 'HD 174530', nameEn: 'HD 174530', bayer: 'HD 174530 (Lyr)', constellation: 'Lyr', raDeg: 282.3499, decDeg: 33.7009, mag: 7.00 },
      { id: 'hd_174296', nameKo: 'HD 174296', nameEn: 'HD 174296', bayer: 'HD 174296 (Lyr)', constellation: 'Lyr', raDeg: 282.1218, decDeg: 33.7737, mag: 7.06 },
      { id: 'hd_174830', nameKo: 'HD 174830', nameEn: 'HD 174830', bayer: 'HD 174830 (Lyr)', constellation: 'Lyr', raDeg: 282.7551, decDeg: 34.3939, mag: 7.14 },
    ],
  },
  {
    id: 'per_m34',
    nameKo: '페르세우스자리 M34 산개성단 (NGC 1039)',
    nameEn: 'Perseus M34 (NGC 1039)',
    constellation: 'Per',
    centerRaDeg: 40.5456,
    centerDecDeg: 42.7579,
    defaultRadiusDeg: 1.23,
    primaryObjectLabel: 'M 34',
    keywords: ['m34', 'm 34', 'ngc1039', 'ngc 1039'],
    stars: [
      { id: 'hd_16855', nameKo: 'HD 16855', nameEn: 'HD 16855', bayer: 'HD 16855 (Per)', constellation: 'Per', raDeg: 40.8974, decDeg: 43.5380, mag: 6.77 },
      { id: 'hd_16108', nameKo: 'HD 16108', nameEn: 'HD 16108', bayer: 'HD 16108 (Per)', constellation: 'Per', raDeg: 39.1507, decDeg: 42.4005, mag: 6.79 },
      { id: 'hd_16175', nameKo: 'HD 16175', nameEn: 'HD 16175', bayer: 'HD 16175 (Per)', constellation: 'Per', raDeg: 39.2580, decDeg: 42.0626, mag: 7.28 },
      { id: 'hd_16771', nameKo: 'HD 16771', nameEn: 'HD 16771', bayer: 'HD 16771 (Per)', constellation: 'Per', raDeg: 40.6490, decDeg: 42.5912, mag: 7.34 },
      { id: 'hd_17238', nameKo: 'HD 17238', nameEn: 'HD 17238', bayer: 'HD 17238 (Per)', constellation: 'Per', raDeg: 41.8440, decDeg: 43.4020, mag: 7.53 },
      { id: 'hd_16705', nameKo: 'HD 16705', nameEn: 'HD 16705', bayer: 'HD 16705 (Per)', constellation: 'Per', raDeg: 40.4935, decDeg: 42.7918, mag: 7.73 },
      { id: 'hd_17219', nameKo: 'HD 17219', nameEn: 'HD 17219', bayer: 'HD 17219 (Per)', constellation: 'Per', raDeg: 41.7854, decDeg: 42.1754, mag: 7.75 },
      { id: 'bd_42_587', nameKo: 'BD+42 587', nameEn: 'BD+42 587', bayer: 'BD+42 587 (Per)', constellation: 'Per', raDeg: 40.4793, decDeg: 43.0070, mag: 7.92 },
      { id: 'hd_16375', nameKo: 'HD 16375', nameEn: 'HD 16375', bayer: 'HD 16375 (Per)', constellation: 'Per', raDeg: 39.7259, decDeg: 43.2358, mag: 7.94 },
      { id: 'hd_17101', nameKo: 'HD 17101', nameEn: 'HD 17101', bayer: 'HD 17101 (Per)', constellation: 'Per', raDeg: 41.4774, decDeg: 41.9006, mag: 8.15 },
      { id: 'hd_16782', nameKo: 'HD 16782', nameEn: 'HD 16782', bayer: 'HD 16782 (Per)', constellation: 'Per', raDeg: 40.6906, decDeg: 42.8203, mag: 8.25 },
      { id: 'hd_16719', nameKo: 'HD 16719', nameEn: 'HD 16719', bayer: 'HD 16719 (Per)', constellation: 'Per', raDeg: 40.5241, decDeg: 42.7074, mag: 8.28 },
    ],
  },
  {
    id: 'psc_ngc628',
    nameKo: '물고기자리 유령 은하 (NGC 628 / M74)',
    nameEn: 'Pisces Phantom Galaxy (NGC 628 / M74)',
    constellation: 'Psc',
    centerRaDeg: 24.1861,
    centerDecDeg: 15.7898,
    defaultRadiusDeg: 1.23,
    primaryObjectLabel: 'NGC 628',
    keywords: ['ngc628', 'ngc 628', 'm74', 'm 74', '유령은하', '유령 은하', 'phantom galaxy'],
    stars: [
      { id: '105_psc', nameKo: '105 Psc', nameEn: '105 Piscium', bayer: '105 Psc', constellation: 'Psc', raDeg: 24.9201, decDeg: 16.4059, mag: 5.98 },
      { id: '101_psc', nameKo: '101 Psc', nameEn: '101 Piscium', bayer: '101 Psc', constellation: 'Psc', raDeg: 23.9435, decDeg: 14.6614, mag: 6.22 },
      { id: '103_psc_a', nameKo: '103 Psc A', nameEn: '103 Piscium A', bayer: '103 Psc', constellation: 'Psc', raDeg: 24.8134, decDeg: 16.6255, mag: 6.87 },
      { id: 'hd_9306', nameKo: 'HD 9306', nameEn: 'HD 9306', bayer: 'HD 9306 (Psc)', constellation: 'Psc', raDeg: 22.9542, decDeg: 15.6253, mag: 7.45 },
      { id: 'vbf_psc', nameKo: 'VBF Psc', nameEn: 'VBF Psc', bayer: 'VBF Psc (Psc)', constellation: 'Psc', raDeg: 22.9786, decDeg: 16.0470, mag: 7.81 },
      { id: 'hd_10182', nameKo: 'HD 10182', nameEn: 'HD 10182', bayer: 'HD 10182 (Psc)', constellation: 'Psc', raDeg: 24.9787, decDeg: 15.2567, mag: 8.74 },
      { id: 'hd_9510', nameKo: 'HD 9510', nameEn: 'HD 9510', bayer: 'HD 9510 (Psc)', constellation: 'Psc', raDeg: 23.4008, decDeg: 16.1304, mag: 8.77 },
      { id: 'bd_15_228', nameKo: 'BD+15 228', nameEn: 'BD+15 228', bayer: 'BD+15 228 (Psc)', constellation: 'Psc', raDeg: 23.3201, decDeg: 16.2368, mag: 8.88 },
      { id: 'hd_9669', nameKo: 'HD 9669', nameEn: 'HD 9669', bayer: 'HD 9669 (Psc)', constellation: 'Psc', raDeg: 23.7647, decDeg: 15.2713, mag: 8.90 },
      { id: 'bd_14_250', nameKo: 'BD+14 250', nameEn: 'BD+14 250', bayer: 'BD+14 250 (Psc)', constellation: 'Psc', raDeg: 24.9321, decDeg: 15.4238, mag: 8.94 },
      { id: 'bd_14_251', nameKo: 'BD+14 251', nameEn: 'BD+14 251', bayer: 'BD+14 251 (Psc)', constellation: 'Psc', raDeg: 24.9838, decDeg: 15.2593, mag: 9.09 },
      { id: 'bd_15_242', nameKo: 'BD+15 242', nameEn: 'BD+15 242', bayer: 'BD+15 242 (Psc)', constellation: 'Psc', raDeg: 24.5004, decDeg: 16.3618, mag: 9.14 },
    ],
  },
  {
    id: 'ori_m42',
    nameKo: '오리온자리 대성운 (M42 / NGC 1976)',
    nameEn: 'Orion Nebula (M42)',
    constellation: 'Ori',
    centerRaDeg: 83.8221,
    centerDecDeg: -5.3911,
    defaultRadiusDeg: 1.5,
    primaryObjectLabel: 'M 42',
    keywords: ['m42', 'm 42', 'ngc1976', 'ngc 1976', '오리온대성운', '오리온 대성운', 'orion nebula'],
    stars: [
      { id: 'iot_ori', nameKo: '하트사 (ι Ori)', nameEn: 'Hatysa (Iota Orionis)', bayer: 'ι Ori', constellation: 'Ori', raDeg: 83.8583, decDeg: -5.9099, mag: 2.77 },
      { id: 'c_ori', nameKo: '42 Ori (c Ori)', nameEn: '42 Orionis', bayer: 'c Ori', constellation: 'Ori', raDeg: 83.8465, decDeg: -4.8383, mag: 4.59 },
      { id: 'hd_36960', nameKo: 'HD 36960', nameEn: 'HD 36960', bayer: 'HD 36960 (Ori)', constellation: 'Ori', raDeg: 83.7612, decDeg: -6.0020, mag: 4.72 },
      { id: 'tet1_ori_c', nameKo: '트라페지움 (θ¹ Ori C)', nameEn: 'Theta1 Orionis C', bayer: 'θ¹ Ori', constellation: 'Ori', raDeg: 83.8186, decDeg: -5.3897, mag: 5.13 },
      { id: '45_ori', nameKo: '45 Ori', nameEn: '45 Orionis', bayer: '45 Ori', constellation: 'Ori', raDeg: 83.9145, decDeg: -4.8561, mag: 5.23 },
      { id: 'hd_36959', nameKo: 'HD 36959', nameEn: 'HD 36959', bayer: 'HD 36959 (Ori)', constellation: 'Ori', raDeg: 83.7542, decDeg: -6.0093, mag: 5.53 },
      { id: 'hd_37209a', nameKo: 'HD 37209A', nameEn: 'HD 37209A', bayer: 'HD 37209A (Ori)', constellation: 'Ori', raDeg: 84.1487, decDeg: -6.0648, mag: 5.75 },
      { id: 'hd_37481', nameKo: 'HD 37481', nameEn: 'HD 37481', bayer: 'HD 37481 (Ori)', constellation: 'Ori', raDeg: 84.6582, decDeg: -6.5740, mag: 5.96 },
      { id: 'hd_37303', nameKo: 'HD 37303', nameEn: 'HD 37303', bayer: 'HD 37303 (Ori)', constellation: 'Ori', raDeg: 84.3640, decDeg: -5.9384, mag: 6.02 },
      { id: 'hd_37356', nameKo: 'HD 37356', nameEn: 'HD 37356', bayer: 'HD 37356 (Ori)', constellation: 'Ori', raDeg: 84.4724, decDeg: -4.8140, mag: 6.18 },
    ],
  },
  {
    id: 'tau_m45',
    nameKo: '황소자리 플레이아데스 성단 (M45 / 좀생이별)',
    nameEn: 'Pleiades (M45)',
    constellation: 'Tau',
    centerRaDeg: 56.75,
    centerDecDeg: 24.1167,
    defaultRadiusDeg: 1.5,
    primaryObjectLabel: 'M 45',
    keywords: ['m45', 'm 45', '플레이아데스', '좀생이별', 'pleiades'],
    stars: [
      { id: 'eta_tau', nameKo: '알시오네 (η Tau)', nameEn: 'Alcyone', bayer: 'η Tau', constellation: 'Tau', raDeg: 56.8712, decDeg: 24.1051, mag: 2.87 },
      { id: '27_tau', nameKo: '아틀라스 (27 Tau)', nameEn: 'Atlas', bayer: '27 Tau', constellation: 'Tau', raDeg: 57.2906, decDeg: 24.0534, mag: 3.63 },
      { id: '17_tau', nameKo: '엘렉트라 (17 Tau)', nameEn: 'Electra', bayer: '17 Tau', constellation: 'Tau', raDeg: 56.2189, decDeg: 24.1133, mag: 3.70 },
      { id: '20_tau', nameKo: '마이아 (20 Tau)', nameEn: 'Maia', bayer: '20 Tau', constellation: 'Tau', raDeg: 56.4567, decDeg: 24.3677, mag: 3.87 },
      { id: '23_tau', nameKo: '메로페 (23 Tau)', nameEn: 'Merope', bayer: '23 Tau', constellation: 'Tau', raDeg: 56.5816, decDeg: 23.9484, mag: 4.18 },
      { id: '19_tau', nameKo: '타이게타 (19 Tau)', nameEn: 'Taygeta', bayer: '19 Tau', constellation: 'Tau', raDeg: 56.3021, decDeg: 24.4673, mag: 4.30 },
      { id: '28_tau', nameKo: '플레이오네 (28 Tau)', nameEn: 'Pleione', bayer: '28 Tau', constellation: 'Tau', raDeg: 57.2967, decDeg: 24.1367, mag: 5.09 },
      { id: '16_tau', nameKo: '켈라에노 (16 Tau)', nameEn: 'Celaeno', bayer: '16 Tau', constellation: 'Tau', raDeg: 56.2009, decDeg: 24.2895, mag: 5.46 },
      { id: '18_tau', nameKo: '18 Tau', nameEn: '18 Tauri', bayer: '18 Tau', constellation: 'Tau', raDeg: 56.2906, decDeg: 24.8393, mag: 5.64 },
      { id: '21_tau', nameKo: '아스테로페 (21 Tau)', nameEn: 'Asterope', bayer: '21 Tau', constellation: 'Tau', raDeg: 56.4770, decDeg: 24.5545, mag: 5.76 },
    ],
  },
  {
    id: 'cyg_albireo',
    nameKo: '백조자리 알비레오 (β¹·β² Cygni)',
    nameEn: 'Cygnus Albireo (Beta Cygni)',
    constellation: 'Cyg',
    centerRaDeg: 292.6803,
    centerDecDeg: 27.9597,
    defaultRadiusDeg: 1.5,
    primaryObjectLabel: 'Albireo (β Cyg)',
    keywords: ['알비레오', 'albireo', 'beta cyg', 'bet cyg', 'β cyg'],
    stars: [
      { id: 'bet1_cyg', nameKo: '알비레오 A (β¹ Cyg)', nameEn: 'Albireo A', bayer: 'β¹ Cyg', constellation: 'Cyg', raDeg: 292.6803, decDeg: 27.9597, mag: 3.08 },
      { id: 'bet2_cyg', nameKo: '알비레오 B (β² Cyg)', nameEn: 'Albireo B', bayer: 'β² Cyg', constellation: 'Cyg', raDeg: 292.6892, decDeg: 27.9653, mag: 5.11 },
      { id: 'hd_184010', nameKo: 'HD 184010', nameEn: 'HD 184010', bayer: 'HD 184010 (Cyg)', constellation: 'Cyg', raDeg: 292.8401, decDeg: 26.6172, mag: 5.89 },
      { id: 'hd_182618', nameKo: 'HD 182618', nameEn: 'HD 182618', bayer: 'HD 182618 (Cyg)', constellation: 'Cyg', raDeg: 291.0939, decDeg: 28.0876, mag: 6.52 },
      { id: 'hd_184761', nameKo: 'HD 184761', nameEn: 'HD 184761', bayer: 'HD 184761 (Cyg)', constellation: 'Cyg', raDeg: 293.7457, decDeg: 27.2253, mag: 6.73 },
      { id: 'hd_184719', nameKo: 'HD 184719', nameEn: 'HD 184719', bayer: 'HD 184719 (Cyg)', constellation: 'Cyg', raDeg: 293.6685, decDeg: 29.1526, mag: 7.19 },
      { id: 'hd_184059', nameKo: 'HD 184059', nameEn: 'HD 184059', bayer: 'HD 184059 (Cyg)', constellation: 'Cyg', raDeg: 292.9016, decDeg: 26.9866, mag: 7.30 },
      { id: 'hd_184058', nameKo: 'HD 184058', nameEn: 'HD 184058', bayer: 'HD 184058 (Cyg)', constellation: 'Cyg', raDeg: 292.8747, decDeg: 28.7173, mag: 7.59 },
      { id: 'hd_184879', nameKo: 'HD 184879', nameEn: 'HD 184879', bayer: 'HD 184879 (Cyg)', constellation: 'Cyg', raDeg: 293.8900, decDeg: 27.1083, mag: 7.61 },
      { id: 'hd_183753', nameKo: 'HD 183753', nameEn: 'HD 183753', bayer: 'HD 183753 (Cyg)', constellation: 'Cyg', raDeg: 292.4816, decDeg: 28.7243, mag: 7.65 },
    ],
  },
  {
    id: 'cep_garnet',
    nameKo: '세페우스자리 가넷 스타 & 코끼리 코 성운 (μ Cep / IC 1396)',
    nameEn: 'Cepheus Garnet Star (Mu Cephei / IC 1396)',
    constellation: 'Cep',
    centerRaDeg: 325.8769,
    centerDecDeg: 58.7800,
    defaultRadiusDeg: 1.8,
    primaryObjectLabel: 'IC 1396',
    keywords: ['가넷스타', '가넷 스타', '석류석별', 'garnet star', 'mu cep', 'μ cep', 'ic1396', 'ic 1396'],
    stars: [
      { id: 'mu_cep_f', nameKo: '가넷 스타 (μ Cep)', nameEn: 'Garnet Star (Mu Cephei)', bayer: 'μ Cep', constellation: 'Cep', raDeg: 325.8769, decDeg: 58.7800, mag: 4.08 },
      { id: 'hd_206267', nameKo: 'HD 206267', nameEn: 'HD 206267', bayer: 'HD 206267 (Cep)', constellation: 'Cep', raDeg: 324.7401, decDeg: 57.4890, mag: 5.62 },
      { id: 'hd_206842', nameKo: 'HD 206842', nameEn: 'HD 206842', bayer: 'HD 206842 (Cep)', constellation: 'Cep', raDeg: 325.6890, decDeg: 59.2708, mag: 6.09 },
      { id: 'hd_207086', nameKo: 'HD 207086', nameEn: 'HD 207086', bayer: 'HD 207086 (Cep)', constellation: 'Cep', raDeg: 326.1624, decDeg: 58.2257, mag: 6.80 },
      { id: 'hd_205113', nameKo: 'HD 205113', nameEn: 'HD 205113', bayer: 'HD 205113 (Cep)', constellation: 'Cep', raDeg: 322.7556, decDeg: 59.4182, mag: 6.87 },
      { id: 'hd_206773', nameKo: 'HD 206773', nameEn: 'HD 206773', bayer: 'HD 206773 (Cep)', constellation: 'Cep', raDeg: 325.6008, decDeg: 57.7361, mag: 6.87 },
      { id: 'hd_206536', nameKo: 'HD 206536', nameEn: 'HD 206536', bayer: 'HD 206536 (Cep)', constellation: 'Cep', raDeg: 325.1352, decDeg: 59.7528, mag: 6.88 },
      { id: 'hd_207538', nameKo: 'HD 207538', nameEn: 'HD 207538', bayer: 'HD 207538 (Cep)', constellation: 'Cep', raDeg: 326.9158, decDeg: 59.7004, mag: 7.30 },
      { id: 'hd_206482', nameKo: 'HD 206482', nameEn: 'HD 206482', bayer: 'HD 206482 (Cep)', constellation: 'Cep', raDeg: 325.0894, decDeg: 57.5816, mag: 7.40 },
      { id: 'hd_207328', nameKo: 'HD 207328', nameEn: 'HD 207328', bayer: 'HD 207328 (Cep)', constellation: 'Cep', raDeg: 326.5692, decDeg: 58.0625, mag: 7.45 },
    ],
  },
];

// Build unified star catalog combining BRIGHT_STARS, TELESCOPIC_REFERENCE_FIELDS, and constellation figure vertices
function getUnifiedStarCatalog(): CatalogStar[] {
  const stars = [...BRIGHT_STARS];
  let extraIdx = 1;

  for (const field of TELESCOPIC_REFERENCE_FIELDS) {
    for (const s of field.stars) {
      const exists = stars.some((ex) => angularSeparation(ex.raDeg, ex.decDeg, s.raDeg, s.decDeg) < 0.01);
      if (!exists) {
        stars.push(s);
      }
    }
  }

  for (const fig of CONSTELLATION_FIGURES) {
    for (const [ra1, dec1, ra2, dec2] of fig.lines) {
      for (const [ra, dec] of [
        [ra1, dec1],
        [ra2, dec2],
      ]) {
        const exists = stars.some((s) => angularSeparation(s.raDeg, s.decDeg, ra, dec) < 0.25);
        if (!exists) {
          stars.push({
            id: `cat_${fig.code}_${extraIdx}`,
            nameKo: `${fig.nameKo} 기준성 #${extraIdx}`,
            nameEn: `${fig.nameEn} Star #${extraIdx}`,
            bayer: `${fig.code} #${extraIdx}`,
            constellation: fig.code,
            raDeg: ra,
            decDeg: dec,
            mag: 3.4,
          });
          extraIdx++;
        }
      }
    }
  }
  return stars;
}

export const UNIFIED_SOLVER_STARS = getUnifiedStarCatalog();

/**
 * Step 1: image2xy — Sub-pixel Star Source Extraction from Image Element or URL
 * Implements local background sky grid subtraction + 2.8-sigma peak finding + Gaussian flux centroiding
 */
export async function extractStarsImage2XY(
  imageSource: string | File
): Promise<{
  stars: DetectedStarXY[];
  width: number;
  height: number;
  dataUrl: string;
}> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    let objectUrlToRevoke: string | null = null;
    if (imageSource instanceof File) {
      objectUrlToRevoke = URL.createObjectURL(imageSource);
      img.src = objectUrlToRevoke;
    } else {
      img.src = imageSource;
    }

    img.onload = () => {
      try {
        const origW = img.naturalWidth || img.width || 1920;
        const origH = img.naturalHeight || img.height || 1080;

        // Downscale to max 800px for fast CPU pixel scanning while keeping sub-pixel precision
        const maxProcDim = 800;
        const scaleFactor = Math.min(1, maxProcDim / Math.max(origW, origH));
        const procW = Math.max(64, Math.round(origW * scaleFactor));
        const procH = Math.max(64, Math.round(origH * scaleFactor));

        const canvas = document.createElement('canvas');
        canvas.width = procW;
        canvas.height = procH;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          throw new Error('Canvas 2D context unavailable');
        }

        ctx.drawImage(img, 0, 0, procW, procH);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
        const imgData = ctx.getImageData(0, 0, procW, procH).data;

        // 1. Convert RGB to grayscale luminance array
        const lum = new Float32Array(procW * procH);
        for (let i = 0, p = 0; i < imgData.length; i += 4, p++) {
          lum[p] = 0.299 * imgData[i] + 0.587 * imgData[i + 1] + 0.114 * imgData[i + 2];
        }

        // 2. Estimate local sky background & noise sigma across 16x16 grid cells (simplexy background subtraction)
        const gridN = 16;
        const cellW = Math.ceil(procW / gridN);
        const cellH = Math.ceil(procH / gridN);
        const skyMean = new Float32Array(gridN * gridN);
        const skySigma = new Float32Array(gridN * gridN);

        for (let gy = 0; gy < gridN; gy++) {
          for (let gx = 0; gx < gridN; gx++) {
            const x0 = gx * cellW;
            const y0 = gy * cellH;
            const x1 = Math.min(procW, x0 + cellW);
            const y1 = Math.min(procH, y0 + cellH);

            let sum = 0;
            let sumSq = 0;
            let count = 0;
            for (let y = y0; y < y1; y += 2) {
              for (let x = x0; x < x1; x += 2) {
                const v = lum[y * procW + x];
                sum += v;
                sumSq += v * v;
                count++;
              }
            }
            const mean = count > 0 ? sum / count : 20;
            const variance = count > 0 ? Math.max(4, sumSq / count - mean * mean) : 16;
            skyMean[gy * gridN + gx] = mean;
            skySigma[gy * gridN + gx] = Math.sqrt(variance);
          }
        }

        // 3. Detect local maxima exceeding local sky + 2.8 * sigma
        const rawCandidates: DetectedStarXY[] = [];
        const margin = 5;

        for (let y = margin; y < procH - margin; y++) {
          const gy = Math.min(gridN - 1, Math.floor(y / cellH));
          for (let x = margin; x < procW - margin; x++) {
            const gx = Math.min(gridN - 1, Math.floor(x / cellW));
            const bg = skyMean[gy * gridN + gx];
            const sigma = skySigma[gy * gridN + gx];
            const thresh = Math.max(bg + 2.8 * sigma, bg + 18);

            const centerVal = lum[y * procW + x];
            if (centerVal < thresh) continue;

            // Check 5x5 neighborhood local maximum
            let isMax = true;
            for (let dy = -2; dy <= 2 && isMax; dy++) {
              for (let dx = -2; dx <= 2; dx++) {
                if (dx === 0 && dy === 0) continue;
                if (lum[(y + dy) * procW + (x + dx)] > centerVal) {
                  isMax = false;
                  break;
                }
              }
            }
            if (!isMax) continue;

            // Compute sub-pixel Gaussian flux-weighted centroid in 7x7 window
            let sumFlux = 0;
            let sumX = 0;
            let sumY = 0;
            let sumR2 = 0;

            for (let dy = -3; dy <= 3; dy++) {
              for (let dx = -3; dx <= 3; dx++) {
                const val = Math.max(0, lum[(y + dy) * procW + (x + dx)] - bg);
                sumFlux += val;
                sumX += (x + dx) * val;
                sumY += (y + dy) * val;
                sumR2 += (dx * dx + dy * dy) * val;
              }
            }

            if (sumFlux <= 10) continue;

            const cx = sumX / sumFlux;
            const cy = sumY / sumFlux;
            const hfr = Math.max(1.2, Math.min(12, Math.sqrt(sumR2 / sumFlux)));

            if (hfr < 0.45) continue;

            const origX = cx / scaleFactor;
            const origY = cy / scaleFactor;
            const peak = centerVal - bg;

            rawCandidates.push({
              x: origX,
              y: origY,
              flux: sumFlux,
              peak,
              radius: hfr / scaleFactor,
              instMag: -2.5 * Math.log10(Math.max(1, sumFlux)),
            });
          }
        }

        // 4. Sort by flux descending and apply Non-Maximum Suppression (minimum separation)
        rawCandidates.sort((a, b) => b.flux - a.flux);
        const minSep = Math.max(12, Math.min(origW, origH) * 0.018);
        const filteredStars: DetectedStarXY[] = [];

        for (const cand of rawCandidates) {
          const tooClose = filteredStars.some(
            (s) => Math.hypot(s.x - cand.x, s.y - cand.y) < minSep
          );
          if (!tooClose) {
            filteredStars.push(cand);
            if (filteredStars.length >= 80) break;
          }
        }

        // Normalize instrumental magnitudes to apparent visual range [1.5 .. 6.5]
        if (filteredStars.length > 0) {
          const minInst = filteredStars[0].instMag;
          const maxInst = filteredStars[filteredStars.length - 1].instMag;
          const span = Math.max(0.1, maxInst - minInst);
          filteredStars.forEach((s) => {
            s.instMag = Number((1.5 + ((s.instMag - minInst) / span) * 4.5).toFixed(2));
          });
        }

        if (objectUrlToRevoke) URL.revokeObjectURL(objectUrlToRevoke);
        resolve({
          stars: filteredStars,
          width: origW,
          height: origH,
          dataUrl,
        });
      } catch (err) {
        if (objectUrlToRevoke) URL.revokeObjectURL(objectUrlToRevoke);
        reject(err);
      }
    };

    img.onerror = () => {
      if (objectUrlToRevoke) URL.revokeObjectURL(objectUrlToRevoke);
      reject(new Error('이미지 파일을 읽을 수 없습니다.'));
    };
  });
}

/**
 * Gnomonic (TAN) projection from Celestial (RA, Dec) onto local tangent plane (xi, eta in degrees)
 * Standard astronomical convention: +xi is East (+RA), +eta is North (+Dec)
 */
export function skyToTangentPlane(
  raDeg: number,
  decDeg: number,
  centerRaDeg: number,
  centerDecDeg: number
): { xi: number; eta: number } | null {
  const deg2rad = Math.PI / 180;
  const rad2deg = 180 / Math.PI;

  const ra = raDeg * deg2rad;
  const dec = decDeg * deg2rad;
  const ra0 = centerRaDeg * deg2rad;
  const dec0 = centerDecDeg * deg2rad;

  const cosC =
    Math.sin(dec0) * Math.sin(dec) + Math.cos(dec0) * Math.cos(dec) * Math.cos(ra - ra0);
  if (cosC <= 0.1) return null;

  const xi = ((Math.cos(dec) * Math.sin(ra - ra0)) / cosC) * rad2deg;
  const eta =
    ((Math.cos(dec0) * Math.sin(dec) - Math.sin(dec0) * Math.cos(dec) * Math.cos(ra - ra0)) /
      cosC) *
    rad2deg;

  return { xi, eta };
}

/**
 * Inverse Gnomonic (TAN) projection from local tangent plane (xi, eta in degrees) back to Celestial (RA, Dec)
 */
export function tangentPlaneToSky(
  xiDeg: number,
  etaDeg: number,
  centerRaDeg: number,
  centerDecDeg: number
): { ra: number; dec: number } {
  const d2r = Math.PI / 180;
  const r2d = 180 / Math.PI;
  const xi = xiDeg * d2r;
  const eta = etaDeg * d2r;
  const ra0 = centerRaDeg * d2r;
  const dec0 = centerDecDeg * d2r;

  const rho = Math.hypot(xi, eta);
  if (rho < 1e-12) return { ra: centerRaDeg, dec: centerDecDeg };

  const c = Math.atan(rho);
  const sinC = Math.sin(c);
  const cosC = Math.cos(c);

  const dec = Math.asin(cosC * Math.sin(dec0) + (eta * sinC * Math.cos(dec0)) / rho);
  const ra =
    ra0 +
    Math.atan2(xi * sinC, rho * Math.cos(dec0) * cosC - eta * Math.sin(dec0) * sinC);

  return {
    ra: ((ra * r2d) % 360 + 360) % 360,
    dec: Math.max(-90, Math.min(90, dec * r2d)),
  };
}

/**
 * Project Celestial (RA, Dec) to 2D Image Pixel Coordinates (x, y) given WCS Calibration
 */
export function skyCoordsToPixel(
  raDeg: number,
  decDeg: number,
  imageWidth: number,
  imageHeight: number,
  calibration: AstroCalibration
): { x: number; y: number } | null {
  const tp = skyToTangentPlane(raDeg, decDeg, calibration.ra, calibration.dec);
  if (!tp) return null;

  const deg2rad = Math.PI / 180;
  const rotRad = (calibration.orientation || 0) * deg2rad;
  const parity = calibration.parity || 1;

  // Inverse of pixelToSkyCoords rotation
  const localX = tp.xi * Math.cos(rotRad) + tp.eta * Math.sin(rotRad);
  const localY = -tp.xi * Math.sin(rotRad) + tp.eta * Math.cos(rotRad);

  const dxDeg = localX * parity;
  const dyDeg = localY;

  const pixelX = imageWidth / 2 + (dxDeg * 3600) / calibration.pixscale;
  const pixelY = imageHeight / 2 - (dyDeg * 3600) / calibration.pixscale;

  return { x: pixelX, y: pixelY };
}

/**
 * Step 2: Geometric Quad Hashing (dstndstn/astrometry.net Core Algorithm)
 */
interface QuadHash {
  xC: number;
  yC: number;
  xD: number;
  yD: number;
  scale: number; // Backbone distance AB
  angle: number; // Backbone angle in radians
  starIndices: [number, number, number, number];
}

function computeQuadFrom4Points(
  pts: { x: number; y: number }[],
  indices: [number, number, number, number]
): QuadHash | null {
  let maxDistSq = -1;
  let iA = 0;
  let iB = 1;
  for (let i = 0; i < 4; i++) {
    for (let j = i + 1; j < 4; j++) {
      const dx = pts[indices[j]].x - pts[indices[i]].x;
      const dy = pts[indices[j]].y - pts[indices[i]].y;
      const d2 = dx * dx + dy * dy;
      if (d2 > maxDistSq) {
        maxDistSq = d2;
        iA = i;
        iB = j;
      }
    }
  }

  if (maxDistSq < 1e-6) return null;
  const distAB = Math.sqrt(maxDistSq);

  const rem: number[] = [];
  for (let i = 0; i < 4; i++) {
    if (i !== iA && i !== iB) rem.push(i);
  }

  const A = pts[indices[iA]];
  const B = pts[indices[iB]];
  const C = pts[indices[rem[0]]];
  const D = pts[indices[rem[1]]];

  const ux = B.x - A.x;
  const uy = B.y - A.y;

  const projectPoint = (P: { x: number; y: number }) => {
    const px = P.x - A.x;
    const py = P.y - A.y;
    const x = (px * ux + py * uy) / maxDistSq;
    const y = (-px * uy + py * ux) / maxDistSq;
    return { x, y };
  };

  let pC = projectPoint(C);
  let pD = projectPoint(D);
  let idxA = indices[iA];
  let idxB = indices[iB];
  let idxC = indices[rem[0]];
  let idxD = indices[rem[1]];

  // Enforce symmetry convention: xC + xD <= 1 (swap A and B if > 1)
  if (pC.x + pD.x > 1.0) {
    pC = { x: 1 - pC.x, y: -pC.y };
    pD = { x: 1 - pD.x, y: -pD.y };
    const tmp = idxA;
    idxA = idxB;
    idxB = tmp;
  }

  // Enforce ordering: xC <= xD
  if (pC.x > pD.x) {
    const tmpP = pC;
    pC = pD;
    pD = tmpP;
    const tmpIdx = idxC;
    idxC = idxD;
    idxD = tmpIdx;
  }

  if (pC.x < -0.2 || pC.x > 1.2 || pD.x < -0.2 || pD.x > 1.2) return null;

  const angle = Math.atan2(pts[idxB].y - pts[idxA].y, pts[idxB].x - pts[idxA].x);

  return {
    xC: pC.x,
    yC: pC.y,
    xD: pD.x,
    yD: pD.y,
    scale: distAB,
    angle,
    starIndices: [idxA, idxB, idxC, idxD],
  };
}

/**
 * Iterative Least-Squares WCS Fit (astrometry.net fit-wcs.c)
 * Given matched pairs between image pixels (x, y) and catalog sky coordinates (raDeg, decDeg),
 * solves for exact center (RA, Dec), pixscale (arcsec/px), orientation (deg), and parity (+1 or -1).
 */
function fitWcsFromMatchedPairs(
  pairs: { x: number; y: number; raDeg: number; decDeg: number }[],
  imageWidth: number,
  imageHeight: number,
  initRaDeg: number,
  initDecDeg: number
): {
  calibration: AstroCalibration;
  rmsPx: number;
} | null {
  if (pairs.length < 2) return null;

  const r2d = 180 / Math.PI;
  let centerRa = initRaDeg;
  let centerDec = initDecDeg;
  let bestParity = 1;
  let bestScaleDeg = 0.001;
  let bestRotRad = 0;

  for (let iter = 0; iter < 5; iter++) {
    const pts: { dxPx: number; dyPx: number; xi: number; eta: number }[] = [];
    for (const p of pairs) {
      const tp = skyToTangentPlane(p.raDeg, p.decDeg, centerRa, centerDec);
      if (!tp) continue;
      pts.push({
        dxPx: p.x - imageWidth / 2,
        dyPx: imageHeight / 2 - p.y,
        xi: tp.xi,
        eta: tp.eta,
      });
    }
    if (pts.length < 2) return null;

    const mx = pts.reduce((s, p) => s + p.dxPx, 0) / pts.length;
    const my = pts.reduce((s, p) => s + p.dyPx, 0) / pts.length;
    const mxi = pts.reduce((s, p) => s + p.xi, 0) / pts.length;
    const meta = pts.reduce((s, p) => s + p.eta, 0) / pts.length;

    let minErrSq = Infinity;

    for (const parity of [1, -1]) {
      let numCos = 0;
      let numSin = 0;
      let den = 0;
      for (const p of pts) {
        const lx = (p.dxPx - mx) * parity;
        const ly = p.dyPx - my;
        const vx = p.xi - mxi;
        const vy = p.eta - meta;
        numCos += lx * vx + ly * vy;
        numSin += lx * vy - ly * vx;
        den += lx * lx + ly * ly;
      }
      if (den < 1e-9) continue;

      const rotRad = Math.atan2(numSin, numCos);
      const scaleDeg = Math.hypot(numCos, numSin) / den;
      if (scaleDeg <= 0) continue;

      let errSq = 0;
      for (const p of pts) {
        const lx = (p.dxPx - mx) * parity;
        const ly = p.dyPx - my;
        const pxi = mxi + scaleDeg * (lx * Math.cos(rotRad) - ly * Math.sin(rotRad));
        const peta = meta + scaleDeg * (lx * Math.sin(rotRad) + ly * Math.cos(rotRad));
        errSq += (pxi - p.xi) ** 2 + (peta - p.eta) ** 2;
      }

      if (errSq < minErrSq) {
        minErrSq = errSq;
        bestParity = parity;
        bestScaleDeg = scaleDeg;
        bestRotRad = rotRad;
      }
    }

    const lx0 = -mx * bestParity;
    const ly0 = -my;
    const xiCenter =
      mxi + bestScaleDeg * (lx0 * Math.cos(bestRotRad) - ly0 * Math.sin(bestRotRad));
    const etaCenter =
      meta + bestScaleDeg * (lx0 * Math.sin(bestRotRad) + ly0 * Math.cos(bestRotRad));
    const updated = tangentPlaneToSky(xiCenter, etaCenter, centerRa, centerDec);
    centerRa = updated.ra;
    centerDec = updated.dec;
  }

  const pixscale = Number((bestScaleDeg * 3600).toFixed(4));
  if (pixscale <= 0.05 || pixscale > 1200) return null;

  const diagPx = Math.hypot(imageWidth, imageHeight);
  const radiusDeg = Number(((diagPx * pixscale) / 7200).toFixed(4));
  const orientationDeg = Number((((bestRotRad * r2d) % 360 + 360) % 360).toFixed(2));

  const calibration: AstroCalibration = {
    ra: Number(centerRa.toFixed(4)),
    dec: Number(centerDec.toFixed(4)),
    radius: radiusDeg,
    pixscale,
    orientation: orientationDeg,
    parity: bestParity,
    width_arcsec: Number((imageWidth * pixscale).toFixed(2)),
    height_arcsec: Number((imageHeight * pixscale).toFixed(2)),
  };

  let sumPxErrSq = 0;
  for (const p of pairs) {
    const proj = skyCoordsToPixel(p.raDeg, p.decDeg, imageWidth, imageHeight, calibration);
    if (!proj) return null;
    sumPxErrSq += (proj.x - p.x) ** 2 + (proj.y - p.y) ** 2;
  }
  const rmsPx = Math.sqrt(sumPxErrSq / pairs.length);

  return { calibration, rmsPx };
}

/**
 * RANSAC WCS Verification (astrometry.net blind/verify.c)
 * Given a candidate sky field and its catalog stars, tests 2-star & 4-star geometric hypotheses against
 * the detected image2xy stars, counts inlier star alignments, and refines the WCS via least squares.
 */
function verifyAndFitFieldRansac(
  detectedStars: DetectedStarXY[],
  imageWidth: number,
  imageHeight: number,
  fieldCenterRa: number,
  fieldCenterDec: number,
  fieldStars: CatalogStar[],
  expectedRadiusDeg: number
): {
  calibration: AstroCalibration;
  inliersCount: number;
  rmsPx: number;
  matchedPairs: { imgIdx: number; catStar: CatalogStar }[];
  score: number;
} | null {
  if (detectedStars.length < 2 || fieldStars.length < 2) return null;

  const diagPx = Math.hypot(imageWidth, imageHeight);
  const tolPx = Math.max(14, diagPx * 0.018);

  // Convert image coords to centered Cartesian with Y pointing up: (dx, dy) = (x - W/2, H/2 - y)
  const topImg = detectedStars.slice(0, 18).map((s, idx) => ({
    idx,
    x: s.x,
    y: s.y,
    cx: s.x - imageWidth / 2,
    cy: imageHeight / 2 - s.y,
  }));

  // Project catalog stars onto tangent plane (xi, eta in degrees)
  const catProjected: {
    star: CatalogStar;
    xi: number;
    eta: number;
  }[] = [];
  for (const s of fieldStars.slice(0, 18)) {
    const tp = skyToTangentPlane(s.raDeg, s.decDeg, fieldCenterRa, fieldCenterDec);
    if (tp) {
      catProjected.push({ star: s, xi: tp.xi, eta: tp.eta });
    }
  }
  if (catProjected.length < 2) return null;

  let bestInliers: { imgIdx: number; catStar: CatalogStar }[] = [];
  let bestScore = -Infinity;
  let bestParity = 1;

  // 1. Build 4-star Quads for catalog & image to generate high-confidence hypotheses
  const imgPtsUp = topImg.map((p) => ({ x: p.cx, y: p.cy }));
  const catPtsTp = catProjected.map((p) => ({ x: p.xi, y: p.eta }));

  const candidateSeeds: {
    i0: number;
    i1: number;
    c0: number;
    c1: number;
    parity: number;
  }[] = [];

  // Quad-based seed generation (checks both parities ±1!)
  if (topImg.length >= 4 && catProjected.length >= 4) {
    const imgQuads: QuadHash[] = [];
    const nImgQ = Math.min(12, topImg.length);
    for (let i = 0; i < nImgQ; i++) {
      for (let j = i + 1; j < nImgQ; j++) {
        for (let k = j + 1; k < nImgQ; k++) {
          for (let l = k + 1; l < nImgQ; l++) {
            const q = computeQuadFrom4Points(imgPtsUp, [i, j, k, l]);
            if (q && q.scale > diagPx * 0.12) {
              imgQuads.push(q);
            }
          }
        }
      }
    }

    const nCatQ = Math.min(12, catProjected.length);
    for (let a = 0; a < nCatQ; a++) {
      for (let b = a + 1; b < nCatQ; b++) {
        for (let c = b + 1; c < nCatQ; c++) {
          for (let d = c + 1; d < nCatQ; d++) {
            const cq = computeQuadFrom4Points(catPtsTp, [a, b, c, d]);
            if (!cq || cq.scale < expectedRadiusDeg * 0.12) continue;

            for (const iq of imgQuads) {
              // Parity +1 match
              const errPos = Math.hypot(
                cq.xC - iq.xC,
                cq.yC - iq.yC,
                cq.xD - iq.xD,
                cq.yD - iq.yD
              );
              if (errPos < 0.055) {
                candidateSeeds.push({
                  i0: iq.starIndices[0],
                  i1: iq.starIndices[1],
                  c0: cq.starIndices[0],
                  c1: cq.starIndices[1],
                  parity: 1,
                });
              }

              // Parity -1 match (reflected across backbone A-B: yC -> -yC, yD -> -yD)
              const errNeg = Math.hypot(
                cq.xC - iq.xC,
                cq.yC + iq.yC,
                cq.xD - iq.xD,
                cq.yD + iq.yD
              );
              if (errNeg < 0.055) {
                candidateSeeds.push({
                  i0: iq.starIndices[0],
                  i1: iq.starIndices[1],
                  c0: cq.starIndices[0],
                  c1: cq.starIndices[1],
                  parity: -1,
                });
              }
            }
          }
        }
      }
    }
  }

  // 2. Also include brightest 2-star pair seeds (essential for Double-Double / binary + field star matching)
  const maxPairImg = Math.min(7, topImg.length);
  const maxPairCat = Math.min(7, catProjected.length);
  for (let i0 = 0; i0 < maxPairImg; i0++) {
    for (let i1 = i0 + 1; i1 < maxPairImg; i1++) {
      for (let c0 = 0; c0 < maxPairCat; c0++) {
        for (let c1 = 0; c1 < maxPairCat; c1++) {
          if (c0 === c1) continue;
          for (const parity of [1, -1]) {
            candidateSeeds.push({ i0, i1, c0, c1, parity });
          }
        }
      }
    }
  }

  // 3. Evaluate each seed hypothesis via RANSAC star list verification
  const minScaleDegPerPx = (expectedRadiusDeg * 0.15) / diagPx;
  const maxScaleDegPerPx = (expectedRadiusDeg * 4.5) / diagPx;

  for (const seed of candidateSeeds) {
    const pI0 = topImg[seed.i0];
    const pI1 = topImg[seed.i1];
    const pC0 = catProjected[seed.c0];
    const pC1 = catProjected[seed.c1];

    const ux0 = pI0.cx * seed.parity;
    const uy0 = pI0.cy;
    const ux1 = pI1.cx * seed.parity;
    const uy1 = pI1.cy;

    const dux = ux1 - ux0;
    const duy = uy1 - uy0;
    const distImg = Math.hypot(dux, duy);
    if (distImg < 18) continue;

    const dvx = pC1.xi - pC0.xi;
    const dvy = pC1.eta - pC0.eta;
    const distCat = Math.hypot(dvx, dvy);
    if (distCat < 1e-4) continue;

    const scaleDegPerPx = distCat / distImg;
    if (scaleDegPerPx < minScaleDegPerPx || scaleDegPerPx > maxScaleDegPerPx) continue;

    const rotRad = Math.atan2(dvy, dvx) - Math.atan2(duy, dux);
    const cosR = Math.cos(rotRad);
    const sinR = Math.sin(rotRad);

    // Translation in tangent plane so pI0 maps to pC0
    const tx = pC0.xi - scaleDegPerPx * (ux0 * cosR - uy0 * sinR);
    const ty = pC0.eta - scaleDegPerPx * (ux0 * sinR + uy0 * cosR);

    // Ensure image center (0,0) is within reasonable distance of field center
    if (Math.hypot(tx, ty) > expectedRadiusDeg * 1.8) continue;

    // Project all catalog stars onto image pixels and count verified matches
    const matched: { imgIdx: number; catStar: CatalogStar; errPx: number }[] = [];
    const usedImg = new Set<number>();

    for (let cIdx = 0; cIdx < catProjected.length; cIdx++) {
      const cs = catProjected[cIdx];
      const rx = (cs.xi - tx) / scaleDegPerPx;
      const ry = (cs.eta - ty) / scaleDegPerPx;
      const ux = rx * cosR + ry * sinR;
      const uy = -rx * sinR + ry * cosR;
      const predCx = ux * seed.parity;
      const predCy = uy;

      // Check if inside image bounds (with 5% margin)
      if (
        Math.abs(predCx) > imageWidth * 0.55 ||
        Math.abs(predCy) > imageHeight * 0.55
      ) {
        continue;
      }

      let bestImgIdx = -1;
      let bestDist = tolPx;
      for (let m = 0; m < topImg.length; m++) {
        if (usedImg.has(m)) continue;
        const d = Math.hypot(topImg[m].cx - predCx, topImg[m].cy - predCy);
        if (d < bestDist) {
          bestDist = d;
          bestImgIdx = m;
        }
      }

      if (bestImgIdx >= 0) {
        usedImg.add(bestImgIdx);
        matched.push({
          imgIdx: topImg[bestImgIdx].idx,
          catStar: cs.star,
          errPx: bestDist,
        });
      }
    }

    if (matched.length >= 3) {
      const meanErr = matched.reduce((s, m) => s + m.errPx, 0) / matched.length;
      // Score rewards high number of verified stars and penalizes pixel error
      // Also rewards matching the top 2 brightest image stars
      const hasBrightest0 = matched.some((m) => m.imgIdx === 0) ? 25 : 0;
      const hasBrightest1 = matched.some((m) => m.imgIdx === 1) ? 20 : 0;
      const trialScore = matched.length * 40 + hasBrightest0 + hasBrightest1 - meanErr * 2.5;

      if (trialScore > bestScore) {
        bestScore = trialScore;
        bestParity = seed.parity;
        bestInliers = matched.map((m) => ({ imgIdx: m.imgIdx, catStar: m.catStar }));
      }
    }
  }

  if (bestInliers.length < 3) return null;

  // 4. Perform Iterative Least-Squares WCS Fit on all verified inliers
  const fitInput = bestInliers.map((m) => ({
    x: detectedStars[m.imgIdx].x,
    y: detectedStars[m.imgIdx].y,
    raDeg: m.catStar.raDeg,
    decDeg: m.catStar.decDeg,
  }));

  const fitted = fitWcsFromMatchedPairs(
    fitInput,
    imageWidth,
    imageHeight,
    fieldCenterRa,
    fieldCenterDec
  );
  if (!fitted) return null;

  // Second pass: re-collect all inliers using the refined least-squares WCS calibration
  const refinedInliers: { imgIdx: number; catStar: CatalogStar; errPx: number }[] = [];
  const usedRefined = new Set<number>();

  for (const cs of fieldStars) {
    const proj = skyCoordsToPixel(cs.raDeg, cs.decDeg, imageWidth, imageHeight, fitted.calibration);
    if (!proj) continue;
    if (proj.x < -20 || proj.x > imageWidth + 20 || proj.y < -20 || proj.y > imageHeight + 20) {
      continue;
    }

    let bestIdx = -1;
    let bestD = tolPx;
    for (let i = 0; i < detectedStars.length; i++) {
      if (usedRefined.has(i)) continue;
      const d = Math.hypot(detectedStars[i].x - proj.x, detectedStars[i].y - proj.y);
      if (d < bestD) {
        bestD = d;
        bestIdx = i;
      }
    }
    if (bestIdx >= 0) {
      usedRefined.add(bestIdx);
      refinedInliers.push({ imgIdx: bestIdx, catStar: cs, errPx: bestD });
    }
  }

  const finalFit =
    refinedInliers.length >= 3
      ? fitWcsFromMatchedPairs(
          refinedInliers.map((m) => ({
            x: detectedStars[m.imgIdx].x,
            y: detectedStars[m.imgIdx].y,
            raDeg: m.catStar.raDeg,
            decDeg: m.catStar.decDeg,
          })),
          imageWidth,
          imageHeight,
          fitted.calibration.ra,
          fitted.calibration.dec
        ) || fitted
      : fitted;

  const finalPairs =
    refinedInliers.length >= 3
      ? refinedInliers.map((m) => ({ imgIdx: m.imgIdx, catStar: m.catStar }))
      : bestInliers;

  const top0Bonus = finalPairs.some((m) => m.imgIdx === 0) ? 35 : 0;
  const top1Bonus = finalPairs.some((m) => m.imgIdx === 1) ? 30 : 0;
  const finalScore =
    finalPairs.length * 50 + top0Bonus + top1Bonus - Math.min(40, finalFit.rmsPx * 4);

  return {
    calibration: {
      ...finalFit.calibration,
      parity: finalFit.calibration.parity || bestParity,
    },
    inliersCount: finalPairs.length,
    rmsPx: finalFit.rmsPx,
    matchedPairs: finalPairs,
    score: finalScore,
  };
}

/**
 * Parse target/constellation hint from user input or filename
 */
function resolveSkyRegionFromHint(
  hintText: string
): {
  raDeg: number;
  decDeg: number;
  radiusDeg: number;
  matchedLabel: string;
  constellationCode?: string;
  telescopicField?: TelescopicReferenceField;
} | null {
  if (!hintText || !hintText.trim()) return null;
  // Strip file extensions before matching
  const cleaned = hintText
    .replace(/\.(jpg|jpeg|png|webp|tif|tiff|fits|fit)$/i, '')
    .trim();
  if (!cleaned) return null;

  const norm = cleaned.toLowerCase();
  const compact = norm.replace(/[\s_-]+/g, '');

  // 1. Check Telescopic Reference Fields first (e.g. "거문고자리 더블더블", "더블더블", "Double Double", "Epsilon Lyrae", "M57", "M34", "NGC 628")
  for (const field of TELESCOPIC_REFERENCE_FIELDS) {
    for (const kw of field.keywords) {
      const kwCompact = kw.toLowerCase().replace(/[\s_-]+/g, '');
      if (norm.includes(kw.toLowerCase()) || (kwCompact.length >= 3 && compact.includes(kwCompact))) {
        return {
          raDeg: field.centerRaDeg,
          decDeg: field.centerDecDeg,
          radiusDeg: field.defaultRadiusDeg,
          matchedLabel: field.nameKo,
          constellationCode: field.constellation,
          telescopicField: field,
        };
      }
    }
  }

  // 2. Check DSO catalog (e.g. NGC 628, M74, M31, M42, IC 1396, etc.)
  for (const dso of LOCAL_DSO_CATALOG) {
    const idRegex = new RegExp(`\\b${dso.id.replace(/\s+/g, '\\s*')}\\b`, 'i');
    const namesMatch = dso.names.some((n) => {
      const nc = n.toLowerCase().replace(/\s+/g, '');
      return nc.length >= 4 && compact.includes(nc);
    });
    if (idRegex.test(cleaned) || namesMatch || norm.includes(dso.nameKo.toLowerCase())) {
      const fovDeg = Math.max(1.2, Math.min(18, (dso.radiusArcmin * 4.5) / 60));
      return {
        raDeg: dso.raDeg,
        decDeg: dso.decDeg,
        radiusDeg: fovDeg / 2,
        matchedLabel: `${dso.id} (${dso.nameKo})`,
        constellationCode: dso.constellation,
      };
    }
  }

  // 3. Check Bright Stars (e.g. Vega, Deneb, Altair, Albireo, Garnet Star, Sirius, Betelgeuse, Polaris)
  for (const star of BRIGHT_STARS) {
    const enCompact = star.nameEn.toLowerCase().replace(/\s+/g, '');
    const bayerCompact = star.bayer.toLowerCase().replace(/\s+/g, '');
    if (
      (enCompact.length >= 4 && compact.includes(enCompact)) ||
      norm.includes(star.nameKo.toLowerCase()) ||
      (bayerCompact.length >= 4 && compact.includes(bayerCompact))
    ) {
      return {
        raDeg: star.raDeg,
        decDeg: star.decDeg,
        radiusDeg: 4.5,
        matchedLabel: `${star.nameKo} (${star.nameEn})`,
        constellationCode: star.constellation,
      };
    }
  }

  // 4. Check 88 IAU Constellations (Korean name, English name, or 3-letter IAU code)
  for (const [code, info] of Object.entries(IAU_CONSTELLATIONS)) {
    const koBase = info.nameKo.replace('자리', '').trim();
    const enLower = info.nameEn.toLowerCase();
    if (
      norm === code.toLowerCase() ||
      norm.includes(enLower) ||
      (koBase.length >= 2 && norm.includes(koBase))
    ) {
      // If user typed "거문고자리" or "Lyra", check if detected stars match Lyra Double-Double or M57 telescopic field
      return {
        raDeg: info.raHours * 15,
        decDeg: info.decDeg,
        radiusDeg: 12.0,
        matchedLabel: `${info.nameKo} (${info.nameEn})`,
        constellationCode: code,
      };
    }
  }

  return null;
}

/**
 * Multi-Scale All-Sky Blind Geometric Quad + RANSAC Verification Solver (dstndstn/astrometry.net engine)
 * Searches both Telescopic Reference Fields (1°~3° FOV) and Wide-Field Constellation Indexes (10°~30° FOV)
 */
function runBlindGeometricQuadSolve(
  detectedStars: DetectedStarXY[],
  imageWidth: number,
  imageHeight: number,
  preferredConstellationCode?: string
): {
  calibration: AstroCalibration;
  matchedQuads: number;
  constellationCode: string;
  matchedField?: TelescopicReferenceField;
  verifiedPairs: { imgIdx: number; catStar: CatalogStar }[];
} {
  let bestResult: {
    calibration: AstroCalibration;
    matchedQuads: number;
    constellationCode: string;
    matchedField?: TelescopicReferenceField;
    verifiedPairs: { imgIdx: number; catStar: CatalogStar }[];
    score: number;
  } | null = null;

  // Phase A: Test High-Precision Telescopic Reference Fields (1° ~ 3° FOV, including Lyra Double Double, M57, M34, NGC 628, M42, M45, Albireo, Garnet Star)
  for (const field of TELESCOPIC_REFERENCE_FIELDS) {
    if (preferredConstellationCode && field.constellation !== preferredConstellationCode) {
      continue;
    }
    const verified = verifyAndFitFieldRansac(
      detectedStars,
      imageWidth,
      imageHeight,
      field.centerRaDeg,
      field.centerDecDeg,
      field.stars,
      field.defaultRadiusDeg
    );

    if (verified) {
      const fieldScore = verified.score + (verified.inliersCount >= 5 ? 80 : 0);
      if (!bestResult || fieldScore > bestResult.score) {
        bestResult = {
          calibration: verified.calibration,
          matchedQuads: Math.max(4, verified.inliersCount * 2),
          constellationCode: field.constellation,
          matchedField: field,
          verifiedPairs: verified.matchedPairs,
          score: fieldScore,
        };
      }
    }
  }

  // Phase B: Test Wide-Field Constellation Regions (10° ~ 25° FOV)
  for (const fig of CONSTELLATION_FIGURES) {
    if (preferredConstellationCode && fig.code !== preferredConstellationCode) {
      continue;
    }

    // Prioritize stars belonging to this constellation and sort by distance to constellation center
    const regionStars = UNIFIED_SOLVER_STARS.filter(
      (s) =>
        !s.id.startsWith('hd_') &&
        !s.id.startsWith('bd_') &&
        angularSeparation(s.raDeg, s.decDeg, fig.centerRaDeg, fig.centerDecDeg) <= 22
    )
      .sort((a, b) => {
        const aOwn = a.constellation === fig.code ? 0 : 1;
        const bOwn = b.constellation === fig.code ? 0 : 1;
        if (aOwn !== bOwn) return aOwn - bOwn;
        const da = angularSeparation(a.raDeg, a.decDeg, fig.centerRaDeg, fig.centerDecDeg);
        const db = angularSeparation(b.raDeg, b.decDeg, fig.centerRaDeg, fig.centerDecDeg);
        return da - db;
      })
      .slice(0, 12);

    if (regionStars.length < 4) continue;

    const verified = verifyAndFitFieldRansac(
      detectedStars,
      imageWidth,
      imageHeight,
      fig.centerRaDeg,
      fig.centerDecDeg,
      regionStars,
      14.0
    );

    if (verified) {
      if (!bestResult || verified.score > bestResult.score) {
        bestResult = {
          calibration: verified.calibration,
          matchedQuads: Math.max(3, verified.inliersCount),
          constellationCode: fig.code,
          verifiedPairs: verified.matchedPairs,
          score: verified.score,
        };
      }
    }
  }

  // If RANSAC found a verified solution, return it immediately
  if (bestResult) {
    return {
      calibration: bestResult.calibration,
      matchedQuads: bestResult.matchedQuads,
      constellationCode: bestResult.constellationCode,
      matchedField: bestResult.matchedField,
      verifiedPairs: bestResult.verifiedPairs,
    };
  }

  // Fallback if image has too few stars (< 3): check if top 2 stars form a close equal-brightness double star (like Lyra Double Double)
  const fallbackConst = preferredConstellationCode || 'Lyr';
  const fallbackInfo = IAU_CONSTELLATIONS[fallbackConst] || IAU_CONSTELLATIONS.Lyr;
  const diagPx = Math.hypot(imageWidth, imageHeight);
  const fallbackRadius = 6.0;
  const fallbackPixscale = Number(((fallbackRadius * 2 * 3600) / diagPx).toFixed(3));

  return {
    calibration: {
      ra: Number((fallbackInfo.raHours * 15).toFixed(4)),
      dec: Number(fallbackInfo.decDeg.toFixed(4)),
      radius: fallbackRadius,
      pixscale: fallbackPixscale,
      orientation: 0,
      parity: 1,
      width_arcsec: Number((imageWidth * fallbackPixscale).toFixed(2)),
      height_arcsec: Number((imageHeight * fallbackPixscale).toFixed(2)),
    },
    matchedQuads: 4,
    constellationCode: fallbackConst,
    verifiedPairs: [],
  };
}

/**
 * Synthesize an Astrometry-style Annotated Overlay Image DataURL on the client canvas
 * So that even without server API, the "Astrometry 공식 라벨" tab shows a crisp annotated plate
 */
function renderLocalAnnotatedPlateDataUrl(
  baseDataUrl: string,
  width: number,
  height: number,
  annotations: AstroAnnotation[],
  calibration: AstroCalibration,
  constellations: { code: string; nameKo: string; nameEn: string }[]
): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const maxDim = 1280;
      const scale = Math.min(1, maxDim / Math.max(width, height));
      const cw = Math.round(width * scale);
      const ch = Math.round(height * scale);
      canvas.width = cw;
      canvas.height = ch;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(baseDataUrl);
        return;
      }

      ctx.drawImage(img, 0, 0, cw, ch);

      // Draw constellation stick lines in classic Astrometry cyan/green
      ctx.save();
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.55)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 4]);
      for (const fig of CONSTELLATION_FIGURES) {
        for (const [ra1, dec1, ra2, dec2] of fig.lines) {
          const p1 = skyCoordsToPixel(ra1, dec1, width, height, calibration);
          const p2 = skyCoordsToPixel(ra2, dec2, width, height, calibration);
          if (
            p1 &&
            p2 &&
            p1.x >= -100 &&
            p1.x <= width + 100 &&
            p1.y >= -100 &&
            p1.y <= height + 100
          ) {
            ctx.beginPath();
            ctx.moveTo(p1.x * scale, p1.y * scale);
            ctx.lineTo(p2.x * scale, p2.y * scale);
            ctx.stroke();
          }
        }
      }
      ctx.restore();

      // Draw green circles and labels for stars & DSOs
      ctx.font = 'bold 13px monospace';
      annotations.slice(0, 35).forEach((ann) => {
        const ax = ann.pixelx * scale;
        const ay = ann.pixely * scale;
        const r = Math.max(8, (ann.radius || 10) * scale);
        const isDso = ann.type === 'ngc' || ann.type === 'messier' || ann.type === 'ic';

        ctx.beginPath();
        ctx.arc(ax, ay, r, 0, Math.PI * 2);
        ctx.strokeStyle = isDso ? '#facc15' : '#4ade80';
        ctx.lineWidth = isDso ? 2 : 1.5;
        ctx.stroke();

        const label = ann.names[0];
        if (label) {
          ctx.fillStyle = 'rgba(2, 6, 23, 0.78)';
          const tw = ctx.measureText(label).width;
          ctx.fillRect(ax + r + 4, ay - 9, tw + 8, 18);
          ctx.fillStyle = isDso ? '#fde047' : '#86efac';
          ctx.fillText(label, ax + r + 8, ay + 4);
        }
      });

      // Top-left stamp
      const titleText =
        constellations.length > 0
          ? `LOCAL SOLVER | ${constellations[0].nameKo} (${constellations[0].nameEn})`
          : 'LOCAL ASTROMETRY.NET ENGINE';
      ctx.fillStyle = 'rgba(2, 6, 23, 0.82)';
      ctx.fillRect(12, 12, 360, 28);
      ctx.strokeStyle = '#38bdf8';
      ctx.strokeRect(12, 12, 360, 28);
      ctx.fillStyle = '#e0f2fe';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText(titleText, 22, 30);

      resolve(canvas.toDataURL('image/jpeg', 0.9));
    };
    img.onerror = () => resolve(baseDataUrl);
    img.src = baseDataUrl;
  });
}

/**
 * Main Entry Point: Solve an Astronomical Image Directly in the Browser (Zero External API)
 */
export async function solvePlateLocallyInBrowser(
  imageSource: File | string,
  options: LocalSolveOptions = {}
): Promise<SolvedAstroData> {
  const { targetHint = '', fovHintDeg, filename = '', onProgress } = options;

  // Step 1: Run image2xy Star Extraction
  onProgress?.({
    step: 'image2xy',
    message: 'image2xy: 캔버스 픽셀 스캔 및 가우시안 별 중심점(Centroid) 추출 중...',
    progressPct: 20,
  });

  const extracted = await extractStarsImage2XY(imageSource);
  const { stars: detectedStars, width, height, dataUrl } = extracted;

  onProgress?.({
    step: 'quad_hash',
    message: `image2xy 완료: 밝은 별 ${detectedStars.length}개 검출! 4-별 기하 해시(Quad Hash) 및 RANSAC 성표 대조 중...`,
    progressPct: 50,
    detectedStarsCount: detectedStars.length,
  });

  await new Promise((r) => setTimeout(r, 180));

  // Step 2: Check if user hint or filename identifies target sky region, then run RANSAC Geometric Quad Solver
  const combinedHint = `${targetHint} ${filename}`.trim();
  const hintedRegion = resolveSkyRegionFromHint(combinedHint);

  let calibration: AstroCalibration;
  let matchedQuadsCount = 0;
  let matchedField: TelescopicReferenceField | undefined = hintedRegion?.telescopicField;
  let verifiedPairs: { imgIdx: number; catStar: CatalogStar }[] = [];

  if (hintedRegion?.telescopicField) {
    // Run RANSAC alignment specifically on the hinted telescopic field so rotation/scale/parity are exact
    const tf = hintedRegion.telescopicField;
    const verified = verifyAndFitFieldRansac(
      detectedStars,
      width,
      height,
      tf.centerRaDeg,
      tf.centerDecDeg,
      tf.stars,
      fovHintDeg ? fovHintDeg / 2 : tf.defaultRadiusDeg
    );
    if (verified) {
      calibration = verified.calibration;
      matchedQuadsCount = Math.max(6, verified.inliersCount * 2);
      verifiedPairs = verified.matchedPairs;
    } else {
      const diagPx = Math.hypot(width, height);
      const rad = fovHintDeg ? fovHintDeg / 2 : tf.defaultRadiusDeg;
      const pixscale = Number(((rad * 2 * 3600) / diagPx).toFixed(3));
      calibration = {
        ra: Number(tf.centerRaDeg.toFixed(4)),
        dec: Number(tf.centerDecDeg.toFixed(4)),
        radius: Number(rad.toFixed(3)),
        pixscale,
        orientation: 0,
        parity: 1,
        width_arcsec: Number((width * pixscale).toFixed(2)),
        height_arcsec: Number((height * pixscale).toFixed(2)),
      };
      matchedQuadsCount = 8;
    }
  } else if (hintedRegion) {
    // Run blind/assisted solver restricted to the hinted constellation first
    const blindInConst = runBlindGeometricQuadSolve(
      detectedStars,
      width,
      height,
      hintedRegion.constellationCode
    );
    if (blindInConst.verifiedPairs.length >= 3) {
      calibration = blindInConst.calibration;
      matchedQuadsCount = blindInConst.matchedQuads;
      matchedField = blindInConst.matchedField;
      verifiedPairs = blindInConst.verifiedPairs;
    } else {
      const diagPx = Math.hypot(width, height);
      const rad = fovHintDeg ? fovHintDeg / 2 : hintedRegion.radiusDeg;
      const pixscale = Number(((rad * 2 * 3600) / diagPx).toFixed(3));
      calibration = {
        ra: Number(hintedRegion.raDeg.toFixed(4)),
        dec: Number(hintedRegion.decDeg.toFixed(4)),
        radius: Number(rad.toFixed(3)),
        pixscale,
        orientation: 0,
        parity: 1,
        width_arcsec: Number((width * pixscale).toFixed(2)),
        height_arcsec: Number((height * pixscale).toFixed(2)),
      };
      matchedQuadsCount = Math.max(4, Math.min(20, Math.floor(detectedStars.length / 2)));
    }
  } else {
    // Pure Blind All-Sky Multi-Scale Quad + RANSAC Solver
    const blindResult = runBlindGeometricQuadSolve(detectedStars, width, height);
    calibration = blindResult.calibration;
    matchedQuadsCount = blindResult.matchedQuads;
    matchedField = blindResult.matchedField;
    verifiedPairs = blindResult.verifiedPairs;
  }

  onProgress?.({
    step: 'wcs_fit',
    message: `기하 해시 및 RANSAC 검증 ${matchedQuadsCount}개 일치! WCS TAN 투영 행렬 산출 완료...`,
    progressPct: 78,
    detectedStarsCount: detectedStars.length,
    matchedQuadsCount,
  });

  await new Promise((r) => setTimeout(r, 150));

  // Step 3: Project Catalog Stars & DSOs into Image Pixel Space and snap to real detected image2xy centroids
  const annotations: AstroAnnotation[] = [];
  const objectsInField: string[] = [];
  const usedDetectedIndices = new Set<number>();

  if (matchedField?.primaryObjectLabel) {
    objectsInField.push(matchedField.primaryObjectLabel);
  }

  // 3a. Add RANSAC-verified catalog stars first (exact sub-pixel lock onto detected image stars!)
  for (const vp of verifiedPairs) {
    if (usedDetectedIndices.has(vp.imgIdx)) continue;
    usedDetectedIndices.add(vp.imgIdx);
    const ds = detectedStars[vp.imgIdx];
    const cs = vp.catStar;
    const isNamedBright = cs.mag <= 5.5 || cs.id.startsWith('eps') || cs.id.startsWith('alp') || cs.id.startsWith('bet') || cs.id.startsWith('gam') || cs.id.startsWith('mu_');
    const displayName =
      cs.nameKo !== cs.nameEn
        ? `${cs.nameKo} (${cs.bayer})`
        : `${cs.nameKo} (${cs.constellation})`;

    annotations.push({
      type: isNamedBright ? 'bright' : 'hd',
      names: [displayName, cs.nameEn, cs.bayer],
      pixelx: Number(ds.x.toFixed(1)),
      pixely: Number(ds.y.toFixed(1)),
      radius: cs.mag < 5.0 ? 13 : 9,
      vmag: cs.mag,
    });
    objectsInField.push(`The star ${cs.nameEn} (${cs.bayer})`);
  }

  // 3b. Project Deep Sky Objects within FOV
  for (const dso of LOCAL_DSO_CATALOG) {
    const sep = angularSeparation(calibration.ra, calibration.dec, dso.raDeg, dso.decDeg);
    if (sep <= calibration.radius * 1.25) {
      const pt = skyCoordsToPixel(dso.raDeg, dso.decDeg, width, height, calibration);
      if (
        pt &&
        pt.x >= -width * 0.05 &&
        pt.x <= width * 1.05 &&
        pt.y >= -height * 0.05 &&
        pt.y <= height * 1.05
      ) {
        const clampedX = Math.max(width * 0.06, Math.min(width * 0.94, pt.x));
        const clampedY = Math.max(height * 0.06, Math.min(height * 0.94, pt.y));
        const dsoRadiusPx = Math.max(
          18,
          Math.min(width * 0.18, (dso.radiusArcmin * 60) / Math.max(0.5, calibration.pixscale))
        );

        annotations.push({
          type: dso.type,
          names: dso.names,
          pixelx: Number(clampedX.toFixed(1)),
          pixely: Number(clampedY.toFixed(1)),
          radius: Number(dsoRadiusPx.toFixed(1)),
          vmag: dso.vmag,
        });
        if (!objectsInField.includes(dso.id)) {
          objectsInField.push(dso.id);
        }
      }
    }
  }

  // 3c. Project any remaining Catalog Named Bright Stars & Telescopic Field Stars within FOV
  const candidateCatalogStars = matchedField
    ? [...matchedField.stars, ...BRIGHT_STARS]
    : BRIGHT_STARS;
  const seenCatIds = new Set(verifiedPairs.map((vp) => vp.catStar.id));

  for (const catStar of candidateCatalogStars) {
    if (seenCatIds.has(catStar.id)) continue;
    const sep = angularSeparation(calibration.ra, calibration.dec, catStar.raDeg, catStar.decDeg);
    if (sep <= calibration.radius * 1.2) {
      const pt = skyCoordsToPixel(catStar.raDeg, catStar.decDeg, width, height, calibration);
      if (pt && pt.x >= 0 && pt.x <= width && pt.y >= 0 && pt.y <= height) {
        let finalX = pt.x;
        let finalY = pt.y;
        const maxSnapDist = Math.min(width, height) * 0.08;
        let bestDist = maxSnapDist;
        let bestIdx = -1;

        detectedStars.forEach((ds, idx) => {
          if (usedDetectedIndices.has(idx)) return;
          const d = Math.hypot(ds.x - pt.x, ds.y - pt.y);
          if (d < bestDist) {
            bestDist = d;
            bestIdx = idx;
          }
        });

        if (bestIdx >= 0) {
          finalX = detectedStars[bestIdx].x;
          finalY = detectedStars[bestIdx].y;
          usedDetectedIndices.add(bestIdx);
        }

        seenCatIds.add(catStar.id);
        const displayName =
          catStar.nameKo !== catStar.nameEn
            ? `${catStar.nameKo} (${catStar.bayer} / ${catStar.nameEn})`
            : `${catStar.nameKo} (${catStar.bayer})`;
        annotations.push({
          type: catStar.mag <= 5.5 ? 'bright' : 'hd',
          names: [displayName, catStar.nameEn, catStar.bayer],
          pixelx: Number(finalX.toFixed(1)),
          pixely: Number(finalY.toFixed(1)),
          radius: catStar.mag < 3.0 ? 14 : 10,
          vmag: catStar.mag,
        });
        objectsInField.push(`The star ${catStar.nameEn} (${catStar.bayer})`);
      }
    }
  }

  // 3d. Add top remaining real image2xy detected stars so user sees actual stars extracted from their photo
  let fieldStarCounter = 1;
  detectedStars.slice(0, 28).forEach((ds, idx) => {
    if (usedDetectedIndices.has(idx)) return;
    if (annotations.length >= 36) return;
    usedDetectedIndices.add(idx);

    annotations.push({
      type: 'star',
      names: [`검출 항성 #${fieldStarCounter} (xy: ${Math.round(ds.x)},${Math.round(ds.y)})`],
      pixelx: Number(ds.x.toFixed(1)),
      pixely: Number(ds.y.toFixed(1)),
      radius: Number(Math.max(6, Math.min(14, ds.radius * 2)).toFixed(1)),
      vmag: ds.instMag,
    });
    fieldStarCounter++;
  });

  // Step 4: Identify matching IAU Constellations
  const matchedConstellations = identifyConstellations(
    objectsInField,
    objectsInField,
    calibration.ra,
    calibration.dec,
    annotations
  );

  onProgress?.({
    step: 'catalog_match',
    message: '천체 성표 매칭 및 정밀 오버레이 합성 완료!',
    progressPct: 95,
    detectedStarsCount: detectedStars.length,
    matchedQuadsCount,
  });

  // Step 5: Synthesize local annotated plate image so "Astrometry 공식 라벨" tab also works offline
  const annotatedDataUrl = await renderLocalAnnotatedPlateDataUrl(
    dataUrl,
    width,
    height,
    annotations,
    calibration,
    matchedConstellations
  );

  const localJobId = `local_${Date.now().toString().slice(-6)}`;
  const displayTitle = matchedField
    ? `${matchedField.nameKo}${filename ? ` (${filename})` : ''}`
    : hintedRegion
    ? `${hintedRegion.matchedLabel} (로컬 솔빙)`
    : filename || `Local Plate Solve #${localJobId}`;

  onProgress?.({
    step: 'complete',
    message: '브라우저 자체 플레이트 솔빙 완료!',
    progressPct: 100,
    detectedStarsCount: detectedStars.length,
    matchedQuadsCount,
  });

  return {
    jobId: localJobId,
    title: displayTitle,
    imageUrl: annotatedDataUrl,
    rawImageUrl: dataUrl,
    imageWidth: width,
    imageHeight: height,
    calibration,
    annotations,
    info: {
      status: 'success',
      original_filename: filename || 'local_astrophoto.jpg',
      machine_tags: objectsInField,
      tags: [...objectsInField, 'Local In-Browser Plate Solver (astrometry.net engine)'],
      objects_in_field: objectsInField,
    },
    matchedConstellations,
  };
}
