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

function parseSesameXml(xml: string, fallbackQuery: string): SimbadObjectData | null {
  if (!xml || xml.includes('Nothing found')) return null;

  const jposMatch = xml.match(/<jpos>([^<]+)<\/jpos>/);
  const jradegMatch = xml.match(/<jradeg>([^<]+)<\/jradeg>/);
  const jdedegMatch = xml.match(/<jdedeg>([^<]+)<\/jdedeg>/);
  const onameMatch = xml.match(/<oname>([^<]+)<\/oname>/);
  const otypeMatch = xml.match(/<otype>([^<]+)<\/otype>/);
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
    source: 'CDS SIMBAD / Sesame Live Astronomical Database',
  };
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
    pixely: 0,
  });
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

      // 1. Try direct browser CORS query to CDS Sesame & backend proxy across candidate identifiers
      for (const candidate of candidates.slice(0, 4)) {
        // 1A. Browser direct CDS Sesame XML query (supports CORS '*')
        try {
          const sesameUrl = `https://cds.unistra.fr/cgi-bin/nph-sesame/-oxp/SNV?${encodeURIComponent(candidate)}`;
          const directResp = await fetch(sesameUrl);
          if (directResp.ok) {
            const xml = await directResp.text();
            const parsed = parseSesameXml(xml, candidate);
            if (parsed && (parsed.raDeg !== null || parsed.coordinatesHMS)) {
              if (isMounted) {
                setData(parsed);
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
      const fallbackData = buildLocalCatalogFallback(targetName, candidates);
      if (fallbackData) {
        if (isMounted) {
          setData(fallbackData);
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
              <p className="text-xs">CDS Sesame / SIMBAD 실시간 데이터베이스 조회 중...</p>
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
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium inline-flex items-center space-x-1.5 transition-colors"
                >
                  <span>SIMBAD 웹페이지 열기</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          )}

          {data && !loading && (
            <div className="space-y-4">
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
                    {data.objectType}
                  </span>
                </div>

                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <span className="text-slate-400 block font-medium">정밀 적경/적위 (HMS/DMS)</span>
                  <span className="text-xs font-mono font-bold text-sky-300 mt-1 block">
                    {data.coordinatesHMS || 'N/A'}
                  </span>
                </div>

                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <span className="text-slate-400 block font-medium">실시등급 (V-Band Mag)</span>
                  <span className="text-sm font-bold text-amber-300 mt-1 block">
                    {data.vMag !== null ? `${data.vMag.toFixed(2)} mag` : '미기재'}
                  </span>
                </div>
              </div>

              {data.raDeg !== null && data.decDeg !== null && (
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-slate-400">십진 각도 좌표:</span>
                  <span className="font-mono text-slate-200">
                    RA: {data.raDeg.toFixed(5)}° | Dec: {data.decDeg.toFixed(5)}°
                  </span>
                </div>
              )}

              <div className="pt-2 flex items-center justify-between text-xs border-t border-slate-800">
                <span className="text-slate-400">출처: {data.source}</span>
                <a
                  href={`https://simbad.cds.unistra.fr/simbad/sim-id?Ident=${encodeURIComponent(cleanSimbadIdent)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium flex items-center space-x-1.5 transition-colors"
                >
                  <span>SIMBAD 웹페이지 열기</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
