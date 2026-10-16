import React, { useEffect, useState } from 'react';
import { X, Database, ExternalLink, Loader2, Star, Sparkles, MapPin } from 'lucide-react';
import { SimbadObjectData } from '../types/astronomy';

interface SimbadInspectorModalProps {
  targetName: string | null;
  onClose: () => void;
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

    // Clean target name: e.g. "β Cas / 11 Cas" -> "beta Cas" or "M 31" -> "M31"
    const cleaned = targetName
      .split('/')[0]
      .replace(/[\(\)]/g, '')
      .replace(/Part of the constellation/i, '')
      .replace(/The constellation/i, '')
      .trim();

    fetch(`/api/astro/simbad?target=${encodeURIComponent(cleaned)}`)
      .then((res) => {
        if (!res.ok) throw new Error(`CDS SIMBAD query returned status ${res.status}`);
        return res.json();
      })
      .then((json) => {
        if (isMounted) {
          setData(json);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message || 'CDS SIMBAD 실시간 데이터베이스 조회를 실패했습니다.');
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [targetName]);

  if (!targetName) return null;

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
            <div className="py-6 px-4 bg-rose-950/40 border border-rose-800/60 rounded-xl text-xs text-rose-300">
              <p className="font-semibold">{error}</p>
              <p className="mt-1 text-slate-400">
                특정 별칭 또는 임의 식별자의 경우 직접 SIMBAD 포털에서 검색하실 수 있습니다.
              </p>
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
                  href={`https://simbad.cds.unistra.fr/simbad/sim-id?Ident=${encodeURIComponent(data.standardName)}`}
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
