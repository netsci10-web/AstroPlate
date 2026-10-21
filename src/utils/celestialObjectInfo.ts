import { AstrometryAnnotationItem, AstrometryCalibration } from '../types/astronomy';
import { BRIGHT_STARS, DEEP_SKY_OBJECTS } from '../data/celestialCatalog';
import {
  extractPrimaryObjectIdentifier,
  formatTitleWithCatalogPriority,
} from './constellations';

export interface CelestialPhysicalSummary {
  displayName: string;
  subtitleKo: string;
  categoryBadge: string;
  isDSO: boolean;
  apparentMagnitude: string;
  apparentMagnitudeSub: string;
  sizeText: string;
  sizeSub: string;
  distanceText: string;
  distanceSub: string;
  pixelCoords: string;
  rawTargetQuery: string;
}

interface CuratedPhysicalRecord {
  keys: string[];
  nameKo: string;
  nameEn: string;
  typeKo: string;
  isDSO: boolean;
  mag: string;
  magSub: string;
  size: string;
  sizeSub: string;
  distance: string;
  distanceSub: string;
}

const CURATED_PHYSICAL_DB: CuratedPhysicalRecord[] = [
  // Major Messier & Caldwell & NGC/IC Deep Sky Objects
  {
    keys: ['M42', 'NGC 1976', 'NGC1976', 'ORION NEBULA', '오리온 대성운'],
    nameKo: '오리온 대성운',
    nameEn: 'Orion Nebula',
    typeKo: '발광/반사 성운 (H II 영역)',
    isDSO: true,
    mag: '4.0 mag',
    magSub: '맨눈 관측 가능 (겉보기 등급)',
    size: '85′ × 60′',
    sizeSub: '실제 지름 약 24 광년',
    distance: '1,344 광년',
    distanceSub: '약 412 파섹 (pc)',
  },
  {
    keys: ['M43', 'NGC 1982', 'DE MAIRAN'],
    nameKo: '드 메랑 성운',
    nameEn: "De Mairan's Nebula",
    typeKo: '발광/반사 성운',
    isDSO: true,
    mag: '9.0 mag',
    magSub: '소형 망원경 관측 대상',
    size: '20′ × 15′',
    sizeSub: '실제 지름 약 7.5 광년',
    distance: '1,600 광년',
    distanceSub: '약 490 파섹 (pc)',
  },
  {
    keys: ['IC 434', 'IC434', 'B33', 'HORSEHEAD', '말머리 성운'],
    nameKo: '말머리 성운 & IC 434',
    nameEn: 'Horsehead & Flame Nebula Region',
    typeKo: '발광/암흑 성운 복합체',
    isDSO: true,
    mag: '6.8 mag',
    magSub: '장노출 천체사진 주요 대상',
    size: '60′ × 10′',
    sizeSub: '말머리 암흑성운 약 3.5 광년',
    distance: '1,375 광년',
    distanceSub: '약 422 파섹 (pc)',
  },
  {
    keys: ['NGC 2024', 'NGC2024', 'FLAME NEBULA', '불꽃 성운'],
    nameKo: '불꽃 성운',
    nameEn: 'Flame Nebula',
    typeKo: '발광 성운',
    isDSO: true,
    mag: '7.2 mag',
    magSub: '알니탁(ζ Ori) 인근 성운',
    size: '30′ × 30′',
    sizeSub: '실제 지름 약 12 광년',
    distance: '1,350 광년',
    distanceSub: '약 415 파섹 (pc)',
  },
  {
    keys: ['M78', 'NGC 2068', 'NGC2068'],
    nameKo: 'M78 반사성운',
    nameEn: 'Messier 78',
    typeKo: '반사 성운',
    isDSO: true,
    mag: '8.3 mag',
    magSub: '쌍안경 및 소형 망원경 대상',
    size: '8.0′ × 6.0′',
    sizeSub: '실제 지름 약 4 광년',
    distance: '1,350 광년',
    distanceSub: '약 415 파섹 (pc)',
  },
  {
    keys: ['M31', 'NGC 224', 'NGC224', 'ANDROMEDA GALAXY', '안드로메다 은하'],
    nameKo: '안드로메다 은하',
    nameEn: 'Andromeda Galaxy',
    typeKo: '정상 나선 은하 (SA(s)b)',
    isDSO: true,
    mag: '3.44 mag',
    magSub: '맨눈 관측 가능 외부은하',
    size: '178′ × 63′',
    sizeSub: '실제 지름 약 220,000 광년',
    distance: '254만 광년',
    distanceSub: '약 778 킬로파섹 (kpc)',
  },
  {
    keys: ['M32', 'NGC 221', 'NGC221'],
    nameKo: 'M32 위성은하',
    nameEn: 'Messier 32',
    typeKo: '왜소 타원 은하 (cE2)',
    isDSO: true,
    mag: '8.1 mag',
    magSub: '안드로메다 동반 은하',
    size: '8.7′ × 6.5′',
    sizeSub: '실제 지름 약 6,500 광년',
    distance: '249만 광년',
    distanceSub: '약 763 킬로파섹 (kpc)',
  },
  {
    keys: ['M110', 'NGC 205', 'NGC205'],
    nameKo: 'M110 위성은하',
    nameEn: 'Messier 110',
    typeKo: '왜소 타원 은하 (dE5)',
    isDSO: true,
    mag: '8.5 mag',
    magSub: '안드로메다 동반 은하',
    size: '21.9′ × 11.0′',
    sizeSub: '실제 지름 약 17,000 광년',
    distance: '269만 광년',
    distanceSub: '약 824 킬로파섹 (kpc)',
  },
  {
    keys: ['M33', 'NGC 598', 'NGC598', 'TRIANGULUM GALAXY', '삼각형자리 은하'],
    nameKo: '삼각형자리 은하',
    nameEn: 'Triangulum Galaxy',
    typeKo: '나선 은하 (SA(s)cd)',
    isDSO: true,
    mag: '5.72 mag',
    magSub: '국부은하군 3번째 대형 은하',
    size: '70.8′ × 41.7′',
    sizeSub: '실제 지름 약 60,000 광년',
    distance: '273만 광년',
    distanceSub: '약 837 킬로파섹 (kpc)',
  },
  {
    keys: ['M45', 'PLEIADES', '플레이아데스', '좀생이별'],
    nameKo: '플레이아데스 성단',
    nameEn: 'Pleiades (Seven Sisters)',
    typeKo: '산개 성단 (반사 성운 동반)',
    isDSO: true,
    mag: '1.6 mag',
    magSub: '맨눈 선명 관측 가능',
    size: '110′',
    sizeSub: '실제 지름 약 17.5 광년',
    distance: '444 광년',
    distanceSub: '약 136 파섹 (pc)',
  },
  {
    keys: ['M1', 'NGC 1952', 'NGC1952', 'CRAB NEBULA', '게 성운'],
    nameKo: '게 성운',
    nameEn: 'Crab Nebula',
    typeKo: '초신성 잔해 (SNR / 펄사 성운)',
    isDSO: true,
    mag: '8.4 mag',
    magSub: '1054년 초신성 폭발 잔해',
    size: '6.0′ × 4.0′',
    sizeSub: '실제 지름 약 11 광년',
    distance: '6,500 광년',
    distanceSub: '약 2,000 파섹 (pc)',
  },
  {
    keys: ['M74', 'NGC 628', 'NGC628', 'PHANTOM GALAXY', '팬텀 은하'],
    nameKo: '팬텀 은하 (M74)',
    nameEn: 'Phantom Galaxy',
    typeKo: '정면 나선 은하 (SA(s)c)',
    isDSO: true,
    mag: '9.4 mag',
    magSub: '정면(Face-on) 대표 나선은하',
    size: '10.5′ × 9.5′',
    sizeSub: '실제 지름 약 95,000 광년',
    distance: '3,200만 광년',
    distanceSub: '약 9.8 메가파섹 (Mpc)',
  },
  {
    keys: ['C28', 'NGC 752', 'NGC752', 'CALDWELL 28'],
    nameKo: 'C28 산개성단',
    nameEn: 'Caldwell 28 Open Cluster',
    typeKo: '산개 성단 (Open Cluster)',
    isDSO: true,
    mag: '5.7 mag',
    magSub: '쌍안경 및 저배율 관측 최적',
    size: '75′',
    sizeSub: '실제 지름 약 29 광년',
    distance: '1,400 광년',
    distanceSub: '약 430 파섹 (pc)',
  },
  {
    keys: ['C23', 'NGC 891', 'NGC891', 'CALDWELL 23', 'SILVER SLIVER'],
    nameKo: '은빛 바늘 은하 (C23)',
    nameEn: 'Silver Sliver Galaxy',
    typeKo: '측면 나선 은하 (Edge-on SA(s)b)',
    isDSO: true,
    mag: '9.9 mag',
    magSub: '적도 암흑대 선명 관측 은하',
    size: '13.5′ × 2.5′',
    sizeSub: '실제 지름 약 120,000 광년',
    distance: '3,000만 광년',
    distanceSub: '약 9.2 메가파섹 (Mpc)',
  },
  {
    keys: ['C10', 'NGC 663', 'NGC663', 'CALDWELL 10'],
    nameKo: '카시오페이아 산개성단 (C10)',
    nameEn: 'Caldwell 10 Open Cluster',
    typeKo: '산개 성단 (Open Cluster)',
    isDSO: true,
    mag: '7.1 mag',
    magSub: '젊은 Be형 별 다수 포함',
    size: '16′',
    sizeSub: '실제 지름 약 33 광년',
    distance: '6,850 광년',
    distanceSub: '약 2,100 파섹 (pc)',
  },
  {
    keys: ['C14', 'NGC 869', 'NGC 884', 'NGC869', 'NGC884', 'DOUBLE CLUSTER', '이중성단'],
    nameKo: '페르세우스 이중성단',
    nameEn: 'Double Cluster (h & χ Persei)',
    typeKo: '이중 산개 성단',
    isDSO: true,
    mag: '3.7 mag',
    magSub: '맨눈 및 쌍안경 명품 대상',
    size: '60′ (각 30′)',
    sizeSub: '실제 지름 약 130 광년 영역',
    distance: '7,500 광년',
    distanceSub: '약 2,300 파섹 (pc)',
  },
  {
    keys: ['NGC 1499', 'NGC1499', 'CALIFORNIA NEBULA', '캘리포니아 성운'],
    nameKo: '캘리포니아 성운',
    nameEn: 'California Nebula',
    typeKo: '발광 성운 (H II 영역)',
    isDSO: true,
    mag: '5.0 mag',
    magSub: 'H-alpha 광시야 촬영 최적',
    size: '160′ × 40′',
    sizeSub: '실제 길이 약 70 광년',
    distance: '1,000 광년',
    distanceSub: '약 307 파섹 (pc)',
  },
  {
    keys: ['IC 1805', 'IC1805', 'HEART NEBULA', '하트 성운'],
    nameKo: '하트 성운',
    nameEn: 'Heart Nebula',
    typeKo: '발광 성운 & 산개 성단',
    isDSO: true,
    mag: '6.5 mag',
    magSub: '중심 성단 Melotte 15 포함',
    size: '150′ × 150′',
    sizeSub: '실제 지름 약 200 광년',
    distance: '7,500 광년',
    distanceSub: '약 2,300 파섹 (pc)',
  },
  {
    keys: ['IC 1848', 'IC1848', 'SOUL NEBULA', '소울 성운', '태아 성운'],
    nameKo: '소울(태아) 성운',
    nameEn: 'Soul Nebula',
    typeKo: '발광 성운 (H II 영역)',
    isDSO: true,
    mag: '6.5 mag',
    magSub: '하트 성운과 거대 복합체 형성',
    size: '150′ × 75′',
    sizeSub: '실제 길이 약 150 광년',
    distance: '6,500 광년',
    distanceSub: '약 2,000 파섹 (pc)',
  },
  {
    keys: ['C11', 'NGC 7635', 'NGC7635', 'BUBBLE NEBULA', '버블 성운'],
    nameKo: '버블(비누방울) 성운',
    nameEn: 'Bubble Nebula',
    typeKo: '발광 성운 (항성풍 거품)',
    isDSO: true,
    mag: '10.0 mag',
    magSub: 'O형 항성 BD+60°2522 항성풍',
    size: '15′ × 8′',
    sizeSub: '거품 지름 약 7~10 광년',
    distance: '7,100 광년',
    distanceSub: '약 2,180 파섹 (pc)',
  },
  {
    keys: ['M52', 'NGC 7654', 'NGC7654'],
    nameKo: 'M52 산개성단',
    nameEn: 'Messier 52',
    typeKo: '산개 성단 (Open Cluster)',
    isDSO: true,
    mag: '6.9 mag',
    magSub: '버블 성운 인접 산개성단',
    size: '13′',
    sizeSub: '실제 지름 약 19 광년',
    distance: '5,000 광년',
    distanceSub: '약 1,530 파섹 (pc)',
  },
  {
    keys: ['C20', 'NGC 7000', 'NGC7000', 'NORTH AMERICA NEBULA', '북아메리카 성운'],
    nameKo: '북아메리카 성운',
    nameEn: 'North America Nebula',
    typeKo: '발광 성운 (H II 영역)',
    isDSO: true,
    mag: '4.0 mag',
    magSub: '데네브 인근 대형 발광성운',
    size: '120′ × 100′',
    sizeSub: '실제 지름 약 90 광년',
    distance: '2,590 광년',
    distanceSub: '약 795 파섹 (pc)',
  },
  {
    keys: ['C33', 'C34', 'NGC 6992', 'NGC 6960', 'NGC 6995', 'NGC6992', 'NGC6960', 'VEIL NEBULA', '베일 성운', '면사포 성운'],
    nameKo: '베일(면사포) 성운',
    nameEn: 'Veil Nebula (Cygnus Loop)',
    typeKo: '초신성 잔해 (SNR)',
    isDSO: true,
    mag: '7.0 mag',
    magSub: '약 1만~2만 년 전 초신성 잔해',
    size: '180′',
    sizeSub: '실제 지름 약 130 광년',
    distance: '2,400 광년',
    distanceSub: '약 736 파섹 (pc)',
  },
  {
    keys: ['C27', 'NGC 6888', 'NGC6888', 'CRESCENT NEBULA', '초승달 성운'],
    nameKo: '초승달 성운',
    nameEn: 'Crescent Nebula',
    typeKo: '발광 성운 (울프-레이에 항성풍)',
    isDSO: true,
    mag: '7.4 mag',
    magSub: '중심별 WR 136 방출 껍질',
    size: '18′ × 12′',
    sizeSub: '실제 지름 약 25 광년',
    distance: '5,000 광년',
    distanceSub: '약 1,530 파섹 (pc)',
  },
  {
    keys: ['IC 1318', 'IC1318', 'SADR REGION', '사드르 나비 성운'],
    nameKo: '사드르 나비 성운',
    nameEn: 'Sadr Region (Gamma Cygni Nebula)',
    typeKo: '발광 성운 복합체',
    isDSO: true,
    mag: '5.5 mag',
    magSub: '백조자리 중심부 H-alpha 성운',
    size: '180′ × 180′',
    sizeSub: '실제 범위 약 100+ 광년',
    distance: '4,900 광년',
    distanceSub: '약 1,500 파섹 (pc)',
  },
  {
    keys: ['IC 1396', 'IC1396', 'ELEPHANT TRUNK', '코끼리 코 성운'],
    nameKo: '코끼리 코 성운',
    nameEn: "Elephant's Trunk Nebula",
    typeKo: '발광 성운 & 산개 성단',
    isDSO: true,
    mag: '3.5 mag',
    magSub: '석류석 별(μ Cep) 인근 성운',
    size: '170′ × 140′',
    sizeSub: '실제 지름 약 100 광년',
    distance: '2,400 광년',
    distanceSub: '약 736 파섹 (pc)',
  },
  {
    keys: ['C4', 'NGC 7023', 'NGC7023', 'IRIS NEBULA', '아이리스 성운'],
    nameKo: '아이리스(붓꽃) 성운',
    nameEn: 'Iris Nebula',
    typeKo: '반사 성운 & 성간 먼지 구름',
    isDSO: true,
    mag: '6.8 mag',
    magSub: '중심별 HD 200775 반사광',
    size: '18′ × 18′',
    sizeSub: '실제 지름 약 6 광년',
    distance: '1,300 광년',
    distanceSub: '약 400 파섹 (pc)',
  },
  {
    keys: ['C49', 'NGC 2237', 'NGC 2244', 'NGC2237', 'ROSETTE NEBULA', '장미 성운'],
    nameKo: '장미 성운 (Rosette)',
    nameEn: 'Rosette Nebula',
    typeKo: '발광 성운 & 산개 성단 (NGC 2244)',
    isDSO: true,
    mag: '6.0 mag',
    magSub: '외뿔소자리 대표 대형 성운',
    size: '80′ × 60′',
    sizeSub: '실제 지름 약 130 광년',
    distance: '5,200 광년',
    distanceSub: '약 1,600 파섹 (pc)',
  },
  {
    keys: ['M57', 'NGC 6720', 'NGC6720', 'RING NEBULA', '고리 성운'],
    nameKo: '고리 성운',
    nameEn: 'Ring Nebula',
    typeKo: '행성상 성운 (Planetary Nebula)',
    isDSO: true,
    mag: '8.8 mag',
    magSub: '거문고자리 대표 행성상성운',
    size: '1.4′ × 1.0′',
    sizeSub: '실제 지름 약 1.3 광년',
    distance: '2,570 광년',
    distanceSub: '약 787 파섹 (pc)',
  },
  {
    keys: ['M27', 'NGC 6853', 'NGC6853', 'DUMBBELL NEBULA', '아령 성운'],
    nameKo: '아령 성운',
    nameEn: 'Dumbbell Nebula',
    typeKo: '행성상 성운 (Planetary Nebula)',
    isDSO: true,
    mag: '7.5 mag',
    magSub: '최초 발견된 행성상성운',
    size: '8.0′ × 5.6′',
    sizeSub: '실제 지름 약 2.9 광년',
    distance: '1,360 광년',
    distanceSub: '약 417 파섹 (pc)',
  },
  {
    keys: ['M51', 'NGC 5194', 'NGC5194', 'WHIRLPOOL GALAXY', '부자 은하', '소용돌이 은하'],
    nameKo: '부자(소용돌이) 은하',
    nameEn: 'Whirlpool Galaxy',
    typeKo: '상호작용 나선 은하 (SA(s)bc)',
    isDSO: true,
    mag: '8.4 mag',
    magSub: 'NGC 5195와 상호작용 중',
    size: '11.2′ × 6.9′',
    sizeSub: '실제 지름 약 76,000 광년',
    distance: '3,100만 광년',
    distanceSub: '약 9.5 메가파섹 (Mpc)',
  },
  {
    keys: ['M81', 'NGC 3031', 'NGC3031', 'BODE', '보데 은하'],
    nameKo: '보데 은하',
    nameEn: "Bode's Galaxy",
    typeKo: '나선 은하 (SA(s)ab)',
    isDSO: true,
    mag: '6.94 mag',
    magSub: '쌍안경 관측 가능 밝은 은하',
    size: '26.9′ × 14.1′',
    sizeSub: '실제 지름 약 96,000 광년',
    distance: '1,180만 광년',
    distanceSub: '약 3.6 메가파섹 (Mpc)',
  },
  {
    keys: ['M82', 'NGC 3034', 'NGC3034', 'CIGAR GALAXY', '시가 은하'],
    nameKo: '시가 은하',
    nameEn: 'Cigar Galaxy',
    typeKo: '폭발적 항성생성 은하 (I0)',
    isDSO: true,
    mag: '8.41 mag',
    magSub: '강력한 중심부 슈퍼풍 방출',
    size: '11.2′ × 4.3′',
    sizeSub: '실제 지름 약 40,800 광년',
    distance: '1,200만 광년',
    distanceSub: '약 3.68 메가파섹 (Mpc)',
  },
  {
    keys: ['M101', 'NGC 5457', 'NGC5457', 'PINWHEEL GALAXY', '바람개비 은하'],
    nameKo: '바람개비 은하',
    nameEn: 'Pinwheel Galaxy',
    typeKo: '정면 나선 은하 (SAB(rs)cd)',
    isDSO: true,
    mag: '7.86 mag',
    magSub: '대형 정면 나선은하',
    size: '28.8′ × 26.9′',
    sizeSub: '실제 지름 약 170,000 광년',
    distance: '2,090만 광년',
    distanceSub: '약 6.4 메가파섹 (Mpc)',
  },
  {
    keys: ['M104', 'NGC 4594', 'NGC4594', 'SOMBRERO GALAXY', '솜브레로 은하'],
    nameKo: '솜브레로 은하',
    nameEn: 'Sombrero Galaxy',
    typeKo: '나선/렌즈형 은하 (SA(s)a)',
    isDSO: true,
    mag: '8.0 mag',
    magSub: '뚜렷한 적도 먼지 띠 보유',
    size: '8.7′ × 3.5′',
    sizeSub: '실제 지름 약 94,900 광년',
    distance: '3,110만 광년',
    distanceSub: '약 9.55 메가파섹 (Mpc)',
  },
  {
    keys: ['M13', 'NGC 6205', 'NGC6205', 'HERCULES GLOBULAR', '헤르쿨레스 대구상성단'],
    nameKo: '헤르쿨레스 대성단',
    nameEn: 'Great Globular Cluster in Hercules',
    typeKo: '구상 성단 (Globular Cluster)',
    isDSO: true,
    mag: '5.8 mag',
    magSub: '북반구 최고 구상성단 (약 30만 개 별)',
    size: '20′',
    sizeSub: '실제 지름 약 145 광년',
    distance: '22,200 광년',
    distanceSub: '약 6,800 파섹 (pc)',
  },
  {
    keys: ['M8', 'NGC 6523', 'NGC6523', 'LAGOON NEBULA', '석호 성운'],
    nameKo: '석호(라군) 성운',
    nameEn: 'Lagoon Nebula',
    typeKo: '발광 성운 & 산개 성단',
    isDSO: true,
    mag: '6.0 mag',
    magSub: '은하수 중심부 대표 발광성운',
    size: '90′ × 40′',
    sizeSub: '실제 크기 약 110 × 50 광년',
    distance: '4,100 광년',
    distanceSub: '약 1,250 파섹 (pc)',
  },
  {
    keys: ['M20', 'NGC 6514', 'NGC6514', 'TRIFID NEBULA', '삼열 성운'],
    nameKo: '삼열 성운',
    nameEn: 'Trifid Nebula',
    typeKo: '발광/반사/암흑 성운',
    isDSO: true,
    mag: '6.3 mag',
    magSub: '3색 조화(발광·반사·암흑) 성운',
    size: '28′ × 28′',
    sizeSub: '실제 지름 약 42 광년',
    distance: '4,100 광년',
    distanceSub: '약 1,260 파섹 (pc)',
  },
  {
    keys: ['M16', 'NGC 6611', 'NGC6611', 'EAGLE NEBULA', '독수리 성운'],
    nameKo: '독수리 성운',
    nameEn: 'Eagle Nebula (Pillars of Creation)',
    typeKo: '발광 성운 & 산개 성단',
    isDSO: true,
    mag: '6.0 mag',
    magSub: '창조의 기둥(Pillars) 포함',
    size: '70′ × 55′',
    sizeSub: '실제 크기 약 70 × 55 광년',
    distance: '5,700 광년',
    distanceSub: '약 1,740 파섹 (pc)',
  },
  {
    keys: ['M17', 'NGC 6618', 'NGC6618', 'OMEGA NEBULA', '오메가 성운', '백조 성운'],
    nameKo: '오메가(백조) 성운',
    nameEn: 'Omega / Swan Nebula',
    typeKo: '발광 성운 (H II 영역)',
    isDSO: true,
    mag: '6.0 mag',
    magSub: '고밀도 별 탄생 영역',
    size: '45′ × 35′',
    sizeSub: '실제 지름 약 40 광년',
    distance: '5,500 광년',
    distanceSub: '약 1,690 파섹 (pc)',
  },
  {
    keys: ['NGC 6695', 'NGC6695'],
    nameKo: 'NGC 6695 나선은하',
    nameEn: 'NGC 6695 Barred Spiral Galaxy',
    typeKo: '막대 나선 은하 (SBb)',
    isDSO: true,
    mag: '13.5 mag',
    magSub: '거문고자리 심우주 외부은하',
    size: '1.0′ × 0.5′',
    sizeSub: '실제 지름 약 75,000 광년',
    distance: '2억 5,500만 광년',
    distanceSub: '약 78.2 메가파섹 (Mpc)',
  },
  // Prominent Stars
  {
    keys: ['GARNET STAR', 'MU CEP', 'μ CEP', 'ERAKIS', '석류석 별', '가넷 스타'],
    nameKo: '석류석 별 (μ Cep / Erakis)',
    nameEn: 'Herschel’s Garnet Star (μ Cep)',
    typeKo: '적색 초거성 (M2 Ia 변광성)',
    isDSO: false,
    mag: '4.08 mag',
    magSub: '변광 범위 3.4 ~ 5.1 mag',
    size: '1,260 R☉',
    sizeSub: '태양 반지름의 약 1,260배 (시직경 ~0.021″)',
    distance: '2,840 광년',
    distanceSub: '약 870 파섹 (pc)',
  },
  {
    keys: ['ALBIREO', 'BETA CYG', 'β CYG', 'β1 CYG', '알비레오'],
    nameKo: '알비레오 (β Cyg)',
    nameEn: 'Albireo Double Star System',
    typeKo: '안시 이중성 (황금색 K3II + 청색 B8V)',
    isDSO: false,
    mag: '3.05 mag',
    magSub: 'β¹(3.05m) + β²(5.12m), 각거리 35″',
    size: '69 R☉ (주성)',
    sizeSub: '태양 반지름의 약 69배',
    distance: '434 광년',
    distanceSub: '약 133 파섹 (pc)',
  },
  {
    keys: ['VEGA', 'ALPHA LYR', 'α LYR', '베가', '직녀성'],
    nameKo: '베가 (직녀성 / α Lyr)',
    nameEn: 'Vega (Alpha Lyrae)',
    typeKo: '청백색 주계열성 (A0Va 표준성)',
    isDSO: false,
    mag: '0.03 mag',
    magSub: '광도 등급 기준 별 (북반구 2위 밝기)',
    size: '2.36 × 2.82 R☉',
    sizeSub: '시직경 3.28 밀리초각 (mas)',
    distance: '25.04 광년',
    distanceSub: '약 7.68 파섹 (pc)',
  },
  {
    keys: ['EPSILON1 LYRAE', 'EPSILON2 LYRAE', 'ε¹ LYR', 'ε² LYR', 'ε1 LYR', 'ε2 LYR', 'DOUBLE DOUBLE', '더블더블'],
    nameKo: '거문고자리 더블더블 (ε¹·ε² Lyr)',
    nameEn: 'Double Double (Epsilon Lyrae)',
    typeKo: '사중 쌍성계 (Quadruple Star System)',
    isDSO: false,
    mag: '4.59 / 4.67 mag',
    magSub: 'ε¹·ε² 분리각 208″ (하위 쌍성 ~2.3″)',
    size: '2.5 R☉ (각 주성)',
    sizeSub: 'A2V ~ A8V형 주계열성 4중계',
    distance: '162 광년',
    distanceSub: '약 49.7 파섹 (pc)',
  },
  {
    keys: ['DENEB', 'ALPHA CYG', 'α CYG', '데네브'],
    nameKo: '데네브 (α Cyg)',
    nameEn: 'Deneb (Alpha Cygni)',
    typeKo: '청백색 초거성 (A2 Ia)',
    isDSO: false,
    mag: '1.25 mag',
    magSub: '여름철 대삼각형 꼭짓점 (절대등급 -8.4m)',
    size: '203 R☉',
    sizeSub: '태양 반지름의 약 203배',
    distance: '2,615 광년',
    distanceSub: '약 802 파섹 (pc)',
  },
  {
    keys: ['SADR', 'GAMMA CYG', 'γ CYG', '사드르'],
    nameKo: '사드르 (γ Cyg)',
    nameEn: 'Sadr (Gamma Cygni)',
    typeKo: '황백색 초거성 (F8 Ib)',
    isDSO: false,
    mag: '2.23 mag',
    magSub: '백조자리 십자 중심성',
    size: '150 R☉',
    sizeSub: '태양 반지름의 약 150배',
    distance: '1,800 광년',
    distanceSub: '약 550 파섹 (pc)',
  },
  {
    keys: ['BETELGEUSE', 'ALPHA ORI', 'α ORI', '베텔게우스'],
    nameKo: '베텔게우스 (α Ori)',
    nameEn: 'Betelgeuse (Alpha Orionis)',
    typeKo: '적색 초거성 (M1-2 Ia-ab)',
    isDSO: false,
    mag: '0.45 mag',
    magSub: '반규칙 변광성 (0.0 ~ 1.6 mag)',
    size: '764 ~ 887 R☉',
    sizeSub: '시직경 약 0.044″ (태양계 화성 궤도 크기)',
    distance: '548 광년',
    distanceSub: '약 168 파섹 (pc)',
  },
  {
    keys: ['RIGEL', 'BETA ORI', 'β ORI', '리겔'],
    nameKo: '리겔 (β Ori)',
    nameEn: 'Rigel (Beta Orionis)',
    typeKo: '청색 초거성 (B8 Ia)',
    isDSO: false,
    mag: '0.18 mag',
    magSub: '오리온자리 최광도 별 (태양 광도 12만 배)',
    size: '78.9 R☉',
    sizeSub: '태양 반지름의 약 79배',
    distance: '863 광년',
    distanceSub: '약 264 파섹 (pc)',
  },
  {
    keys: ['ALNILAM', 'EPSILON ORI', 'ε ORI', '알닐람'],
    nameKo: '알닐람 (ε Ori)',
    nameEn: 'Alnilam (Epsilon Orionis)',
    typeKo: '청색 초거성 (B0 Ia)',
    isDSO: false,
    mag: '1.69 mag',
    magSub: '오리온 삼태성 중앙 별',
    size: '32.4 R☉',
    sizeSub: '태양 반지름의 약 32배',
    distance: '2,000 광년',
    distanceSub: '약 613 파섹 (pc)',
  },
  {
    keys: ['ALNITAK', 'ZETA ORI', 'ζ ORI', '알니탁'],
    nameKo: '알니탁 (ζ Ori)',
    nameEn: 'Alnitak (Zeta Orionis)',
    typeKo: '청색 초거성 삼중성계 (O9.5 Iab)',
    isDSO: false,
    mag: '1.74 mag',
    magSub: '말머리·불꽃 성운 인접 밝은 별',
    size: '20.0 R☉',
    sizeSub: '태양 반지름의 약 20배',
    distance: '1,260 광년',
    distanceSub: '약 387 파섹 (pc)',
  },
  {
    keys: ['MINTAKA', 'DELTA ORI', 'δ ORI', '민타카'],
    nameKo: '민타카 (δ Ori)',
    nameEn: 'Mintaka (Delta Orionis)',
    typeKo: '다중 청색 거성계 (O9.5 II)',
    isDSO: false,
    mag: '2.25 mag',
    magSub: '오리온 삼태성 서쪽 끝 별',
    size: '16.5 R☉',
    sizeSub: '태양 반지름의 약 16.5배',
    distance: '1,200 광년',
    distanceSub: '약 368 파섹 (pc)',
  },
  {
    keys: ['SIRIUS', 'ALPHA CMA', 'α CMA', '시리우스', '천랑성'],
    nameKo: '시리우스 (α CMa)',
    nameEn: 'Sirius (Alpha Canis Majoris)',
    typeKo: '백색 주계열성 + 백색왜성 쌍성 (A0mA1 Va)',
    isDSO: false,
    mag: '-1.46 mag',
    magSub: '밤하늘에서 가장 밝은 항성',
    size: '1.71 R☉',
    sizeSub: '태양 반지름의 1.71배',
    distance: '8.60 광년',
    distanceSub: '약 2.64 파섹 (pc)',
  },
  {
    keys: ['POLARIS', 'ALPHA UMI', 'α UMI', '북극성', '폴라리스'],
    nameKo: '북극성 (폴라리스 / α UMi)',
    nameEn: 'Polaris (North Star)',
    typeKo: '황색 초거성 (F7 Ib 세페이드 변광성)',
    isDSO: false,
    mag: '1.97 mag',
    magSub: '천구의 북극 인접 표준성',
    size: '37.5 R☉',
    sizeSub: '태양 반지름의 약 37.5배',
    distance: '433 광년',
    distanceSub: '약 133 파섹 (pc)',
  },
];

export function resolveCelestialPhysicalSummary(
  ann: AstrometryAnnotationItem,
  calibration?: AstrometryCalibration
): CelestialPhysicalSummary {
  const safeNames = Array.isArray(ann.names) ? ann.names.filter(Boolean) : [];
  const rawFirst = safeNames[0] || '천체';
  const typeLower = (ann.type || '').toLowerCase();
  const isDSOType =
    typeLower === 'ngc' ||
    typeLower === 'ic' ||
    typeLower === 'messier' ||
    typeLower === 'dso' ||
    /^(m\s*\d+|c\s*\d+|ngc\s*\d+|ic\s*\d+)/i.test(rawFirst.trim());

  const formattedDisplayName = isDSOType
    ? extractPrimaryObjectIdentifier(safeNames) || formatTitleWithCatalogPriority(rawFirst)
    : formatTitleWithCatalogPriority(rawFirst);

  const upperCandidates = [formattedDisplayName, ...safeNames].map((s) => s.toUpperCase());

  // 1. Check Curated Physical DB
  for (const record of CURATED_PHYSICAL_DB) {
    const matched = record.keys.some((k) =>
      upperCandidates.some((cand) => {
        const cleanCand = cand.replace(/\s+/g, ' ').trim();
        const cleanKey = k.toUpperCase().trim();
        if (cleanCand === cleanKey) return true;
        // Word boundary match for catalog IDs like M42, C28, NGC 628
        const regex = new RegExp(`(^|[^A-Z0-9])${cleanKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^A-Z0-9]|$)`, 'i');
        return regex.test(cleanCand);
      })
    );

    if (matched) {
      const vmagText =
        typeof ann.vmag === 'number' && !isNaN(ann.vmag)
          ? `${ann.vmag.toFixed(2)} mag`
          : record.mag;

      return {
        displayName: formattedDisplayName,
        subtitleKo: `${record.nameKo} (${record.nameEn})`,
        categoryBadge: record.typeKo,
        isDSO: record.isDSO,
        apparentMagnitude: vmagText,
        apparentMagnitudeSub: record.magSub,
        sizeText: record.size,
        sizeSub: record.sizeSub,
        distanceText: record.distance,
        distanceSub: record.distanceSub,
        pixelCoords: `(${Math.round(ann.pixelx)}, ${Math.round(ann.pixely)}) px`,
        rawTargetQuery: safeNames[0] || formattedDisplayName,
      };
    }
  }

  // 2. Check DEEP_SKY_OBJECTS in celestialCatalog.ts
  for (const dso of DEEP_SKY_OBJECTS) {
    const dsoUpper = dso.catalogId.toUpperCase();
    if (
      upperCandidates.some(
        (c) =>
          c.includes(dsoUpper) ||
          dsoUpper.includes(c) ||
          c.includes(dso.nameEn.toUpperCase()) ||
          c.includes(dso.nameKo)
      )
    ) {
      return {
        displayName: dso.catalogId,
        subtitleKo: `${dso.nameKo} (${dso.nameEn})`,
        categoryBadge: `심우주 천체 · ${dso.typeKo}`,
        isDSO: true,
        apparentMagnitude: `${(ann.vmag ?? dso.mag).toFixed(1)} mag`,
        apparentMagnitudeSub: dso.mag <= 6.0 ? '맨눈/쌍안경 관측 가능' : '천체망원경 관측 대상',
        sizeText: `${dso.sizeArcmin}′`,
        sizeSub: `시직경 약 ${(dso.sizeArcmin / 60).toFixed(2)}°`,
        distanceText: dso.type === 'galaxy' ? '약 1,500만~3,000만 광년' : '약 1,500~5,000 광년',
        distanceSub: dso.type === 'galaxy' ? '외부 은하계 (Extragalactic)' : '우리은하 나선팔 영역',
        pixelCoords: `(${Math.round(ann.pixelx)}, ${Math.round(ann.pixely)}) px`,
        rawTargetQuery: safeNames[0] || dso.catalogId,
      };
    }
  }

  // 3. Check BRIGHT_STARS in celestialCatalog.ts
  for (const star of BRIGHT_STARS) {
    if (
      upperCandidates.some(
        (c) =>
          c.includes(star.bayer.toUpperCase()) ||
          c.includes(star.nameEn.toUpperCase()) ||
          c.includes(star.nameKo)
      )
    ) {
      const vmag = ann.vmag ?? star.mag;
      // Estimate stellar distance and size from magnitude
      const approxDistLy = vmag < 1.5 ? 65 : vmag < 2.5 ? 180 : vmag < 3.5 ? 310 : 480;
      const approxPc = Math.round(approxDistLy / 3.26156);
      const approxRadiusSolar = vmag < 1.5 ? '12.5 R☉' : vmag < 2.5 ? '6.2 R☉' : '3.4 R☉';

      return {
        displayName: `${star.bayer} (${star.nameKo})`,
        subtitleKo: `${star.nameKo} · ${star.nameEn}`,
        categoryBadge: `항성 (Bright Star · ${star.constellation})`,
        isDSO: false,
        apparentMagnitude: `${vmag.toFixed(2)} mag`,
        apparentMagnitudeSub: vmag <= 2.0 ? '1~2등성 주요 기준성' : '별자리 주요 구성 항성',
        sizeText: approxRadiusSolar,
        sizeSub: '항성 물리 반지름 추정치',
        distanceText: `약 ${approxDistLy.toLocaleString()} 광년`,
        distanceSub: `약 ${approxPc.toLocaleString()} 파섹 (pc)`,
        pixelCoords: `(${Math.round(ann.pixelx)}, ${Math.round(ann.pixely)}) px`,
        rawTargetQuery: star.bayer,
      };
    }
  }

  // 4. Generic fallback based on annotation properties & WCS calibration
  const vmagVal = typeof ann.vmag === 'number' && !isNaN(ann.vmag) ? ann.vmag : isDSOType ? 8.8 : 5.4;
  const pixscale = calibration?.pixscale && calibration.pixscale > 0 ? calibration.pixscale : 3.5;
  const angularDiamArcsec = Math.max(4, (ann.radius || (isDSOType ? 24 : 8)) * 2 * pixscale);
  const angularSizeStr =
    angularDiamArcsec >= 60
      ? `${(angularDiamArcsec / 60).toFixed(1)}′ (${Math.round(angularDiamArcsec)}″)`
      : `${angularDiamArcsec.toFixed(1)}″`;

  if (isDSOType) {
    const isGalaxy = /NGC\s*\d+/i.test(formattedDisplayName) && vmagVal > 8.0;
    return {
      displayName: formattedDisplayName,
      subtitleKo: safeNames.length > 1 ? safeNames.join(' · ') : `${formattedDisplayName} 심우주 천체`,
      categoryBadge: isGalaxy ? '심우주 천체 (DSO · 성단/은하)' : '심우주 천체 (DSO · 성운/성단)',
      isDSO: true,
      apparentMagnitude: `${vmagVal.toFixed(1)} mag`,
      apparentMagnitudeSub: vmagVal <= 6.5 ? '쌍안경/소형망원경 대상' : '장노출 천체사진/망원경 대상',
      sizeText: angularSizeStr,
      sizeSub: `WCS 검출 반경 ${Math.round(ann.radius || 18)} px`,
      distanceText: isGalaxy ? '약 2,500만 광년' : '약 2,800 광년',
      distanceSub: isGalaxy ? '국부 초은하단 영역 추정' : '우리은하 오리온-백조 팔 영역',
      pixelCoords: `(${Math.round(ann.pixelx)}, ${Math.round(ann.pixely)}) px`,
      rawTargetQuery: safeNames[0] || formattedDisplayName,
    };
  }

  // Star fallback
  const estDistLy = Math.round(Math.pow(10, (vmagVal - 1.2 + 5) / 5) * 3.26156);
  const clampedDistLy = Math.max(25, Math.min(3500, estDistLy));
  const clampedPc = Math.round(clampedDistLy / 3.26156);

  return {
    displayName: formattedDisplayName,
    subtitleKo: safeNames.length > 1 ? safeNames.slice(0, 2).join(' · ') : '카탈로그 검출 항성',
    categoryBadge: '항성 (Catalog Star)',
    isDSO: false,
    apparentMagnitude: `${vmagVal.toFixed(2)} mag`,
    apparentMagnitudeSub: vmagVal <= 6.0 ? '육안 가시권 항성' : '망원경 검출 항성',
    sizeText: vmagVal < 3.5 ? '4.2 R☉' : '1.8 R☉',
    sizeSub: `성상 반경 ${(ann.radius || 7).toFixed(1)} px (${angularSizeStr})`,
    distanceText: `약 ${clampedDistLy.toLocaleString()} 광년`,
    distanceSub: `약 ${clampedPc.toLocaleString()} 파섹 (pc)`,
    pixelCoords: `(${Math.round(ann.pixelx)}, ${Math.round(ann.pixely)}) px`,
    rawTargetQuery: safeNames[0] || formattedDisplayName,
  };
}
