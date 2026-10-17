/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  Telescope,
  Sparkles,
  Database,
  Upload,
  Globe,
  Compass,
  AlertCircle,
  Loader2,
  ExternalLink,
  Layers,
  Clock,
  Plus,
} from 'lucide-react';
import { Navbar } from './components/Navbar';
import { StarPhotoViewer } from './components/StarPhotoViewer';
import { CelestialStarChart } from './components/CelestialStarChart';
import { AstroTelemetryPanel } from './components/AstroTelemetryPanel';
import { SimbadInspectorModal } from './components/SimbadInspectorModal';
import { UploadPlateSolveModal } from './components/UploadPlateSolveModal';
import { AnalysisHistoryDrawer } from './components/AnalysisHistoryDrawer';
import { EmptyState } from './components/EmptyState';
import { SolvedAstroData, AnalysisHistoryItem } from './types/astronomy';
import { identifyConstellations } from './utils/constellations';
import { degToRA_HMS, degToDec_DMS } from './utils/coordinateMath';
import { SAMPLE_SOLVED_JOBS } from './data/sampleShowcase';

const STORAGE_KEY = 'astroplate_user_history';

export default function App() {
  const [loading, setLoading] = useState(true);
  const [solvedData, setSolvedData] = useState<SolvedAstroData | null>(null);
  const [activeJobId, setActiveJobId] = useState<number | string | null>(null);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [history, setHistory] = useState<AnalysisHistoryItem[]>([]);

  // Modals state
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isHistoryDrawerOpen, setIsHistoryDrawerOpen] = useState(false);
  const [modalInitialFile, setModalInitialFile] = useState<File | null>(null);
  const [modalInitialUrl, setModalInitialUrl] = useState<string>('');
  const [selectedTargetForSimbad, setSelectedTargetForSimbad] = useState<string | null>(null);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  // Reset all state to clean initial home view when AstroPlate logo/brand is clicked
  const handleResetHome = useCallback(() => {
    setSolvedData(null);
    setActiveJobId(null);
    setErrorNotice(null);
    setLoading(false);
    setIsUploadModalOpen(false);
    setIsHistoryDrawerOpen(false);
    setModalInitialFile(null);
    setModalInitialUrl('');
  }, []);

  // Open modal on click - user clicks upload area inside modal to choose file
  const handleOpenNewPhoto = () => {
    setModalInitialFile(null);
    setModalInitialUrl('');
    setIsUploadModalOpen(true);
  };

  // Check API key & load remembered history
  useEffect(() => {
    fetch('/api/astrometry/status')
      .then((r) => {
        if (!r.ok) return { hasApiKey: false };
        const ct = r.headers.get('content-type') || '';
        return ct.includes('application/json') ? r.json() : { hasApiKey: false };
      })
      .then((d) => setHasApiKey(Boolean(d?.hasApiKey)))
      .catch(() => setHasApiKey(false));

    // Read local storage history
    let localHistory: AnalysisHistoryItem[] = [];
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        localHistory = JSON.parse(stored);
      }
    } catch (e) {
      console.error('Failed to parse localStorage history:', e);
    }

    // Also sync with server history and Astrometry.net my-jobs
    fetch('/api/astrometry/history')
      .then((r) => {
        if (!r.ok) throw new Error('Static environment or no server history');
        const ct = r.headers.get('content-type') || '';
        if (!ct.includes('application/json')) throw new Error('Not JSON response');
        return r.json();
      })
      .then(async (data) => {
        const serverHistory: AnalysisHistoryItem[] = data?.history || [];
        const map = new Map<string, AnalysisHistoryItem>();

        serverHistory.forEach((item) => map.set(String(item.jobId), item));
        localHistory.forEach((item) => map.set(String(item.jobId), item));

        const combined = Array.from(map.values()).sort((a, b) => b.timestamp - a.timestamp);
        setHistory(combined);
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(combined));
        } catch (e) {}

        // If user has analyzed photos in history, restore the most recent one
        if (combined.length > 0) {
          loadJobData(combined[0].jobId, combined[0].imageUrl, false);
        } else {
          // If local history is empty, try auto-sync from user's Astrometry.net account
          try {
            const myJobsResp = await fetch('/api/astrometry/my-jobs');
            if (myJobsResp.ok) {
              const ct = myJobsResp.headers.get('content-type') || '';
              if (ct.includes('application/json')) {
                const myJobsData = await myJobsResp.json();
                const myJobs = myJobsData.detailed || [];
                const solvedJobs = myJobs.filter((j: any) => j.status === 'success' && j.jobId);
                if (solvedJobs.length > 0) {
                  loadJobData(solvedJobs[0].jobId, undefined, true);
                  return;
                }
              }
            }
          } catch (e) {
            console.error('Failed to auto-sync my-jobs on mount:', e);
          }
          // Default to sample showcase so page is immediately rich and visible
          setSolvedData(SAMPLE_SOLVED_JOBS[0]);
          setActiveJobId(SAMPLE_SOLVED_JOBS[0].jobId);
          setLoading(false);
        }
      })
      .catch(() => {
        if (localHistory.length > 0) {
          setHistory(localHistory);
          loadJobData(localHistory[0].jobId, localHistory[0].imageUrl, false);
        } else {
          // In static GitHub pages deployment without backend, show rich sample showcase immediately
          setSolvedData(SAMPLE_SOLVED_JOBS[0]);
          setActiveJobId(SAMPLE_SOLVED_JOBS[0].jobId);
          setLoading(false);
        }
      });
  }, []);

  // Save item to history keyed by Job ID with full solved data cache
  const saveToHistory = useCallback((solved: SolvedAstroData, customImgUrl?: string) => {
    const primaryConst = solved.matchedConstellations[0];
    const starsCount = solved.annotations.filter(
      (a) => a.type === 'bright' || a.type === 'star' || a.type === 'hd'
    ).length;
    const dsosCount = solved.annotations.length - starsCount;

    // Use reliable image URLs linked to Job ID
    const validImgUrl = `/api/astrometry/image-proxy/${solved.jobId}/annotated`;
    const validRawImgUrl =
      solved.rawImageUrl ||
      (customImgUrl && !customImgUrl.startsWith('blob:')
        ? customImgUrl
        : `/api/astrometry/image-proxy/${solved.jobId}/original`);

    const newItem: AnalysisHistoryItem = {
      id: `job_${solved.jobId}`,
      jobId: solved.jobId,
      title: solved.title || `Job #${solved.jobId}`,
      imageUrl: validImgUrl,
      rawImageUrl: validRawImgUrl,
      timestamp: Date.now(),
      raDeg: solved.calibration.ra,
      decDeg: solved.calibration.dec,
      radiusDeg: solved.calibration.radius,
      primaryConstellationKo: primaryConst?.nameKo || '천구 별자리',
      primaryConstellationCode: primaryConst?.code || '',
      starsCount,
      dsosCount,
      solvedData: {
        ...solved,
        imageUrl: validImgUrl,
        rawImageUrl: validRawImgUrl,
      },
    };

    setHistory((prev) => {
      const filtered = prev.filter((h) => String(h.jobId) !== String(solved.jobId));
      const updated = [newItem, ...filtered];
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });

    // Sync to server endpoint
    fetch('/api/astrometry/history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newItem),
    }).catch(() => {});
  }, []);

  // Fetch full Astrometry solved data for a specific Job ID
  const loadJobData = async (
    jobId: number | string,
    customImageUrl?: string,
    shouldSaveToHistory = true
  ) => {
    setLoading(true);
    setErrorNotice(null);

    // 1. First, check if full solvedData is already cached in history for this Job ID
    const existingHist = history.find((h) => String(h.jobId) === String(jobId));
    if (existingHist?.solvedData && String(existingHist.solvedData.jobId) === String(jobId)) {
      setSolvedData(existingHist.solvedData);
      setActiveJobId(jobId);
      setLoading(false);
      return;
    }

    // 2. Check pre-computed sample jobs
    const sample = SAMPLE_SOLVED_JOBS.find((s) => String(s.jobId) === String(jobId));
    if (sample && (!customImageUrl || customImageUrl.startsWith('blob:'))) {
      setSolvedData(sample);
      setActiveJobId(sample.jobId);
      if (shouldSaveToHistory) {
        saveToHistory(sample);
      }
      setLoading(false);
      return;
    }

    // 3. Fetch from Astrometry.net API using Job ID
    try {
      const resp = await fetch(`/api/astrometry/jobs/${jobId}/full`);
      if (!resp.ok) {
        if (sample) {
          setSolvedData(sample);
          setActiveJobId(sample.jobId);
          if (shouldSaveToHistory) saveToHistory(sample);
          return;
        }
        throw new Error(`Job #${jobId} 데이터 조회 실패 (HTTP ${resp.status})`);
      }

      const raw = await resp.json();
      const calibration = raw.calibration;
      const annotations = raw.annotations || [];
      const info = raw.info || {};

      // Match constellations using IAU definitions, Astrometry tags, coordinates, and star annotations
      const matched = identifyConstellations(
        info.tags || [],
        info.objects_in_field || [],
        calibration?.ra || 0,
        calibration?.dec || 0,
        annotations
      );

      // Determine photo URLs: canonical Astrometry image proxies for this specific Job ID
      const resolvedImageUrl = `/api/astrometry/image-proxy/${jobId}/annotated`;
      const resolvedRawImageUrl =
        customImageUrl && !customImageUrl.startsWith('blob:')
          ? customImageUrl
          : `/api/astrometry/image-proxy/${jobId}/original`;

      const calW =
        calibration?.width_arcsec && calibration?.pixscale && calibration.pixscale > 0
          ? Math.round(calibration.width_arcsec / calibration.pixscale)
          : 1920;
      const calH =
        calibration?.height_arcsec && calibration?.pixscale && calibration.pixscale > 0
          ? Math.round(calibration.height_arcsec / calibration.pixscale)
          : 1080;

      const solved: SolvedAstroData = {
        jobId,
        title: info.original_filename || `Astrometry Plate Solve #${jobId}`,
        imageUrl: resolvedImageUrl,
        rawImageUrl: resolvedRawImageUrl,
        imageWidth: calW,
        imageHeight: calH,
        calibration,
        annotations,
        info,
        matchedConstellations: matched,
      };

      setSolvedData(solved);
      setActiveJobId(jobId);

      // Automatically remember analyzed photo in history
      if (shouldSaveToHistory) {
        saveToHistory(solved, resolvedRawImageUrl);
      }
    } catch (err: any) {
      console.error('Failed to load job data:', err);
      if (existingHist?.solvedData) {
        setSolvedData(existingHist.solvedData);
        setActiveJobId(jobId);
      } else if (sample) {
        setSolvedData(sample);
        setActiveJobId(sample.jobId);
        if (shouldSaveToHistory) saveToHistory(sample);
      } else {
        setErrorNotice(err.message || `Astrometry.net Job #${jobId} 데이터 로드 중 오류가 발생했습니다.`);
      }
    } finally {
      setLoading(false);
    }
  };

  // Delete single history item
  const handleDeleteHistoryItem = (id: string) => {
    setHistory((prev) => {
      const updated = prev.filter((item) => item.id !== id);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {}

      // If active job was deleted, switch to first item or null
      const deletedItem = prev.find((item) => item.id === id);
      if (deletedItem && String(deletedItem.jobId) === String(activeJobId)) {
        if (updated.length > 0) {
          loadJobData(updated[0].jobId, updated[0].imageUrl, false);
        } else {
          setSolvedData(null);
          setActiveJobId(null);
        }
      }
      return updated;
    });

    fetch(`/api/astrometry/history/${id}`, { method: 'DELETE' }).catch(() => {});
  };

  // Clear all history
  const handleClearAllHistory = () => {
    setHistory([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {}
    setSolvedData(null);
    setActiveJobId(null);
    fetch('/api/astrometry/history', { method: 'DELETE' }).catch(() => {});
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-sky-500 selection:text-white">
      {/* Navigation Header */}
      <Navbar
        onOpenUpload={handleOpenNewPhoto}
        onOpenJobInput={() => setIsUploadModalOpen(true)}
        onOpenHistory={() => setIsHistoryDrawerOpen(true)}
        onReset={handleResetHome}
        historyCount={history.length}
        hasApiKey={hasApiKey}
      />

      {/* Main Content Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Error Notification */}
        {errorNotice && (
          <div className="p-4 bg-rose-950/50 border border-rose-800/80 rounded-2xl text-xs text-rose-300 flex items-center justify-between shadow-lg">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-400" />
              <span>{errorNotice}</span>
            </div>
            <button
              onClick={() => setErrorNotice(null)}
              className="text-xs px-2.5 py-1 rounded bg-rose-900/60 hover:bg-rose-800 text-white transition-colors"
            >
              닫기
            </button>
          </div>
        )}

        {/* Loading Spinner */}
        {loading && (
          <div className="h-96 bg-slate-900 rounded-2xl border border-slate-800 flex flex-col items-center justify-center space-y-4">
            <Loader2 className="w-10 h-10 text-sky-400 animate-spin" />
            <div className="text-center">
              <p className="text-sm font-bold text-white">
                nova.astrometry.net 실시간 관측 데이터베이스 분석 중...
              </p>
              <p className="text-xs text-slate-400 mt-1">
                WCS 정밀 좌표 추출 및 성도 별자리 매칭 알고리즘 적용 중
              </p>
            </div>
          </div>
        )}

        {/* Empty State: Shown when no photo has been analyzed yet */}
        {!loading && !solvedData && (
          <EmptyState
            onStartUpload={(file) => {
              setModalInitialFile(file);
              setIsUploadModalOpen(true);
            }}
            onSubmitUrl={(url) => {
              setModalInitialUrl(url);
              setIsUploadModalOpen(true);
            }}
            onSubmitJobId={(jobId) => loadJobData(jobId, undefined, true)}
            onSelectSampleJob={(sample) => {
              setSolvedData(sample);
              setActiveJobId(sample.jobId);
              saveToHistory(sample);
            }}
            hasApiKey={hasApiKey}
          />
        )}

        {/* Target Header Banner (When photo is solved) */}
        {!loading && solvedData && (
          <div className="bg-slate-900/80 rounded-2xl border border-slate-800 p-5 shadow-xl flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-sky-950 text-sky-400 border border-sky-800">
                  실시간 솔빙 완료 (Solved)
                </span>
                <span className="text-xs font-mono text-slate-400">
                  Job ID: #{solvedData.jobId}
                </span>
                <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-sky-400" />
                  기록에 저장됨
                </span>
              </div>

              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-1">
                {solvedData.title || `천체 관측 사진 #${solvedData.jobId}`}
              </h1>

              <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-slate-300">
                <span className="flex items-center gap-1 text-sky-300 font-medium">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  주요 별자리:{' '}
                  <strong className="text-white">
                    {solvedData.matchedConstellations[0]?.nameKo || '천구 별자리'} (
                    {solvedData.matchedConstellations[0]?.code})
                  </strong>
                </span>
                <span className="text-slate-600">•</span>
                <span className="font-mono text-slate-300">
                  RA: <strong className="text-sky-400">{degToRA_HMS(solvedData.calibration.ra)}</strong>
                </span>
                <span className="text-slate-600">•</span>
                <span className="font-mono text-slate-300">
                  Dec: <strong className="text-sky-400">{degToDec_DMS(solvedData.calibration.dec)}</strong>
                </span>
                <span className="text-slate-600">•</span>
                <span>
                  화각: <strong className="text-indigo-300">{solvedData.calibration.radius.toFixed(2)}°</strong>
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => setIsHistoryDrawerOpen(true)}
                className="text-xs px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center space-x-1.5 transition-colors shadow-sm"
              >
                <Clock className="w-3.5 h-3.5 text-sky-400" />
                <span>분석 기록 ({history.length})</span>
              </button>
            </div>
          </div>
        )}

        {/* Main Presentation Panels */}
        {!loading && solvedData && (
          <div className="space-y-6">
            {/* 1. Main Photograph Viewer with Constellation & Star Overlays */}
            <section aria-label="천체 사진 별자리 오버레이 뷰어">
              <StarPhotoViewer
                data={solvedData}
                onSelectObject={(obj) => setSelectedTargetForSimbad(obj)}
              />
            </section>

            {/* 2. Interactive Celestial Star Chart (성도 연동) */}
            <section aria-label="실시간 성도 연동 및 별자리 매칭">
              <CelestialStarChart
                data={solvedData}
                onSelectConstellation={(code) => {
                  console.log('Selected constellation:', code);
                }}
              />
            </section>

            {/* 3. WCS Calibration Telemetry & Catalog Table */}
            <section aria-label="천체 좌표 및 원격 측정 카탈로그">
              <AstroTelemetryPanel
                data={solvedData}
                onSelectObject={(obj) => setSelectedTargetForSimbad(obj)}
              />
            </section>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 border-t border-slate-800 py-6 text-xs text-slate-400 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleResetHome}
            title="AstroPlate 홈으로 초기화 (메인 화면으로 이동)"
            className="flex items-center space-x-2 text-left hover:text-white transition-colors cursor-pointer group"
          >
            <Telescope className="w-4 h-4 text-sky-400 group-hover:text-sky-300 transition-colors" />
            <span className="font-semibold text-slate-300 group-hover:text-white transition-colors">AstroPlate Platform</span>
            <span>— 실시간 Astrometry.net API &amp; IAU 성도 별자리 매칭 시스템</span>
          </button>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setIsHistoryDrawerOpen(true)}
              className="hover:text-sky-400 transition-colors flex items-center gap-1"
            >
              <Clock className="w-3 h-3" />
              <span>내 분석 기록 ({history.length})</span>
            </button>
            <a
              href="https://nova.astrometry.net/api_help"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-sky-400 transition-colors"
            >
              Astrometry API Help
            </a>
            <a
              href="https://simbad.cds.unistra.fr/simbad/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-sky-400 transition-colors"
            >
              CDS SIMBAD
            </a>
          </div>
        </div>
      </footer>

      {/* Upload & Solve Modal */}
      <UploadPlateSolveModal
        isOpen={isUploadModalOpen}
        onClose={() => {
          setIsUploadModalOpen(false);
          setModalInitialFile(null);
          setModalInitialUrl('');
        }}
        onSolveSuccess={(jobId, imgUrl) => loadJobData(jobId, imgUrl, true)}
        hasApiKey={hasApiKey}
        initialFile={modalInitialFile}
        initialUrl={modalInitialUrl}
      />

      {/* Analysis History Drawer */}
      <AnalysisHistoryDrawer
        isOpen={isHistoryDrawerOpen}
        onClose={() => setIsHistoryDrawerOpen(false)}
        history={history}
        activeJobId={activeJobId}
        onSelectJob={(jobId) => loadJobData(jobId, undefined, false)}
        onDeleteItem={handleDeleteHistoryItem}
        onClearAll={handleClearAllHistory}
        onSyncMyJobs={async () => {
          try {
            const resp = await fetch('/api/astrometry/my-jobs');
            if (resp.ok) {
              const data = await resp.json();
              const jobs = data.detailed || [];
              if (jobs.length > 0 && jobs[0].jobId) {
                loadJobData(jobs[0].jobId, undefined, true);
              }
            }
          } catch (e) {
            console.error('Failed to sync my jobs:', e);
          }
        }}
      />

      {/* CDS SIMBAD Real-time Database Inspector Modal */}
      <SimbadInspectorModal
        targetName={selectedTargetForSimbad}
        onClose={() => setSelectedTargetForSimbad(null)}
      />
    </div>
  );
}
