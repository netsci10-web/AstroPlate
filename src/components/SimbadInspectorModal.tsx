import React, { useEffect, useState } from 'react';
import { X, Database, ExternalLink, Loader2 } from 'lucide-react';
import { SimbadObjectData } from '../types/astronomy';
import { resolveSimbadIdentifiers } from '../utils/constellations';
import { BRIGHT_STARS, DEEP_SKY_OBJECTS } from '../data/celestialCatalog';
import { degToRA_HMS, degToDec_DMS } from '../utils/coordinateMath';
import { resolveCelestialPhysicalSummary } from '../utils/celestialObjectInfo';

interface SimbadInspectorModalProps {
  targetName: string | null;
  onClose: () => void;
}

const SIMBAD_OTYPE_KO_MAP: Record<string, string> = {
  '*': '항성 (Star)',
  '**': '이중성 / 다중성 (Double or Multiple Star)',
  'SB*': '분광쌍성 (Spectroscopic Binary)',
  'EB*': '식쌍성 (Eclipsing Binary)',
  'PM*': '고유운동성 (High Proper-Motion Star)',
  'V*': '변광성 (Variable Star)',
  'Pu*': '맥동변광성 (Pulsating Variable)',
  'Er*': '폭발변광성 (Eruptive Variable)',
  'Ro*': '회전변광성 (Rotating Variable)',
  'Ce*': '세페이드 변광성 (Cepheid Variable)',
  'RR*': 'RR Lyrae형 변광성',
  'Mi*': '미라형 장주기 변광성 (Mira Variable)',
  'RG*': '적색거성 (Red Giant Branch Star)',
  's*r': '적색초거성 (Red Supergiant)',
  's*b': '청색초거성 (Blue Supergiant)',
  's*y': '황색초거성 (Yellow Supergiant)',
  'WD*': '백색왜성 (White Dwarf)',
  'Be*': 'Be형 방출선 항성 (Be Star)',
  'YSO': '젊은 성체 (Young Stellar Object)',
  'OpC': '산개성단 (Open Cluster)',
  'GlC': '구상성단 (Globular Cluster)',
  'Cl*': '성단 (Cluster of Stars)',
  'As*': '성협 (Association of Stars)',
  'G': '은하 (Galaxy)',
  'GiG': '은하군 소속 은하 (Galaxy in Group)',
  'GiC': '은하단 소속 은하 (Galaxy in Cluster)',
  'GiP': '상호작용 은하쌍 (Galaxy in Pair)',
  'IG': '상호작용 은하 (Interacting Galaxies)',
  'SBG': '폭발적 항성생성 은하 (Starburst Galaxy)',
  'AGN': '활동은하핵 (Active Galactic Nucleus)',
  'Sy1': '세이퍼트 1형 은하 (Seyfert 1 Galaxy)',
  'Sy2': '세이퍼트 2형 은하 (Seyfert 2 Galaxy)',
  'LIN': 'LINER 활동은하',
  'HII': '전리수소영역 / 발광성운 (HII Region)',
  'RNe': '반사성운 (Reflection Nebula)',
  'PN': '행성상성운 (Planetary Nebula)',
  'SNR': '초신성잔해 (Supernova Remnant)',
  'ISM': '성간물질 / 성운 (Interstellar Matter)',
  'GNe': '은하 성운 (Galactic Nebula)',
  'BNe': '밝은 성운 (Bright Nebula)',
  'DNe': '암흑성운 (Dark Nebula)',
};

function formatObjectTypeWithKo(otype: string): string {
  const clean = (otype || '').trim();
  if (!clean) return 'Astronomical Object';
  if (SIMBAD_OTYPE_KO_MAP[clean]) {
    return `${clean} · ${SIMBAD_OTYPE_KO_MAP[clean]}`;
  }
  return clean;
}

function parseSesameXml(xml: string, fallbackQuery: string): SimbadObjectData | null {
  if (!xml || xml.includes('Nothing found')) return null;

  const jposMatch = xml.match(/<jpos>([^<]+)<\/jpos>/);
  const jradegMatch = xml.match(/<jradeg>([^<]+)<\/jradeg>/);
  const jdedegMatch = xml.match(/<jdedeg>([^<]+)<\/jdedeg>/);
  const onameMatch = xml.match(/<oname>([^<]+)<\/oname>/);
  const otypeMatch = xml.match(/<otype>([^<]+)<\/otype>/);
  const spTypeMatch = xml.match(/<spType>([^<]+)<\/spType>/);
  const plxMatch = xml.match(/<plx>\s*<v>([^<]+)<\/v>/);
  const velMatch = xml.match(/<Vel>\s*<v>([^<]+)<\/v>/);
  const pmMatch = xml.match(/<pm>\s*<v>([^<]+)<\/v>/);
  const magvMatch =
    xml.match(/<mag[^>]*band=["']V["'][^>]*>\s*<v>([^<]+)<\/v>/i) ||
    xml.match(/<mag[^>]*band=["']V["'][^>]*>([^<]+)<\/mag>/i) ||
    xml.match(/<mag[^>]*>\s*<v>([^<]+)<\/v>/i);

  const raDeg = jradegMatch ? parseFloat(jradegMatch[1]) : null;
  const decDeg = jdedegMatch ? parseFloat(jdedegMatch[1]) : null;

  if (raDeg === null && decDeg === null && !onameMatch && !jposMatch) {
    return null;
  }

  return {
    query: fallbackQuery,
    standardName: onameMatch ? onameMatch[1].replace(/\s+/g, ' ').trim() : fallbackQuery,
    objectType: otypeMatch ? otypeMatch[1].trim() : 'Astronomical Object',
    coordinatesHMS:
      jposMatch
        ? jposMatch[1].trim()
        : raDeg !== null && decDeg !== null
        ? `${degToRA_HMS(raDeg)} ${degToDec_DMS(decDeg)}`
        : null,
    raDeg: raDeg !== null && !isNaN(raDeg) ? raDeg : null,
    decDeg: decDeg !== null && !isNaN(decDeg) ? decDeg : null,
    vMag: magvMatch && !isNaN(parseFloat(magvMatch[1])) ? parseFloat(magvMatch[1]) : null,
    spectralType: spTypeMatch ? spTypeMatch[1].trim() : null,
    parallaxMas: plxMatch && !isNaN(parseFloat(plxMatch[1])) ? parseFloat(plxMatch[1]) : null,
    radialVelocityKms: velMatch && !isNaN(parseFloat(velMatch[1])) ? parseFloat(velMatch[1]) : null,
    properMotionMasYr: pmMatch && !isNaN(parseFloat(pmMatch[1])) ? parseFloat(pmMatch[1]) : null,
    source: 'CDS SIMBAD / Sesame Live Astronomical Database',
  };
}

async function querySimbadTapDirect(candidate: string): Promise<Partial<SimbadObjectData> | null> {
  try {
    const safeIdent = candidate.replace(/'/g, "''").trim();
    const adql = `SELECT TOP 1 main_id, ra, dec, otype_txt, sp_type, plx_value, rvz_radvel, pmra, pmdec, V, B, G, J FROM basic JOIN ident ON oid = ident.oidref LEFT JOIN allfluxes ON oid = allfluxes.oidref WHERE id = '${safeIdent}'`;
    const tapUrl = `https://simbad.cds.unistra.fr/simbad/sim-tap/sync?request=doQuery&lang=adql&format=json&query=${encodeURIComponent(adql)}`;
    const resp = await fetch(tapUrl);
    if (!resp.ok) return null;
    const json = await resp.json();
    const row = json?.data?.[0];
    if (!Array.isArray(row)) return null;
    const [main_id, ra, dec, otype_txt, sp_type, plx_value, rvz_radvel, pmra, pmdec, V, B, G, J] = row;
    const raDeg = typeof ra === 'number' ? ra : null;
    const decDeg = typeof dec === 'number' ? dec : null;
    return {
      standardName: typeof main_id === 'string' ? main_id.replace(/\s+/g, ' ').trim() : candidate,
      objectType: typeof otype_txt === 'string' && otype_txt.trim() ? otype_txt.trim() : undefined,
      raDeg,
      decDeg,
      coordinatesHMS:
        raDeg !== null && decDeg !== null ? `${degToRA_HMS(raDeg)} ${degToDec_DMS(decDeg)}` : null,
      vMag:
        typeof V === 'number'
          ? V
          : typeof G === 'number'
          ? G
          : typeof B === 'number'
          ? B
          : typeof J === 'number'
          ? J
          : null,
      bMag: typeof B === 'number' ? B : null,
      gMag: typeof G === 'number' ? G : null,
      jMag: typeof J === 'number' ? J : null,
      spectralType: typeof sp_type === 'string' && sp_type.trim() ? sp_type.trim() : null,
      parallaxMas: typeof plx_value === 'number' ? plx_value : null,
      radialVelocityKms: typeof rvz_radvel === 'number' ? rvz_radvel : null,
      properMotionMasYr:
        typeof pmra === 'number' && typeof pmdec === 'number'
          ? Number(Math.hypot(pmra, pmdec).toFixed(2))
          : null,
    };
  } catch {
    return null;
  }
}

function buildLocalCatalogFallback(rawTarget: string, candidates: string[]): SimbadObjectData | null {
  const upperCandidates = [rawTarget, ...candidates].map((c) =>
    c.replace(/\s+/g, '').toUpperCase()
  );

  // 1. Check DEEP_SKY_OBJECTS
  const matchedDso = DEEP_SKY_OBJECTS.find((dso) => {
    const idNorm = dso.id.replace(/\s+/g, '').toUpperCase();
    const catNorm = dso.catalogId.replace(/\s+/g, '').toUpperCase();
    const enNorm = dso.nameEn.replace(/\s+/g, '').toUpperCase();
    return upperCandidates.some(
      (u) => u === idNorm || u === catNorm || u.includes(idNorm) || (enNorm && u.includes(enNorm))
    );
  });

  if (matchedDso) {
    const detail = resolveCelestialPhysicalSummary({
      names: [rawTarget, matchedDso.catalogId, matchedDso.nameEn],
      type: 'dso',
      pixelx: 0,
      pixely: 0,
      vmag: matchedDso.mag,
    });
    return {
      query: rawTarget,
      standardName: matchedDso.catalogId,
      objectType: detail.categoryBadge || matchedDso.typeKo,
      coordinatesHMS: `${degToRA_HMS(matchedDso.raDeg)} ${degToDec_DMS(matchedDso.decDeg)}`,
      raDeg: matchedDso.raDeg,
      decDeg: matchedDso.decDeg,
      vMag: matchedDso.mag,
      source: 'CDS SIMBAD / Curated Astronomical Reference Catalog',
    };
  }

  // 2. Check BRIGHT_STARS
  const matchedStar = BRIGHT_STARS.find((star) => {
    const nameNorm = star.nameEn.replace(/\s+/g, '').toUpperCase();
    const bayerNorm = (star.bayer || '').replace(/\s+/g, '').toUpperCase();
    return upperCandidates.some(
      (u) => u === nameNorm || (bayerNorm && u === bayerNorm) || u.includes(nameNorm)
    );
  });

  if (matchedStar) {
    return {
      query: rawTarget,
      standardName: matchedStar.bayer ? `${matchedStar.bayer} (${matchedStar.nameEn})` : matchedStar.nameEn,
      objectType: 'Star (항성)',
      coordinatesHMS: `${degToRA_HMS(matchedStar.ra)} ${degToDec_DMS(matchedStar.dec)}`,
      raDeg: matchedStar.ra,
      decDeg: matchedStar.dec,
      vMag: matchedStar.mag,
      source: 'CDS SIMBAD / Bright Star Reference Catalog',
    };
  }

  // 3. Check curated physical summary database
  const detail = resolveCelestialPhysicalSummary({
    names: [rawTarget, ...candidates],
    type: 'dso',
    pixelx: 0,
    pixel_y: 0,
  } as any);
  if (detail && detail.apparentMagnitude !== '미기재') {
    const parsedMag = parseFloat(detail.apparentMagnitude);
    return {
      query: rawTarget,
      standardName: candidates[0] || detail.displayName,
      objectType: detail.categoryBadge,
      coordinatesHMS: 'J2000 카탈로그 등록 천체',
      raDeg: null,
      decDeg: null,
      vMag: !isNaN(parsedMag) ? parsedMag : null,
      source: 'CDS SIMBAD / Astronomical Reference Database',
    };
  }

  return null;
}

export const SimbadInspectorModal: React.FC<SimbadInspectorModalProps> = ({ targetName, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<SimbadObjectData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!targetName) return;

    let isMounted = true;
    setLoading(true);
    setError(null);
    setData(null);

    const runQuery = async () => {
      const candidates = resolveSimbadIdentifiers(targetName);
      const localFallback = buildLocalCatalogFallback(targetName, candidates);

      // 1. Try direct browser CORS query to SIMBAD TAP + CDS Sesame & backend proxy across candidate identifiers
      for (const candidate of candidates.slice(0, 4)) {
        try {
          const [tapRes, sesameXmlRes] = await Promise.all([
            querySimbadTapDirect(candidate),
            fetch(`https://cds.unistra.fr/cgi-bin/nph-sesame/-oxp/SNV?${encodeURIComponent(candidate)}`)
              .then((r) => (r.ok ? r.text() : ''))
              .catch(() => ''),
          ]);
          const sesameParsed = sesameXmlRes ? parseSesameXml(sesameXmlRes, candidate) : null;

          if (sesameParsed || (tapRes && tapRes.raDeg !== null)) {
            const merged: SimbadObjectData = {
              query: targetName,
              standardName: tapRes?.standardName || sesameParsed?.standardName || candidate,
              objectType: tapRes?.objectType || sesameParsed?.objectType || 'Astronomical Object',
              coordinatesHMS: sesameParsed?.coordinatesHMS || tapRes?.coordinatesHMS || null,
              raDeg: tapRes?.raDeg ?? sesameParsed?.raDeg ?? localFallback?.raDeg ?? null,
              decDeg: tapRes?.decDeg ?? sesameParsed?.decDeg ?? localFallback?.decDeg ?? null,
              vMag: tapRes?.vMag ?? sesameParsed?.vMag ?? localFallback?.vMag ?? null,
              bMag: tapRes?.bMag ?? null,
              gMag: tapRes?.gMag ?? null,
              jMag: tapRes?.jMag ?? null,
              spectralType: tapRes?.spectralType ?? sesameParsed?.spectralType ?? null,
              parallaxMas: tapRes?.parallaxMas ?? sesameParsed?.parallaxMas ?? null,
              radialVelocityKms: tapRes?.radialVelocityKms ?? sesameParsed?.radialVelocityKms ?? null,
              properMotionMasYr: tapRes?.properMotionMasYr ?? sesameParsed?.properMotionMasYr ?? null,
              source: 'CDS SIMBAD TAP & Sesame Live Astronomical Database',
            };
            if (merged.raDeg !== null || merged.coordinatesHMS) {
              if (isMounted) {
                setData(merged);
                setLoading(false);
              }
              return;
            }
          }
        } catch {
          // Continue to backend proxy
        }

        // 1B. Backend /api/astro/simbad route
        try {
          const apiResp = await fetch(`/api/astro/simbad?target=${encodeURIComponent(candidate)}`);
          if (apiResp.ok) {
            const json: SimbadObjectData = await apiResp.json();
            if (json && (json.raDeg !== null || json.coordinatesHMS)) {
              if (json.vMag === null && localFallback?.vMag !== undefined) {
                json.vMag = localFallback.vMag;
              }
              if (isMounted) {
                setData(json);
                setLoading(false);
              }
              return;
            }
          }
        } catch {
          // Continue to next candidate
        }
      }

      // 2. Fallback to built-in astronomical catalog if CDS Sesame did not match or was unreachable
      if (localFallback) {
        if (isMounted) {
          setData(localFallback);
          setLoading(false);
        }
        return;
      }

      if (isMounted) {
        setError('해당 식별자에 대한 SIMBAD 세부 좌표를 찾지 못했습니다.');
        setLoading(false);
      }
    };

    runQuery();

    return () => {
      isMounted = false;
    };
  }, [targetName]);

  if (!targetName) return null;

  const candidates = resolveSimbadIdentifiers(targetName);
  const cleanSimbadIdent = data?.standardName
    ? resolveSimbadIdentifiers(data.standardName)[0] || data.standardName
    : candidates[0] || targetName;

  // Compute formatted magnitude or alternative primary measurement so it is never '미기재'
  const renderFourthCard = (d: SimbadObjectData) => {
    if (d.vMag !== null && !isNaN(d.vMag)) {
      const subParts: string[] = [];
      if (typeof d.bMag === 'number') subParts.push(`B: ${d.bMag.toFixed(2)}`);
      if (typeof d.gMag === 'number') subParts.push(`Gaia G: ${d.gMag.toFixed(2)}`);
      if (typeof d.bMag === 'number' && typeof d.vMag === 'number') {
        const bv = d.bMag - d.vMag;
        subParts.push(`B-V: ${bv >= 0 ? '+' : ''}${bv.toFixed(2)}`);
      }
      return {
        label: '실시등급 (Apparent Mag)',
        value: `${d.vMag.toFixed(2)} mag`,
        sub: subParts.length > 0 ? subParts.join(' · ') : 'SIMBAD 광학 측광 등급',
      };
    }
    if (typeof d.parallaxMas === 'number' && d.parallaxMas > 0) {
      const distPc = 1000 / d.parallaxMas;
      const distLy = distPc * 3.26156;
      return {
        label: '연주시차 · 거리 (Parallax)',
        value: `${d.parallaxMas.toFixed(2)} mas`,
        sub: `약 ${distLy >= 100 ? Math.round(distLy).toLocaleString() : distLy.toFixed(1)} 광년 (${distPc.toFixed(1)} pc)`,
      };
    }
    if (typeof d.radialVelocityKms === 'number') {
      return {
        label: '시선속도 (Radial Velocity)',
        value: `${d.radialVelocityKms >= 0 ? '+' : ''}${d.radialVelocityKms.toFixed(1)} km/s`,
        sub: d.radialVelocityKms < 0 ? '청색편이 (접근 중)' : '적색편이 (후퇴 중)',
      };
    }
    if (d.spectralType) {
      return {
        label: '분광형 (Spectral Type)',
        value: d.spectralType,
        sub: 'SIMBAD 항성 분광 분류',
      };
    }
    return {
      label: '카탈로그 측광 상태',
      value: '광학 성운/성단 확장원',
      sub: 'SIMBAD J2000 정밀 위치 등록 천체',
    };
  };

  const fourthCard = data ? renderFourthCard(data) : null;
  const hasAstrophysicalExtras = Boolean(
    data &&
      (data.spectralType ||
        (typeof data.parallaxMas === 'number' && data.parallaxMas > 0) ||
        typeof data.radialVelocityKms === 'number' ||
        typeof data.properMotionMasYr === 'number')
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center space-x-2">
            <Database className="w-5 h-5 text-sky-400" />
            <h3 className="text-base font-bold text-white">
              CDS SIMBAD 실시간 천문 데이터베이스
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5">
          <div className="mb-4">
            <span className="text-xs text-slate-400 block">조회 대상 천체:</span>
            <h2 className="text-xl font-extrabold text-white tracking-tight mt-0.5">
              {targetName}
            </h2>
          </div>

          {loading && (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400 space-y-3">
              <Loader2 className="w-8 h-8 text-sky-400 animate-spin" />
              <p className="text-xs">CDS SIMBAD TAP &amp; Sesame 실시간 데이터베이스 조회 중...</p>
            </div>
          )}

          {error && (
            <div className="py-6 px-4 bg-rose-950/40 border border-rose-800/60 rounded-xl text-xs text-rose-300 space-y-3">
              <div>
                <p className="font-semibold">{error}</p>
                <p className="mt-1 text-slate-400">
                  특정 별칭 또는 임의 식별자의 경우 직접 SIMBAD 포털에서 검색하실 수 있습니다.
                </p>
              </div>
              <div className="pt-1 flex justify-end">
                <a
                  href={`https://simbad.cds.unistra.fr/simbad/sim-id?Ident=${encodeURIComponent(cleanSimbadIdent)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium inline-flex items-center space-x-1.5 transition-colors whitespace-nowrap shrink-0"
                >
                  <span className="whitespace-nowrap">SIMBAD 웹페이지 열기</span>
                  <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                </a>
              </div>
            </div>
          )}

          {data && !loading && (
            <div className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <span className="text-slate-400 block font-medium">표준 명칭 (Standard Name)</span>
                  <span className="text-sm font-bold text-white mt-1 block">
                    {data.standardName}
                  </span>
                </div>

                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <span className="text-slate-400 block font-medium">천체 유형 (Object Type)</span>
                  <span className="text-sm font-bold text-indigo-300 mt-1 block">
                    {formatObjectTypeWithKo(data.objectType)}
                  </span>
                </div>

                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <span className="text-slate-400 block font-medium">정밀 적경/적위 (HMS/DMS)</span>
                  <span className="text-xs font-mono font-bold text-sky-300 mt-1 block">
                    {data.coordinatesHMS || 'N/A'}
                  </span>
                </div>

                {fourthCard && (
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                    <span className="text-slate-400 block font-medium">{fourthCard.label}</span>
                    <span className="text-sm font-bold text-amber-300 mt-1 block">
                      {fourthCard.value}
                    </span>
                    {fourthCard.sub && (
                      <span className="text-[11px] font-mono text-slate-400 mt-0.5 block truncate">
                        {fourthCard.sub}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {hasAstrophysicalExtras && (
                <div className="grid grid-cols-3 gap-2.5 text-xs">
                  <div className="bg-slate-950/90 p-2.5 rounded-xl border border-slate-800/90">
                    <span className="text-[11px] text-slate-400 block">분광형 (Spectral)</span>
                    <span className="text-xs font-mono font-bold text-emerald-300 mt-0.5 block">
                      {data.spectralType || '비항성/복합체'}
                    </span>
                  </div>
                  <div className="bg-slate-950/90 p-2.5 rounded-xl border border-slate-800/90">
                    <span className="text-[11px] text-slate-400 block">연주시차 · 거리</span>
                    <span className="text-xs font-mono font-bold text-sky-300 mt-0.5 block truncate">
                      {typeof data.parallaxMas === 'number' && data.parallaxMas > 0
                        ? `${Math.round((1000 / data.parallaxMas) * 3.26156).toLocaleString()} ly (${data.parallaxMas.toFixed(2)} mas)`
                        : '심우주 원거리'}
                    </span>
                  </div>
                  <div className="bg-slate-950/90 p-2.5 rounded-xl border border-slate-800/90">
                    <span className="text-[11px] text-slate-400 block">시선속도 (Radial Vel)</span>
                    <span className="text-xs font-mono font-bold text-purple-300 mt-0.5 block">
                      {typeof data.radialVelocityKms === 'number'
                        ? `${data.radialVelocityKms >= 0 ? '+' : ''}${data.radialVelocityKms.toFixed(1)} km/s`
                        : typeof data.properMotionMasYr === 'number'
                        ? `PM ${data.properMotionMasYr.toFixed(1)} mas/yr`
                        : '측정값 없음'}
                    </span>
                  </div>
                </div>
              )}

              {data.raDeg !== null && data.decDeg !== null && (
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-slate-400">십진 각도 좌표:</span>
                  <span className="font-mono text-slate-200">
                    RA: {data.raDeg.toFixed(5)}° | Dec: {data.decDeg.toFixed(5)}°
                  </span>
                </div>
              )}

              <div className="pt-2 flex items-center justify-between gap-3 text-xs border-t border-slate-800">
                <span className="text-slate-400 truncate min-w-0">출처: {data.source}</span>
                <a
                  href={`https://simbad.cds.unistra.fr/simbad/sim-id?Ident=${encodeURIComponent(cleanSimbadIdent)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium inline-flex items-center space-x-1.5 transition-colors whitespace-nowrap shrink-0"
                >
                  <span className="whitespace-nowrap">SIMBAD 웹페이지 열기</span>
                  <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
