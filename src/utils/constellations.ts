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
    raHours: 18.8,
    decDeg: 36.7,
    raRange: [18.2, 19.5],
    decRange: [25.7, 47.7],
    family: 'Hercules family',
    brightest: 'Vega (α Lyr)',
    asterism: [
      ['α', 'ε'],
      ['ε', 'ζ'],
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
  if (annotations && annotations.length > 0) {
    for (const ann of annotations) {
      if (!ann.names) continue;
      for (const name of ann.names) {
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
  annotations: { names: string[]; pixelx: number; pixely: number }[],
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

  for (const ann of annotations) {
    if (!ann.names || ann.names.length === 0) continue;
    for (const name of ann.names) {
      for (const [constCode] of Object.entries(IAU_CONSTELLATIONS)) {
        if (name.includes(constCode)) {
          const greek = normalizeGreekLetter(name);
          const key = `${constCode}_${greek}`;
          if (!starMap.has(key)) {
            starMap.set(key, { x: ann.pixelx, y: ann.pixely, fullName: name });
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
      const g1 = normalizeGreekLetter(s1);
      const g2 = normalizeGreekLetter(s2);

      const p1 = starMap.get(`${match.code}_${g1}`);
      const p2 = starMap.get(`${match.code}_${g2}`);

      if (p1 && p2) {
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

  return linesResult;
}
