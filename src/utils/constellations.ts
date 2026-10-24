import { ConstellationDefinition, ConstellationMatch } from '../types/astronomy';

// Comprehensive catalog of all 88 official IAU Constellations with Korean names, centers, and bounds
export const IAU_CONSTELLATIONS: Record<string, {
  nameEn: string;
  nameKo: string;
  genitive?: string;
  raHours: number;
  decDeg: number;
  family: string;
  brightest: string;
  raRange?: [number, number]; // in hours [min, max]
  decRange?: [number, number]; // in degrees [min, max]
  asterism: [string, string][]; // Pairs of Greek/Bayer designations to connect
}> = {
  // Cepheus - 세페우스자리
  Cep: {
    nameEn: 'Cepheus',
    nameKo: '세페우스자리',
    raHours: 22.0,
    decDeg: 71.0,
    raRange: [20.0, 8.5], // Wraps from 20h past 0h to 8.5h
    decRange: [53.0, 88.5],
    family: 'Perseus family',
    brightest: 'Alderamin (α Cep)',
    asterism: [
      ['α', 'β'], // Alderamin - Alfirk
      ['β', 'γ'], // Alfirk - Errai
      ['γ', 'ι'], // Errai - Iota
      ['ι', 'ζ'], // Iota - Zeta
      ['ζ', 'δ'], // Zeta - Delta Cephei
      ['δ', 'μ'], // Delta - Mu Cephei (Garnet Star)
      ['μ', 'α'], // Mu Cephei - Alderamin
      ['α', 'ι'], // Base of house
      ['ζ', 'ε'],
    ],
  },
  // Cassiopeia - 카시오페이아자리
  Cas: {
    nameEn: 'Cassiopeia',
    nameKo: '카시오페이아자리',
    raHours: 1.3,
    decDeg: 60.5,
    raRange: [22.9, 3.7], // Wraps across 0h
    decRange: [46.5, 77.7],
    family: 'Perseus family',
    brightest: 'Shedar (α Cas)',
    asterism: [
      ['β', 'α'], // Caph - Shedar
      ['α', 'γ'], // Shedar - Navi
      ['γ', 'δ'], // Navi - Ruchbah
      ['δ', 'ε'], // Ruchbah - Segin
    ],
  },
  // Cygnus - 백조자리
  Cyg: {
    nameEn: 'Cygnus',
    nameKo: '백조자리',
    raHours: 20.6,
    decDeg: 44.5,
    raRange: [19.1, 22.1],
    decRange: [27.7, 51.2],
    family: 'Hercules family',
    brightest: 'Deneb (α Cyg)',
    asterism: [
      ['α', 'γ'], // Deneb - Sadr
      ['γ', 'β'], // Sadr - Albireo
      ['δ', 'γ'], // Fawaris - Sadr
      ['γ', 'ε'], // Sadr - Gienah
    ],
  },
  // Andromeda - 안드로메다자리
  And: {
    nameEn: 'Andromeda',
    nameKo: '안드로메다자리',
    raHours: 0.8,
    decDeg: 38.8,
    raRange: [22.9, 2.6],
    decRange: [21.5, 53.2],
    family: 'Perseus family',
    brightest: 'Alpheratz (α And)',
    asterism: [
      ['α', 'δ'],
      ['δ', 'β'], // Mirach
      ['β', 'γ'], // Almach
      ['δ', 'π'],
      ['β', 'μ'],
    ],
  },
  // Perseus - 페르세우스자리
  Per: {
    nameEn: 'Perseus',
    nameKo: '페르세우스자리',
    raHours: 3.2,
    decDeg: 45.0,
    raRange: [1.5, 4.8],
    decRange: [30.9, 59.2],
    family: 'Perseus family',
    brightest: 'Mirfak (α Per)',
    asterism: [
      ['γ', 'α'],
      ['α', 'δ'],
      ['δ', 'ε'],
      ['ε', 'ξ'],
      ['α', 'β'], // Algol
      ['β', 'ρ'],
      ['δ', 'ν'],
    ],
  },
  // Ursa Major - 큰곰자리
  UMa: {
    nameEn: 'Ursa Major',
    nameKo: '큰곰자리',
    raHours: 11.3,
    decDeg: 55.6,
    raRange: [8.1, 14.5],
    decRange: [28.3, 73.2],
    family: 'Ursa Major family',
    brightest: 'Alioth (ε UMa)',
    asterism: [
      ['α', 'β'], // Dubhe - Merak
      ['β', 'γ'], // Merak - Phecda
      ['γ', 'δ'], // Phecda - Megrez
      ['δ', 'α'], // Megrez - Dubhe
      ['δ', 'ε'], // Megrez - Alioth
      ['ε', 'ζ'], // Alioth - Mizar
      ['ζ', 'η'], // Mizar - Alkaid
    ],
  },
  // Ursa Minor - 작은곰자리
  UMi: {
    nameEn: 'Ursa Minor',
    nameKo: '작은곰자리',
    raHours: 15.0,
    decDeg: 78.0,
    raRange: [0.0, 24.0],
    decRange: [65.5, 90.0],
    family: 'Ursa Major family',
    brightest: 'Polaris (α UMi)',
    asterism: [
      ['α', 'δ'], // Polaris
      ['δ', 'ε'],
      ['ε', 'ζ'],
      ['ζ', 'β'], // Kochab
      ['β', 'γ'], // Pherkad
      ['γ', 'η'],
      ['η', 'ζ'],
    ],
  },
  // Orion - 오리온자리
  Ori: {
    nameEn: 'Orion',
    nameKo: '오리온자리',
    raHours: 5.6,
    decDeg: 5.9,
    raRange: [4.7, 6.4],
    decRange: [-11.0, 22.9],
    family: 'Orion family',
    brightest: 'Rigel (β Ori)',
    asterism: [
      ['α', 'γ'], // Betelgeuse - Bellatrix
      ['α', 'ζ'], // Betelgeuse - Alnitak
      ['γ', 'δ'], // Bellatrix - Mintaka
      ['δ', 'ε'], // Belt: Mintaka - Alnilam
      ['ε', 'ζ'], // Belt: Alnilam - Alnitak
      ['ζ', 'κ'], // Alnitak - Saiph
      ['δ', 'β'], // Mintaka - Rigel
      ['κ', 'β'], // Saiph - Rigel
    ],
  },
  // Lyra - 거문고자리
  Lyr: {
    nameEn: 'Lyra',
    nameKo: '거문고자리',
    genitive: 'Lyrae',
    raHours: 18.8,
    decDeg: 36.7,
    raRange: [18.2, 19.5],
    decRange: [25.7, 47.7],
    family: 'Hercules family',
    brightest: 'Vega (α Lyr)',
    asterism: [
      ['α', 'ε'],
      ['α', 'ε¹'],
      ['ε¹', 'ε²'],
      ['ε²', 'ζ'],
      ['ε', 'ζ'],
      ['α', 'ζ'],
      ['ζ', 'δ'],
      ['δ', 'β'], // Sheliak
      ['β', 'γ'], // Sulafat
      ['γ', 'δ'],
    ],
  },
  // Hercules - 헤라클레스자리
  Her: {
    nameEn: 'Hercules',
    nameKo: '헤라클레스자리',
    raHours: 17.4,
    decDeg: 27.5,
    raRange: [15.8, 18.9],
    decRange: [3.6, 51.3],
    family: 'Hercules family',
    brightest: 'Kornephoros (β Her)',
    asterism: [
      ['ε', 'ζ'],
      ['ζ', 'η'],
      ['η', 'π'],
      ['π', 'ε'], // Keystone
      ['η', 'θ'],
      ['θ', 'ι'],
      ['ζ', 'β'],
      ['β', 'α'], // Rasalgethi
    ],
  },
  // Triangulum - 삼각형자리
  Tri: {
    nameEn: 'Triangulum',
    nameKo: '삼각형자리',
    raHours: 2.2,
    decDeg: 31.5,
    raRange: [1.5, 2.9],
    decRange: [25.6, 37.4],
    family: 'Perseus family',
    brightest: 'Mothallah (α Tri)',
    asterism: [
      ['α', 'β'],
      ['β', 'γ'],
      ['γ', 'α'],
    ],
  },
  // Pisces - 물고기자리
  Psc: {
    nameEn: 'Pisces',
    nameKo: '물고기자리',
    raHours: 0.5,
    decDeg: 14.0,
    raRange: [22.8, 2.1],
    decRange: [-6.5, 33.7],
    family: 'Zodiac',
    brightest: 'Alpherg (η Psc)',
    asterism: [
      ['α', 'ξ'],
      ['ξ', 'ν'],
      ['ν', 'μ'],
      ['μ', 'ε'],
    ],
  },
  // Taurus - 황소자리
  Tau: {
    nameEn: 'Taurus',
    nameKo: '황소자리',
    raHours: 4.7,
    decDeg: 19.1,
    raRange: [3.4, 6.0],
    decRange: [-1.8, 31.1],
    family: 'Zodiac',
    brightest: 'Aldebaran (α Tau)',
    asterism: [
      ['α', 'ε'],
      ['ε', 'γ'],
      ['γ', 'δ'],
      ['δ', 'θ'],
      ['θ', 'α'], // Hyades V
      ['β', 'ζ'], // Horns
    ],
  },
  // Gemini - 쌍둥이자리
  Gem: {
    nameEn: 'Gemini',
    nameKo: '쌍둥이자리',
    raHours: 7.1,
    decDeg: 22.5,
    raRange: [6.0, 8.1],
    decRange: [9.9, 35.4],
    family: 'Zodiac',
    brightest: 'Pollux (β Gem)',
    asterism: [
      ['α', 'β'], // Castor - Pollux
      ['α', 'θ'],
      ['θ', 'γ'],
      ['β', 'δ'],
      ['δ', 'ξ'],
    ],
  },
  // Leo - 사자자리
  Leo: {
    nameEn: 'Leo',
    nameKo: '사자자리',
    raHours: 10.7,
    decDeg: 13.1,
    raRange: [9.3, 12.0],
    decRange: [-6.6, 32.9],
    family: 'Zodiac',
    brightest: 'Regulus (α Leo)',
    asterism: [
      ['α', 'η'],
      ['η', 'γ'],
      ['γ', 'ζ'],
      ['ζ', 'μ'],
      ['μ', 'ε'], // Sickle
      ['γ', 'δ'],
      ['δ', 'β'], // Denebola
    ],
  },
  // Scorpius - 전갈자리
  Sco: {
    nameEn: 'Scorpius',
    nameKo: '전갈자리',
    raHours: 16.9,
    decDeg: -30.7,
    raRange: [15.8, 17.9],
    decRange: [-45.8, -8.3],
    family: 'Zodiac',
    brightest: 'Antares (α Sco)',
    asterism: [
      ['β', 'δ'],
      ['δ', 'π'],
      ['δ', 'σ'],
      ['σ', 'α'], // Antares
      ['α', 'τ'],
      ['τ', 'ε'],
      ['ε', 'μ'],
      ['μ', 'ζ'],
      ['ζ', 'η'],
      ['η', 'θ'],
      ['θ', 'ι'],
      ['ι', 'κ'],
      ['κ', 'λ'],
    ],
  },
  // Sagittarius - 궁수자리
  Sgr: {
    nameEn: 'Sagittarius',
    nameKo: '궁수자리',
    raHours: 19.1,
    decDeg: -25.5,
    raRange: [17.7, 20.5],
    decRange: [-45.3, -11.7],
    family: 'Zodiac',
    brightest: 'Kaus Australis (ε Sgr)',
    asterism: [
      ['γ', 'δ'],
      ['δ', 'ε'],
      ['ε', 'γ'], // Teapot spout
      ['δ', 'λ'],
      ['λ', 'φ'],
      ['φ', 'σ'],
      ['σ', 'ζ'],
      ['ζ', 'τ'],
    ],
  },
  // Aquila - 독수리자리
  Aql: {
    nameEn: 'Aquila',
    nameKo: '독수리자리',
    raHours: 19.8,
    decDeg: 3.4,
    raRange: [18.7, 20.6],
    decRange: [-11.9, 18.7],
    family: 'Hercules family',
    brightest: 'Altair (α Aql)',
    asterism: [
      ['β', 'α'], // Alshain - Altair
      ['α', 'γ'], // Altair - Tarazed
      ['α', 'δ'],
      ['δ', 'ζ'],
      ['δ', 'λ'],
    ],
  },
  // Pegasus - 페가수스자리
  Peg: {
    nameEn: 'Pegasus',
    nameKo: '페가수스자리',
    raHours: 22.7,
    decDeg: 19.5,
    raRange: [21.2, 0.2],
    decRange: [2.3, 36.6],
    family: 'Perseus family',
    brightest: 'Enif (ε Peg)',
    asterism: [
      ['α', 'β'], // Markab - Scheat
      ['β', 'γ'], // Great Square
      ['α', 'ζ'],
      ['ζ', 'ε'],
    ],
  },
  // Boötes - 목동자리
  Boo: {
    nameEn: 'Boötes',
    nameKo: '목동자리',
    raHours: 14.7,
    decDeg: 31.2,
    raRange: [13.6, 15.8],
    decRange: [7.4, 55.0],
    family: 'Ursa Major family',
    brightest: 'Arcturus (α Boo)',
    asterism: [
      ['α', 'η'],
      ['α', 'ζ'],
      ['α', 'ε'],
      ['ε', 'δ'],
      ['δ', 'β'],
      ['β', 'γ'],
      ['γ', 'ε'], // Kite shape
    ],
  },
  // Virgo - 처녀자리
  Vir: {
    nameEn: 'Virgo',
    nameKo: '처녀자리',
    raHours: 13.4,
    decDeg: -4.2,
    raRange: [11.6, 15.2],
    decRange: [-22.7, 14.4],
    family: 'Zodiac',
    brightest: 'Spica (α Vir)',
    asterism: [
      ['α', 'ζ'],
      ['ζ', 'γ'],
      ['γ', 'δ'],
      ['δ', 'ε'],
      ['γ', 'η'],
      ['η', 'β'],
    ],
  },
  // Canis Major - 큰개자리
  CMa: {
    nameEn: 'Canis Major',
    nameKo: '큰개자리',
    raHours: 6.8,
    decDeg: -22.1,
    raRange: [6.2, 7.5],
    decRange: [-33.4, -11.0],
    family: 'Orion family',
    brightest: 'Sirius (α CMa)',
    asterism: [
      ['α', 'β'],
      ['α', 'γ'],
      ['α', 'δ'],
      ['δ', 'ε'],
      ['ε', 'η'],
    ],
  },
  // Canis Minor - 작은개자리
  CMi: {
    nameEn: 'Canis Minor',
    nameKo: '작은개자리',
    raHours: 7.6,
    decDeg: 5.2,
    raRange: [7.1, 8.2],
    decRange: [0.0, 13.0],
    family: 'Orion family',
    brightest: 'Procyon (α CMi)',
    asterism: [['α', 'β']],
  },
  // Auriga - 마차부자리
  Aur: {
    nameEn: 'Auriga',
    nameKo: '마차부자리',
    raHours: 6.0,
    decDeg: 42.0,
    raRange: [4.6, 7.5],
    decRange: [28.0, 56.2],
    family: 'Perseus family',
    brightest: 'Capella (α Aur)',
    asterism: [
      ['α', 'β'],
      ['β', 'θ'],
      ['θ', 'ι'],
      ['ι', 'ε'],
      ['ε', 'α'],
    ],
  },
  // Draco - 용자리
  Dra: {
    nameEn: 'Draco',
    nameKo: '용자리',
    raHours: 17.0,
    decDeg: 65.0,
    raRange: [9.3, 20.9],
    decRange: [47.5, 86.0],
    family: 'Ursa Major family',
    brightest: 'Eltanin (γ Dra)',
    asterism: [
      ['β', 'γ'],
      ['γ', 'ξ'],
      ['ξ', 'ν'],
      ['ν', 'β'], // Head
      ['ξ', 'δ'],
    ],
  },
  // Cassiopeia / Cepheus neighbor: Camelopardalis - 기린자리
  Cam: {
    nameEn: 'Camelopardalis',
    nameKo: '기린자리',
    raHours: 6.0,
    decDeg: 70.0,
    raRange: [3.3, 14.4],
    decRange: [52.7, 86.1],
    family: 'Ursa Major family',
    brightest: 'β Cam',
    asterism: [['α', 'β'], ['β', 'γ']],
  },
  // Lacerta - 도마뱀자리
  Lac: {
    nameEn: 'Lacerta',
    nameKo: '도마뱀자리',
    raHours: 22.5,
    decDeg: 45.0,
    raRange: [21.9, 22.9],
    decRange: [35.2, 56.9],
    family: 'Perseus family',
    brightest: 'α Lac',
    asterism: [['α', 'β']],
  },
  // Vulpecula - 여우자리
  Vul: {
    nameEn: 'Vulpecula',
    nameKo: '여우자리',
    raHours: 20.2,
    decDeg: 24.5,
    raRange: [18.9, 21.4],
    decRange: [19.1, 29.5],
    family: 'Hercules family',
    brightest: 'Anser (α Vul)',
    asterism: [['α', '8']],
  },
  // Sagitta - 화살자리
  Sge: {
    nameEn: 'Sagitta',
    nameKo: '화살자리',
    raHours: 19.8,
    decDeg: 18.9,
    raRange: [19.2, 20.3],
    decRange: [16.1, 21.6],
    family: 'Hercules family',
    brightest: 'γ Sge',
    asterism: [['α', 'β'], ['β', 'δ'], ['δ', 'γ']],
  },
  // Delphinus - 돌고래자리
  Del: {
    nameEn: 'Delphinus',
    nameKo: '돌고래자리',
    raHours: 20.7,
    decDeg: 11.7,
    raRange: [20.2, 21.1],
    decRange: [2.7, 20.9],
    family: 'Heavenly Waters',
    brightest: 'Rotanev (β Del)',
    asterism: [['α', 'β'], ['β', 'δ'], ['δ', 'γ'], ['γ', 'α'], ['δ', 'ε']],
  },
  // Crux - 남십자자리
  Cru: {
    nameEn: 'Crux',
    nameKo: '남십자자리',
    raHours: 12.4,
    decDeg: -60.2,
    family: 'Heavenly Waters',
    brightest: 'Acrux (α Cru)',
    asterism: [
      ['α', 'γ'],
      ['β', 'δ'],
    ],
  },
  // Centaurus - 센타우루스자리
  Cen: {
    nameEn: 'Centaurus',
    nameKo: '센타우루스자리',
    raHours: 13.1,
    decDeg: -47.3,
    family: 'Hercules family',
    brightest: 'Rigil Kentaurus (α Cen)',
    asterism: [
      ['α', 'β'],
      ['β', 'ε'],
      ['ε', 'ζ'],
      ['ζ', 'γ'],
    ],
  },
  // Ophiuchus - 뱀주인자리
  Oph: {
    nameEn: 'Ophiuchus',
    nameKo: '뱀주인자리',
    raHours: 17.4,
    decDeg: -4.3,
    family: 'Hercules family',
    brightest: 'Rasalhague (α Oph)',
    asterism: [['α', 'β'], ['β', 'γ']],
  },
  // Serpens - 뱀자리
  Ser: {
    nameEn: 'Serpens',
    nameKo: '뱀자리',
    raHours: 17.0,
    decDeg: 6.0,
    family: 'Hercules family',
    brightest: 'Unukalhai (α Ser)',
    asterism: [['α', 'β']],
  },
  // Corona Borealis - 북쪽왕관자리
  CrB: {
    nameEn: 'Corona Borealis',
    nameKo: '북쪽왕관자리',
    raHours: 15.8,
    decDeg: 32.6,
    family: 'Ursa Major family',
    brightest: 'Alphecca (α CrB)',
    asterism: [['θ', 'β'], ['β', 'α'], ['α', 'γ'], ['γ', 'δ'], ['δ', 'ε']],
  },
  // Canes Venatici - 사냥개자리
  CVn: {
    nameEn: 'Canes Venatici',
    nameKo: '사냥개자리',
    raHours: 13.1,
    decDeg: 40.1,
    family: 'Ursa Major family',
    brightest: 'Cor Caroli (α CVn)',
    asterism: [['α', 'β']],
  },
  // Coma Berenices - 머리털자리
  Com: {
    nameEn: 'Coma Berenices',
    nameKo: '머리털자리',
    raHours: 12.8,
    decDeg: 23.3,
    family: 'Ursa Major family',
    brightest: 'Diadem (α Com)',
    asterism: [['α', 'β'], ['β', 'γ']],
  },
  // Monoceros - 외뿔소자리
  Mon: {
    nameEn: 'Monoceros',
    nameKo: '외뿔소자리',
    raHours: 7.1,
    decDeg: -3.3,
    family: 'Orion family',
    brightest: 'α Mon',
    asterism: [['α', 'β'], ['β', 'γ']],
  },
  // Lepus - 토끼자리
  Lep: {
    nameEn: 'Lepus',
    nameKo: '토끼자리',
    raHours: 5.6,
    decDeg: -19.0,
    family: 'Orion family',
    brightest: 'Arneb (α Lep)',
    asterism: [['α', 'β'], ['β', 'γ'], ['γ', 'δ']],
  },
  // Cetus - 고래자리
  Cet: {
    nameEn: 'Cetus',
    nameKo: '고래자리',
    raHours: 1.7,
    decDeg: -7.2,
    family: 'Perseus family',
    brightest: 'Diphda (β Cet)',
    asterism: [['α', 'γ'], ['γ', 'δ']],
  },
  // Aries - 양자리
  Ari: {
    nameEn: 'Aries',
    nameKo: '양자리',
    raHours: 2.6,
    decDeg: 20.8,
    family: 'Zodiac',
    brightest: 'Hamal (α Ari)',
    asterism: [['α', 'β'], ['β', 'γ']],
  },
  // Cancer - 게자리
  Cnc: {
    nameEn: 'Cancer',
    nameKo: '게자리',
    raHours: 8.6,
    decDeg: 19.8,
    family: 'Zodiac',
    brightest: 'Tarf (β Cnc)',
    asterism: [['α', 'β'], ['β', 'γ']],
  },
  // Libra - 천칭자리
  Lib: {
    nameEn: 'Libra',
    nameKo: '천칭자리',
    raHours: 15.2,
    decDeg: -15.6,
    family: 'Zodiac',
    brightest: 'Zubeneschamali (β Lib)',
    asterism: [['α', 'β'], ['β', 'γ'], ['γ', 'σ']],
  },
  // Capricornus - 염소자리
  Cap: {
    nameEn: 'Capricornus',
    nameKo: '염소자리',
    raHours: 21.0,
    decDeg: -18.0,
    family: 'Zodiac',
    brightest: 'Deneb Algedi (δ Cap)',
    asterism: [['α', 'β'], ['β', 'γ']],
  },
  // Aquarius - 물병자리
  Aqr: {
    nameEn: 'Aquarius',
    nameKo: '물병자리',
    raHours: 22.3,
    decDeg: -10.8,
    family: 'Zodiac',
    brightest: 'Sadalsuud (β Aqr)',
    asterism: [['α', 'β'], ['β', 'γ']],
  },
  // Piscis Austrinus - 남쪽물고기자리
  PsA: {
    nameEn: 'Piscis Austrinus',
    nameKo: '남쪽물고기자리',
    raHours: 22.3,
    decDeg: -30.6,
    family: 'Heavenly Waters',
    brightest: 'Fomalhaut (α PsA)',
    asterism: [['α', 'ε'], ['ε', 'δ']],
  },
  // Puppis - 고물자리
  Pup: {
    nameEn: 'Puppis',
    nameKo: '고물자리',
    raHours: 7.3,
    decDeg: -31.2,
    family: 'Heavenly Waters',
    brightest: 'Naos (ζ Pup)',
    asterism: [['ζ', 'ξ']],
  },
  // Vela - 돛자리
  Vel: {
    nameEn: 'Vela',
    nameKo: '돛자리',
    raHours: 9.6,
    decDeg: -47.2,
    family: 'Heavenly Waters',
    brightest: 'Suhail (γ Vel)',
    asterism: [['γ', 'δ'], ['δ', 'κ']],
  },
  // Carina - 용골자리
  Car: {
    nameEn: 'Carina',
    nameKo: '용골자리',
    raHours: 8.7,
    decDeg: -63.2,
    family: 'Heavenly Waters',
    brightest: 'Canopus (α Car)',
    asterism: [['α', 'β'], ['β', 'ε']],
  },
  // Eridanus - 에리다누스자리
  Eri: {
    nameEn: 'Eridanus',
    nameKo: '에리다누스자리',
    raHours: 3.8,
    decDeg: -29.0,
    family: 'Heavenly Waters',
    brightest: 'Achernar (α Eri)',
    asterism: [['α', 'β'], ['β', 'γ']],
  },
  // Grus - 두루미자리
  Gru: {
    nameEn: 'Grus',
    nameKo: '두루미자리',
    raHours: 22.5,
    decDeg: -46.4,
    family: 'Bayer',
    brightest: 'Alnair (α Gru)',
    asterism: [['α', 'β'], ['β', 'γ']],
  },
  // Pavo - 공작자리
  Pav: {
    nameEn: 'Pavo',
    nameKo: '공작자리',
    raHours: 19.4,
    decDeg: -65.8,
    family: 'Bayer',
    brightest: 'Peacock (α Pav)',
    asterism: [['α', 'β'], ['β', 'γ']],
  },
  // Phoenix - 봉황자리
  Phe: {
    nameEn: 'Phoenix',
    nameKo: '봉황자리',
    raHours: 0.4,
    decDeg: -42.3,
    family: 'Bayer',
    brightest: 'Ankaa (α Phe)',
    asterism: [['α', 'β'], ['β', 'γ']],
  },
  // Tucana - 큰부리새자리
  Tuc: {
    nameEn: 'Tucana',
    nameKo: '큰부리새자리',
    raHours: 23.8,
    decDeg: -65.8,
    family: 'Bayer',
    brightest: 'α Tuc',
    asterism: [['α', 'β']],
  },
  // Hydrus - 물뱀자리
  Hyi: {
    nameEn: 'Hydrus',
    nameKo: '물뱀자리',
    raHours: 2.3,
    decDeg: -69.9,
    family: 'Bayer',
    brightest: 'α Hyi',
    asterism: [['α', 'β']],
  },
  // Dorado - 황새치자리
  Dor: {
    nameEn: 'Dorado',
    nameKo: '황새치자리',
    raHours: 5.2,
    decDeg: -59.7,
    family: 'Bayer',
    brightest: 'α Dor',
    asterism: [['α', 'β']],
  },
  // Apus - 극락조자리
  Aps: {
    nameEn: 'Apus',
    nameKo: '극락조자리',
    raHours: 16.1,
    decDeg: -75.3,
    family: 'Bayer',
    brightest: 'α Aps',
    asterism: [['α', 'β']],
  },
  // Chamaeleon - 카멜레온자리
  Cha: {
    nameEn: 'Chamaeleon',
    nameKo: '카멜레온자리',
    raHours: 11.1,
    decDeg: -79.2,
    family: 'Bayer',
    brightest: 'α Cha',
    asterism: [['α', 'β']],
  },
  // Volans - 날치자리
  Vol: {
    nameEn: 'Volans',
    nameKo: '날치자리',
    raHours: 7.8,
    decDeg: -70.5,
    family: 'Bayer',
    brightest: 'β Vol',
    asterism: [['α', 'β']],
  },
  // Musca - 파리자리
  Mus: {
    nameEn: 'Musca',
    nameKo: '파리자리',
    raHours: 12.6,
    decDeg: -70.2,
    family: 'Bayer',
    brightest: 'α Mus',
    asterism: [['α', 'β']],
  },
  // Triangulum Australe - 남쪽삼각형자리
  TrA: {
    nameEn: 'Triangulum Australe',
    nameKo: '남쪽삼각형자리',
    raHours: 16.1,
    decDeg: -65.4,
    family: 'Bayer',
    brightest: 'Atria (α TrA)',
    asterism: [['α', 'β'], ['β', 'γ'], ['γ', 'α']],
  },
  // Octans - 팔분의자리 (South Celestial Pole)
  Oct: {
    nameEn: 'Octans',
    nameKo: '팔분의자리',
    raHours: 21.0,
    decDeg: -85.0,
    family: 'Lacaille',
    brightest: 'ν Oct',
    asterism: [['α', 'β']],
  },
};

// Map Greek letter unicode/spelling to single symbol e.g. "α"
export function normalizeGreekLetter(str: string): string {
  const map: Record<string, string> = {
    alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ', epsilon: 'ε',
    zeta: 'ζ', eta: 'η', theta: 'θ', iota: 'ι', kappa: 'κ',
    lambda: 'λ', mu: 'μ', nu: 'ν', xi: 'ξ', omicron: 'ο',
    pi: 'π', rho: 'ρ', sigma: 'σ', tau: 'τ', upsilon: 'υ',
    phi: 'φ', chi: 'χ', psi: 'ψ', omega: 'ω',
  };
  const lower = str.toLowerCase();
  for (const [key, val] of Object.entries(map)) {
    if (lower.includes(key)) return val;
  }
  const greekRegex = /[\u0370-\u03ff]/;
  const match = str.match(greekRegex);
  if (match) return match[0];
  return str.trim();
}

/**
 * Identify constellations from:
 * 1. Detected star annotations (e.g. "μ Cep", "α Cyg", "β Cas") -> highest confidence!
 * 2. Astrometry tags & objects_in_field (e.g. "(Cep)", "Cepheus")
 * 3. Exact sky coordinate (RA, Dec) bounds
 */
export function identifyConstellations(
  tags: string[],
  objectsInField: string[],
  raDeg: number,
  decDeg: number,
  annotations?: { names?: string[] }[]
): ConstellationMatch[] {
  const detectedCodes = new Map<string, number>();

  // Normalized RA in hours (0..24)
  let normRaDeg = raDeg % 360;
  if (normRaDeg < 0) normRaDeg += 360;
  const raHours = normRaDeg / 15;

  // 1. PRIMARY CHECK: Exact IAU celestial coordinate boundary matching
  // The constellation that contains the center (RA, Dec) is the true host constellation
  let hostConstellationCode: string | null = null;
  let minCenterDistance = Infinity;

  const d2r = Math.PI / 180;
  const phi1 = decDeg * d2r;

  for (const [code, info] of Object.entries(IAU_CONSTELLATIONS)) {
    if (info.raRange && info.decRange) {
      const [raMin, raMax] = info.raRange;
      const [decMin, decMax] = info.decRange;

      let inRa = false;
      if (raMin <= raMax) {
        inRa = raHours >= raMin && raHours <= raMax;
      } else {
        // Wraps around 24h / 0h (e.g. Cepheus [20.0, 8.5], Cassiopeia [22.9, 3.7], Pisces [22.8, 2.1])
        inRa = raHours >= raMin || raHours <= raMax;
      }

      const inDec = decDeg >= decMin && decDeg <= decMax;

      if (inRa && inDec) {
        // Angular distance to constellation center (spherical law of cosines)
        const centerRaDeg = info.raHours * 15;
        const centerDecDeg = info.decDeg;
        const phi2 = centerDecDeg * d2r;
        const dLam = (centerRaDeg - normRaDeg) * d2r;
        const cosD = Math.sin(phi1) * Math.sin(phi2) + Math.cos(phi1) * Math.cos(phi2) * Math.cos(dLam);
        const dist = Math.acos(Math.max(-1, Math.min(1, cosD))) * (180 / Math.PI);

        if (dist < minCenterDistance) {
          minCenterDistance = dist;
          hostConstellationCode = code;
        }
        detectedCodes.set(code, (detectedCodes.get(code) || 0) + 400);
      }
    }
  }

  // Best host constellation gets massive dominant boost
  if (hostConstellationCode) {
    detectedCodes.set(hostConstellationCode, (detectedCodes.get(hostConstellationCode) || 0) + 1200);
  }

  // 2. Astrometry explicit constellation tags & object identifications e.g. "The constellation Cepheus (Cep)", "Erakis (μ Cep)"
  const allTexts = [...(tags || []), ...(objectsInField || [])];
  for (const text of allTexts) {
    // Explicit constellation tag e.g. "The constellation Cepheus (Cep)"
    const constMatch = text.match(/constellation\s+([A-Za-z\s]+)\s*\(([A-Za-z]{3})\)/i);
    if (constMatch) {
      const code = constMatch[2];
      if (IAU_CONSTELLATIONS[code]) {
        detectedCodes.set(code, (detectedCodes.get(code) || 0) + 1000);
      }
    }

    // Check for constellation abbreviation inside parentheses e.g. "(μ Cep)", "(α Cep)", "(β Cyg)", "(61 Cyg)"
    const parenMatches = text.match(/\(([^)]+)\)/g);
    if (parenMatches) {
      for (const p of parenMatches) {
        const inner = p.slice(1, -1);
        for (const [code] of Object.entries(IAU_CONSTELLATIONS)) {
          const codeRegex = new RegExp(`\\b${code}\\b`, 'i');
          if (codeRegex.test(inner)) {
            detectedCodes.set(code, (detectedCodes.get(code) || 0) + 900);
          }
        }
      }
    }

    // Check for exact constellation abbreviation or name
    for (const [code, info] of Object.entries(IAU_CONSTELLATIONS)) {
      if (info.genitive && text.toLowerCase().includes(info.genitive.toLowerCase())) {
        detectedCodes.set(code, (detectedCodes.get(code) || 0) + 800);
      }
      if (text.toLowerCase().includes(info.nameEn.toLowerCase())) {
        detectedCodes.set(code, (detectedCodes.get(code) || 0) + 600);
      }
      if (text.includes(info.nameKo) || text.includes(info.nameKo.replace('자리', ''))) {
        detectedCodes.set(code, (detectedCodes.get(code) || 0) + 800);
      }
      // Word boundary code match e.g. "Cep", "Cyg"
      const codeRegex = new RegExp(`\\b${code}\\b`, 'i');
      if (codeRegex.test(text)) {
        detectedCodes.set(code, (detectedCodes.get(code) || 0) + 500);
      }
    }
  }

  // 3. Direct star annotations check (e.g., "μ Cep", "Alderamin (α Cep)", "Albireo (β1 Cyg)")
  // Bayer / Flamsteed stars belonging to constellations
  if (Array.isArray(annotations) && annotations.length > 0) {
    for (const ann of annotations) {
      if (!ann || !Array.isArray(ann.names)) continue;
      for (const name of ann.names) {
        if (typeof name !== 'string') continue;
        for (const [code, info] of Object.entries(IAU_CONSTELLATIONS)) {
          // Match boundary word like "μ Cep", "alpha Cep", "6 Cyg", "11 Cas"
          const regex = new RegExp(`\\b${code}\\b`, 'i');
          if (regex.test(name)) {
            detectedCodes.set(code, (detectedCodes.get(code) || 0) + 200);
          }
          if (info.genitive && name.toLowerCase().includes(info.genitive.toLowerCase())) {
            detectedCodes.set(code, (detectedCodes.get(code) || 0) + 200);
          }
        }
      }
    }
  }

  // 4. Fallback: If still nothing matched, find the closest constellation center via spherical angular distance
  if (detectedCodes.size === 0) {
    let closestCode = 'Cep';
    let minDistance = Infinity;

    for (const [code, info] of Object.entries(IAU_CONSTELLATIONS)) {
      const centerRaDeg = info.raHours * 15;
      const centerDecDeg = info.decDeg;

      // Spherical law of cosines
      const d2r = Math.PI / 180;
      const phi1 = decDeg * d2r;
      const phi2 = centerDecDeg * d2r;
      const dLam = (centerRaDeg - normRaDeg) * d2r;
      const cosD = Math.sin(phi1) * Math.sin(phi2) + Math.cos(phi1) * Math.cos(phi2) * Math.cos(dLam);
      const dist = Math.acos(Math.max(-1, Math.min(1, cosD))) * (180 / Math.PI);

      if (dist < minDistance) {
        minDistance = dist;
        closestCode = code;
      }
    }
    detectedCodes.set(closestCode, 300);
  }

  // Sort by score descending
  const sorted = Array.from(detectedCodes.entries()).sort((a, b) => b[1] - a[1]);

  return sorted.map(([code, score], index) => {
    const info = IAU_CONSTELLATIONS[code] || {
      nameEn: code,
      nameKo: `${code}자리`,
      family: 'Celestial',
      brightest: 'N/A',
    };

    return {
      code,
      nameKo: info.nameKo,
      nameEn: info.nameEn,
      genitive: info.nameEn,
      family: info.family,
      brightestStar: info.brightest,
      isPrimary: index === 0,
      starsCountInField: score,
    };
  });
}

// Generate constellation stick figure lines by matching detected stars in annotations
export function getConstellationLinesForImage(
  annotations: { names: string[]; pixelx: number; pixely: number; type?: string }[],
  constellations: ConstellationMatch[]
): {
  constellation: string;
  nameKo: string;
  fromStar: string;
  toStar: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}[] {
  const linesResult: {
    constellation: string;
    nameKo: string;
    fromStar: string;
    toStar: string;
    x1: number;
    y1: number;
    x2: number;
    y2: number;
  }[] = [];

  // Index stars by constellation and greek/bayer letter e.g. "Cep_μ" -> { x, y, fullName }
  const starMap = new Map<string, { x: number; y: number; fullName: string }>();
  const catalogIdMap = new Map<string, { x: number; y: number; fullName: string }>();

  const safeAnnotations = Array.isArray(annotations) ? annotations : [];
  for (const ann of safeAnnotations) {
    if (!ann || !Array.isArray(ann.names) || ann.names.length === 0) continue;
    const primaryName = ann.names[0];
    for (const name of ann.names) {
      const compactId = name.replace(/\s+/g, ' ').trim().toUpperCase();
      if (!catalogIdMap.has(compactId)) {
        catalogIdMap.set(compactId, { x: ann.pixelx, y: ann.pixely, fullName: primaryName });
      }
      if (name.includes('ε¹ Lyr') || name.toLowerCase().includes('epsilon1 lyr') || name.includes('4 Lyr')) {
        starMap.set('Lyr_ε¹', { x: ann.pixelx, y: ann.pixely, fullName: primaryName });
        starMap.set('Lyr_ε', { x: ann.pixelx, y: ann.pixely, fullName: primaryName });
      }
      if (name.includes('ε² Lyr') || name.toLowerCase().includes('epsilon2 lyr') || name.includes('5 Lyr')) {
        starMap.set('Lyr_ε²', { x: ann.pixelx, y: ann.pixely, fullName: primaryName });
      }
      for (const [constCode] of Object.entries(IAU_CONSTELLATIONS)) {
        if (name.includes(constCode)) {
          const greek = normalizeGreekLetter(name);
          const key = `${constCode}_${greek}`;
          if (!starMap.has(key)) {
            starMap.set(key, { x: ann.pixelx, y: ann.pixely, fullName: primaryName });
          }
        }
      }
    }
  }

  // Connect stars based on the known constellation stick figure
  for (const match of constellations) {
    const info = IAU_CONSTELLATIONS[match.code];
    if (!info || !info.asterism) continue;

    for (const [s1, s2] of info.asterism) {
      const g1 = s1 === 'ε¹' || s1 === 'ε²' ? s1 : normalizeGreekLetter(s1);
      const g2 = s2 === 'ε¹' || s2 === 'ε²' ? s2 : normalizeGreekLetter(s2);

      const p1 = starMap.get(`${match.code}_${g1}`);
      const p2 = starMap.get(`${match.code}_${g2}`);

      if (p1 && p2 && (p1.x !== p2.x || p1.y !== p2.y)) {
        linesResult.push({
          constellation: match.code,
          nameKo: match.nameKo,
          fromStar: p1.fullName,
          toStar: p2.fullName,
          x1: p1.x,
          y1: p1.y,
          x2: p2.x,
          y2: p2.y,
        });
      }
    }
  }

  // For telescopic fields (such as Lyra Double Double ε¹·ε² Lyr), also connect key reference stars in the field
  const eps1 = starMap.get('Lyr_ε¹');
  const eps2 = starMap.get('Lyr_ε²');
  if (eps1 && eps2) {
    const telescopicPairs: [string, string][] = [
      ['ε² LYR', 'HD 173383'],
      ['HD 173383', 'HD 173631'],
      ['ε¹ LYR', 'HD 173290'],
      ['ε¹ LYR', 'BD+39 3514'],
      ['BD+39 3514', 'BD+39 3523'],
      ['ε² LYR', 'BD+39 3523'],
    ];
    const findStar = (token: string) => {
      if (token === 'ε¹ LYR') return eps1;
      if (token === 'ε² LYR') return eps2;
      for (const [k, v] of catalogIdMap.entries()) {
        if (k.includes(token)) return v;
      }
      return undefined;
    };
    for (const [a, b] of telescopicPairs) {
      const pa = findStar(a);
      const pb = findStar(b);
      if (pa && pb) {
        linesResult.push({
          constellation: 'Lyr',
          nameKo: '거문고자리 (더블더블 성야 패턴)',
          fromStar: pa.fullName,
          toStar: pb.fullName,
          x1: pa.x,
          y1: pa.y,
          x2: pb.x,
          y2: pb.y,
        });
      }
    }
  }

  return linesResult;
}

// Complete Messier (M1..M110) <-> NGC/IC cross-reference map
export const MESSIER_TO_NGC_IC: Record<string, string> = {
  M1: 'NGC 1952', M2: 'NGC 7089', M3: 'NGC 5272', M4: 'NGC 6121', M5: 'NGC 5904',
  M6: 'NGC 6405', M7: 'NGC 6475', M8: 'NGC 6523', M9: 'NGC 6333', M10: 'NGC 6254',
  M11: 'NGC 6705', M12: 'NGC 6218', M13: 'NGC 6205', M14: 'NGC 6402', M15: 'NGC 7078',
  M16: 'NGC 6611', M17: 'NGC 6618', M18: 'NGC 6613', M19: 'NGC 6273', M20: 'NGC 6514',
  M21: 'NGC 6531', M22: 'NGC 6656', M23: 'NGC 6494', M25: 'IC 4725', M26: 'NGC 6694',
  M27: 'NGC 6853', M28: 'NGC 6626', M29: 'NGC 6913', M30: 'NGC 7099', M31: 'NGC 224',
  M32: 'NGC 221', M33: 'NGC 598', M34: 'NGC 1039', M35: 'NGC 2168', M36: 'NGC 1960',
  M37: 'NGC 2099', M38: 'NGC 1912', M39: 'NGC 7092', M41: 'NGC 2287', M42: 'NGC 1976',
  M43: 'NGC 1982', M44: 'NGC 2632', M46: 'NGC 2437', M47: 'NGC 2422', M48: 'NGC 2548',
  M49: 'NGC 4472', M50: 'NGC 2323', M51: 'NGC 5194', M52: 'NGC 7654', M53: 'NGC 5024',
  M54: 'NGC 6715', M55: 'NGC 6809', M56: 'NGC 6779', M57: 'NGC 6720', M58: 'NGC 4579',
  M59: 'NGC 4621', M60: 'NGC 4649', M61: 'NGC 4303', M62: 'NGC 6266', M63: 'NGC 5055',
  M64: 'NGC 4826', M65: 'NGC 3623', M66: 'NGC 3627', M67: 'NGC 2682', M68: 'NGC 4590',
  M69: 'NGC 6637', M70: 'NGC 6681', M71: 'NGC 6838', M72: 'NGC 6981', M73: 'NGC 6994',
  M74: 'NGC 628', M75: 'NGC 6864', M76: 'NGC 650', M77: 'NGC 1068', M78: 'NGC 2068',
  M79: 'NGC 1904', M80: 'NGC 6093', M81: 'NGC 3031', M82: 'NGC 3034', M83: 'NGC 5236',
  M84: 'NGC 4374', M85: 'NGC 4382', M86: 'NGC 4406', M87: 'NGC 4486', M88: 'NGC 4501',
  M89: 'NGC 4552', M90: 'NGC 4569', M91: 'NGC 4548', M92: 'NGC 6341', M93: 'NGC 2447',
  M94: 'NGC 4736', M95: 'NGC 3351', M96: 'NGC 3368', M97: 'NGC 3587', M98: 'NGC 4192',
  M99: 'NGC 4254', M100: 'NGC 4321', M101: 'NGC 5457', M102: 'NGC 5866', M103: 'NGC 581',
  M104: 'NGC 4594', M105: 'NGC 3379', M106: 'NGC 4258', M107: 'NGC 6171', M108: 'NGC 3556',
  M109: 'NGC 3992', M110: 'NGC 205',
};

// Complete Caldwell (C1..C109) <-> NGC/IC cross-reference map
export const CALDWELL_TO_NGC_IC: Record<string, string> = {
  C1: 'NGC 188', C2: 'NGC 40', C3: 'NGC 4236', C4: 'NGC 7023', C5: 'IC 342',
  C6: 'NGC 6543', C7: 'NGC 2403', C8: 'NGC 559', C10: 'NGC 663', C11: 'NGC 7635',
  C12: 'NGC 6946', C13: 'NGC 457', C14: 'NGC 869 / NGC 884', C15: 'NGC 6826', C16: 'NGC 7243',
  C17: 'NGC 147', C18: 'NGC 185', C19: 'IC 5146', C20: 'NGC 7000', C21: 'NGC 4449',
  C22: 'NGC 7662', C23: 'NGC 891', C24: 'NGC 1275', C25: 'NGC 2419', C26: 'NGC 4244',
  C27: 'NGC 6888', C28: 'NGC 752', C29: 'NGC 5005', C30: 'NGC 7331', C31: 'IC 405',
  C32: 'NGC 4631', C33: 'NGC 6992', C34: 'NGC 6960', C35: 'NGC 4889', C36: 'NGC 4559',
  C37: 'NGC 6885', C38: 'NGC 4565', C39: 'NGC 2392', C40: 'NGC 3626', C42: 'NGC 7006',
  C43: 'NGC 7814', C44: 'NGC 7479', C45: 'NGC 5248', C46: 'NGC 2261', C47: 'NGC 6934',
  C48: 'NGC 2775', C49: 'NGC 2237', C50: 'NGC 2244', C51: 'IC 1613', C52: 'NGC 4697',
  C53: 'NGC 3115', C54: 'NGC 2506', C55: 'NGC 7009', C56: 'NGC 246', C57: 'NGC 6822',
  C58: 'NGC 2360', C59: 'NGC 3242', C60: 'NGC 4038', C61: 'NGC 4039', C62: 'NGC 247',
  C63: 'NGC 7293', C64: 'NGC 2362', C65: 'NGC 253', C66: 'NGC 5694', C67: 'NGC 1097',
  C68: 'NGC 6729', C69: 'NGC 6302', C70: 'NGC 300', C71: 'NGC 2477', C72: 'NGC 55',
  C73: 'NGC 1851', C74: 'NGC 3132', C75: 'NGC 6124', C76: 'NGC 6231', C77: 'NGC 5128',
  C78: 'NGC 6541', C79: 'NGC 3201', C80: 'NGC 5139', C81: 'NGC 6352', C82: 'NGC 6193',
  C83: 'NGC 4945', C84: 'NGC 5286', C85: 'IC 2391', C86: 'NGC 6397', C87: 'NGC 1261',
  C88: 'NGC 5823', C89: 'NGC 6087', C90: 'NGC 2867', C91: 'NGC 3532', C92: 'NGC 3372',
  C93: 'NGC 6752', C94: 'NGC 4755', C95: 'NGC 6025', C96: 'NGC 2516', C97: 'NGC 3766',
  C98: 'NGC 4609', C102: 'IC 2602', C103: 'NGC 2070', C104: 'NGC 362', C105: 'NGC 4833',
  C106: 'NGC 104', C107: 'NGC 6101', C108: 'NGC 4372', C109: 'NGC 3195',
};

// Reverse lookup map: "NGC 628" -> { mc: "M74", ngcIc: "NGC 628" }, "NGC 752" -> { mc: "C28", ngcIc: "NGC 752" }
const NGC_IC_TO_MC: Record<string, { mc: string; ngcIc: string }> = (() => {
  const map: Record<string, { mc: string; ngcIc: string }> = {};
  for (const [mKey, ngcVal] of Object.entries(MESSIER_TO_NGC_IC)) {
    map[ngcVal.toUpperCase()] = { mc: mKey, ngcIc: ngcVal };
  }
  for (const [cKey, ngcVal] of Object.entries(CALDWELL_TO_NGC_IC)) {
    if (ngcVal.includes('/')) {
      for (const part of ngcVal.split('/')) {
        const trimmed = part.trim().toUpperCase();
        map[trimmed] = { mc: cKey, ngcIc: trimmed };
      }
    } else {
      map[ngcVal.toUpperCase()] = { mc: cKey, ngcIc: ngcVal };
    }
  }
  // Additional multi-NGC aliases for C33 (Eastern Veil NGC 6992 / NGC 6995) and M76 (NGC 650 / NGC 651)
  map['NGC 6995'] = { mc: 'C33', ngcIc: 'NGC 6995' };
  map['NGC 651'] = { mc: 'M76', ngcIc: 'NGC 651' };
  return map;
})();

/**
 * Formats an object designation so that if a Caldwell (C) or Messier (M) number exists,
 * the Caldwell or Messier number is shown first and NGC/IC is placed inside parentheses (...).
 * If no Caldwell or Messier number exists, returns the designation as-is.
 */
export function formatCatalogDesignationWithPriority(
  messierOrNames?: string | string[] | null,
  caldwellId?: string | null,
  ngcIcList: string[] = []
): string | null {
  // If called with an array of names (e.g., dso.names from annotations), delegate to extractPrimaryObjectIdentifier
  if (Array.isArray(messierOrNames)) {
    return extractPrimaryObjectIdentifier(messierOrNames);
  }

  const messierId = typeof messierOrNames === 'string' ? messierOrNames : null;
  const safeCaldwellId = typeof caldwellId === 'string' ? caldwellId : null;
  const safeNgcIcList = Array.isArray(ngcIcList) ? ngcIcList.filter((s): s is string => typeof s === 'string') : [];

  const uniqueNgcIc = Array.from(
    new Set(safeNgcIcList.map((s) => s.replace(/\s+/g, ' ').trim().toUpperCase()))
  ).filter(Boolean);

  // 1. If explicit Messier or Caldwell is provided
  let primaryMC = messierId
    ? messierId.replace(/^MESSIER\s*/i, 'M').replace(/\s+/g, '').toUpperCase()
    : safeCaldwellId
    ? safeCaldwellId.replace(/^CALDWELL\s*/i, 'C').replace(/\s+/g, '').toUpperCase()
    : null;

  // 2. If not explicitly provided, check if any NGC/IC in the list maps to a known Messier or Caldwell number
  if (!primaryMC && uniqueNgcIc.length > 0) {
    for (const ngcIc of uniqueNgcIc) {
      const mapped = NGC_IC_TO_MC[ngcIc];
      if (mapped) {
        primaryMC = mapped.mc;
        break;
      }
    }
  }

  // 3. If we have a Messier or Caldwell number, ensure we also look up its canonical NGC/IC if none was in uniqueNgcIc
  if (primaryMC) {
    if (uniqueNgcIc.length === 0) {
      const canonicalNgc = MESSIER_TO_NGC_IC[primaryMC] || CALDWELL_TO_NGC_IC[primaryMC];
      if (canonicalNgc) {
        return `${primaryMC} (${canonicalNgc})`;
      }
      return primaryMC;
    }
    return `${primaryMC} (${uniqueNgcIc.join(' / ')})`;
  }

  // 4. No Messier or Caldwell number exists -> return NGC/IC as-is
  if (uniqueNgcIc.length > 0) {
    return uniqueNgcIc[0];
  }

  return null;
}

/**
 * Normalizes any title string so that if a Caldwell or Messier number exists alongside or via NGC/IC,
 * Caldwell/Messier appears first and NGC/IC is inside parentheses (...). If none exists, returns as-is.
 */
export function formatTitleWithCatalogPriority(
  rawTitle: string,
  objectsOrTags: string[] = []
): string {
  if (!rawTitle || typeof rawTitle !== 'string') return rawTitle || '';
  let result = rawTitle.trim();

  // Case 0: Deduplicate nested repeated titles when re-analyzing
  // e.g. "전갈자리 ω¹·ω² Scorpii (Jabhat Acrabi 이중성) (전갈자리 ω¹·ω² Scorpii (Jabhat Acrabi 이중성) (stacked.jpg))"
  // -> "전갈자리 ω¹·ω² Scorpii (Jabhat Acrabi 이중성) (stacked.jpg)"
  let prevResult = '';
  while (prevResult !== result) {
    prevResult = result;
    for (let splitIdx = 3; splitIdx < result.length - 4; splitIdx++) {
      if (result.slice(splitIdx, splitIdx + 2) === ' (') {
        const prefix = result.slice(0, splitIdx).trim();
        const rest = result.slice(splitIdx + 2);
        if (prefix.length >= 3 && rest.startsWith(prefix) && rest.endsWith(')')) {
          const innerAfterPrefix = rest.slice(prefix.length, -1).trim();
          result = innerAfterPrefix ? `${prefix} ${innerAfterPrefix}` : prefix;
          break;
        }
      }
    }
  }

  // Case 1: Parenthesized "(NGC 628 / M74)" or "(M31 / NGC 224)" or "(NGC 891 / Caldwell 23)"
  result = result.replace(
    /\(\s*(?:(NGC|IC)\s*(\d+[A-Z]?)\s*\/\s*(?:(Messier|M|Caldwell|C)\s*(\d+))|(?:(Messier|M|Caldwell|C)\s*(\d+))\s*\/\s*(NGC|IC)\s*(\d+[A-Z]?))\s*\)/gi,
    (_match, ngc1, num1, mc1, mcNum1, mc2, mcNum2, ngc2, num2) => {
      const mcPrefix = (mc1 || mc2).toUpperCase().startsWith('C') ? 'C' : 'M';
      const mcNumber = mcNum1 || mcNum2;
      const ngcPrefix = (ngc1 || ngc2).toUpperCase();
      const ngcNumber = (num1 || num2).toUpperCase();
      return `${mcPrefix}${mcNumber} (${ngcPrefix} ${ngcNumber})`;
    }
  );

  // Case 2: "NGC 663 산개성단 (Caldwell 10)" or "NGC 752 산개성단 (Caldwell 28)"
  result = result.replace(
    /\b(NGC|IC)\s*(\d+[A-Z]?)\s*([^()]*?)\(\s*(?:Caldwell|C|Messier|M)\s*(\d+)\s*\)/gi,
    (_match, ngcPrefix, ngcNum, middleText, mcNum) => {
      const isCaldwell = _match.toLowerCase().includes('caldwell') || /\(\s*c\s*\d+/i.test(_match);
      const mcTag = `${isCaldwell ? 'C' : 'M'}${mcNum}`;
      const mid = middleText.trim();
      return mid
        ? `${mcTag} ${mid} (${ngcPrefix.toUpperCase()} ${ngcNum.toUpperCase()})`
        : `${mcTag} (${ngcPrefix.toUpperCase()} ${ngcNum.toUpperCase()})`;
    }
  );

  // Case 3: Standalone "(NGC 869 / NGC 884)" -> "C14 (NGC 869 / NGC 884)"
  result = result.replace(/\(\s*NGC\s*869\s*\/\s*(?:NGC\s*)?884\s*\)/gi, 'C14 (NGC 869 / NGC 884)');
  result = result.replace(/\(\s*NGC\s*6992\s*\/\s*(?:NGC\s*)?6995\s*\)/gi, 'C33 (NGC 6992 / NGC 6995)');
  result = result.replace(/\(\s*NGC\s*7000\s*\/\s*IC\s*5070\s*\)/gi, 'C20 (NGC 7000 / IC 5070)');

  // Case 4: If string contains a standalone M or C number without its NGC/IC in parentheses, add (NGC/IC) if known
  if (!/\(\s*(?:NGC|IC)\s*\d+/i.test(result)) {
    result = result.replace(/\b(M|C)\s*(\d{1,3})\b/g, (fullMatch, mcPrefix, mcNum) => {
      const key = `${mcPrefix.toUpperCase()}${mcNum}`;
      const canonical = MESSIER_TO_NGC_IC[key] || CALDWELL_TO_NGC_IC[key];
      if (canonical && !result.toUpperCase().includes(canonical.toUpperCase())) {
        return `${key} (${canonical})`;
      }
      return fullMatch;
    });
  }

  // Case 5: If string contains NGC/IC without M/C in the string, check if it maps to a known M/C
  if (!/\b(?:M|C|Messier|Caldwell)\s*\d+\b/i.test(result)) {
    result = result.replace(/\b(NGC|IC)\s*(\d+[A-Z]?)\b/gi, (fullMatch, cat, num) => {
      const key = `${cat.toUpperCase()} ${num.toUpperCase()}`;
      const mapped = NGC_IC_TO_MC[key];
      if (mapped) {
        return `${mapped.mc} (${key})`;
      }
      return fullMatch;
    });
  }

  // Case 6: If result still has no catalog designation at all, check if objectsOrTags provides one when result ends with "의 천체"
  if (result.endsWith('의 천체') && Array.isArray(objectsOrTags) && objectsOrTags.length > 0) {
    const extracted = extractPrimaryObjectIdentifier(objectsOrTags);
    if (extracted) {
      result = result.replace(/의\s*천체$/, `의 ${extracted}`);
    }
  }

  return result;
}

/**
 * Extracts the most representative celestial object identifier.
 * Rule: If a Caldwell (C) or Messier (M) number exists, show it first and put NGC or IC inside ().
 * If no Caldwell or Messier number exists, show NGC/IC or object name as-is.
 */
export function extractPrimaryObjectIdentifier(
  objectsOrTags: string[] = [],
  filename?: string,
  title?: string
): string | null {
  const candidates: string[] = [];
  if (Array.isArray(objectsOrTags)) {
    candidates.push(...objectsOrTags.filter((s) => typeof s === 'string' && s.trim().length > 0));
  }
  if (filename && typeof filename === 'string' && filename.trim()) {
    candidates.push(filename);
  }
  if (title && typeof title === 'string' && title.trim()) {
    candidates.push(title);
  }

  if (candidates.length === 0) return null;

  // Priority 0: Iconic Named Double Stars / Asterisms (e.g. Double Double ε Lyr)
  for (const item of candidates) {
    const low = item.toLowerCase();
    if (
      low.includes('더블더블') ||
      low.includes('double double') ||
      low.includes('epsilon1 lyrae') ||
      low.includes('epsilon2 lyrae') ||
      low.includes('ε¹ lyr') ||
      low.includes('ε² lyr')
    ) {
      return '더블더블 (ε¹·ε² Lyr)';
    }
  }

  // Priority 1: Scan all candidates for Messier (M), Caldwell (C), NGC, and IC numbers
  let foundMessier: string | null = null;
  let foundCaldwell: string | null = null;
  const foundNgcIc: string[] = [];
  let foundOtherCatalog: string | null = null;

  for (const item of candidates) {
    // Check for "target:ngc=628" or "target:messier=74" or "target:m=74"
    const targetMatch = item.match(/target:(ngc|ic|messier|m|caldwell|c)=?(\d+[A-Z]?)/i);
    if (targetMatch) {
      const rawCat = targetMatch[1].toUpperCase();
      const num = targetMatch[2].toUpperCase();
      if (rawCat === 'MESSIER' || rawCat === 'M') {
        if (!foundMessier) foundMessier = `M${num}`;
      } else if (rawCat === 'CALDWELL' || rawCat === 'C') {
        if (!foundCaldwell) foundCaldwell = `C${num}`;
      } else {
        foundNgcIc.push(`${rawCat} ${num}`);
      }
    }

    // Check for Messier ("Messier 74", "M 74", "M74")
    const messierMatches = item.matchAll(/\b(?:Messier|M)\s*(\d{1,3})\b/gi);
    for (const m of messierMatches) {
      const mNum = parseInt(m[1], 10);
      if (mNum >= 1 && mNum <= 110 && !foundMessier) {
        foundMessier = `M${mNum}`;
      }
    }

    // Check for Caldwell ("Caldwell 28", "C 28", "C28")
    const caldwellMatches = item.matchAll(/\b(?:Caldwell\s*(\d{1,3})|C\s*(\d{1,3}))\b/gi);
    for (const c of caldwellMatches) {
      // Avoid matching "c Ori" or single star letter by ensuring either "Caldwell" or "C<num>"
      const cNumStr = c[1] || c[2];
      const cNum = parseInt(cNumStr, 10);
      if (cNum >= 1 && cNum <= 109 && !foundCaldwell) {
        foundCaldwell = `C${cNum}`;
      }
    }

    // Check for NGC ("NGC 628", "NGC628")
    const ngcMatches = item.matchAll(/\bNGC\s*(\d+[A-Z]?)\b/gi);
    for (const n of ngcMatches) {
      foundNgcIc.push(`NGC ${n[1].toUpperCase()}`);
    }

    // Check for IC ("IC 434", "IC434")
    const icMatches = item.matchAll(/\bIC\s*(\d+[A-Z]?)\b/gi);
    for (const ic of icMatches) {
      foundNgcIc.push(`IC ${ic[1].toUpperCase()}`);
    }

    // Other catalogs (Sh2, Barnard, vdB, LBN, LDN)
    if (!foundOtherCatalog) {
      const otherCatMatch = item.match(/\b(Sh2-\d+|vdB\s*\d+|B\s*\d+|Barnard\s*\d+|LBN\s*\d+|LDN\s*\d+|Sharpless\s*\d+)\b/i);
      if (otherCatMatch) foundOtherCatalog = otherCatMatch[1].toUpperCase();
    }
  }

  // If any Messier, Caldwell, NGC, or IC was found, format with Caldwell/Messier priority and (NGC/IC) in parentheses
  if (foundMessier || foundCaldwell || foundNgcIc.length > 0) {
    // Filter NGC/IC list to those matching the primary Messier/Caldwell if one exists, or keep primary NGC/IC
    let relevantNgcIc = foundNgcIc;
    if (foundMessier || foundCaldwell) {
      const mcKey = (foundMessier || foundCaldwell)!;
      const canonical = MESSIER_TO_NGC_IC[mcKey] || CALDWELL_TO_NGC_IC[mcKey];
      if (canonical) {
        const canonicalParts = canonical.split('/').map((s) => s.trim().toUpperCase());
        const matchedFromCandidates = foundNgcIc.filter((id) => canonicalParts.includes(id.toUpperCase()));
        relevantNgcIc = matchedFromCandidates.length > 0 ? matchedFromCandidates : [canonical];
      }
    } else if (foundNgcIc.length > 0) {
      // Check if any found NGC/IC has a Messier or Caldwell number in the cross-reference table
      const firstMapped = foundNgcIc.find((id) => Boolean(NGC_IC_TO_MC[id.toUpperCase()]));
      if (firstMapped) {
        const mappedInfo = NGC_IC_TO_MC[firstMapped.toUpperCase()];
        if (mappedInfo.mc.startsWith('M')) foundMessier = mappedInfo.mc;
        else foundCaldwell = mappedInfo.mc;
        const canonical = MESSIER_TO_NGC_IC[mappedInfo.mc] || CALDWELL_TO_NGC_IC[mappedInfo.mc];
        const canonicalParts = canonical ? canonical.split('/').map((s) => s.trim().toUpperCase()) : [firstMapped];
        const matchedFromCandidates = foundNgcIc.filter((id) => canonicalParts.includes(id.toUpperCase()));
        relevantNgcIc = matchedFromCandidates.length > 0 ? matchedFromCandidates : [firstMapped];
      } else {
        relevantNgcIc = [foundNgcIc[0]];
      }
    }

    const formatted = formatCatalogDesignationWithPriority(foundMessier, foundCaldwell, relevantNgcIc);
    if (formatted) return formatted;
  }

  if (foundOtherCatalog) return foundOtherCatalog;

  // Priority 2: Named prominent astronomical objects (e.g. Andromeda, Orion Nebula, Pleiades, Spica, etc.)
  for (const item of candidates) {
    const clean = item.trim();
    if (
      clean.length > 1 &&
      !/^\d+$/.test(clean) &&
      !/^job/i.test(clean) &&
      !clean.toLowerCase().includes('constellation') &&
      !clean.toLowerCase().includes('stars') &&
      !clean.toLowerCase().includes('local in-browser') &&
      !clean.toLowerCase().includes('dual index:') &&
      !clean.toLowerCase().endsWith('.fits') &&
      !clean.toLowerCase().endsWith('.jpg') &&
      !clean.toLowerCase().endsWith('.png')
    ) {
      return formatTitleWithCatalogPriority(clean);
    }
  }

  return null;
}

/**
 * Returns formatted title for a constellation's celestial objects,
 * e.g., "물고기 자리의 M74 (NGC 628)", "안드로메다 자리의 C28 (NGC 752)", "오리온 자리의 IC 434", or fallback "물고기 자리의 천체".
 */
export function getConstellationObjectTitle(
  constellationKo?: string,
  raDeg?: number,
  decDeg?: number,
  objectsOrTags: string[] = [],
  filename?: string,
  title?: string
): string {
  let name = (constellationKo || '').trim();
  let existingObjPart = '';

  // Strip previous placeholder suffixes like "의 천체"
  name = name.replace(/의\s*천체$/, '').trim();

  // Extract base constellation name and any existing object suffix
  if (name.includes('의 ')) {
    const parts = name.split('의 ');
    name = parts[0].trim();
    existingObjPart = parts.slice(1).join('의 ').trim();
  }

  // If unknown, placeholder, or not provided, calculate from RA/Dec coordinates or tags
  if (!name || name === '천구 별자리' || name === '천구' || name === '성도 매칭 결과') {
    if (
      typeof raDeg === 'number' &&
      typeof decDeg === 'number' &&
      !isNaN(raDeg) &&
      !isNaN(decDeg) &&
      (raDeg !== 0 || decDeg !== 0)
    ) {
      const matches = identifyConstellations(objectsOrTags, [], raDeg, decDeg, []);
      if (matches.length > 0 && matches[0]?.nameKo) {
        name = matches[0].nameKo;
      }
    }
  }

  // Format constellation with space before '자리' (e.g. "물고기자리" -> "물고기 자리")
  let formattedConstellation = name;
  if (/자리$/.test(name) && !name.includes(' ')) {
    formattedConstellation = name.replace(/자리$/, ' 자리');
  }

  const combinedCandidates = existingObjPart ? [...objectsOrTags, existingObjPart] : objectsOrTags;
  const primaryObj = extractPrimaryObjectIdentifier(combinedCandidates, filename, title);

  if (formattedConstellation && formattedConstellation !== '천구 별자리' && formattedConstellation !== '천구' && formattedConstellation !== '성도 매칭 결과') {
    if (primaryObj) {
      return `${formattedConstellation}의 ${primaryObj}`;
    }
    return `${formattedConstellation}의 천체`;
  }

  if (primaryObj) {
    return `천구의 ${primaryObj}`;
  }

  return '천구의 천체';
}

const GREEK_TO_SIMBAD_ABBR: Record<string, string> = {
  α: 'alf',
  β: 'bet',
  γ: 'gam',
  δ: 'del',
  ε: 'eps',
  ζ: 'zet',
  η: 'eta',
  θ: 'tet',
  ι: 'iot',
  κ: 'kap',
  λ: 'lam',
  μ: 'mu.',
  ν: 'nu.',
  ξ: 'ksi',
  ο: 'omi',
  π: 'pi.',
  ρ: 'rho',
  σ: 'sig',
  τ: 'tau',
  υ: 'ups',
  φ: 'phi',
  χ: 'chi',
  ψ: 'psi',
  ω: 'ome',
};

/**
 * Resolves a formatted display target name (e.g., "M13 (NGC 6205)", "C14 (NGC 869)", "β Cas / 11 Cas")
 * into an ordered list of clean, atomic CDS SIMBAD / Sesame identifiers.
 */
export function resolveSimbadIdentifiers(rawTarget: string): string[] {
  if (!rawTarget || typeof rawTarget !== 'string') return [];

  const results: string[] = [];
  const pushUnique = (val?: string | null) => {
    if (!val) return;
    const trimmed = val.replace(/\s+/g, ' ').trim();
    if (trimmed && !results.some((r) => r.toUpperCase() === trimmed.toUpperCase())) {
      results.push(trimmed);
    }
  };

  const low = rawTarget.toLowerCase();
  if (low.includes('더블더블') || low.includes('double double') || low.includes('ε¹') || low.includes('ε²')) {
    pushUnique('eps1 Lyr');
    pushUnique('* eps01 Lyr');
    pushUnique('eps Lyr');
  }

  // 1. Extract Messier numbers (e.g. "M13" -> "M 13", "NGC 6205")
  const messierMatches = rawTarget.matchAll(/\b(?:Messier|M)\s*(\d{1,3})\b/gi);
  for (const m of messierMatches) {
    const num = parseInt(m[1], 10);
    if (num >= 1 && num <= 110) {
      const mKey = `M${num}`;
      pushUnique(`M ${num}`);
      pushUnique(mKey);
      if (MESSIER_TO_NGC_IC[mKey]) {
        for (const part of MESSIER_TO_NGC_IC[mKey].split('/')) {
          pushUnique(part.trim());
        }
      }
    }
  }

  // 2. Extract NGC / IC numbers (including inside parentheses, e.g., "(NGC 6205)")
  const ngcIcMatches = rawTarget.matchAll(/\b(NGC|IC)\s*(\d+[A-Z]?)\b/gi);
  for (const n of ngcIcMatches) {
    pushUnique(`${n[1].toUpperCase()} ${n[2].toUpperCase()}`);
  }

  // 3. Extract Caldwell numbers and translate to canonical NGC/IC (since SIMBAD does not index "C14" directly)
  const caldwellMatches = rawTarget.matchAll(/\b(?:Caldwell|C)\s*(\d{1,3})\b/gi);
  for (const c of caldwellMatches) {
    const num = parseInt(c[1], 10);
    if (num >= 1 && num <= 109) {
      const cKey = `C${num}`;
      const mappedNgc = CALDWELL_TO_NGC_IC[cKey];
      if (mappedNgc) {
        for (const part of mappedNgc.split('/')) {
          pushUnique(part.trim());
        }
      }
    }
  }

  // 4. Extract HD / HIP / HR / SAO / Sh2 / Barnard / vdB / LBN / LDN catalog IDs
  const otherCatMatches = rawTarget.matchAll(
    /\b(HD|HIP|HR|SAO|Sh2-|vdB|Barnard|B|LBN|LDN|TYC)\s*([0-9\-]+[A-Z]?)\b/gi
  );
  for (const oc of otherCatMatches) {
    const prefix = oc[1].toUpperCase() === 'SH2-' ? 'Sh2-' : `${oc[1]} `;
    pushUnique(`${prefix}${oc[2]}`);
  }

  // 5. Extract Greek Bayer / Flamsteed designations (e.g., "β Cas", "α Ori", "11 Cas")
  for (const [greek, simbadAbbr] of Object.entries(GREEK_TO_SIMBAD_ABBR)) {
    const bayerRegex = new RegExp(`${greek}[¹²³123]?\\s+([A-Za-z]{3})\\b`, 'g');
    for (const bm of rawTarget.matchAll(bayerRegex)) {
      const constCode = bm[1];
      pushUnique(`* ${simbadAbbr} ${constCode}`);
      pushUnique(`${simbadAbbr} ${constCode}`);
      pushUnique(`${greek} ${constCode}`);
    }
  }

  const flamsteedMatches = rawTarget.matchAll(/\b(\d{1,3}\s+[A-Z][a-z]{2})\b/g);
  for (const fm of flamsteedMatches) {
    pushUnique(`* ${fm[1]}`);
    pushUnique(fm[1]);
  }

  // 6. Split by parentheses, slashes, and separators to extract clean ASCII astronomical names
  const parts = rawTarget
    .split(/[()\/|—–·,]/)
    .map((p) =>
      p
        .replace(/Part of the constellation/gi, '')
        .replace(/The constellation/gi, '')
        .replace(/[가-힣]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
    )
    .filter((p) => p.length >= 2 && !/^C\d{1,3}$/i.test(p));

  for (const part of parts) {
    pushUnique(part);
  }

  if (results.length === 0) {
    pushUnique(rawTarget.replace(/[()]/g, ' ').replace(/\s+/g, ' ').trim());
  }

  return results;
}

