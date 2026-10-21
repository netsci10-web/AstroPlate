/**
 * Comprehensive Celestial Star Catalog & Constellation Stick-Figure Asterisms
 * High-precision J2000 coordinates for real-time all-sky chart projection
 */

export interface CatalogStar {
  id: string;
  nameKo: string;
  nameEn: string;
  bayer: string;
  constellation: string;
  raDeg: number;  // 0 .. 360
  decDeg: number; // -90 .. +90
  mag: number;    // Apparent visual magnitude (lower is brighter)
  color?: string; // Spectral color approximation
}

export interface ConstellationFigure {
  code: string;
  nameKo: string;
  nameEn: string;
  family: string;
  centerRaDeg: number;
  centerDecDeg: number;
  lines: [number, number, number, number][]; // [ra1, dec1, ra2, dec2] in degrees
}

// Major bright stars visible to naked eye across northern and southern hemispheres
export const BRIGHT_STARS: CatalogStar[] = [
  // Cepheus
  { id: 'alp_cep', nameKo: '알데라민', nameEn: 'Alderamin', bayer: 'α Cep', constellation: 'Cep', raDeg: 319.64, decDeg: 62.59, mag: 2.45, color: '#f8fafc' },
  { id: 'bet_cep', nameKo: '알피르크', nameEn: 'Alfirk', bayer: 'β Cep', constellation: 'Cep', raDeg: 322.16, decDeg: 70.56, mag: 3.23, color: '#bae6fd' },
  { id: 'gam_cep', nameKo: '에라이', nameEn: 'Errai', bayer: 'γ Cep', constellation: 'Cep', raDeg: 354.84, decDeg: 77.63, mag: 3.21, color: '#fed7aa' },
  { id: 'iot_cep', nameKo: '이오타 세페이', nameEn: 'Iota Cephei', bayer: 'ι Cep', constellation: 'Cep', raDeg: 342.31, decDeg: 66.20, mag: 3.50, color: '#fef08a' },
  { id: 'zet_cep', nameKo: '제타 세페이', nameEn: 'Zeta Cephei', bayer: 'ζ Cep', constellation: 'Cep', raDeg: 332.71, decDeg: 58.20, mag: 3.39, color: '#fed7aa' },
  { id: 'del_cep', nameKo: '델타 세페이', nameEn: 'Delta Cephei', bayer: 'δ Cep', constellation: 'Cep', raDeg: 337.29, decDeg: 58.42, mag: 4.07, color: '#fef08a' },
  { id: 'mu_cep',  nameKo: '가넷 스타', nameEn: 'Garnet Star (μ Cep)', bayer: 'μ Cep', constellation: 'Cep', raDeg: 325.88, decDeg: 58.78, mag: 4.08, color: '#f87171' },

  // Cassiopeia
  { id: 'bet_cas', nameKo: '카프', nameEn: 'Caph', bayer: 'β Cas', constellation: 'Cas', raDeg: 2.29, decDeg: 59.15, mag: 2.28, color: '#f8fafc' },
  { id: 'alp_cas', nameKo: '셰다르', nameEn: 'Schedar', bayer: 'α Cas', constellation: 'Cas', raDeg: 10.13, decDeg: 56.54, mag: 2.24, color: '#fed7aa' },
  { id: 'gam_cas', nameKo: '나비', nameEn: 'Navi (γ Cas)', bayer: 'γ Cas', constellation: 'Cas', raDeg: 14.18, decDeg: 60.72, mag: 2.15, color: '#bae6fd' },
  { id: 'del_cas', nameKo: '루크바', nameEn: 'Ruchbah', bayer: 'δ Cas', constellation: 'Cas', raDeg: 20.95, decDeg: 60.23, mag: 2.68, color: '#f8fafc' },
  { id: 'eps_cas', nameKo: '세긴', nameEn: 'Segin', bayer: 'ε Cas', constellation: 'Cas', raDeg: 26.11, decDeg: 63.67, mag: 3.35, color: '#bae6fd' },

  // Cygnus
  { id: 'alp_cyg', nameKo: '데네브', nameEn: 'Deneb', bayer: 'α Cyg', constellation: 'Cyg', raDeg: 310.36, decDeg: 45.28, mag: 1.25, color: '#ffffff' },
  { id: 'gam_cyg', nameKo: '사드르', nameEn: 'Sadr', bayer: 'γ Cyg', constellation: 'Cyg', raDeg: 305.56, decDeg: 40.26, mag: 2.23, color: '#fef08a' },
  { id: 'bet_cyg', nameKo: '알비레오', nameEn: 'Albireo', bayer: 'β Cyg', constellation: 'Cyg', raDeg: 292.68, decDeg: 27.96, mag: 3.05, color: '#fed7aa' },
  { id: 'del_cyg', nameKo: '파와리스', nameEn: 'Fawaris', bayer: 'δ Cyg', constellation: 'Cyg', raDeg: 296.24, decDeg: 45.13, mag: 2.86, color: '#bae6fd' },
  { id: 'eps_cyg', nameKo: '기에나', nameEn: 'Gienah', bayer: 'ε Cyg', constellation: 'Cyg', raDeg: 311.55, decDeg: 33.97, mag: 2.48, color: '#fed7aa' },
  { id: 'zet_cyg', nameKo: '제타 시그니', nameEn: 'Zeta Cygni', bayer: 'ζ Cyg', constellation: 'Cyg', raDeg: 318.42, decDeg: 30.23, mag: 3.21, color: '#fef08a' },

  // Lyra
  { id: 'alp_lyr', nameKo: '베가 (직녀성)', nameEn: 'Vega', bayer: 'α Lyr', constellation: 'Lyr', raDeg: 279.2347, decDeg: 38.7837, mag: 0.03, color: '#e0f2fe' },
  { id: 'eps1_lyr', nameKo: '더블더블 ε¹ Lyr (4 Lyr)', nameEn: 'Epsilon1 Lyrae (Double Double)', bayer: 'ε¹ Lyr', constellation: 'Lyr', raDeg: 281.0848, decDeg: 39.6701, mag: 4.67, color: '#e0f2fe' },
  { id: 'eps2_lyr', nameKo: '더블더블 ε² Lyr (5 Lyr)', nameEn: 'Epsilon2 Lyrae (Double Double)', bayer: 'ε² Lyr', constellation: 'Lyr', raDeg: 281.0952, decDeg: 39.6127, mag: 4.59, color: '#e0f2fe' },
  { id: 'zet_lyr', nameKo: '제타 리라', nameEn: 'Zeta1 Lyrae', bayer: 'ζ Lyr', constellation: 'Lyr', raDeg: 281.1931, decDeg: 37.6051, mag: 4.36, color: '#f8fafc' },
  { id: 'del2_lyr', nameKo: '델타2 리라', nameEn: 'Delta2 Lyrae', bayer: 'δ Lyr', constellation: 'Lyr', raDeg: 283.6260, decDeg: 36.8986, mag: 4.22, color: '#fb923c' },
  { id: 'bet_lyr', nameKo: '셰리아크', nameEn: 'Sheliak', bayer: 'β Lyr', constellation: 'Lyr', raDeg: 282.5200, decDeg: 33.3627, mag: 3.52, color: '#bae6fd' },
  { id: 'gam_lyr', nameKo: '술라파트', nameEn: 'Sulafat', bayer: 'γ Lyr', constellation: 'Lyr', raDeg: 284.7359, decDeg: 32.6896, mag: 3.25, color: '#bae6fd' },

  // Aquila
  { id: 'alp_aql', nameKo: '알타이르 (견우성)', nameEn: 'Altair', bayer: 'α Aql', constellation: 'Aql', raDeg: 297.70, decDeg: 8.87, mag: 0.77, color: '#ffffff' },
  { id: 'gam_aql', nameKo: '타라제드', nameEn: 'Tarazed', bayer: 'γ Aql', constellation: 'Aql', raDeg: 296.57, decDeg: 10.61, mag: 2.72, color: '#fed7aa' },
  { id: 'bet_aql', nameKo: '알샤인', nameEn: 'Alshain', bayer: 'β Aql', constellation: 'Aql', raDeg: 298.83, decDeg: 6.41, mag: 3.71, color: '#fef08a' },

  // Ursa Major (Big Dipper)
  { id: 'alp_uma', nameKo: '두베', nameEn: 'Dubhe', bayer: 'α UMa', constellation: 'UMa', raDeg: 165.93, decDeg: 61.75, mag: 1.81, color: '#fed7aa' },
  { id: 'bet_uma', nameKo: '메라크', nameEn: 'Merak', bayer: 'β UMa', constellation: 'UMa', raDeg: 165.46, decDeg: 56.38, mag: 2.34, color: '#f8fafc' },
  { id: 'gam_uma', nameKo: '페크다', nameEn: 'Phecda', bayer: 'γ UMa', constellation: 'UMa', raDeg: 178.46, decDeg: 53.69, mag: 2.41, color: '#f8fafc' },
  { id: 'del_uma', nameKo: '메그레즈', nameEn: 'Megrez', bayer: 'δ UMa', constellation: 'UMa', raDeg: 183.86, decDeg: 57.03, mag: 3.32, color: '#f8fafc' },
  { id: 'eps_uma', nameKo: '알리오스', nameEn: 'Alioth', bayer: 'ε UMa', constellation: 'UMa', raDeg: 193.51, decDeg: 55.96, mag: 1.76, color: '#f8fafc' },
  { id: 'zet_uma', nameKo: '미자르', nameEn: 'Mizar', bayer: 'ζ UMa', constellation: 'UMa', raDeg: 200.98, decDeg: 54.92, mag: 2.23, color: '#f8fafc' },
  { id: 'eta_uma', nameKo: '알카이드', nameEn: 'Alkaid', bayer: 'η UMa', constellation: 'UMa', raDeg: 206.89, decDeg: 49.31, mag: 1.85, color: '#bae6fd' },

  // Ursa Minor
  { id: 'alp_umi', nameKo: '북극성 (폴라리스)', nameEn: 'Polaris', bayer: 'α UMi', constellation: 'UMi', raDeg: 37.95, decDeg: 89.26, mag: 1.97, color: '#fef08a' },
  { id: 'bet_umi', nameKo: '코카브', nameEn: 'Kochab', bayer: 'β UMi', constellation: 'UMi', raDeg: 222.68, decDeg: 74.16, mag: 2.07, color: '#fed7aa' },
  { id: 'gam_umi', nameKo: '페르카드', nameEn: 'Pherkad', bayer: 'γ UMi', constellation: 'UMi', raDeg: 230.18, decDeg: 71.83, mag: 3.00, color: '#f8fafc' },

  // Orion
  { id: 'alp_ori', nameKo: '베텔게우스', nameEn: 'Betelgeuse', bayer: 'α Ori', constellation: 'Ori', raDeg: 88.79, decDeg: 7.41, mag: 0.45, color: '#fb923c' },
  { id: 'bet_ori', nameKo: '리겔', nameEn: 'Rigel', bayer: 'β Ori', constellation: 'Ori', raDeg: 78.63, decDeg: -8.20, mag: 0.18, color: '#bae6fd' },
  { id: 'gam_ori', nameKo: '벨라트릭스', nameEn: 'Bellatrix', bayer: 'γ Ori', constellation: 'Ori', raDeg: 81.28, decDeg: 6.35, mag: 1.64, color: '#bae6fd' },
  { id: 'del_ori', nameKo: '민타카', nameEn: 'Mintaka', bayer: 'δ Ori', constellation: 'Ori', raDeg: 83.00, decDeg: -0.30, mag: 2.25, color: '#bae6fd' },
  { id: 'eps_ori', nameKo: '알닐람', nameEn: 'Alnilam', bayer: 'ε Ori', constellation: 'Ori', raDeg: 84.05, decDeg: -1.20, mag: 1.69, color: '#bae6fd' },
  { id: 'zet_ori', nameKo: '알니탁', nameEn: 'Alnitak', bayer: 'ζ Ori', constellation: 'Ori', raDeg: 85.19, decDeg: -1.94, mag: 1.74, color: '#bae6fd' },
  { id: 'kap_ori', nameKo: '사이프', nameEn: 'Saiph', bayer: 'κ Ori', constellation: 'Ori', raDeg: 86.94, decDeg: -9.67, mag: 2.07, color: '#bae6fd' },

  // Canis Major
  { id: 'alp_cma', nameKo: '시리우스 (천랑성)', nameEn: 'Sirius', bayer: 'α CMa', constellation: 'CMa', raDeg: 101.29, decDeg: -16.72, mag: -1.46, color: '#ffffff' },
  { id: 'bet_cma', nameKo: '미르잠', nameEn: 'Mirzam', bayer: 'β CMa', constellation: 'CMa', raDeg: 95.67, decDeg: -17.96, mag: 1.98, color: '#bae6fd' },
  { id: 'del_cma', nameKo: '웨젠', nameEn: 'Wezen', bayer: 'δ CMa', constellation: 'CMa', raDeg: 107.10, decDeg: -26.39, mag: 1.83, color: '#fef08a' },
  { id: 'eps_cma', nameKo: '아드하라', nameEn: 'Adhara', bayer: 'ε CMa', constellation: 'CMa', raDeg: 104.66, decDeg: -28.97, mag: 1.50, color: '#bae6fd' },

  // Taurus
  { id: 'alp_tau', nameKo: '알데바란', nameEn: 'Aldebaran', bayer: 'α Tau', constellation: 'Tau', raDeg: 68.98, decDeg: 16.51, mag: 0.85, color: '#fb923c' },
  { id: 'bet_tau', nameKo: '엘나스', nameEn: 'Elnath', bayer: 'β Tau', constellation: 'Tau', raDeg: 81.57, decDeg: 28.61, mag: 1.65, color: '#bae6fd' },

  // Gemini
  { id: 'alp_gem', nameKo: '카스토르', nameEn: 'Castor', bayer: 'α Gem', constellation: 'Gem', raDeg: 113.65, decDeg: 31.89, mag: 1.58, color: '#f8fafc' },
  { id: 'bet_gem', nameKo: '폴룩스', nameEn: 'Pollux', bayer: 'β Gem', constellation: 'Gem', raDeg: 116.14, decDeg: 28.03, mag: 1.16, color: '#fed7aa' },
  { id: 'gam_gem', nameKo: '알헤나', nameEn: 'Alhena', bayer: 'γ Gem', constellation: 'Gem', raDeg: 99.43, decDeg: 16.40, mag: 1.93, color: '#f8fafc' },

  // Auriga
  { id: 'alp_aur', nameKo: '카펠라', nameEn: 'Capella', bayer: 'α Aur', constellation: 'Aur', raDeg: 79.17, decDeg: 46.00, mag: 0.08, color: '#fef08a' },
  { id: 'bet_aur', nameKo: '멘칼리난', nameEn: 'Menkalinan', bayer: 'β Aur', constellation: 'Aur', raDeg: 89.88, decDeg: 44.95, mag: 1.90, color: '#f8fafc' },

  // Boötes
  { id: 'alp_boo', nameKo: '아크투루스', nameEn: 'Arcturus', bayer: 'α Boo', constellation: 'Boo', raDeg: 213.91, decDeg: 19.18, mag: -0.05, color: '#fb923c' },
  { id: 'eps_boo', nameKo: '이자르', nameEn: 'Izar', bayer: 'ε Boo', constellation: 'Boo', raDeg: 221.25, decDeg: 27.07, mag: 2.35, color: '#fed7aa' },

  // Leo
  { id: 'alp_leo', nameKo: '레굴루스', nameEn: 'Regulus', bayer: 'α Leo', constellation: 'Leo', raDeg: 152.09, decDeg: 11.97, mag: 1.36, color: '#bae6fd' },
  { id: 'bet_leo', nameKo: '데네볼라', nameEn: 'Denebola', bayer: 'β Leo', constellation: 'Leo', raDeg: 177.26, decDeg: 14.57, mag: 2.14, color: '#f8fafc' },
  { id: 'gam_leo', nameKo: '알기에바', nameEn: 'Algieba', bayer: 'γ Leo', constellation: 'Leo', raDeg: 154.99, decDeg: 19.84, mag: 2.01, color: '#fed7aa' },

  // Virgo
  { id: 'alp_vir', nameKo: '스피카', nameEn: 'Spica', bayer: 'α Vir', constellation: 'Vir', raDeg: 201.30, decDeg: -11.16, mag: 0.98, color: '#bae6fd' },

  // Scorpius
  { id: 'alp_sco', nameKo: '안타레스', nameEn: 'Antares', bayer: 'α Sco', constellation: 'Sco', raDeg: 247.35, decDeg: -26.43, mag: 1.06, color: '#f87171' },
  { id: 'lam_sco', nameKo: '샤울라', nameEn: 'Shaula', bayer: 'λ Sco', constellation: 'Sco', raDeg: 263.40, decDeg: -37.10, mag: 1.62, color: '#bae6fd' },
  { id: 'the_sco', nameKo: '사르가스', nameEn: 'Sargas', bayer: 'θ Sco', constellation: 'Sco', raDeg: 264.33, decDeg: -42.99, mag: 1.86, color: '#fef08a' },

  // Sagittarius
  { id: 'eps_sgr', nameKo: '카오스 아우스트랄리스', nameEn: 'Kaus Australis', bayer: 'ε Sgr', constellation: 'Sgr', raDeg: 276.04, decDeg: -34.38, mag: 1.79, color: '#bae6fd' },
  { id: 'sig_sgr', nameKo: '눈키', nameEn: 'Nunki', bayer: 'σ Sgr', constellation: 'Sgr', raDeg: 283.82, decDeg: -26.30, mag: 2.05, color: '#bae6fd' },

  // Pegasus & Andromeda
  { id: 'alp_peg', nameKo: '마르카브', nameEn: 'Markab', bayer: 'α Peg', constellation: 'Peg', raDeg: 346.19, decDeg: 15.21, mag: 2.49, color: '#bae6fd' },
  { id: 'bet_peg', nameKo: '셰아트', nameEn: 'Scheat', bayer: 'β Peg', constellation: 'Peg', raDeg: 345.94, decDeg: 28.08, mag: 2.44, color: '#fb923c' },
  { id: 'gam_peg', nameKo: '알게니브', nameEn: 'Algenib', bayer: 'γ Peg', constellation: 'Peg', raDeg: 2.30, decDeg: 15.18, mag: 2.84, color: '#bae6fd' },
  { id: 'alp_and', nameKo: '알페라츠', nameEn: 'Alpheratz', bayer: 'α And', constellation: 'And', raDeg: 2.10, decDeg: 29.09, mag: 2.07, color: '#bae6fd' },
  { id: 'bet_and', nameKo: '미라크', nameEn: 'Mirach', bayer: 'β And', constellation: 'And', raDeg: 17.43, decDeg: 35.62, mag: 2.07, color: '#fb923c' },
  { id: 'gam_and', nameKo: '알마크', nameEn: 'Almach', bayer: 'γ And', constellation: 'And', raDeg: 30.97, decDeg: 42.33, mag: 2.10, color: '#fed7aa' },

  // Perseus
  { id: 'alp_per', nameKo: '미르파크', nameEn: 'Mirfak', bayer: 'α Per', constellation: 'Per', raDeg: 51.08, decDeg: 49.86, mag: 1.79, color: '#fef08a' },
  { id: 'bet_per', nameKo: '알골', nameEn: 'Algol', bayer: 'β Per', constellation: 'Per', raDeg: 47.04, decDeg: 40.96, mag: 2.09, color: '#bae6fd' },

  // Southern Skies
  { id: 'alp_car', nameKo: '카노푸스', nameEn: 'Canopus', bayer: 'α Car', constellation: 'Car', raDeg: 95.99, decDeg: -52.70, mag: -0.74, color: '#f8fafc' },
  { id: 'alp_cru', nameKo: '아크룩스', nameEn: 'Acrux', bayer: 'α Cru', constellation: 'Cru', raDeg: 186.65, decDeg: -63.10, mag: 0.77, color: '#bae6fd' },
  { id: 'bet_cru', nameKo: '미모사', nameEn: 'Mimosa', bayer: 'β Cru', constellation: 'Cru', raDeg: 191.93, decDeg: -59.69, mag: 1.25, color: '#bae6fd' },
  { id: 'alp_cen', nameKo: '리길 켄타우루스', nameEn: 'Alpha Centauri', bayer: 'α Cen', constellation: 'Cen', raDeg: 219.90, decDeg: -60.83, mag: -0.27, color: '#fef08a' },
  { id: 'bet_cen', nameKo: '하다르', nameEn: 'Hadar', bayer: 'β Cen', constellation: 'Cen', raDeg: 210.96, decDeg: -60.37, mag: 0.61, color: '#bae6fd' },
  { id: 'alp_psa', nameKo: '포말하우트', nameEn: 'Fomalhaut', bayer: 'α PsA', constellation: 'PsA', raDeg: 344.41, decDeg: -29.62, mag: 1.17, color: '#ffffff' },
  { id: 'alp_eri', nameKo: '아케르나르', nameEn: 'Achernar', bayer: 'α Eri', constellation: 'Eri', raDeg: 24.43, decDeg: -57.24, mag: 0.45, color: '#bae6fd' },
];

// Constellation stick-figure lines connecting stars across the entire sky
// Every line is defined as [ra1, dec1, ra2, dec2] in degrees
export const CONSTELLATION_FIGURES: ConstellationFigure[] = [
  // 1. Cepheus - 세페우스자리 (House shape)
  {
    code: 'Cep',
    nameKo: '세페우스자리',
    nameEn: 'Cepheus',
    family: 'Perseus family',
    centerRaDeg: 330.0,
    centerDecDeg: 71.0,
    lines: [
      [319.64, 62.59, 322.16, 70.56], // Alderamin - Alfirk
      [322.16, 70.56, 354.84, 77.63], // Alfirk - Errai
      [354.84, 77.63, 342.31, 66.20], // Errai - Iota
      [342.31, 66.20, 332.71, 58.20], // Iota - Zeta
      [332.71, 58.20, 319.64, 62.59], // Zeta - Alderamin
      [319.64, 62.59, 342.31, 66.20], // Alderamin - Iota (base)
      [332.71, 58.20, 337.29, 58.42], // Zeta - Delta
      [337.29, 58.42, 325.88, 58.78], // Delta - Mu Cephei
    ],
  },

  // 2. Cassiopeia - 카시오페이아자리 (Iconic 'W' shape)
  {
    code: 'Cas',
    nameKo: '카시오페이아자리',
    nameEn: 'Cassiopeia',
    family: 'Perseus family',
    centerRaDeg: 19.5,
    centerDecDeg: 60.5,
    lines: [
      [2.29, 59.15, 10.13, 56.54],   // Caph - Schedar
      [10.13, 56.54, 14.18, 60.72],  // Schedar - Navi
      [14.18, 60.72, 20.95, 60.23],  // Navi - Ruchbah
      [20.95, 60.23, 26.11, 63.67],  // Ruchbah - Segin
    ],
  },

  // 3. Cygnus - 백조자리 (Northern Cross)
  {
    code: 'Cyg',
    nameKo: '백조자리',
    nameEn: 'Cygnus',
    family: 'Hercules family',
    centerRaDeg: 309.0,
    centerDecDeg: 44.5,
    lines: [
      [310.36, 45.28, 305.56, 40.26], // Deneb - Sadr
      [305.56, 40.26, 292.68, 27.96], // Sadr - Albireo
      [296.24, 45.13, 305.56, 40.26], // Fawaris - Sadr
      [305.56, 40.26, 311.55, 33.97], // Sadr - Gienah
      [311.55, 33.97, 318.42, 30.23], // Gienah - Zeta Cyg
    ],
  },

  // 4. Lyra - 거문고자리 (Parallelogram + Vega & Double-Double Triangle)
  {
    code: 'Lyr',
    nameKo: '거문고자리',
    nameEn: 'Lyra',
    family: 'Hercules family',
    centerRaDeg: 282.0,
    centerDecDeg: 36.7,
    lines: [
      [279.2347, 38.7837, 281.0848, 39.6701], // Vega - Epsilon1 Lyr (Double Double)
      [281.0848, 39.6701, 281.0952, 39.6127], // Epsilon1 Lyr - Epsilon2 Lyr (Double Double pair)
      [281.0952, 39.6127, 281.1931, 37.6051], // Epsilon2 Lyr - Zeta Lyr
      [279.2347, 38.7837, 281.1931, 37.6051], // Vega - Zeta Lyr
      [281.1931, 37.6051, 283.6260, 36.8986], // Zeta - Delta2 Lyr
      [283.6260, 36.8986, 284.7359, 32.6896], // Delta2 - Sulafat
      [284.7359, 32.6896, 282.5200, 33.3627], // Sulafat - Sheliak
      [282.5200, 33.3627, 281.1931, 37.6051], // Sheliak - Zeta Lyr
    ],
  },

  // 5. Aquila - 독수리자리
  {
    code: 'Aql',
    nameKo: '독수리자리',
    nameEn: 'Aquila',
    family: 'Hercules family',
    centerRaDeg: 296.0,
    centerDecDeg: 3.4,
    lines: [
      [296.57, 10.61, 297.70, 8.87],  // Tarazed - Altair
      [297.70, 8.87, 298.83, 6.41],   // Altair - Alshain
      [297.70, 8.87, 291.36, 3.11],   // Altair - Delta Aql
      [291.36, 3.11, 286.35, 13.86],  // Delta Aql - Zeta Aql
      [291.36, 3.11, 301.32, -0.82],  // Delta Aql - Theta Aql
      [291.36, 3.11, 286.54, -4.88],  // Delta Aql - Lambda Aql
    ],
  },

  // 6. Ursa Major - 큰곰자리 (Big Dipper)
  {
    code: 'UMa',
    nameKo: '큰곰자리 (북두칠성)',
    nameEn: 'Ursa Major',
    family: 'Ursa Major family',
    centerRaDeg: 169.5,
    centerDecDeg: 55.6,
    lines: [
      [165.93, 61.75, 165.46, 56.38], // Dubhe - Merak
      [165.46, 56.38, 178.46, 53.69], // Merak - Phecda
      [178.46, 53.69, 183.86, 57.03], // Phecda - Megrez
      [183.86, 57.03, 165.93, 61.75], // Megrez - Dubhe
      [183.86, 57.03, 193.51, 55.96], // Megrez - Alioth
      [193.51, 55.96, 200.98, 54.92], // Alioth - Mizar
      [200.98, 54.92, 206.89, 49.31], // Mizar - Alkaid
    ],
  },

  // 7. Ursa Minor - 작은곰자리 (Little Dipper)
  {
    code: 'UMi',
    nameKo: '작은곰자리',
    nameEn: 'Ursa Minor',
    family: 'Ursa Major family',
    centerRaDeg: 225.0,
    centerDecDeg: 78.0,
    lines: [
      [37.95, 89.26, 260.10, 86.58],  // Polaris - Delta
      [260.10, 86.58, 252.48, 82.04], // Delta - Epsilon
      [252.48, 82.04, 237.28, 77.79], // Epsilon - Zeta
      [237.28, 77.79, 222.68, 74.16], // Zeta - Kochab
      [222.68, 74.16, 230.18, 71.83], // Kochab - Pherkad
      [230.18, 71.83, 244.38, 75.76], // Pherkad - Eta
      [244.38, 75.76, 237.28, 77.79], // Eta - Zeta
    ],
  },

  // 8. Orion - 오리온자리 (Hourglass & Belt)
  {
    code: 'Ori',
    nameKo: '오리온자리',
    nameEn: 'Orion',
    family: 'Orion family',
    centerRaDeg: 84.0,
    centerDecDeg: 5.9,
    lines: [
      [88.79, 7.41, 81.28, 6.35],    // Betelgeuse - Bellatrix
      [81.28, 6.35, 83.00, -0.30],   // Bellatrix - Mintaka
      [83.00, -0.30, 84.05, -1.20],  // Mintaka - Alnilam (Belt)
      [84.05, -1.20, 85.19, -1.94],  // Alnilam - Alnitak (Belt)
      [85.19, -1.94, 88.79, 7.41],   // Alnitak - Betelgeuse
      [83.00, -0.30, 78.63, -8.20],  // Mintaka - Rigel
      [85.19, -1.94, 86.94, -9.67],  // Alnitak - Saiph
      [86.94, -9.67, 78.63, -8.20],  // Saiph - Rigel
    ],
  },

  // 9. Taurus - 황소자리
  {
    code: 'Tau',
    nameKo: '황소자리',
    nameEn: 'Taurus',
    family: 'Zodiac',
    centerRaDeg: 68.0,
    centerDecDeg: 16.5,
    lines: [
      [68.98, 16.51, 67.14, 19.18],  // Aldebaran - Epsilon
      [67.14, 19.18, 65.73, 17.54],  // Epsilon - Delta
      [65.73, 17.54, 64.95, 15.63],  // Delta - Gamma
      [64.95, 15.63, 68.98, 16.51],  // Gamma - Aldebaran (Hyades V)
      [67.14, 19.18, 81.57, 28.61],  // Epsilon - Elnath (Horn 1)
      [68.98, 16.51, 84.41, 21.14],  // Aldebaran - Zeta Tau (Horn 2)
    ],
  },

  // 10. Gemini - 쌍둥이자리
  {
    code: 'Gem',
    nameKo: '쌍둥이자리',
    nameEn: 'Gemini',
    family: 'Zodiac',
    centerRaDeg: 106.0,
    centerDecDeg: 22.5,
    lines: [
      [113.65, 31.89, 116.14, 28.03], // Castor - Pollux
      [116.14, 28.03, 110.15, 21.98], // Pollux - Wasat
      [110.15, 21.98, 99.43, 16.40],  // Wasat - Alhena
      [113.65, 31.89, 100.98, 25.13], // Castor - Mebsuta
      [100.98, 25.13, 95.74, 22.51],  // Mebsuta - Tejat
    ],
  },

  // 11. Auriga - 마차부자리 (Pentagon)
  {
    code: 'Aur',
    nameKo: '마차부자리',
    nameEn: 'Auriga',
    family: 'Perseus family',
    centerRaDeg: 84.0,
    centerDecDeg: 42.0,
    lines: [
      [79.17, 46.00, 89.88, 44.95],  // Capella - Menkalinan
      [89.88, 44.95, 89.92, 37.21],  // Menkalinan - Theta
      [89.92, 37.21, 81.57, 28.61],  // Theta - Elnath
      [81.57, 28.61, 74.25, 33.17],  // Elnath - Hassaleh
      [74.25, 33.17, 79.17, 46.00],  // Hassaleh - Capella
    ],
  },

  // 12. Pegasus - 페가수스자리 (Great Square)
  {
    code: 'Peg',
    nameKo: '페가수스자리',
    nameEn: 'Pegasus',
    family: 'Perseus family',
    centerRaDeg: 340.0,
    centerDecDeg: 19.0,
    lines: [
      [346.19, 15.21, 345.94, 28.08], // Markab - Scheat
      [345.94, 28.08, 2.10, 29.09],   // Scheat - Alpheratz
      [2.10, 29.09, 2.30, 15.18],     // Alpheratz - Algenib
      [2.30, 15.18, 346.19, 15.21],   // Algenib - Markab
      [346.19, 15.21, 340.32, 10.83], // Markab - Homam
      [340.32, 10.83, 326.05, 9.87],  // Homam - Enif
    ],
  },

  // 13. Andromeda - 안드로메다자리
  {
    code: 'And',
    nameKo: '안드로메다자리',
    nameEn: 'Andromeda',
    family: 'Perseus family',
    centerRaDeg: 12.0,
    centerDecDeg: 38.8,
    lines: [
      [2.10, 29.09, 9.83, 30.86],    // Alpheratz - Delta
      [9.83, 30.86, 17.43, 35.62],   // Delta - Mirach
      [17.43, 35.62, 30.97, 42.33],  // Mirach - Almach
      [17.43, 35.62, 14.18, 38.50],  // Mirach - Mu
    ],
  },

  // 14. Perseus - 페르세우스자리
  {
    code: 'Per',
    nameKo: '페르세우스자리',
    nameEn: 'Perseus',
    family: 'Perseus family',
    centerRaDeg: 48.0,
    centerDecDeg: 45.0,
    lines: [
      [46.12, 53.51, 51.08, 49.86],  // Gamma - Mirfak
      [51.08, 49.86, 55.73, 47.79],  // Mirfak - Delta
      [55.73, 47.79, 59.47, 40.01],  // Delta - Epsilon
      [59.47, 40.01, 58.53, 31.88],  // Epsilon - Zeta
      [51.08, 49.86, 47.04, 40.96],  // Mirfak - Algol
    ],
  },

  // 15. Leo - 사자자리 (Sickle & Triangle)
  {
    code: 'Leo',
    nameKo: '사자자리',
    nameEn: 'Leo',
    family: 'Zodiac',
    centerRaDeg: 160.0,
    centerDecDeg: 15.0,
    lines: [
      [152.09, 11.97, 154.99, 19.84], // Regulus - Algieba
      [154.99, 19.84, 154.17, 23.42], // Algieba - Adhafera
      [154.17, 23.42, 149.60, 26.01], // Adhafera - Rasalas
      [149.60, 26.01, 146.46, 23.77], // Rasalas - Algenubi
      [154.99, 19.84, 168.53, 20.52], // Algieba - Zosma
      [168.53, 20.52, 177.26, 14.57], // Zosma - Denebola
      [177.26, 14.57, 168.83, 15.43], // Denebola - Chertan
      [168.83, 15.43, 152.09, 11.97], // Chertan - Regulus
    ],
  },

  // 16. Boötes - 목동자리 (Kite)
  {
    code: 'Boo',
    nameKo: '목동자리',
    nameEn: 'Boötes',
    family: 'Ursa Major family',
    centerRaDeg: 218.0,
    centerDecDeg: 30.0,
    lines: [
      [213.91, 19.18, 208.74, 18.40], // Arcturus - Muphrid
      [213.91, 19.18, 221.25, 27.07], // Arcturus - Izar
      [221.25, 27.07, 217.96, 30.37], // Izar - Rho
      [217.96, 30.37, 217.96, 38.31], // Rho - Seginus
      [217.96, 38.31, 225.48, 40.39], // Seginus - Nekkar
      [225.48, 40.39, 221.25, 27.07], // Nekkar - Izar
    ],
  },

  // 17. Corona Borealis - 북쪽왕관자리 (Arc of Jewels)
  {
    code: 'CrB',
    nameKo: '북쪽왕관자리',
    nameEn: 'Corona Borealis',
    family: 'Ursa Major family',
    centerRaDeg: 235.0,
    centerDecDeg: 29.0,
    lines: [
      [230.22, 31.36, 231.95, 29.11], // Theta - Nusakan
      [231.95, 29.11, 233.67, 26.71], // Nusakan - Alphecca
      [233.67, 26.71, 235.80, 26.30], // Alphecca - Gamma
      [235.80, 26.30, 237.95, 26.07], // Gamma - Delta
      [237.95, 26.07, 239.52, 26.87], // Delta - Epsilon
    ],
  },

  // 18. Hercules - 헤라클레스자리 (Keystone)
  {
    code: 'Her',
    nameKo: '헤라클레스자리',
    nameEn: 'Hercules',
    family: 'Hercules family',
    centerRaDeg: 260.0,
    centerDecDeg: 27.0,
    lines: [
      [247.55, 21.49, 258.78, 24.84], // Kornephoros - Sarin
      [258.78, 24.84, 258.66, 14.39], // Sarin - Rasalgethi
      [247.55, 21.49, 250.93, 31.60], // Kornephoros - Rutilicus
      [250.93, 31.60, 252.64, 38.92], // Rutilicus - Eta
      [252.64, 38.92, 258.85, 36.81], // Eta - Pi
      [258.85, 36.81, 258.78, 24.84], // Pi - Sarin
    ],
  },

  // 19. Scorpius - 전갈자리 (Stinger hook)
  {
    code: 'Sco',
    nameKo: '전갈자리',
    nameEn: 'Scorpius',
    family: 'Zodiac',
    centerRaDeg: 253.0,
    centerDecDeg: -30.0,
    lines: [
      [241.36, -19.81, 240.08, -22.62], // Graffias - Dschubba
      [240.08, -22.62, 239.71, -26.11], // Dschubba - Pi Sco
      [240.08, -22.62, 247.35, -26.43], // Dschubba - Antares
      [247.35, -26.43, 248.97, -28.22], // Antares - Alniyat
      [248.97, -28.22, 252.54, -34.29], // Alniyat - Larawag
      [252.54, -34.29, 252.97, -37.99], // Larawag - Mu1
      [252.97, -37.99, 253.86, -42.36], // Mu1 - Zeta2
      [253.86, -42.36, 257.79, -43.24], // Zeta2 - Eta
      [257.79, -43.24, 264.33, -42.99], // Eta - Sargas
      [264.33, -42.99, 267.72, -40.13], // Sargas - Iota1
      [267.72, -40.13, 263.40, -37.10], // Iota1 - Shaula
      [263.40, -37.10, 263.15, -37.30], // Shaula - Lesath
    ],
  },

  // 20. Sagittarius - 궁수자리 (Teapot)
  {
    code: 'Sgr',
    nameKo: '궁수자리 (주전자)',
    nameEn: 'Sagittarius',
    family: 'Zodiac',
    centerRaDeg: 280.0,
    centerDecDeg: -28.0,
    lines: [
      [271.44, -30.42, 275.24, -29.83], // Alnasl - Kaus Media
      [275.24, -29.83, 276.99, -25.42], // Kaus Media - Kaus Borealis
      [276.99, -25.42, 281.33, -27.00], // Kaus Borealis - Phi
      [281.33, -27.00, 283.82, -26.30], // Phi - Nunki
      [283.82, -26.30, 285.65, -29.88], // Nunki - Ascella
      [285.65, -29.88, 276.04, -34.38], // Ascella - Kaus Australis
      [276.04, -34.38, 275.24, -29.83], // Kaus Australis - Kaus Media
      [276.04, -34.38, 271.44, -30.42], // Kaus Australis - Alnasl
      [281.33, -27.00, 275.24, -29.83], // Phi - Kaus Media
      [285.65, -29.88, 286.72, -27.67], // Ascella - Tau
    ],
  },

  // 21. Canis Major - 큰개자리
  {
    code: 'CMa',
    nameKo: '큰개자리',
    nameEn: 'Canis Major',
    family: 'Orion family',
    centerRaDeg: 104.0,
    centerDecDeg: -22.0,
    lines: [
      [95.67, -17.96, 101.29, -16.72], // Mirzam - Sirius
      [101.29, -16.72, 106.04, -15.63],// Sirius - Muliphein
      [101.29, -16.72, 107.10, -26.39],// Sirius - Wezen
      [107.10, -26.39, 104.66, -28.97],// Wezen - Adhara
      [104.66, -28.97, 95.16, -30.06], // Adhara - Furud
      [107.10, -26.39, 111.02, -29.30],// Wezen - Aludra
    ],
  },

  // 22. Canis Minor - 작은개자리
  {
    code: 'CMi',
    nameKo: '작은개자리',
    nameEn: 'Canis Minor',
    family: 'Orion family',
    centerRaDeg: 114.0,
    centerDecDeg: 6.0,
    lines: [
      [114.83, 5.22, 111.78, 8.29], // Procyon - Gomeisa
    ],
  },

  // 23. Crux - 남십자자리 (Southern Cross)
  {
    code: 'Cru',
    nameKo: '남십자자리',
    nameEn: 'Crux',
    family: 'Heavenly Waters',
    centerRaDeg: 187.0,
    centerDecDeg: -60.0,
    lines: [
      [186.65, -63.10, 187.79, -57.11], // Acrux - Gacrux
      [191.93, -59.69, 183.84, -58.75], // Mimosa - Imai
    ],
  },

  // 24. Centaurus - 센타우루스자리
  {
    code: 'Cen',
    nameKo: '센타우루스자리',
    nameEn: 'Centaurus',
    family: 'Hercules family',
    centerRaDeg: 200.0,
    centerDecDeg: -47.0,
    lines: [
      [219.90, -60.83, 210.96, -60.37], // Alpha Cen - Hadar
      [210.96, -60.37, 211.70, -36.37], // Hadar - Menkent
      [210.96, -60.37, 190.38, -48.96], // Hadar - Muhlifain
    ],
  },

  // 25. Draco - 용자리 (Circumpolar dragon)
  {
    code: 'Dra',
    nameKo: '용자리',
    nameEn: 'Draco',
    family: 'Ursa Major family',
    centerRaDeg: 260.0,
    centerDecDeg: 65.0,
    lines: [
      [262.64, 52.30, 269.15, 51.49], // Rastaban - Eltanin
      [269.15, 51.49, 268.37, 56.87], // Eltanin - Grumium
      [268.37, 56.87, 262.96, 55.18], // Grumium - Kuma
      [262.96, 55.18, 262.64, 52.30], // Kuma - Rastaban (Dragon head)
      [268.37, 56.87, 257.21, 65.71], // Grumium - Aldhibah
      [257.21, 65.71, 230.12, 58.97], // Aldhibah - Edasich
      [230.12, 58.97, 211.26, 64.38], // Edasich - Thuban
    ],
  },

  // 26. Aries - 양자리
  {
    code: 'Ari',
    nameKo: '양자리',
    nameEn: 'Aries',
    family: 'Zodiac',
    centerRaDeg: 35.0,
    centerDecDeg: 20.0,
    lines: [
      [31.79, 23.46, 28.66, 20.81], // Hamal - Sheratan
      [28.66, 20.81, 27.91, 19.29], // Sheratan - Mesarthim
    ],
  },

  // 27. Cancer - 게자리
  {
    code: 'Cnc',
    nameKo: '게자리',
    nameEn: 'Cancer',
    family: 'Zodiac',
    centerRaDeg: 130.0,
    centerDecDeg: 20.0,
    lines: [
      [133.00, 18.15, 128.60, 11.86], // Asellus Australis - Acubens
      [133.00, 18.15, 131.17, 9.18],  // Asellus Australis - Altarf
      [133.00, 18.15, 130.84, 21.47], // Asellus Australis - Asellus Borealis
    ],
  },

  // 28. Libra - 천칭자리
  {
    code: 'Lib',
    nameKo: '천칭자리',
    nameEn: 'Libra',
    family: 'Zodiac',
    centerRaDeg: 228.0,
    centerDecDeg: -15.0,
    lines: [
      [229.25, -9.38, 222.72, -16.04], // Zubeneschamali - Zubenelgenubi
      [222.72, -16.04, 227.62, -25.28], // Zubenelgenubi - Brachium
      [227.62, -25.28, 233.88, -14.79], // Brachium - Zubenelakrab
      [233.88, -14.79, 229.25, -9.38], // Zubenelakrab - Zubeneschamali
    ],
  },

  // 29. Capricornus - 염소자리
  {
    code: 'Cap',
    nameKo: '염소자리',
    nameEn: 'Capricornus',
    family: 'Zodiac',
    centerRaDeg: 315.0,
    centerDecDeg: -18.0,
    lines: [
      [304.49, -12.54, 305.26, -14.78], // Algedi - Dabih
      [305.26, -14.78, 316.71, -26.92], // Dabih - Omega Cap
      [316.71, -26.92, 326.76, -17.23], // Omega Cap - Zeta Cap
      [326.76, -17.23, 325.80, -16.66], // Zeta Cap - Nashira
      [325.80, -16.66, 326.06, -16.13], // Nashira - Deneb Algedi
      [326.06, -16.13, 304.49, -12.54], // Deneb Algedi - Algedi
    ],
  },

  // 30. Aquarius - 물병자리
  {
    code: 'Aqr',
    nameKo: '물병자리',
    nameEn: 'Aquarius',
    family: 'Zodiac',
    centerRaDeg: 335.0,
    centerDecDeg: -10.0,
    lines: [
      [323.79, -5.57, 331.45, -0.32], // Sadalsuud - Sadalmelik
      [331.45, -0.32, 335.41, -1.39], // Sadalmelik - Sadachbia
      [335.41, -1.39, 342.16, -15.82], // Sadachbia - Skat
      [331.45, -0.32, 334.61, -7.78],  // Sadalmelik - Ancha
    ],
  },

  // 31. Pisces - 물고기자리
  {
    code: 'Psc',
    nameKo: '물고기자리',
    nameEn: 'Pisces',
    family: 'Zodiac',
    centerRaDeg: 15.0,
    centerDecDeg: 14.0,
    lines: [
      [30.52, 2.76, 20.35, 7.58],    // Alrescha - Nu Psc
      [20.35, 7.58, 14.15, 15.34],   // Nu Psc - Delta Psc
      [14.15, 15.34, 1.83, 15.35],   // Delta Psc - Gamma Psc
      [30.52, 2.76, 27.56, 8.82],    // Alrescha - Xi Psc
      [27.56, 8.82, 23.36, 17.09],   // Xi Psc - Iota Psc
    ],
  },
];

// Milky Way Galactic Equator trajectory points [RA, Dec] in degrees (J2000)
// Connects the iconic band of our galaxy across celestial sphere
export const MILKY_WAY_COORDINATES: [number, number][] = [
  [0, 60],
  [15, 62],
  [30, 61],
  [45, 56],
  [60, 48],
  [75, 36],
  [85, 23],
  [95, 8],
  [105, -7],
  [115, -20],
  [125, -34],
  [135, -45],
  [150, -56],
  [170, -62],
  [190, -63],
  [210, -61],
  [230, -52],
  [250, -40],
  [265, -28], // Galactic Center (Sgr A*)
  [280, -14],
  [290, 2],
  [300, 18],
  [310, 36],
  [320, 50],
  [335, 59],
  [360, 60],
];

export interface DeepSkyCatalogObject {
  id: string;
  catalogId: string;
  nameKo: string;
  nameEn: string;
  type: 'nebula' | 'galaxy' | 'cluster' | 'planetary_nebula' | 'supernova_remnant';
  typeKo: string;
  constellation: string;
  raDeg: number;
  decDeg: number;
  mag: number;
  sizeArcmin: number;
}

export const DEEP_SKY_OBJECTS: DeepSkyCatalogObject[] = [
  // Orion (Ori)
  { id: 'm42', catalogId: 'M42 (NGC 1976)', nameKo: '오리온 대성운', nameEn: 'Orion Nebula', type: 'nebula', typeKo: '발광/반사 성운', constellation: 'Ori', raDeg: 83.8221, decDeg: -5.3911, mag: 4.0, sizeArcmin: 85 },
  { id: 'ic434', catalogId: 'IC 434 / B33', nameKo: '말머리 성운 & 불꽃 성운', nameEn: 'Horsehead & Flame Nebula', type: 'nebula', typeKo: '암흑/발광 성운', constellation: 'Ori', raDeg: 85.25, decDeg: -2.46, mag: 6.8, sizeArcmin: 60 },
  { id: 'm78', catalogId: 'M78 (NGC 2068)', nameKo: 'M78 반사성운', nameEn: 'Messier 78', type: 'nebula', typeKo: '반사 성운', constellation: 'Ori', raDeg: 86.6946, decDeg: 0.08, mag: 8.3, sizeArcmin: 8 },
  // Taurus (Tau)
  { id: 'm45', catalogId: 'M45', nameKo: '플레이아데스 성단 (좀생이별)', nameEn: 'Pleiades', type: 'cluster', typeKo: '산개 성단', constellation: 'Tau', raDeg: 56.75, decDeg: 24.1167, mag: 1.6, sizeArcmin: 110 },
  { id: 'm1', catalogId: 'M1 (NGC 1952)', nameKo: '게 성운', nameEn: 'Crab Nebula', type: 'supernova_remnant', typeKo: '초신성 잔해', constellation: 'Tau', raDeg: 83.6331, decDeg: 22.0145, mag: 8.4, sizeArcmin: 6 },
  // Andromeda & Triangulum (And, Tri)
  { id: 'm31', catalogId: 'M31 (NGC 224)', nameKo: '안드로메다 은하', nameEn: 'Andromeda Galaxy', type: 'galaxy', typeKo: '나선 은하', constellation: 'And', raDeg: 10.6847, decDeg: 41.2687, mag: 3.4, sizeArcmin: 178 },
  { id: 'm33', catalogId: 'M33 (NGC 598)', nameKo: '삼각형자리 은하', nameEn: 'Triangulum Galaxy', type: 'galaxy', typeKo: '나선 은하', constellation: 'Tri', raDeg: 23.4621, decDeg: 30.6599, mag: 5.7, sizeArcmin: 73 },
  // Perseus & Cassiopeia & Cepheus (Per, Cas, Cep)
  { id: 'ngc869', catalogId: 'C14 (NGC 869 / NGC 884)', nameKo: '페르세우스 이중성단', nameEn: 'Double Cluster', type: 'cluster', typeKo: '이중 산개 성단', constellation: 'Per', raDeg: 35.125, decDeg: 57.14, mag: 3.7, sizeArcmin: 60 },
  { id: 'ngc1499', catalogId: 'NGC 1499', nameKo: '캘리포니아 성운', nameEn: 'California Nebula', type: 'nebula', typeKo: '발광 성운', constellation: 'Per', raDeg: 60.2, decDeg: 36.4, mag: 5.0, sizeArcmin: 150 },
  { id: 'm76', catalogId: 'M76 (NGC 650)', nameKo: '작은 아령 성운', nameEn: 'Little Dumbbell Nebula', type: 'planetary_nebula', typeKo: '행성상 성운', constellation: 'Per', raDeg: 25.582, decDeg: 51.575, mag: 10.1, sizeArcmin: 2.7 },
  { id: 'ic1805', catalogId: 'IC 1805', nameKo: '하트 성운', nameEn: 'Heart Nebula', type: 'nebula', typeKo: '발광 성운', constellation: 'Cas', raDeg: 38.175, decDeg: 61.45, mag: 6.5, sizeArcmin: 150 },
  { id: 'ic1848', catalogId: 'IC 1848', nameKo: '소울(태아) 성운', nameEn: 'Soul Nebula', type: 'nebula', typeKo: '발광 성운', constellation: 'Cas', raDeg: 42.8, decDeg: 60.43, mag: 6.5, sizeArcmin: 150 },
  { id: 'ngc7635', catalogId: 'C11 (NGC 7635) / M52 (NGC 7654)', nameKo: '버블 성운 & M52 성단', nameEn: 'Bubble Nebula & M52', type: 'nebula', typeKo: '발광 성운/성단', constellation: 'Cas', raDeg: 350.19, decDeg: 61.2, mag: 7.3, sizeArcmin: 15 },
  { id: 'ic1396', catalogId: 'IC 1396', nameKo: '코끼리 코 성운', nameEn: 'Elephant Trunk Nebula', type: 'nebula', typeKo: '발광 성운', constellation: 'Cep', raDeg: 324.74, decDeg: 57.49, mag: 3.5, sizeArcmin: 170 },
  { id: 'ngc7023', catalogId: 'C4 (NGC 7023)', nameKo: '아이리스(붓꽃) 성운', nameEn: 'Iris Nebula', type: 'nebula', typeKo: '반사 성운', constellation: 'Cep', raDeg: 315.38, decDeg: 68.16, mag: 6.8, sizeArcmin: 18 },
  // Cygnus, Lyra, Vulpecula (Cyg, Lyr, Vul)
  { id: 'ngc7000', catalogId: 'C20 (NGC 7000)', nameKo: '북아메리카 성운', nameEn: 'North America Nebula', type: 'nebula', typeKo: '발광 성운', constellation: 'Cyg', raDeg: 314.8, decDeg: 44.33, mag: 4.0, sizeArcmin: 120 },
  { id: 'ngc6992', catalogId: 'C33 / C34 (NGC 6992 / NGC 6960)', nameKo: '베일(면사포) 성운', nameEn: 'Veil Nebula', type: 'supernova_remnant', typeKo: '초신성 잔해', constellation: 'Cyg', raDeg: 312.75, decDeg: 30.7, mag: 7.0, sizeArcmin: 180 },
  { id: 'ic1318', catalogId: 'IC 1318', nameKo: '사드르 나비 성운', nameEn: 'Sadr Region Nebula', type: 'nebula', typeKo: '발광 성운', constellation: 'Cyg', raDeg: 305.56, decDeg: 40.26, mag: 5.5, sizeArcmin: 180 },
  { id: 'ngc6888', catalogId: 'C27 (NGC 6888)', nameKo: '초승달 성운', nameEn: 'Crescent Nebula', type: 'nebula', typeKo: '발광 성운', constellation: 'Cyg', raDeg: 303.06, decDeg: 38.35, mag: 7.4, sizeArcmin: 18 },
  { id: 'm57', catalogId: 'M57 (NGC 6720)', nameKo: '고리 성운', nameEn: 'Ring Nebula', type: 'planetary_nebula', typeKo: '행성상 성운', constellation: 'Lyr', raDeg: 283.396, decDeg: 33.029, mag: 8.8, sizeArcmin: 1.5 },
  { id: 'm27', catalogId: 'M27 (NGC 6853)', nameKo: '아령 성운', nameEn: 'Dumbbell Nebula', type: 'planetary_nebula', typeKo: '행성상 성운', constellation: 'Vul', raDeg: 299.901, decDeg: 22.721, mag: 7.5, sizeArcmin: 8 },
  // Ursa Major, Canes Venatici (UMa, CVn)
  { id: 'm81', catalogId: 'M81 (NGC 3031) / M82 (NGC 3034)', nameKo: '보데 은하 & 시가 은하', nameEn: 'Bode & Cigar Galaxies', type: 'galaxy', typeKo: '은하 쌍', constellation: 'UMa', raDeg: 148.888, decDeg: 69.36, mag: 6.9, sizeArcmin: 27 },
  { id: 'm101', catalogId: 'M101 (NGC 5457)', nameKo: '바람개비 은하', nameEn: 'Pinwheel Galaxy', type: 'galaxy', typeKo: '나선 은하', constellation: 'UMa', raDeg: 210.802, decDeg: 54.349, mag: 7.9, sizeArcmin: 29 },
  { id: 'm97', catalogId: 'M97 (NGC 3587) / M108 (NGC 3556)', nameKo: '부엉이 성운 & 서프보드 은하', nameEn: 'Owl Nebula & M108', type: 'planetary_nebula', typeKo: '행성상 성운/은하', constellation: 'UMa', raDeg: 168.699, decDeg: 55.019, mag: 9.9, sizeArcmin: 3.4 },
  { id: 'm51', catalogId: 'M51 (NGC 5194)', nameKo: '부자(소용돌이) 은하', nameEn: 'Whirlpool Galaxy', type: 'galaxy', typeKo: '상호작용 나선 은하', constellation: 'CVn', raDeg: 202.47, decDeg: 47.195, mag: 8.4, sizeArcmin: 11 },
  // Hercules, Sagittarius, Scorpius (Her, Sgr, Sco)
  { id: 'm13', catalogId: 'M13 (NGC 6205)', nameKo: '헤르쿨레스 대구상성단', nameEn: 'Hercules Globular Cluster', type: 'cluster', typeKo: '구상 성단', constellation: 'Her', raDeg: 250.423, decDeg: 36.46, mag: 5.8, sizeArcmin: 20 },
  { id: 'm8', catalogId: 'M8 (NGC 6523) / M20 (NGC 6514)', nameKo: '석호 성운 & 삼열 성운', nameEn: 'Lagoon & Trifid Nebulae', type: 'nebula', typeKo: '발광/반사 성운', constellation: 'Sgr', raDeg: 270.92, decDeg: -24.38, mag: 6.0, sizeArcmin: 90 },
  { id: 'm17', catalogId: 'M17 (NGC 6618) / M16 (NGC 6611)', nameKo: '오메가(백조) & 독수리 성운', nameEn: 'Omega & Eagle Nebulae', type: 'nebula', typeKo: '발광 성운', constellation: 'Sgr', raDeg: 275.196, decDeg: -16.17, mag: 6.0, sizeArcmin: 45 },
  { id: 'rho_oph', catalogId: 'IC 4604', nameKo: '안타레스 & 로 오피우치 성운 복합체', nameEn: 'Rho Ophiuchi Complex', type: 'nebula', typeKo: '발광/반사/암흑 성운', constellation: 'Sco', raDeg: 246.79, decDeg: -24.5, mag: 4.6, sizeArcmin: 180 },
  // Leo, Virgo, Cancer, Monoceros, Auriga, Gemini
  { id: 'm66', catalogId: 'M65 (NGC 3623) / M66 (NGC 3627)', nameKo: '사자자리 삼중은하 (Leo Triplet)', nameEn: 'Leo Triplet', type: 'galaxy', typeKo: '은하군', constellation: 'Leo', raDeg: 170.06, decDeg: 13.15, mag: 8.9, sizeArcmin: 35 },
  { id: 'm104', catalogId: 'M104 (NGC 4594)', nameKo: '솜브레로 은하', nameEn: 'Sombrero Galaxy', type: 'galaxy', typeKo: '나선 은하', constellation: 'Vir', raDeg: 189.998, decDeg: -11.623, mag: 8.0, sizeArcmin: 9 },
  { id: 'm87', catalogId: 'M87 (NGC 4486)', nameKo: '처녀자리 A 은하 (M87)', nameEn: 'Virgo A (M87)', type: 'galaxy', typeKo: '타원 은하', constellation: 'Vir', raDeg: 187.706, decDeg: 12.391, mag: 8.6, sizeArcmin: 8.3 },
  { id: 'm44', catalogId: 'M44 (NGC 2632)', nameKo: '프레세페(벌집) 성단', nameEn: 'Beehive Cluster', type: 'cluster', typeKo: '산개 성단', constellation: 'Cnc', raDeg: 130.1, decDeg: 19.67, mag: 3.7, sizeArcmin: 95 },
  { id: 'ngc2237', catalogId: 'C49 (NGC 2237)', nameKo: '장미 성운 (Rosette)', nameEn: 'Rosette Nebula', type: 'nebula', typeKo: '발광 성운', constellation: 'Mon', raDeg: 97.98, decDeg: 4.95, mag: 6.0, sizeArcmin: 80 },
  { id: 'm35', catalogId: 'M35 (NGC 2168)', nameKo: '쌍둥이자리 M35 산개성단', nameEn: 'Messier 35', type: 'cluster', typeKo: '산개 성단', constellation: 'Gem', raDeg: 92.225, decDeg: 24.333, mag: 5.3, sizeArcmin: 28 },
  { id: 'm37', catalogId: 'M36 (NGC 1960) / M37 (NGC 2099) / M38 (NGC 1912)', nameKo: '마차부자리 3대 산개성단', nameEn: 'Auriga Open Clusters', type: 'cluster', typeKo: '산개 성단', constellation: 'Aur', raDeg: 88.07, decDeg: 32.55, mag: 6.2, sizeArcmin: 24 },
];

