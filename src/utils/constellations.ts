import { ConstellationDefinition, ConstellationMatch } from '../types/astronomy';
import { CONSTELLATION_FIGURES } from '../data/celestialCatalog';
import { skyCoordsToPixel } from './coordinateMath';

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
      ['17', '19'], // Pleiades M45
      ['19', '20'],
      ['20', '21'],
      ['17', '23'],
      ['23', 'η'],
      ['η', '27'],
      ['27', '28'],
      ['20', 'η'],
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
      ['β', 'ω¹'],
      ['ω¹', 'ω²'],
      ['ω²', 'δ'],
      ['β', 'ν'],
      ['δ', 'π'],
      ['π', 'ρ'],
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
      ['λ', 'υ'],
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
    raRange: [16.0, 18.7],
    decRange: [-30.2, 14.3],
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
    raRange: [15.2, 18.9],
    decRange: [-16.1, 25.5],
    family: 'Hercules family',
    brightest: 'Unukalhai (α Ser)',
    asterism: [['α', 'β']],
  },
  // Scutum - 방패자리
  Sct: {
    nameEn: 'Scutum',
    nameKo: '방패자리',
    raHours: 18.7,
    decDeg: -9.8,
    raRange: [18.3, 19.0],
    decRange: [-15.9, -3.8],
    family: 'Hercules family',
    brightest: 'α Sct',
    asterism: [['α', 'β'], ['β', 'γ']],
  },
  // Corona Borealis - 북쪽왕관자리
  CrB: {
    nameEn: 'Corona Borealis',
    nameKo: '북쪽왕관자리',
    raHours: 15.8,
    decDeg: 32.6,
    raRange: [15.3, 16.4],
    decRange: [25.5, 39.8],
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
    raRange: [12.1, 14.1],
    decRange: [27.8, 52.4],
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
    raRange: [11.9, 13.6],
    decRange: [13.3, 33.5],
    family: 'Ursa Major family',
    brightest: 'Diadem (α Com)',
    asterism: [['α', 'β'], ['β', 'γ']],
  },
  // Monoceros - 외뿔소자리
  Mon: {
    nameEn: 'Monoceros',
    nameKo: '외뿔소자리',
    raHours: 6.9,
    decDeg: 2.0,
    raRange: [5.9, 8.1],
    decRange: [-11.0, 11.9],
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
    raRange: [4.9, 6.1],
    decRange: [-27.3, -10.8],
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
    raRange: [23.9, 3.4],
    decRange: [-24.9, 10.5],
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
    raRange: [1.8, 3.5],
    decRange: [10.0, 31.4],
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
    raRange: [7.9, 9.3],
    decRange: [6.5, 33.1],
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
  // Hydra - 바다뱀자리
  Hya: {
    nameEn: 'Hydra',
    nameKo: '바다뱀자리',
    raHours: 10.5,
    decDeg: -14.5,
    raRange: [8.2, 15.0],
    decRange: [-35.7, 6.6],
    family: 'Hercules family',
    brightest: 'Alphard (α Hya)',
    asterism: [['α', 'ι'], ['α', 'γ']],
  },
  // Lynx - 살쾡이자리
  Lyn: {
    nameEn: 'Lynx',
    nameKo: '살쾡이자리',
    raHours: 8.0,
    decDeg: 47.5,
    raRange: [6.3, 9.7],
    decRange: [32.9, 61.9],
    family: 'Ursa Major family',
    brightest: 'α Lyn',
    asterism: [['α', '38']],
  },
  // Leo Minor - 작은사자자리
  LMi: {
    nameEn: 'Leo Minor',
    nameKo: '작은사자자리',
    raHours: 10.2,
    decDeg: 32.0,
    raRange: [9.4, 11.1],
    decRange: [22.8, 41.4],
    family: 'Ursa Major family',
    brightest: 'Praecipua (46 LMi)',
    asterism: [['46', 'β']],
  },
  // Sextans - 육분의자리
  Sex: {
    nameEn: 'Sextans',
    nameKo: '육분의자리',
    raHours: 10.2,
    decDeg: -2.6,
    raRange: [9.7, 10.9],
    decRange: [-11.7, 6.4],
    family: 'Hercules family',
    brightest: 'α Sex',
    asterism: [['α', 'β'], ['α', 'γ']],
  },
  // Crater - 컵자리
  Crt: {
    nameEn: 'Crater',
    nameKo: '컵자리',
    raHours: 11.4,
    decDeg: -15.9,
    raRange: [10.9, 12.0],
    decRange: [-25.2, -6.7],
    family: 'Hercules family',
    brightest: 'δ Crt',
    asterism: [['α', 'β'], ['β', 'γ'], ['γ', 'δ'], ['δ', 'α']],
  },
  // Corvus - 까마귀자리
  Crv: {
    nameEn: 'Corvus',
    nameKo: '까마귀자리',
    raHours: 12.4,
    decDeg: -18.4,
    raRange: [11.9, 12.9],
    decRange: [-25.3, -11.7],
    family: 'Hercules family',
    brightest: 'Gienah (γ Crv)',
    asterism: [['β', 'δ'], ['δ', 'γ'], ['γ', 'ε'], ['ε', 'β']],
  },
  // Sculptor - 조각가자리
  Scl: {
    nameEn: 'Sculptor',
    nameKo: '조각가자리',
    raHours: 0.4,
    decDeg: -32.1,
    raRange: [23.1, 1.8],
    decRange: [-39.6, -24.8],
    family: 'Lacaille',
    brightest: 'α Scl',
    asterism: [['α', 'β'], ['β', 'γ'], ['γ', 'δ']],
  },
  // Fornax - 화로자리
  For: {
    nameEn: 'Fornax',
    nameKo: '화로자리',
    raHours: 2.8,
    decDeg: -31.6,
    raRange: [1.8, 3.8],
    decRange: [-39.5, -23.8],
    family: 'Lacaille',
    brightest: 'Dalim (α For)',
    asterism: [['α', 'β']],
  },
  // Columba - 비둘기자리
  Col: {
    nameEn: 'Columba',
    nameKo: '비둘기자리',
    raHours: 5.8,
    decDeg: -35.1,
    raRange: [5.1, 6.7],
    decRange: [-43.1, -27.1],
    family: 'Heavenly Waters',
    brightest: 'Phact (α Col)',
    asterism: [['α', 'β'], ['β', 'γ']],
  },
  // Horologium - 시계자리
  Hor: {
    nameEn: 'Horologium',
    nameKo: '시계자리',
    raHours: 3.3,
    decDeg: -53.3,
    family: 'Lacaille',
    brightest: 'α Hor',
    asterism: [['α', 'β']],
  },
  // Circinus - 컴퍼스자리
  Cir: {
    nameEn: 'Circinus',
    nameKo: '컴퍼스자리',
    raHours: 14.6,
    decDeg: -63.0,
    family: 'Lacaille',
    brightest: 'α Cir',
    asterism: [['α', 'β'], ['α', 'γ']],
  },
  // Norma - 직각자자리
  Nor: {
    nameEn: 'Norma',
    nameKo: '직각자자리',
    raHours: 16.0,
    decDeg: -51.4,
    family: 'Lacaille',
    brightest: 'γ² Nor',
    asterism: [['γ²', 'ε'], ['ε', 'η']],
  },
  // Ara - 제단자리
  Ara: {
    nameEn: 'Ara',
    nameKo: '제단자리',
    raHours: 17.4,
    decDeg: -56.6,
    family: 'Hercules family',
    brightest: 'β Ara',
    asterism: [['α', 'β'], ['β', 'γ']],
  },
  // Corona Australis - 남쪽왕관자리
  CrA: {
    nameEn: 'Corona Australis',
    nameKo: '남쪽왕관자리',
    raHours: 18.6,
    decDeg: -41.1,
    family: 'Hercules family',
    brightest: 'Meridiana (α CrA)',
    asterism: [['α', 'β'], ['β', 'γ']],
  },
  // Equuleus - 조랑말자리
  Equ: {
    nameEn: 'Equuleus',
    nameKo: '조랑말자리',
    raHours: 21.2,
    decDeg: 7.8,
    family: 'Heavenly Waters',
    brightest: 'Kitalpha (α Equ)',
    asterism: [['α', 'δ'], ['δ', 'γ'], ['γ', 'β'], ['β', 'α']],
  },
  // Lupus - 이리자리
  Lup: {
    nameEn: 'Lupus',
    nameKo: '이리자리',
    raHours: 15.2,
    decDeg: -42.7,
    family: 'Hercules family',
    brightest: 'α Lup',
    asterism: [['α', 'β'], ['β', 'γ']],
  },
  // Pyxis - 나침반자리
  Pyx: {
    nameEn: 'Pyxis',
    nameKo: '나침반자리',
    raHours: 9.0,
    decDeg: -27.4,
    family: 'Heavenly Waters',
    brightest: 'α Pyx',
    asterism: [['α', 'β'], ['α', 'γ']],
  },
  // Antlia - 공기펌프자리
  Ant: {
    nameEn: 'Antlia',
    nameKo: '공기펌프자리',
    raHours: 10.3,
    decDeg: -32.5,
    family: 'Lacaille',
    brightest: 'α Ant',
    asterism: [['α', 'ε'], ['α', 'ι']],
  },
  // Caelum - 조각칼자리
  Cae: {
    nameEn: 'Caelum',
    nameKo: '조각칼자리',
    raHours: 4.7,
    decDeg: -37.9,
    family: 'Lacaille',
    brightest: 'α Cae',
    asterism: [['α', 'β']],
  },
  // Pictor - 화가자리
  Pic: {
    nameEn: 'Pictor',
    nameKo: '화가자리',
    raHours: 5.7,
    decDeg: -53.5,
    family: 'Lacaille',
    brightest: 'α Pic',
    asterism: [['α', 'β'], ['β', 'γ']],
  },
  // Telescopium - 망원경자리
  Tel: {
    nameEn: 'Telescopium',
    nameKo: '망원경자리',
    raHours: 19.3,
    decDeg: -51.0,
    family: 'Lacaille',
    brightest: 'α Tel',
    asterism: [['α', 'ζ']],
  },
  // Microscopium - 현미경자리
  Mic: {
    nameEn: 'Microscopium',
    nameKo: '현미경자리',
    raHours: 21.0,
    decDeg: -36.3,
    family: 'Lacaille',
    brightest: 'γ Mic',
    asterism: [['α', 'γ'], ['γ', 'ε']],
  },
  // Indus - 인디언자리
  Ind: {
    nameEn: 'Indus',
    nameKo: '인디언자리',
    raHours: 21.5,
    decDeg: -59.7,
    family: 'Bayer',
    brightest: 'α Ind',
    asterism: [['α', 'β'], ['β', 'θ']],
  },
  // Reticulum - 그물자리
  Ret: {
    nameEn: 'Reticulum',
    nameKo: '그물자리',
    raHours: 3.9,
    decDeg: -60.0,
    family: 'Lacaille',
    brightest: 'α Ret',
    asterism: [['α', 'β'], ['β', 'δ'], ['δ', 'ε'], ['ε', 'α']],
  },
  // Mensa - 테이블산자리
  Men: {
    nameEn: 'Mensa',
    nameKo: '테이블산자리',
    raHours: 5.4,
    decDeg: -77.5,
    family: 'Lacaille',
    brightest: 'α Men',
    asterism: [['α', 'β'], ['β', 'γ']],
  },
};

// Map Greek letter unicode/spelling to symbol e.g. "α" or "ω¹"
export function normalizeGreekLetter(str: string, keepSuperscript = false): string {
  // 1. Check Greek Unicode symbol first so English words like "Scorpii" never match "pi"
  const greekWithSupRegex = /([\u0370-\u03ff])([¹²³123])?/;
  const match = str.match(greekWithSupRegex);
  if (match) {
    if (keepSuperscript && match[2]) {
      const supMap: Record<string, string> = { '1': '¹', '2': '²', '3': '³', '¹': '¹', '²': '²', '³': '³' };
      return `${match[1]}${supMap[match[2]] || match[2]}`;
    }
    return match[1];
  }

  // 2. Check spelled-out Greek names with strict word boundaries (longest names first)
  const entries: [string, string][] = [
    ['epsilon', 'ε'],
    ['omicron', 'ο'],
    ['upsilon', 'υ'],
    ['lambda', 'λ'],
    ['alpha', 'α'],
    ['gamma', 'γ'],
    ['delta', 'δ'],
    ['theta', 'θ'],
    ['kappa', 'κ'],
    ['sigma', 'σ'],
    ['omega', 'ω'],
    ['beta', 'β'],
    ['zeta', 'ζ'],
    ['iota', 'ι'],
    ['eta', 'η'],
    ['rho', 'ρ'],
    ['tau', 'τ'],
    ['phi', 'φ'],
    ['chi', 'χ'],
    ['psi', 'ψ'],
    ['mu', 'μ'],
    ['nu', 'ν'],
    ['xi', 'ξ'],
    ['pi', 'π'],
  ];
  for (const [key, val] of entries) {
    const regex = new RegExp(`\\b${key}([123¹²³])?\\b`, 'i');
    const m = str.match(regex);
    if (m) {
      if (keepSuperscript && m[1]) {
        const supMap: Record<string, string> = { '1': '¹', '2': '²', '3': '³', '¹': '¹', '²': '²', '³': '³' };
        return `${val}${supMap[m[1]] || m[1]}`;
      }
      return val;
    }
  }
  return str.trim();
}

// Complete official IAU host constellation map for all Messier (M1..M110), Caldwell (C1..C109), and their NGC/IC equivalents
export const DSO_OFFICIAL_CONSTELLATION: Record<string, string> = (() => {
  const base: Record<string, string> = {
    // Messier M1..M110
    M1: 'Tau', 'NGC 1952': 'Tau',
    M2: 'Aqr', 'NGC 7089': 'Aqr',
    M3: 'CVn', 'NGC 5272': 'CVn',
    M4: 'Sco', 'NGC 6121': 'Sco',
    M5: 'Ser', 'NGC 5904': 'Ser',
    M6: 'Sco', 'NGC 6405': 'Sco',
    M7: 'Sco', 'NGC 6475': 'Sco',
    M8: 'Sgr', 'NGC 6523': 'Sgr',
    M9: 'Oph', 'NGC 6333': 'Oph',
    M10: 'Oph', 'NGC 6254': 'Oph',
    M11: 'Sct', 'NGC 6705': 'Sct',
    M12: 'Oph', 'NGC 6218': 'Oph',
    M13: 'Her', 'NGC 6205': 'Her',
    M14: 'Oph', 'NGC 6402': 'Oph',
    M15: 'Peg', 'NGC 7078': 'Peg',
    M16: 'Ser', 'NGC 6611': 'Ser',
    M17: 'Sgr', 'NGC 6618': 'Sgr',
    M18: 'Sgr', 'NGC 6613': 'Sgr',
    M19: 'Oph', 'NGC 6273': 'Oph',
    M20: 'Sgr', 'NGC 6514': 'Sgr',
    M21: 'Sgr', 'NGC 6531': 'Sgr',
    M22: 'Sgr', 'NGC 6656': 'Sgr',
    M23: 'Sgr', 'NGC 6494': 'Sgr',
    M24: 'Sgr', 'IC 4715': 'Sgr',
    M25: 'Sgr', 'IC 4725': 'Sgr',
    M26: 'Sct', 'NGC 6694': 'Sct',
    M27: 'Vul', 'NGC 6853': 'Vul',
    M28: 'Sgr', 'NGC 6626': 'Sgr',
    M29: 'Cyg', 'NGC 6913': 'Cyg',
    M30: 'Cap', 'NGC 7099': 'Cap',
    M31: 'And', 'NGC 224': 'And',
    M32: 'And', 'NGC 221': 'And',
    M33: 'Tri', 'NGC 598': 'Tri',
    M34: 'Per', 'NGC 1039': 'Per',
    M35: 'Gem', 'NGC 2168': 'Gem',
    M36: 'Aur', 'NGC 1960': 'Aur',
    M37: 'Aur', 'NGC 2099': 'Aur',
    M38: 'Aur', 'NGC 1912': 'Aur',
    M39: 'Cyg', 'NGC 7092': 'Cyg',
    M40: 'UMa',
    M41: 'CMa', 'NGC 2287': 'CMa',
    M42: 'Ori', 'NGC 1976': 'Ori',
    M43: 'Ori', 'NGC 1982': 'Ori',
    M44: 'Cnc', 'NGC 2632': 'Cnc',
    M45: 'Tau',
    M46: 'Pup', 'NGC 2437': 'Pup',
    M47: 'Pup', 'NGC 2422': 'Pup',
    M48: 'Hya', 'NGC 2548': 'Hya',
    M49: 'Vir', 'NGC 4472': 'Vir',
    M50: 'Mon', 'NGC 2323': 'Mon',
    M51: 'CVn', 'NGC 5194': 'CVn', 'NGC 5195': 'CVn',
    M52: 'Cas', 'NGC 7654': 'Cas',
    M53: 'Com', 'NGC 5024': 'Com',
    M54: 'Sgr', 'NGC 6715': 'Sgr',
    M55: 'Sgr', 'NGC 6809': 'Sgr',
    M56: 'Lyr', 'NGC 6779': 'Lyr',
    M57: 'Lyr', 'NGC 6720': 'Lyr',
    M58: 'Vir', 'NGC 4579': 'Vir',
    M59: 'Vir', 'NGC 4621': 'Vir',
    M60: 'Vir', 'NGC 4649': 'Vir',
    M61: 'Vir', 'NGC 4303': 'Vir',
    M62: 'Oph', 'NGC 6266': 'Oph',
    M63: 'CVn', 'NGC 5055': 'CVn',
    M64: 'Com', 'NGC 4826': 'Com',
    M65: 'Leo', 'NGC 3623': 'Leo',
    M66: 'Leo', 'NGC 3627': 'Leo', 'NGC 3628': 'Leo',
    M67: 'Cnc', 'NGC 2682': 'Cnc',
    M68: 'Hya', 'NGC 4590': 'Hya',
    M69: 'Sgr', 'NGC 6637': 'Sgr',
    M70: 'Sgr', 'NGC 6681': 'Sgr',
    M71: 'Sge', 'NGC 6838': 'Sge',
    M72: 'Aqr', 'NGC 6981': 'Aqr',
    M73: 'Aqr', 'NGC 6994': 'Aqr',
    M74: 'Psc', 'NGC 628': 'Psc',
    M75: 'Sgr', 'NGC 6864': 'Sgr',
    M76: 'Per', 'NGC 650': 'Per', 'NGC 651': 'Per',
    M77: 'Cet', 'NGC 1068': 'Cet',
    M78: 'Ori', 'NGC 2068': 'Ori',
    M79: 'Lep', 'NGC 1904': 'Lep',
    M80: 'Sco', 'NGC 6093': 'Sco',
    M81: 'UMa', 'NGC 3031': 'UMa',
    M82: 'UMa', 'NGC 3034': 'UMa',
    M83: 'Hya', 'NGC 5236': 'Hya',
    M84: 'Vir', 'NGC 4374': 'Vir',
    M85: 'Com', 'NGC 4382': 'Com',
    M86: 'Vir', 'NGC 4406': 'Vir',
    M87: 'Vir', 'NGC 4486': 'Vir',
    M88: 'Com', 'NGC 4501': 'Com',
    M89: 'Vir', 'NGC 4552': 'Vir',
    M90: 'Vir', 'NGC 4569': 'Vir',
    M91: 'Com', 'NGC 4548': 'Com',
    M92: 'Her', 'NGC 6341': 'Her',
    M93: 'Pup', 'NGC 2447': 'Pup',
    M94: 'CVn', 'NGC 4736': 'CVn',
    M95: 'Leo', 'NGC 3351': 'Leo',
    M96: 'Leo', 'NGC 3368': 'Leo',
    M97: 'UMa', 'NGC 3587': 'UMa',
    M98: 'Com', 'NGC 4192': 'Com',
    M99: 'Com', 'NGC 4254': 'Com',
    M100: 'Com', 'NGC 4321': 'Com',
    M101: 'UMa', 'NGC 5457': 'UMa',
    M102: 'Dra', 'NGC 5866': 'Dra',
    M103: 'Cas', 'NGC 581': 'Cas',
    M104: 'Vir', 'NGC 4594': 'Vir',
    M105: 'Leo', 'NGC 3379': 'Leo',
    M106: 'CVn', 'NGC 4258': 'CVn',
    M107: 'Oph', 'NGC 6171': 'Oph',
    M108: 'UMa', 'NGC 3556': 'UMa',
    M109: 'UMa', 'NGC 3992': 'UMa',
    M110: 'And', 'NGC 205': 'And',
    // Caldwell C1..C109 & Additional Famous NGCs/ICs
    C1: 'Cep', 'NGC 188': 'Cep',
    C2: 'Cep', 'NGC 40': 'Cep',
    C3: 'Dra', 'NGC 4236': 'Dra',
    C4: 'Cep', 'NGC 7023': 'Cep',
    C5: 'Cam', 'IC 342': 'Cam',
    C6: 'Dra', 'NGC 6543': 'Dra',
    C7: 'Cam', 'NGC 2403': 'Cam',
    C8: 'Cas', 'NGC 559': 'Cas',
    C9: 'Cep', 'Sh2-155': 'Cep',
    C10: 'Cas', 'NGC 663': 'Cas',
    C11: 'Cas', 'NGC 7635': 'Cas',
    C12: 'Cep', 'NGC 6946': 'Cep',
    C13: 'Cas', 'NGC 457': 'Cas',
    C14: 'Per', 'NGC 869': 'Per', 'NGC 884': 'Per',
    C15: 'Cyg', 'NGC 6826': 'Cyg',
    C16: 'Lac', 'NGC 7243': 'Lac',
    C17: 'Cas', 'NGC 147': 'Cas',
    C18: 'Cas', 'NGC 185': 'Cas',
    C19: 'Cyg', 'IC 5146': 'Cyg',
    C20: 'Cyg', 'NGC 7000': 'Cyg', 'IC 5070': 'Cyg',
    C21: 'CVn', 'NGC 4449': 'CVn',
    C22: 'And', 'NGC 7662': 'And',
    C23: 'And', 'NGC 891': 'And',
    C24: 'Per', 'NGC 1275': 'Per',
    C25: 'Lyn', 'NGC 2419': 'Lyn',
    C26: 'CVn', 'NGC 4244': 'CVn',
    C27: 'Cyg', 'NGC 6888': 'Cyg',
    C28: 'And', 'NGC 752': 'And',
    C29: 'CVn', 'NGC 5005': 'CVn',
    C30: 'Peg', 'NGC 7331': 'Peg', 'NGC 7318': 'Peg', 'NGC 7320': 'Peg',
    C31: 'Aur', 'IC 405': 'Aur',
    C32: 'CVn', 'NGC 4631': 'CVn',
    C33: 'Cyg', 'NGC 6992': 'Cyg', 'NGC 6995': 'Cyg',
    C34: 'Cyg', 'NGC 6960': 'Cyg',
    C35: 'Com', 'NGC 4889': 'Com',
    C36: 'Com', 'NGC 4559': 'Com',
    C37: 'Vul', 'NGC 6885': 'Vul',
    C38: 'Com', 'NGC 4565': 'Com',
    C39: 'Gem', 'NGC 2392': 'Gem',
    C40: 'Leo', 'NGC 3626': 'Leo',
    C41: 'Tau',
    C42: 'Del', 'NGC 7006': 'Del',
    C43: 'Peg', 'NGC 7814': 'Peg',
    C44: 'Peg', 'NGC 7479': 'Peg',
    C45: 'Boo', 'NGC 5248': 'Boo',
    C46: 'Mon', 'NGC 2261': 'Mon',
    C47: 'Del', 'NGC 6934': 'Del',
    C48: 'Cnc', 'NGC 2775': 'Cnc',
    C49: 'Mon', 'NGC 2237': 'Mon', 'NGC 2238': 'Mon', 'NGC 2246': 'Mon',
    C50: 'Mon', 'NGC 2244': 'Mon', 'NGC 2239': 'Mon',
    C51: 'Cet', 'IC 1613': 'Cet',
    C52: 'Vir', 'NGC 4697': 'Vir',
    C53: 'Sex', 'NGC 3115': 'Sex',
    C54: 'Mon', 'NGC 2506': 'Mon',
    C55: 'Aqr', 'NGC 7009': 'Aqr',
    C56: 'Cet', 'NGC 246': 'Cet',
    C57: 'Sgr', 'NGC 6822': 'Sgr',
    C58: 'CMa', 'NGC 2360': 'CMa',
    C59: 'Hya', 'NGC 3242': 'Hya',
    C60: 'Crv', 'NGC 4038': 'Crv',
    C61: 'Crv', 'NGC 4039': 'Crv',
    C62: 'Cet', 'NGC 247': 'Cet',
    C63: 'Aqr', 'NGC 7293': 'Aqr',
    C64: 'CMa', 'NGC 2362': 'CMa',
    C65: 'Scl', 'NGC 253': 'Scl',
    C66: 'Hya', 'NGC 5694': 'Hya',
    C67: 'For', 'NGC 1097': 'For',
    C68: 'CrA', 'NGC 6729': 'CrA',
    C69: 'Sco', 'NGC 6302': 'Sco',
    C70: 'Scl', 'NGC 300': 'Scl',
    C71: 'Pup', 'NGC 2477': 'Pup',
    C72: 'Scl', 'NGC 55': 'Scl',
    C73: 'Col', 'NGC 1851': 'Col',
    C74: 'Vel', 'NGC 3132': 'Vel',
    C75: 'Sco', 'NGC 6124': 'Sco',
    C76: 'Sco', 'NGC 6231': 'Sco',
    C77: 'Cen', 'NGC 5128': 'Cen',
    C78: 'CrA', 'NGC 6541': 'CrA',
    C79: 'Vel', 'NGC 3201': 'Vel',
    C80: 'Cen', 'NGC 5139': 'Cen',
    C81: 'Ara', 'NGC 6352': 'Ara',
    C82: 'Ara', 'NGC 6193': 'Ara',
    C83: 'Cen', 'NGC 4945': 'Cen',
    C84: 'Cen', 'NGC 5286': 'Cen',
    C85: 'Vel', 'IC 2391': 'Vel',
    C86: 'Ara', 'NGC 6397': 'Ara',
    C87: 'Hor', 'NGC 1261': 'Hor',
    C88: 'Cir', 'NGC 5823': 'Cir',
    C89: 'Nor', 'NGC 6087': 'Nor',
    C90: 'Car', 'NGC 2867': 'Car',
    C91: 'Car', 'NGC 3532': 'Car',
    C92: 'Car', 'NGC 3372': 'Car',
    C93: 'Pav', 'NGC 6752': 'Pav',
    C94: 'Cru', 'NGC 4755': 'Cru',
    C95: 'Tri', 'NGC 6025': 'TrA',
    C96: 'Car', 'NGC 2516': 'Car',
    C97: 'Cen', 'NGC 3766': 'Cen',
    C98: 'Cru', 'NGC 4609': 'Cru',
    C99: 'Cru',
    C100: 'Cen', 'IC 2944': 'Cen',
    C101: 'Pav', 'NGC 6744': 'Pav',
    C102: 'Car', 'IC 2602': 'Car',
    C103: 'Dor', 'NGC 2070': 'Dor',
    C104: 'Tuc', 'NGC 362': 'Tuc',
    C105: 'Mus', 'NGC 4833': 'Mus',
    C106: 'Tuc', 'NGC 104': 'Tuc',
    C107: 'Aps', 'NGC 6101': 'Aps',
    C108: 'Mus', 'NGC 4372': 'Mus',
    C109: 'Cha', 'NGC 3195': 'Cha',
    // Additional Famous Deep-Sky Objects
    'IC 1805': 'Cas', 'IC 1848': 'Cas', 'NGC 281': 'Cas',
    'IC 434': 'Ori', 'NGC 2024': 'Ori', 'NGC 1499': 'Per',
    'IC 1396': 'Cep', 'NGC 7380': 'Cep', 'NGC 2264': 'Mon',
  };
  return base;
})();

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
    // Boost official IAU host constellation for known Messier / Caldwell / NGC / IC objects
    for (const [dsoKey, dsoConst] of Object.entries(DSO_OFFICIAL_CONSTELLATION)) {
      const compactText = text.toUpperCase().replace(/\s+/g, '');
      const compactKey = dsoKey.replace(/\s+/g, '');
      const regex = new RegExp(`(?:^|[^A-Z0-9])${compactKey}(?:$|[^0-9])`, 'i');
      if (regex.test(compactText) && IAU_CONSTELLATIONS[dsoConst]) {
        detectedCodes.set(dsoConst, (detectedCodes.get(dsoConst) || 0) + 2200);
      }
    }

    // Explicit constellation tag e.g. "The constellation Cepheus (Cep)"
    const constMatch = text.match(/constellation\s+([A-Za-z\s]+)\s*\(([A-Za-z]{3})\)/i);
    if (constMatch) {
      const code = constMatch[2];
      if (IAU_CONSTELLATIONS[code]) {
        detectedCodes.set(code, (detectedCodes.get(code) || 0) + 1800);
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

// Helper to test if two 2D line segments (A-B) and (C-D) strictly intersect
function segmentsStrictlyIntersect(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  cx: number,
  cy: number,
  dx: number,
  dy: number
): boolean {
  const ccw = (p1x: number, p1y: number, p2x: number, p2y: number, p3x: number, p3y: number) =>
    (p3y - p1y) * (p2x - p1x) - (p2y - p1y) * (p3x - p1x);
  const d1 = ccw(cx, cy, dx, dy, ax, ay);
  const d2 = ccw(cx, cy, dx, dy, bx, by);
  const d3 = ccw(ax, ay, bx, by, cx, cy);
  const d4 = ccw(ax, ay, bx, by, dx, dy);
  return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
}

// Clip a 2D line segment (x1, y1)-(x2, y2) to rectangle [0, width] x [0, height] using Liang-Barsky
function clipLineSegmentToRect(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  width: number,
  height: number
): { x1: number; y1: number; x2: number; y2: number } | null {
  const dx = x2 - x1;
  const dy = y2 - y1;
  let u1 = 0;
  let u2 = 1;

  const p = [-dx, dx, -dy, dy];
  const q = [x1, width - x1, y1, height - y1];

  for (let i = 0; i < 4; i++) {
    if (p[i] === 0) {
      if (q[i] < 0) return null;
    } else {
      const t = q[i] / p[i];
      if (p[i] < 0) {
        if (t > u2) return null;
        if (t > u1) u1 = t;
      } else {
        if (t < u1) return null;
        if (t < u2) u2 = t;
      }
    }
  }

  return {
    x1: x1 + u1 * dx,
    y1: y1 + u1 * dy,
    x2: x1 + u2 * dx,
    y2: y1 + u2 * dy,
  };
}

// Generate official IAU constellation stick figure lines strictly where real constellation lines exist
export function getConstellationLinesForImage(
  annotations: { names: string[]; pixelx: number; pixely: number; type?: string; vmag?: number }[],
  constellations: ConstellationMatch[],
  calibration?: {
    ra: number;
    dec: number;
    radius: number;
    pixscale: number;
    orientation: number;
    parity?: number;
  },
  imageWidth?: number,
  imageHeight?: number
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

  const addLineUnique = (line: {
    constellation: string;
    nameKo: string;
    fromStar: string;
    toStar: string;
    x1: number;
    y1: number;
    x2: number;
    y2: number;
  }) => {
    if (Math.hypot(line.x1 - line.x2, line.y1 - line.y2) < 4) return;
    const exists = linesResult.some(
      (l) =>
        (Math.hypot(l.x1 - line.x1, l.y1 - line.y1) < 6 &&
          Math.hypot(l.x2 - line.x2, l.y2 - line.y2) < 6) ||
        (Math.hypot(l.x1 - line.x2, l.y1 - line.y2) < 6 &&
          Math.hypot(l.x2 - line.x1, l.y2 - line.y1) < 6)
    );
    if (!exists) {
      linesResult.push(line);
    }
  };

  // Index stars by constellation and greek/bayer/flamsteed designation e.g. "Sco_ω¹", "Sco_ω", "Tau_17"
  const starMap = new Map<string, { x: number; y: number; fullName: string }>();

  const safeAnnotations = Array.isArray(annotations) ? annotations : [];
  for (const ann of safeAnnotations) {
    if (!ann || !Array.isArray(ann.names) || ann.names.length === 0) continue;
    const primaryName = ann.names[0];
    for (const name of ann.names) {
      if (typeof name !== 'string') continue;
      if (name.includes('ε¹ Lyr') || name.toLowerCase().includes('epsilon1 lyr') || name.includes('4 Lyr')) {
        starMap.set('Lyr_ε¹', { x: ann.pixelx, y: ann.pixely, fullName: primaryName });
        starMap.set('Lyr_ε', { x: ann.pixelx, y: ann.pixely, fullName: primaryName });
      }
      if (name.includes('ε² Lyr') || name.toLowerCase().includes('epsilon2 lyr') || name.includes('5 Lyr')) {
        starMap.set('Lyr_ε²', { x: ann.pixelx, y: ann.pixely, fullName: primaryName });
      }
      if (name.includes('ω¹ Sco') || name.toLowerCase().includes('omega1 sco') || name.includes('9 Sco')) {
        starMap.set('Sco_ω¹', { x: ann.pixelx, y: ann.pixely, fullName: primaryName });
        starMap.set('Sco_ω', { x: ann.pixelx, y: ann.pixely, fullName: primaryName });
      }
      if (name.includes('ω² Sco') || name.toLowerCase().includes('omega2 sco') || name.includes('10 Sco')) {
        starMap.set('Sco_ω²', { x: ann.pixelx, y: ann.pixely, fullName: primaryName });
      }
      for (const [constCode, constInfo] of Object.entries(IAU_CONSTELLATIONS)) {
        const codeRegex = new RegExp(`\\b${constCode}\\b`, 'i');
        const genMatch =
          constInfo.genitive && name.toLowerCase().includes(constInfo.genitive.toLowerCase());
        const nameEnMatch = name.toLowerCase().includes(constInfo.nameEn.toLowerCase());
        if (codeRegex.test(name) || genMatch || nameEnMatch) {
          const greekSup = normalizeGreekLetter(name, true);
          const greekBase = normalizeGreekLetter(name, false);
          if (greekSup && greekSup !== name.trim()) {
            const keySup = `${constCode}_${greekSup}`;
            if (!starMap.has(keySup)) {
              starMap.set(keySup, { x: ann.pixelx, y: ann.pixely, fullName: primaryName });
            }
          }
          if (greekBase && greekBase !== name.trim()) {
            const keyBase = `${constCode}_${greekBase}`;
            if (!starMap.has(keyBase)) {
              starMap.set(keyBase, { x: ann.pixelx, y: ann.pixely, fullName: primaryName });
            }
          }
          const flamMatch = name.match(new RegExp(`\\b(\\d{1,3})\\s+${constCode}\\b`, 'i'));
          if (flamMatch) {
            const keyFlam = `${constCode}_${flamMatch[1]}`;
            if (!starMap.has(keyFlam)) {
              starMap.set(keyFlam, { x: ann.pixelx, y: ann.pixely, fullName: primaryName });
            }
          }
        }
      }
    }
  }

  // 1. Connect stars based on the official IAU constellation stick figure (asterism)
  const safeConstellations = Array.isArray(constellations) ? constellations : [];
  for (const match of safeConstellations) {
    const info = IAU_CONSTELLATIONS[match.code];
    if (!info || !info.asterism) continue;

    for (const [s1, s2] of info.asterism) {
      const g1Sup = normalizeGreekLetter(s1, true);
      const g1Base = normalizeGreekLetter(s1, false);
      const g2Sup = normalizeGreekLetter(s2, true);
      const g2Base = normalizeGreekLetter(s2, false);

      const p1 = starMap.get(`${match.code}_${g1Sup}`) || starMap.get(`${match.code}_${g1Base}`);
      const p2 = starMap.get(`${match.code}_${g2Sup}`) || starMap.get(`${match.code}_${g2Base}`);

      if (p1 && p2 && (p1.x !== p2.x || p1.y !== p2.y)) {
        addLineUnique({
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

  // Filter star annotations in frame for snapping official CONSTELLATION_FIGURES vertices
  const starAnnotations = safeAnnotations.filter((ann) => {
    if (!ann || typeof ann.pixelx !== 'number' || typeof ann.pixely !== 'number') return false;
    const t = (ann.type || '').toLowerCase();
    const first = (ann.names?.[0] || '').toLowerCase();
    if (
      t === 'ngc' ||
      t === 'ic' ||
      t === 'messier' ||
      t === 'dso' ||
      first.startsWith('m ') ||
      first.startsWith('m3') ||
      first.startsWith('ngc') ||
      first.startsWith('ic ')
    ) {
      return false;
    }
    return true;
  });

  // 2. Project official CONSTELLATION_FIGURES via WCS calibration when official constellation lines exist in the field
  if (
    calibration &&
    calibration.pixscale > 0 &&
    imageWidth &&
    imageWidth > 0 &&
    imageHeight &&
    imageHeight > 0
  ) {
    const snapRadius = Math.max(18, Math.min(45, Math.hypot(imageWidth, imageHeight) * 0.025));
    const marginX = imageWidth * 0.1;
    const marginY = imageHeight * 0.1;
    const isWideOrMediumField = (calibration.radius || 0) >= 2.5;

    for (const fig of CONSTELLATION_FIGURES) {
      for (const [ra1, dec1, ra2, dec2] of fig.lines) {
        const pt1 = skyCoordsToPixel(
          ra1,
          dec1,
          imageWidth,
          imageHeight,
          calibration.ra,
          calibration.dec,
          calibration.pixscale,
          calibration.orientation,
          calibration.parity ?? 1
        );
        const pt2 = skyCoordsToPixel(
          ra2,
          dec2,
          imageWidth,
          imageHeight,
          calibration.ra,
          calibration.dec,
          calibration.pixscale,
          calibration.orientation,
          calibration.parity ?? 1
        );
        if (!pt1 || !pt2) continue;

        const p1Inside =
          pt1.x >= -marginX &&
          pt1.x <= imageWidth + marginX &&
          pt1.y >= -marginY &&
          pt1.y <= imageHeight + marginY;
        const p2Inside =
          pt2.x >= -marginX &&
          pt2.x <= imageWidth + marginX &&
          pt2.y >= -marginY &&
          pt2.y <= imageHeight + marginY;

        // Only draw official constellation line if both vertices are in/near the frame,
        // or in wide/medium fields (>= 2.5° radius) if at least one constellation vertex star is inside the frame
        // and the segment clips cleanly into the image bounds.
        if (p1Inside && p2Inside) {
          let x1 = pt1.x;
          let y1 = pt1.y;
          let x2 = pt2.x;
          let y2 = pt2.y;
          let fromName = `${fig.nameKo} 기준성`;
          let toName = `${fig.nameKo} 기준성`;

          let bestD1 = snapRadius;
          let bestD2 = snapRadius;
          for (const sa of starAnnotations) {
            const d1 = Math.hypot(sa.pixelx - pt1.x, sa.pixely - pt1.y);
            if (d1 < bestD1) {
              bestD1 = d1;
              x1 = sa.pixelx;
              y1 = sa.pixely;
              fromName = sa.names?.[0] || fromName;
            }
            const d2 = Math.hypot(sa.pixelx - pt2.x, sa.pixely - pt2.y);
            if (d2 < bestD2) {
              bestD2 = d2;
              x2 = sa.pixelx;
              y2 = sa.pixely;
              toName = sa.names?.[0] || toName;
            }
          }

          const clipped = clipLineSegmentToRect(x1, y1, x2, y2, imageWidth, imageHeight);
          if (clipped && Math.hypot(clipped.x2 - clipped.x1, clipped.y2 - clipped.y1) >= 12) {
            addLineUnique({
              constellation: fig.code,
              nameKo: fig.nameKo,
              fromStar: fromName,
              toStar: toName,
              x1: Number(clipped.x1.toFixed(1)),
              y1: Number(clipped.y1.toFixed(1)),
              x2: Number(clipped.x2.toFixed(1)),
              y2: Number(clipped.y2.toFixed(1)),
            });
          }
        } else if (isWideOrMediumField && (p1Inside || p2Inside)) {
          let x1 = pt1.x;
          let y1 = pt1.y;
          let x2 = pt2.x;
          let y2 = pt2.y;
          let fromName = `${fig.nameKo} 기준성`;
          let toName = `${fig.nameKo} 기준성`;

          let bestD1 = snapRadius;
          let bestD2 = snapRadius;
          for (const sa of starAnnotations) {
            if (p1Inside) {
              const d1 = Math.hypot(sa.pixelx - pt1.x, sa.pixely - pt1.y);
              if (d1 < bestD1) {
                bestD1 = d1;
                x1 = sa.pixelx;
                y1 = sa.pixely;
                fromName = sa.names?.[0] || fromName;
              }
            }
            if (p2Inside) {
              const d2 = Math.hypot(sa.pixelx - pt2.x, sa.pixely - pt2.y);
              if (d2 < bestD2) {
                bestD2 = d2;
                x2 = sa.pixelx;
                y2 = sa.pixely;
                toName = sa.names?.[0] || toName;
              }
            }
          }

          const clipped = clipLineSegmentToRect(x1, y1, x2, y2, imageWidth, imageHeight);
          if (clipped && Math.hypot(clipped.x2 - clipped.x1, clipped.y2 - clipped.y1) >= 24) {
            addLineUnique({
              constellation: fig.code,
              nameKo: fig.nameKo,
              fromStar: fromName,
              toStar: toName,
              x1: Number(clipped.x1.toFixed(1)),
              y1: Number(clipped.y1.toFixed(1)),
              x2: Number(clipped.x2.toFixed(1)),
              y2: Number(clipped.y2.toFixed(1)),
            });
          }
        }
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
  M21: 'NGC 6531', M22: 'NGC 6656', M23: 'NGC 6494', M24: 'IC 4715', M25: 'IC 4725',
  M26: 'NGC 6694', M27: 'NGC 6853', M28: 'NGC 6626', M29: 'NGC 6913', M30: 'NGC 7099',
  M31: 'NGC 224', M32: 'NGC 221', M33: 'NGC 598', M34: 'NGC 1039', M35: 'NGC 2168',
  M36: 'NGC 1960', M37: 'NGC 2099', M38: 'NGC 1912', M39: 'NGC 7092', M41: 'NGC 2287',
  M42: 'NGC 1976', M43: 'NGC 1982', M44: 'NGC 2632', M46: 'NGC 2437', M47: 'NGC 2422',
  M48: 'NGC 2548', M49: 'NGC 4472', M50: 'NGC 2323', M51: 'NGC 5194', M52: 'NGC 7654',
  M53: 'NGC 5024', M54: 'NGC 6715', M55: 'NGC 6809', M56: 'NGC 6779', M57: 'NGC 6720',
  M58: 'NGC 4579', M59: 'NGC 4621', M60: 'NGC 4649', M61: 'NGC 4303', M62: 'NGC 6266',
  M63: 'NGC 5055', M64: 'NGC 4826', M65: 'NGC 3623', M66: 'NGC 3627', M67: 'NGC 2682',
  M68: 'NGC 4590', M69: 'NGC 6637', M70: 'NGC 6681', M71: 'NGC 6838', M72: 'NGC 6981',
  M73: 'NGC 6994', M74: 'NGC 628', M75: 'NGC 6864', M76: 'NGC 650', M77: 'NGC 1068',
  M78: 'NGC 2068', M79: 'NGC 1904', M80: 'NGC 6093', M81: 'NGC 3031', M82: 'NGC 3034',
  M83: 'NGC 5236', M84: 'NGC 4374', M85: 'NGC 4382', M86: 'NGC 4406', M87: 'NGC 4486',
  M88: 'NGC 4501', M89: 'NGC 4552', M90: 'NGC 4569', M91: 'NGC 4548', M92: 'NGC 6341',
  M93: 'NGC 2447', M94: 'NGC 4736', M95: 'NGC 3351', M96: 'NGC 3368', M97: 'NGC 3587',
  M98: 'NGC 4192', M99: 'NGC 4254', M100: 'NGC 4321', M101: 'NGC 5457', M102: 'NGC 5866',
  M103: 'NGC 581', M104: 'NGC 4594', M105: 'NGC 3379', M106: 'NGC 4258', M107: 'NGC 6171',
  M108: 'NGC 3556', M109: 'NGC 3992', M110: 'NGC 205',
};

// Complete Caldwell (C1..C109) <-> NGC/IC cross-reference map
export const CALDWELL_TO_NGC_IC: Record<string, string> = {
  C1: 'NGC 188', C2: 'NGC 40', C3: 'NGC 4236', C4: 'NGC 7023', C5: 'IC 342',
  C6: 'NGC 6543', C7: 'NGC 2403', C8: 'NGC 559', C9: 'Sh2-155', C10: 'NGC 663',
  C11: 'NGC 7635', C12: 'NGC 6946', C13: 'NGC 457', C14: 'NGC 869', C15: 'NGC 6826',
  C16: 'NGC 7243', C17: 'NGC 147', C18: 'NGC 185', C19: 'IC 5146', C20: 'NGC 7000',
  C21: 'NGC 4449', C22: 'NGC 7662', C23: 'NGC 891', C24: 'NGC 1275', C25: 'NGC 2419',
  C26: 'NGC 4244', C27: 'NGC 6888', C28: 'NGC 752', C29: 'NGC 5005', C30: 'NGC 7331',
  C31: 'IC 405', C32: 'NGC 4631', C33: 'NGC 6992', C34: 'NGC 6960', C35: 'NGC 4889',
  C36: 'NGC 4559', C37: 'NGC 6885', C38: 'NGC 4565', C39: 'NGC 2392', C40: 'NGC 3626',
  C42: 'NGC 7006', C43: 'NGC 7814', C44: 'NGC 7479', C45: 'NGC 5248', C46: 'NGC 2261',
  C47: 'NGC 6934', C48: 'NGC 2775', C49: 'NGC 2237', C50: 'NGC 2244', C51: 'IC 1613',
  C52: 'NGC 4697', C53: 'NGC 3115', C54: 'NGC 2506', C55: 'NGC 7009', C56: 'NGC 246',
  C57: 'NGC 6822', C58: 'NGC 2360', C59: 'NGC 3242', C60: 'NGC 4038', C61: 'NGC 4039',
  C62: 'NGC 247', C63: 'NGC 7293', C64: 'NGC 2362', C65: 'NGC 253', C66: 'NGC 5694',
  C67: 'NGC 1097', C68: 'NGC 6729', C69: 'NGC 6302', C70: 'NGC 300', C71: 'NGC 2477',
  C72: 'NGC 55', C73: 'NGC 1851', C74: 'NGC 3132', C75: 'NGC 6124', C76: 'NGC 6231',
  C77: 'NGC 5128', C78: 'NGC 6541', C79: 'NGC 3201', C80: 'NGC 5139', C81: 'NGC 6352',
  C82: 'NGC 6193', C83: 'NGC 4945', C84: 'NGC 5286', C85: 'IC 2391', C86: 'NGC 6397',
  C87: 'NGC 1261', C88: 'NGC 5823', C89: 'NGC 6087', C90: 'NGC 2867', C91: 'NGC 3532',
  C92: 'NGC 3372', C93: 'NGC 6752', C94: 'NGC 4755', C95: 'NGC 6025', C96: 'NGC 2516',
  C97: 'NGC 3766', C98: 'NGC 4609', C100: 'IC 2944', C101: 'NGC 6744', C102: 'IC 2602',
  C103: 'NGC 2070', C104: 'NGC 362', C105: 'NGC 4833', C106: 'NGC 104', C107: 'NGC 6101',
  C108: 'NGC 4372', C109: 'NGC 3195',
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
  // Additional multi-NGC aliases for C14 (NGC 869 / NGC 884), C33 (NGC 6992 / NGC 6995), C50 (NGC 2244 / NGC 2239), C49 (NGC 2237 / NGC 2238 / NGC 2246), and M76 (NGC 650 / NGC 651)
  map['NGC 884'] = { mc: 'C14', ngcIc: 'NGC 869' };
  map['NGC 6995'] = { mc: 'C33', ngcIc: 'NGC 6992' };
  map['NGC 2239'] = { mc: 'C50', ngcIc: 'NGC 2244' };
  map['NGC 2238'] = { mc: 'C49', ngcIc: 'NGC 2237' };
  map['NGC 2246'] = { mc: 'C49', ngcIc: 'NGC 2237' };
  map['NGC 651'] = { mc: 'M76', ngcIc: 'NGC 650' };
  return map;
})();

/**
 * Formats an object designation so that if a Caldwell (C) or Messier (M) number exists,
 * the Caldwell or Messier number is shown first and its single canonical NGC/IC is placed inside parentheses (...).
 * If no Caldwell or Messier number exists, returns the single representative designation as-is.
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
  const safeNgcIcList = Array.isArray(ngcIcList)
    ? ngcIcList.filter((s): s is string => typeof s === 'string')
    : [];

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

  // 3. If we have a Messier or Caldwell number, pair it with its single canonical NGC/IC (if any exists)
  if (primaryMC) {
    const canonicalRaw = MESSIER_TO_NGC_IC[primaryMC] || CALDWELL_TO_NGC_IC[primaryMC];
    if (canonicalRaw) {
      const singleCanonical = canonicalRaw.split('/')[0].trim();
      return `${primaryMC} (${singleCanonical})`;
    }
    // Note: M40, M45, etc. do not have an NGC/IC designation
    return primaryMC;
  }

  // 4. No Messier or Caldwell number exists -> return single primary NGC/IC as-is
  if (uniqueNgcIc.length > 0) {
    return uniqueNgcIc[0];
  }

  return null;
}

/**
 * Normalizes any title string so that:
 * 1. Duplicate/nested titles or trailing redundant parentheticals are removed.
 * 2. Only ONE representative celestial target is kept (multi-object lists like "M81 · M82 (NGC 3031 / NGC 3034)" become "M81 (NGC 3031)").
 * 3. Caldwell/Messier appears first with its single NGC/IC inside parentheses (...).
 */
export function formatTitleWithCatalogPriority(
  rawTitle: string,
  objectsOrTags: string[] = []
): string {
  if (!rawTitle || typeof rawTitle !== 'string') return rawTitle || '';
  let result = rawTitle.trim();

  // Strip trailing filename parentheticals like "(stacked.jpg)" or "(local_astrophoto.jpg)"
  result = result.replace(/\s*\([^()]+\.(?:jpg|jpeg|png|fit|fits|tif|tiff|webp)\)\s*\)*$/i, '').trim();
  result = result.replace(/\s*\(로컬\s*솔빙\)\s*$/i, '').trim();

  // Case 0: Deduplicate nested or repeated titles when re-analyzing
  let prevResult = '';
  while (prevResult !== result) {
    prevResult = result;
    for (let splitIdx = 3; splitIdx < result.length - 4; splitIdx++) {
      if (result.slice(splitIdx, splitIdx + 2) === ' (') {
        const prefix = result.slice(0, splitIdx).trim();
        const rest = result.slice(splitIdx + 2);
        if (prefix.length >= 3 && rest.startsWith(prefix) && rest.endsWith(')')) {
          result = prefix;
          break;
        }
        // Also strip trailing parenthetical if it contains "... 자리의 ..." (a full constellation title wrapped inside parentheses)
        if (rest.endsWith(')') && /자리의\s+/.test(rest)) {
          result = prefix;
          break;
        }
      }
    }
  }

  // Fix repeated constellation prefix like "전갈 자리의 전갈자리 ..." or "안드로메다자리 안드로메다 은하"
  result = result.replace(/^([가-힣]+)\s*자리의\s+\1\s*자리\s*/u, '$1 자리의 ');
  result = result.replace(/^([가-힣]+)자리\s+\1\s*은하/u, '$1자리 은하');

  // Collapse multi-Messier / multi-Caldwell dot or slash lists: "M81 · M82" -> "M81", "M65 · M66" -> "M66"
  result = result.replace(/\b((?:M|C)\s*\d{1,3})\s*[·\/&]\s*(?:M|C)\s*\d{1,3}\b/gi, '$1');

  // Collapse multi-NGC/IC inside parentheses: "(NGC 598 & NGC 604)" -> "(NGC 598)", "(NGC 869 / NGC 884)" -> "(NGC 869)"
  result = result.replace(
    /\(\s*((?:NGC|IC)\s*\d+[A-Z]?)\s*(?:\/|&|·|,)\s*[^()]+\)/gi,
    '($1)'
  );

  // Collapse multi-HD inside parentheses: "(HD 716 & HD 1050)" -> "(HD 716)"
  result = result.replace(
    /\(\s*(HD\s*\d+[A-Z]?)\s*(?:\/|&|·|,)\s*[^()]+\)/gi,
    '($1)'
  );

  // Strip secondary "& <object>" outside parentheses: "C28 산개성단 (NGC 752) & 56 And" -> "C28 산개성단 (NGC 752)"
  result = result.replace(/\)\s*&\s*[^()]+$/g, ')').trim();

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

  // Case 3: If string contains a standalone M or C number without its NGC/IC in parentheses, add (NGC/IC) if known
  if (!/\(\s*(?:NGC|IC)\s*\d+/i.test(result)) {
    let addedCanonical = false;
    result = result.replace(/\b(M|C)\s*(\d{1,3})\b/g, (fullMatch, mcPrefix, mcNum) => {
      if (addedCanonical) return fullMatch;
      const key = `${mcPrefix.toUpperCase()}${mcNum}`;
      const canonicalRaw = MESSIER_TO_NGC_IC[key] || CALDWELL_TO_NGC_IC[key];
      if (canonicalRaw) {
        const canonical = canonicalRaw.split('/')[0].trim();
        if (!result.toUpperCase().includes(canonical.toUpperCase())) {
          addedCanonical = true;
          return `${key} (${canonical})`;
        }
      }
      return fullMatch;
    });
  }

  // Case 4: If string contains NGC/IC without M/C in the string, check if it maps to a known M/C
  if (!/\b(?:M|C|Messier|Caldwell)\s*\d+\b/i.test(result)) {
    let replacedMc = false;
    result = result.replace(/\b(NGC|IC)\s*(\d+[A-Z]?)\b/gi, (fullMatch, cat, num) => {
      if (replacedMc) return fullMatch;
      const key = `${cat.toUpperCase()} ${num.toUpperCase()}`;
      const mapped = NGC_IC_TO_MC[key];
      if (mapped) {
        replacedMc = true;
        return `${mapped.mc} (${mapped.ngcIc})`;
      }
      return fullMatch;
    });
  }

  // Collapse identical adjacent parentheticals: "(NGC 752) (NGC 752)" or "(α Vir) (α Vir)" -> "(NGC 752)"
  result = result.replace(/(\([^()]+\))\s*\1+/gi, '$1');

  // If there is a primary "(NGC xxx)" or "(IC xxx)" and another trailing "(...)" that repeats the catalog ID, drop the trailing one
  const dualParenMatch = result.match(/^(.*?\(\s*(?:NGC|IC|α|β|γ|δ|ε|ζ|η|θ|ι|κ|λ|μ|ν|ξ|ο|π|ρ|σ|τ|υ|φ|χ|ψ|ω|HD)[^()]+\))\s*\(([^()]+)\)$/i);
  if (dualParenMatch) {
    result = dualParenMatch[1].trim();
  }

  // Case 5: If result still has no catalog designation at all, check if objectsOrTags provides one when result ends with "의 천체"
  if (result.endsWith('의 천체') && Array.isArray(objectsOrTags) && objectsOrTags.length > 0) {
    const extracted = extractPrimaryObjectIdentifier(objectsOrTags);
    if (extracted) {
      result = result.replace(/의\s*천체$/, `의 ${extracted}`);
    }
  }

  return result.trim();
}

// Faint background NGC galaxies that appear inside prominent named-star telescopic fields
const FAINT_BACKGROUND_GALAXIES_IN_STAR_FIELDS = new Set(['NGC 5122', 'NGC 6695']);

/**
 * Extracts the single most representative celestial object identifier.
 * Rule:
 * - Always returns ONE representative celestial target (never multiple targets joined by / or &).
 * - If a Caldwell (C) or Messier (M) number exists, show it first and put its single NGC or IC inside ().
 * - If no Caldwell or Messier number exists, show the single primary NGC/IC or star name as-is.
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

  // Priority 0: Iconic Named Double Stars / Showpiece 1st-Mag Stars when they are the primary field subject
  for (const item of candidates) {
    const low = item.toLowerCase();
    if (
      low.includes('더블더블') ||
      low.includes('double double') ||
      low.includes('epsilon1 lyrae') ||
      low.includes('epsilon2 lyrae') ||
      low.includes('ε¹ lyr') ||
      low.includes('ε² lyr') ||
      low.includes('ε1 lyr')
    ) {
      return '더블더블 (ε¹ Lyr)';
    }
    if (low.includes('스피카') || /\bspica\b/i.test(item) || low.includes('α vir')) {
      return '스피카 (α Vir)';
    }
    if (low.includes('폴룩스') || /\bpollux\b/i.test(item) || low.includes('β gem')) {
      return '폴룩스 (β Gem)';
    }
    if (low.includes('알비레오') || /\balbireo\b/i.test(item) || low.includes('β¹ cyg') || low.includes('β1 cyg')) {
      return '알비레오 (β¹ Cyg)';
    }
    if (
      low.includes('가넷 스타') ||
      low.includes('가넷스타') ||
      low.includes('석류석 별') ||
      low.includes('석류석별') ||
      /\bgarnet star\b/i.test(item) ||
      low.includes('μ cep')
    ) {
      return '가넷 스타 (μ Cep)';
    }
    if (low.includes('아키르드') || /\bachird\b/i.test(item) || low.includes('η cas')) {
      return '아키르드 (η Cas)';
    }
    if (low.includes('jabhat') || low.includes('ω¹ sco') || low.includes('omega1 scorpii')) {
      return 'ω¹ Sco';
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
        const desig = `${rawCat} ${num}`;
        if (!FAINT_BACKGROUND_GALAXIES_IN_STAR_FIELDS.has(desig)) {
          foundNgcIc.push(desig);
        }
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
      const cNumStr = c[1] || c[2];
      const cNum = parseInt(cNumStr, 10);
      if (cNum >= 1 && cNum <= 109 && !foundCaldwell) {
        foundCaldwell = `C${cNum}`;
      }
    }

    // Check for NGC ("NGC 628", "NGC628")
    const ngcMatches = item.matchAll(/\bNGC\s*(\d+[A-Z]?)\b/gi);
    for (const n of ngcMatches) {
      const desig = `NGC ${n[1].toUpperCase()}`;
      if (!FAINT_BACKGROUND_GALAXIES_IN_STAR_FIELDS.has(desig)) {
        foundNgcIc.push(desig);
      }
    }

    // Check for IC ("IC 434", "IC434")
    const icMatches = item.matchAll(/\bIC\s*(\d+[A-Z]?)\b/gi);
    for (const ic of icMatches) {
      foundNgcIc.push(`IC ${ic[1].toUpperCase()}`);
    }

    // Other catalogs (Sh2, Barnard, vdB, LBN, LDN)
    if (!foundOtherCatalog) {
      const otherCatMatch = item.match(
        /\b(Sh2-\d+|vdB\s*\d+|B\s*\d+|Barnard\s*\d+|LBN\s*\d+|LDN\s*\d+|Sharpless\s*\d+)\b/i
      );
      if (otherCatMatch) foundOtherCatalog = otherCatMatch[1].toUpperCase();
    }
  }

  // If any Messier, Caldwell, NGC, or IC was found, format ONE representative object
  if (foundMessier || foundCaldwell || foundNgcIc.length > 0) {
    // Special disambiguation for Rosette Cluster C50 (NGC 2244 / NGC 2239):
    // When Astrometry.net lists NGC 2239 or NGC 2244 alongside NGC 2237, prefer C50 (NGC 2244) if C50/NGC 2244/NGC 2239 is present and C49 wasn't explicitly requested
    const hasC50Cluster =
      foundCaldwell === 'C50' ||
      foundNgcIc.includes('NGC 2244') ||
      foundNgcIc.includes('NGC 2239');
    if (hasC50Cluster && foundCaldwell !== 'C49') {
      foundCaldwell = 'C50';
    }

    let singleNgcIc: string[] = [];
    if (foundMessier || foundCaldwell) {
      const mcKey = (foundMessier || foundCaldwell)!;
      const canonicalRaw = MESSIER_TO_NGC_IC[mcKey] || CALDWELL_TO_NGC_IC[mcKey];
      if (canonicalRaw) {
        singleNgcIc = [canonicalRaw.split('/')[0].trim()];
      }
    } else if (foundNgcIc.length > 0) {
      const firstMapped = foundNgcIc.find((id) => Boolean(NGC_IC_TO_MC[id.toUpperCase()]));
      if (firstMapped) {
        const mappedInfo = NGC_IC_TO_MC[firstMapped.toUpperCase()];
        if (mappedInfo.mc.startsWith('M')) foundMessier = mappedInfo.mc;
        else foundCaldwell = mappedInfo.mc;
        singleNgcIc = [mappedInfo.ngcIc];
      } else {
        singleNgcIc = [foundNgcIc[0]];
      }
    }

    const formatted = formatCatalogDesignationWithPriority(foundMessier, foundCaldwell, singleNgcIc);
    if (formatted) return formatted;
  }

  if (foundOtherCatalog) return foundOtherCatalog;

  // Priority 1.5: Check for specific HD / BD / TYC / Bayer / Flamsteed star designations in candidates
  for (const item of candidates) {
    const hdMatch = item.match(/\b(HD\s*\d+[A-Z]?|BD[+-]\d+\s+\d+[A-Z]?|TYC\s*\d+-\d+-\d+)\b/i);
    if (hdMatch) {
      return hdMatch[1].replace(/\s+/g, ' ').trim().toUpperCase();
    }
  }

  // Priority 2: Named prominent astronomical objects (strip any constellation prefix or "The star ")
  for (const item of candidates) {
    let clean = item
      .replace(/^The\s+star\s+/i, '')
      .replace(/^Part\s+of\s+the\s+constellation\s+.*/i, '')
      .replace(/^[가-힣]+\s*자리의\s+/u, '')
      .replace(/^[가-힣]+자리\s+/u, '')
      .trim();

    // If clean has multiple targets separated by & or /, keep only the first
    if (clean.includes(' & ')) {
      clean = clean.split(' & ')[0].trim();
    }

    if (
      clean.length > 1 &&
      !/^\d+$/.test(clean) &&
      !/^job/i.test(clean) &&
      !clean.toLowerCase().includes('constellation') &&
      !clean.toLowerCase().includes('stars') &&
      !clean.toLowerCase().includes('local in-browser') &&
      !clean.toLowerCase().includes('dual index:') &&
      !clean.toLowerCase().includes('심우주 성야') &&
      !clean.toLowerCase().endsWith('성야') &&
      !clean.toLowerCase().endsWith('의 천체') &&
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
 * Returns formatted title for a constellation's single representative celestial object,
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
  let primaryObj = extractPrimaryObjectIdentifier(combinedCandidates, filename, title);

  // Ensure primaryObj never repeats the constellation prefix
  if (primaryObj && formattedConstellation) {
    const bareConst = formattedConstellation.replace(/\s*자리$/, '').trim();
    if (bareConst.length >= 2) {
      primaryObj = primaryObj
        .replace(new RegExp(`^${bareConst}\\s*자리의\\s*`, 'u'), '')
        .replace(new RegExp(`^${bareConst}\\s*자리\\s*`, 'u'), '')
        .trim();
    }
  }

  if (
    formattedConstellation &&
    formattedConstellation !== '천구 별자리' &&
    formattedConstellation !== '천구' &&
    formattedConstellation !== '성도 매칭 결과'
  ) {
    if (primaryObj && primaryObj !== '천체') {
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

/**
 * Curated dictionary of stars that have official IAU / traditional proper names (특별히 고유 이름이 있는 항성).
 * Generic catalog stars (HD, BD, CD, TYC, Gaia DR3, HIP, HR, SAO, or unnamed Flamsteed/Bayer numbers)
 * are excluded so the precision constellation overlay remains clean and readable.
 */
const SPECIAL_NAMED_STARS: { label: string; aliases: string[] }[] = [
  // Lyra
  { label: '베가 (α Lyr)', aliases: ['베가', '직녀성', 'vega', 'α lyr', 'alf lyr', 'alpha lyrae', '3 lyr'] },
  { label: '더블더블 (ε¹ Lyr)', aliases: ['더블더블 ε¹ lyr', 'ε¹ lyr', 'ε1 lyr', 'eps1 lyr', 'epsilon1 lyrae', 'double double', '더블더블', '4 lyr'] },
  { label: '더블더블 (ε² Lyr)', aliases: ['더블더블 ε² lyr', 'ε² lyr', 'ε2 lyr', 'eps2 lyr', 'epsilon2 lyrae', '5 lyr'] },
  { label: '셰리아크 (β Lyr)', aliases: ['셰리아크', 'sheliak', 'β lyr', 'bet lyr', 'beta lyrae', '10 lyr'] },
  { label: '술라파트 (γ Lyr)', aliases: ['술라파트', 'sulafat', 'γ lyr', 'gam lyr', 'gamma lyrae', '14 lyr'] },

  // Cygnus
  { label: '데네브 (α Cyg)', aliases: ['데네브', 'deneb', 'α cyg', 'alf cyg', 'alpha cygni', '50 cyg'] },
  { label: '사드르 (γ Cyg)', aliases: ['사드르', 'sadr', 'γ cyg', 'gam cyg', 'gamma cygni', '37 cyg'] },
  { label: '알비레오 A (β¹ Cyg)', aliases: ['알비레오 a', '알비레오', 'albireo a', 'albireo', 'β¹ cyg', 'β1 cyg', 'β cyg', 'bet1 cyg', 'beta1 cygni', '6 cyg a'] },
  { label: '알비레오 B (β² Cyg)', aliases: ['알비레오 b', 'albireo b', 'β² cyg', 'β2 cyg', 'bet2 cyg', 'beta2 cygni', '6 cyg b'] },
  { label: '파와리스 (δ Cyg)', aliases: ['파와리스', 'fawaris', 'δ cyg', 'del cyg', 'delta cygni', '18 cyg'] },
  { label: '기에나 (ε Cyg)', aliases: ['기에나', 'gienah', 'ε cyg', 'eps cyg', 'epsilon cygni', '53 cyg'] },

  // Aquila
  { label: '알타이르 (α Aql)', aliases: ['알타이르', '견우성', 'altair', 'α aql', 'alf aql', 'alpha aquilae', '53 aql'] },
  { label: '타라제드 (γ Aql)', aliases: ['타라제드', 'tarazed', 'γ aql', 'gam aql', 'gamma aquilae', '50 aql'] },
  { label: '알샤인 (β Aql)', aliases: ['알샤인', 'alshain', 'β aql', 'bet aql', 'beta aquilae', '60 aql'] },

  // Cepheus
  { label: '가넷 스타 (μ Cep)', aliases: ['가넷 스타', '가넷스타', '석류석 별', '석류석별', 'garnet star', 'the garnet star', 'erakis', 'μ cep', 'mu cep', 'mu cephei'] },
  { label: '알데라민 (α Cep)', aliases: ['알데라민', 'alderamin', 'α cep', 'alf cep', 'alpha cephei', '5 cep'] },
  { label: '알피르크 (β Cep)', aliases: ['알피르크', 'alfirk', 'β cep', 'bet cep', 'beta cephei', '8 cep'] },
  { label: '에라이 (γ Cep)', aliases: ['에라이', 'errai', 'γ cep', 'gam cep', 'gamma cephei', '35 cep'] },

  // Cassiopeia
  { label: '카프 (β Cas)', aliases: ['카프', 'caph', 'β cas', 'bet cas', 'beta cassiopeiae', '11 cas'] },
  { label: '셰다르 (α Cas)', aliases: ['셰다르', 'schedar', 'α cas', 'alf cas', 'alpha cassiopeiae', '18 cas'] },
  { label: '나비 (γ Cas)', aliases: ['나비', 'navi', 'γ cas', 'gam cas', 'gamma cassiopeiae', '27 cas'] },
  { label: '루크바 (δ Cas)', aliases: ['루크바', 'ruchbah', 'δ cas', 'del cas', 'delta cassiopeiae', '37 cas'] },
  { label: '세긴 (ε Cas)', aliases: ['세긴', 'segin', 'ε cas', 'eps cas', 'epsilon cassiopeiae', '45 cas'] },
  { label: '아키르드 (η Cas)', aliases: ['아키르드', 'achird', 'η cas', 'eta cas', 'eta cassiopeiae', '24 cas'] },

  // Andromeda & Pegasus
  { label: '알페라츠 (α And)', aliases: ['알페라츠', 'alpheratz', 'sirrah', 'α and', 'alf and', 'alpha andromedae', '21 and'] },
  { label: '미라크 (β And)', aliases: ['미라크', 'mirach', 'β and', 'bet and', 'beta andromedae', '43 and'] },
  { label: '알마크 (γ And)', aliases: ['알마크', 'almach', 'γ and', 'gam and', 'gamma1 andromedae', '57 and'] },
  { label: '마르카브 (α Peg)', aliases: ['마르카브', 'markab', 'α peg', 'alf peg', 'alpha pegasi', '54 peg'] },
  { label: '셰아트 (β Peg)', aliases: ['셰아트', 'scheat', 'β peg', 'bet peg', 'beta pegasi', '53 peg'] },
  { label: '알게니브 (γ Peg)', aliases: ['알게니브', 'algenib', 'γ peg', 'gam peg', 'gamma pegasi', '88 peg'] },
  { label: '에니프 (ε Peg)', aliases: ['에니프', 'enif', 'ε peg', 'eps peg', 'epsilon pegasi', '8 peg'] },

  // Perseus & Auriga
  { label: '미르파크 (α Per)', aliases: ['미르파크', 'mirfak', 'α per', 'alf per', 'alpha persei', '33 per'] },
  { label: '알골 (β Per)', aliases: ['알골', 'algol', 'β per', 'bet per', 'beta persei', '26 per'] },
  { label: '카펠라 (α Aur)', aliases: ['카펠라', 'capella', 'α aur', 'alf aur', 'alpha aurigae', '13 aur'] },
  { label: '멘칼리난 (β Aur)', aliases: ['멘칼리난', 'menkalinan', 'β aur', 'bet aur', 'beta aurigae', '34 aur'] },

  // Taurus & Pleiades (M45)
  { label: '알데바란 (α Tau)', aliases: ['알데바란', 'aldebaran', 'α tau', 'alf tau', 'alpha tauri', '87 tau'] },
  { label: '엘나스 (β Tau)', aliases: ['엘나스', 'elnath', 'β tau', 'bet tau', 'beta tauri', '112 tau'] },
  { label: '알시오네 (η Tau)', aliases: ['알시오네', 'alcyone', 'η tau', 'eta tau', 'eta tauri', '25 tau'] },
  { label: '아틀라스 (27 Tau)', aliases: ['아틀라스', 'atlas', '27 tau', '27 tauri'] },
  { label: '엘렉트라 (17 Tau)', aliases: ['엘렉트라', 'electra', '17 tau', '17 tauri'] },
  { label: '마이아 (20 Tau)', aliases: ['마이아', 'maia', '20 tau', '20 tauri'] },
  { label: '메로페 (23 Tau)', aliases: ['메로페', 'merope', '23 tau', '23 tauri'] },
  { label: '타이게타 (19 Tau)', aliases: ['타이게타', 'taygeta', '19 tau', '19 tauri'] },
  { label: '플레이오네 (28 Tau)', aliases: ['플레이오네', 'pleione', '28 tau', '28 tauri'] },
  { label: '켈라에노 (16 Tau)', aliases: ['켈라에노', 'celaeno', '16 tau', '16 tauri'] },
  { label: '아스테로페 (21 Tau)', aliases: ['아스테로페', 'asterope', 'sterope', '21 tau', '21 tauri'] },

  // Orion
  { label: '베텔게우스 (α Ori)', aliases: ['베텔게우스', 'betelgeuse', 'α ori', 'alf ori', 'alpha orionis', '58 ori'] },
  { label: '리겔 (β Ori)', aliases: ['리겔', 'rigel', 'β ori', 'bet ori', 'beta orionis', '19 ori'] },
  { label: '벨라트릭스 (γ Ori)', aliases: ['벨라트릭스', 'bellatrix', 'γ ori', 'gam ori', 'gamma orionis', '24 ori'] },
  { label: '민타카 (δ Ori)', aliases: ['민타카', 'mintaka', 'δ ori', 'del ori', 'delta orionis', '34 ori'] },
  { label: '알닐람 (ε Ori)', aliases: ['알닐람', 'alnilam', 'ε ori', 'eps ori', 'epsilon orionis', '46 ori'] },
  { label: '알니탁 (ζ Ori)', aliases: ['알니탁', 'alnitak', 'ζ ori', 'zet ori', 'zeta orionis', '50 ori'] },
  { label: '사이프 (κ Ori)', aliases: ['사이프', 'saiph', 'κ ori', 'kap ori', 'kappa orionis', '53 ori'] },
  { label: '하트사 (ι Ori)', aliases: ['하트사', 'hatysa', 'na\'ir al saif', 'ι ori', 'iot ori', 'iota orionis', '44 ori'] },
  { label: '트라페지움 (θ¹ Ori C)', aliases: ['트라페지움', 'trapezium', 'θ¹ ori c', 'θ¹ ori', 'θ1 ori c', 'θ1 ori', 'theta1 orionis c', 'theta1 orionis', '41 ori'] },

  // Gemini, Canis Major, Canis Minor
  { label: '카스토르 (α Gem)', aliases: ['카스토르', 'castor', 'α gem', 'alf gem', 'alpha geminorum', '66 gem'] },
  { label: '폴룩스 (β Gem)', aliases: ['폴룩스', 'pollux', 'β gem', 'bet gem', 'beta geminorum', '78 gem'] },
  { label: '알헤나 (γ Gem)', aliases: ['알헤나', 'alhena', 'γ gem', 'gam gem', 'gamma geminorum', '24 gem'] },
  { label: '시리우스 (α CMa)', aliases: ['시리우스', '천랑성', 'sirius', 'α cma', 'alf cma', 'alpha canis majoris', '9 cma'] },
  { label: '미르잠 (β CMa)', aliases: ['미르잠', 'mirzam', 'murzim', 'β cma', 'bet cma', 'beta canis majoris', '2 cma'] },
  { label: '웨젠 (δ CMa)', aliases: ['웨젠', 'wezen', 'δ cma', 'del cma', 'delta canis majoris', '25 cma'] },
  { label: '아드하라 (ε CMa)', aliases: ['아드하라', 'adhara', 'ε cma', 'eps cma', 'epsilon canis majoris', '21 cma'] },
  { label: '프로키온 (α CMi)', aliases: ['프로키온', 'procyon', 'α cmi', 'alf cmi', 'alpha canis minoris', '10 cmi'] },
  { label: '고메이사 (β CMi)', aliases: ['고메이사', 'gomeisa', 'β cmi', 'bet cmi', 'beta canis minoris', '3 cmi'] },

  // Ursa Major, Ursa Minor, Canes Venatici, Boötes
  { label: '두베 (α UMa)', aliases: ['두베', 'dubhe', 'α uma', 'alf uma', 'alpha ursae majoris', '50 uma'] },
  { label: '메라크 (β UMa)', aliases: ['메라크', 'merak', 'β uma', 'bet uma', 'beta ursae majoris', '48 uma'] },
  { label: '페크다 (γ UMa)', aliases: ['페크다', 'phecda', 'phad', 'γ uma', 'gam uma', 'gamma ursae majoris', '64 uma'] },
  { label: '메그레즈 (δ UMa)', aliases: ['메그레즈', 'megrez', 'δ uma', 'del uma', 'delta ursae majoris', '69 uma'] },
  { label: '알리오스 (ε UMa)', aliases: ['알리오스', 'alioth', 'ε uma', 'eps uma', 'epsilon ursae majoris', '77 uma'] },
  { label: '미자르 (ζ UMa)', aliases: ['미자르', 'mizar', 'ζ uma', 'zet uma', 'zeta ursae majoris', '79 uma'] },
  { label: '알코르 (80 UMa)', aliases: ['알코르', 'alcor', '80 uma', 'g uma'] },
  { label: '알카이드 (η UMa)', aliases: ['알카이드', 'alkaid', 'benetnasch', 'η uma', 'eta uma', 'eta ursae majoris', '85 uma'] },
  { label: '북극성 (α UMi)', aliases: ['북극성', '폴라리스', 'polaris', 'α umi', 'alf umi', 'alpha ursae minoris', '1 umi'] },
  { label: '코카브 (β UMi)', aliases: ['코카브', 'kochab', 'β umi', 'bet umi', 'beta ursae minoris', '7 umi'] },
  { label: '페르카드 (γ UMi)', aliases: ['페르카드', 'pherkad', 'γ umi', 'gam umi', 'gamma ursae minoris', '13 umi'] },
  { label: '코르 카롤리 (α CVn)', aliases: ['코르 카롤리', 'cor caroli', 'α cvn', 'alf cvn', 'alpha canum venaticorum', '12 cvn'] },
  { label: '아크투루스 (α Boo)', aliases: ['아크투루스', 'arcturus', 'α boo', 'alf boo', 'alpha bootis', '16 boo'] },
  { label: '이자르 (ε Boo)', aliases: ['이자르', 'izar', 'pulcherrima', 'ε boo', 'eps boo', 'epsilon bootis', '36 boo'] },

  // Leo, Virgo, Hydra
  { label: '레굴루스 (α Leo)', aliases: ['레굴루스', 'regulus', 'α leo', 'alf leo', 'alpha leonis', '32 leo'] },
  { label: '데네볼라 (β Leo)', aliases: ['데네볼라', 'denebola', 'β leo', 'bet leo', 'beta leonis', '94 leo'] },
  { label: '알기에바 (γ Leo)', aliases: ['알기에바', 'algieba', 'γ leo', 'gam leo', 'gamma1 leonis', '41 leo'] },
  { label: '스피카 (α Vir)', aliases: ['스피카', 'spica', 'α vir', 'alf vir', 'alpha virginis', '67 vir'] },
  { label: '알파드 (α Hya)', aliases: ['알파드', 'alphard', 'α hya', 'alf hya', 'alpha hydrae', '30 hya'] },

  // Scorpius, Sagittarius, Ophiuchus, Southern Stars
  { label: '안타레스 (α Sco)', aliases: ['안타레스', 'antares', 'α sco', 'alf sco', 'alpha scorpii', '21 sco'] },
  { label: '샤울라 (λ Sco)', aliases: ['샤울라', 'shaula', 'λ sco', 'lam sco', 'lambda scorpii', '35 sco'] },
  { label: '사르가스 (θ Sco)', aliases: ['사르가스', 'sargas', 'θ sco', 'the sco', 'theta scorpii'] },
  { label: '카오스 아우스트랄리스 (ε Sgr)', aliases: ['카오스 아우스트랄리스', 'kaus australis', 'ε sgr', 'eps sgr', 'epsilon sagittarii', '20 sgr'] },
  { label: '눈키 (σ Sgr)', aliases: ['눈키', 'nunki', 'σ sgr', 'sig sgr', 'sigma sagittarii', '34 sgr'] },
  { label: '라스알하게 (α Oph)', aliases: ['라스알하게', 'rasalhague', 'α oph', 'alf oph', 'alpha ophiuchi', '55 oph'] },
  { label: '알페카 (α CrB)', aliases: ['알페카', 'alphecca', 'gemma', 'α crb', 'alf crb', 'alpha coronae borealis', '5 crb'] },
  { label: '엘타닌 (γ Dra)', aliases: ['엘타닌', 'eltanin', 'γ dra', 'gam dra', 'gamma draconis', '33 dra'] },
  { label: '투반 (α Dra)', aliases: ['투반', 'thuban', 'α dra', 'alf dra', 'alpha draconis', '11 dra'] },
  { label: '포말하우트 (α PsA)', aliases: ['포말하우트', 'fomalhaut', 'α psa', 'alf psa', 'alpha piscis austrini', '24 psa'] },
  { label: '하말 (α Ari)', aliases: ['하말', 'hamal', 'α ari', 'alf ari', 'alpha arietis', '13 ari'] },
  { label: '미라 (ο Cet)', aliases: ['미라', 'mira', 'ο cet', 'omi cet', 'omicron ceti', '68 cet'] },
  { label: '디프다 (β Cet)', aliases: ['디프다', '데네브 카이토스', 'diphda', 'deneb kaitos', 'β cet', 'bet cet', 'beta ceti', '16 cet'] },
  { label: '카노푸스 (α Car)', aliases: ['카노푸스', 'canopus', 'α car', 'alf car', 'alpha carinae'] },
  { label: '아크룩스 (α Cru)', aliases: ['아크룩스', 'acrux', 'α cru', 'alf cru', 'alpha crucis'] },
  { label: '미모사 (β Cru)', aliases: ['미모사', 'mimosa', 'becrux', 'β cru', 'bet cru', 'beta crucis'] },
  { label: '리길 켄타우루스 (α Cen)', aliases: ['리길 켄타우루스', 'rigil kentaurus', 'alpha centauri', 'α cen', 'alf cen'] },
  { label: '하다르 (β Cen)', aliases: ['하다르', 'hadar', 'agena', 'β cen', 'bet cen', 'beta centauri'] },
  { label: '아케르나르 (α Eri)', aliases: ['아케르나르', 'achernar', 'α eri', 'alf eri', 'alpha eridani'] },
];

const GREEK_TRANSLITERATION_WORDS = new Set([
  'alpha', 'beta', 'gamma', 'delta', 'epsilon', 'zeta', 'eta', 'theta',
  'iota', 'kappa', 'lambda', 'mu', 'nu', 'xi', 'omicron', 'pi',
  'rho', 'sigma', 'tau', 'upsilon', 'phi', 'chi', 'psi', 'omega',
  '알파', '베타', '감마', '델타', '엡실론', '제타', '에타', '세타',
  '이오타', '카파', '람다', '뮤', '뉴', '크시', '오미크론', '파이',
  '로', '시그마', '타우', '웁실론', '피', '카이', '프시', '오메가',
]);

const LATIN_CONSTELLATION_GENITIVES = new Set([
  'andromedae', 'antliae', 'apodis', 'aquarii', 'aquilae', 'arae', 'arietis', 'aurigae',
  'bootis', 'boötis', 'caeli', 'camelopardalis', 'cancri', 'canum', 'venaticorum',
  'canis', 'majoris', 'minoris', 'capricorni', 'carinae', 'cassiopeiae', 'centauri',
  'cephei', 'ceti', 'chamaeleontis', 'circini', 'columbae', 'comae', 'berenices',
  'coronae', 'australis', 'borealis', 'corvi', 'crateris', 'crucis', 'cygni',
  'delphini', 'doradus', 'draconis', 'equulei', 'eridani', 'fornacis', 'geminorum',
  'gruis', 'herculis', 'horologii', 'hydrae', 'hydri', 'indi', 'lacertae',
  'leonis', 'leporis', 'librae', 'lupi', 'lyncis', 'lyrae', 'mensae', 'microscopii',
  'monocerotis', 'muscae', 'normae', 'octantis', 'ophiuchi', 'orionis', 'pavonis',
  'pegasi', 'persei', 'phoenicis', 'pictoris', 'piscium', 'piscis', 'austrini',
  'puppis', 'pyxidis', 'reticuli', 'sagittae', 'sagittarii', 'scorpii', 'sculptoris',
  'scuti', 'serpentis', 'sextantis', 'tauri', 'telescopii', 'trianguli', 'tucanae',
  'ursae', 'velorum', 'virginis', 'volantis', 'vulpeculae',
  ...Object.values(IAU_CONSTELLATIONS)
    .map((c) => c.genitive?.toLowerCase())
    .filter((g): g is string => Boolean(g)),
]);

/**
 * Checks whether a star annotation represents a specially named star (특별히 이름이 있는 항성)
 * rather than a generic catalog star (HD, BD, CD, TYC, Gaia DR3, HIP, HR, SAO, or unnamed Flamsteed/Bayer).
 * Returns the formatted display label if it is a specially named star, or null otherwise.
 */
export function resolveSpecialNamedStarLabel(names?: string[]): string | null {
  if (!Array.isArray(names) || names.length === 0) return null;

  // Strip trailing telemetry/catalog suffixes like " · Gaia DR3 ..." or " · TYC ..."
  const cleanedCandidates = names
    .map((n) => (typeof n === 'string' ? n.split('·')[0].trim() : ''))
    .filter((n) => n.length > 0);
  if (cleanedCandidates.length === 0) return null;

  // 1. Immediately reject if the primary name is a DSO or synthetic star entry
  const firstLow = cleanedCandidates[0].toLowerCase();
  if (
    firstLow.startsWith('검출 항성') ||
    firstLow.includes('기준성 #') ||
    firstLow.includes('star #') ||
    firstLow.startsWith('gaia dr3') ||
    /^(?:m|c|ngc|ic)\s*\d+/i.test(cleanedCandidates[0])
  ) {
    return null;
  }

  // 2. Check against our curated SPECIAL_NAMED_STARS dictionary
  for (const entry of SPECIAL_NAMED_STARS) {
    for (const raw of cleanedCandidates) {
      const norm = raw
        .toLowerCase()
        .replace(/[()]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      for (const alias of entry.aliases) {
        const aliasNorm = alias.toLowerCase().trim();
        if (norm === aliasNorm) {
          return entry.label;
        }
        // Check token boundary match for multi-word strings like "알니탁 (ζ Ori)" or "Garnet Star (Mu Cephei)"
        const escaped = aliasNorm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const boundaryRegex = new RegExp(`(^|[\\s/·,])${escaped}($|[\\s/·,])`, 'i');
        if (boundaryRegex.test(norm)) {
          return entry.label;
        }
      }
    }
  }

  // 3. Check if Astrometry.net provided a genuine proper English/Korean star name not in the table
  // (Reject catalog IDs like HD/BD/CD/TYC/HIP/HR/SAO, Flamsteed numbers like "56 And" / "39 Cancri",
  //  Bayer letters like "ν And" / "ζ Ori B", variable star IDs like "V902 Her" / "R Scuti",
  //  and Latin Greek+Genitive forms like "Nu Andromedae" / "Sigma Geminorum")
  for (const raw of cleanedCandidates) {
    // Strip trailing constellation tag like "(Cyg)" or "(And)"
    const stripped = raw.replace(/\(\s*[A-Za-z]{3}\s*\)$/g, '').trim();
    if (!stripped) continue;

    // Reject standard catalog prefixes
    if (/^(?:HD|BD|CD|CPD|TYC|HIP|HR|SAO|USNO|2MASS|GAIA|GJ|LHS|WDS)\b/i.test(stripped)) {
      continue;
    }
    // Reject Flamsteed designations with 3-letter code or full Latin genitive ("56 And", "39 Cancri", "73 Leo (n Leo)")
    if (/^\d{1,3}\s+[A-Za-z]+\b/i.test(stripped)) {
      continue;
    }
    // Reject Bayer / letter / variable star designations ("ν And", "ω¹ Sco", "c Ori", "R Sct", "V902 Her", "BR CVn", "R Scuti")
    if (/^(?:[α-ωΑ-Ω][¹²³123]?|[A-Za-z]{1,2}\d*)\s+[A-Za-z]{3}\b/.test(stripped)) {
      continue;
    }
    const words = stripped.replace(/[()]/g, ' ').trim().split(/\s+/);
    if (
      words.length >= 2 &&
      /^(?:[α-ωΑ-Ω][¹²³123]?|[A-Za-z]{1,2}\d*|\d{1,3})$/.test(words[0]) &&
      LATIN_CONSTELLATION_GENITIVES.has(words[1].toLowerCase())
    ) {
      continue;
    }
    // Reject Greek letter transliterations like "Nu Andromedae", "Sigma Orionis", "제타 리라", "시그마 오리온"
    const firstWord = stripped.split(/[\s(]+/)[0].replace(/[0-9¹²³]/g, '').toLowerCase();
    if (GREEK_TRANSLITERATION_WORDS.has(firstWord)) {
      continue;
    }
    // Reject strings that still contain HD/BD/TYC/Gaia inside
    if (/\b(?:HD|BD|CD|TYC|Gaia)\s*[+-]?\d+/i.test(stripped)) {
      continue;
    }

    // It's a genuine proper name (e.g. "Vindemiatrix", "Sheratan", "Porrima", "Rasalgethi")
    return stripped;
  }

  return null;
}


