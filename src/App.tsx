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
  Camera,
  Activity,
  RotateCcw,
  Cpu,
} from 'lucide-react';
import { Navbar, GlobalAppTheme } from './components/Navbar';
import { StarPhotoViewer } from './components/StarPhotoViewer';
import { CelestialStarChart } from './components/CelestialStarChart';
import { AstroTelemetryPanel } from './components/AstroTelemetryPanel';
import { SimbadInspectorModal } from './components/SimbadInspectorModal';
import { UploadPlateSolveModal } from './components/UploadPlateSolveModal';
import { MyAccountJobsDrawer } from './components/MyAccountJobsDrawer';
import { DualIndexCatalogModal } from './components/DualIndexCatalogModal';
import { EmptyState } from './components/EmptyState';
import { SolvedAstroData, AnalysisHistoryItem } from './types/astronomy';
import {
  identifyConstellations,
  getConstellationObjectTitle,
  formatTitleWithCatalogPriority,
} from './utils/constellations';
import { degToRA_HMS, degToDec_DMS } from './utils/coordinateMath';
import { SAMPLE_SOLVED_JOBS } from './data/sampleShowcase';
import {
  extractStarsImage2XY,
  verifyAndSnapAnnotationsToDetectedStars,
  solvePlateLocallyInBrowser,
} from './utils/localPlateSolver';
import { buildDualIndexTelemetryForCalibration } from './utils/dualIndexCatalog';
import {
  getRememberedAccountJobs,
  rememberAccountJob,
  deleteRememberedAccountJob,
  clearAllRememberedAccountJobs,
  getDeletedJobIds,
  isJobDeleted,
} from './utils/accountJobs';

const STORAGE_KEY = 'astroplate_account_jobs';
const LEGACY_STORAGE_KEY = 'astroplate_user_history';
const THEME_STORAGE_KEY = 'astroplate_global_theme';

export type MainTab = 'photo' | 'chart' | 'telemetry';

export default function App() {
  const [loading, setLoading] = useState(false);
  const [solvedData, setSolvedData] = useState<SolvedAstroData | null>(null);
  const [activeJobId, setActiveJobId] = useState<number | string | null>(null);
  const [activeMainTab, setActiveMainTab] = useState<MainTab>('photo');
  const [hasApiKey, setHasApiKey] = useState(false);
  const [accountJobs, setAccountJobs] = useState<AnalysisHistoryItem[]>([]);
  const [globalTheme, setGlobalTheme] = useState<GlobalAppTheme>(() => {
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY);
      if (saved === 'daylight' || saved === 'deep_space') return saved;
    } catch {}
    return 'deep_space';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', globalTheme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, globalTheme);
    } catch {}
  }, [globalTheme]);

  const handleToggleGlobalTheme = useCallback(() => {
    setGlobalTheme((prev) => (prev === 'deep_space' ? 'daylight' : 'deep_space'));
  }, []);

  // Modals state
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isAccountJobsDrawerOpen, setIsAccountJobsDrawerOpen] = useState(false);
  const [isDualIndexModalOpen, setIsDualIndexModalOpen] = useState(false);
  const [modalInitialFile, setModalInitialFile] = useState<File | null>(null);
  const [modalInitialUrl, setModalInitialUrl] = useState<string>('');
  const [modalInitialTab, setModalInitialTab] = useState<'upload' | 'url' | 'jobId' | 'myJobs'>('upload');
  const [selectedTargetForSimbad, setSelectedTargetForSimbad] = useState<string | null>(null);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);
  const [isReAnalyzing, setIsReAnalyzing] = useState(false);
  const [reAnalyzeStatus, setReAnalyzeStatus] = useState<string | null>(null);

  // Reset all state to clean initial home view when AstroPlate logo/brand is clicked
  const handleResetHome = useCallback(() => {
    setSolvedData(null);
    setActiveJobId(null);
    setActiveMainTab('photo');
    setErrorNotice(null);
    setLoading(false);
    setIsUploadModalOpen(false);
    setIsAccountJobsDrawerOpen(false);
    setIsDualIndexModalOpen(false);
    setModalInitialFile(null);
    setModalInitialUrl('');
    setModalInitialTab('upload');
  }, []);

  // Open modal for file upload
  const handleOpenNewPhoto = () => {
    setModalInitialFile(null);
    setModalInitialUrl('');
    setModalInitialTab('upload');
    setIsUploadModalOpen(true);
  };

  // Open modal directly for Job ID lookup
  const handleOpenJobInput = () => {
    setModalInitialFile(null);
    setModalInitialUrl('');
    setModalInitialTab('jobId');
    setIsUploadModalOpen(true);
  };

  // Re-run astrophoto plate solve analysis on the current photo
  const handleReAnalyzeCurrentPhoto = async () => {
    if (!solvedData) {
      handleOpenNewPhoto();
      return;
    }

    setIsReAnalyzing(true);
    setReAnalyzeStatus('천체사진 simplexy 항성 추출 및 Equal-Density 듀얼 인덱스 정밀 재분석 중...');

    try {
      const imgSrc =
        solvedData.rawImageUrl ||
        solvedData.imageUrl ||
        `/api/astrometry/image-proxy/${solvedData.jobId}/original`;

      const primaryConst = solvedData.matchedConstellations[0];
      const targetHint = primaryConst?.nameKo || '';
      const fovDeg = solvedData.calibration?.radius ? solvedData.calibration.radius * 2 : undefined;

      const rawOrigName = solvedData.info?.original_filename || solvedData.title || '';
      const trailingFileMatch = rawOrigName.match(/\(([^()]+\.(?:jpg|jpeg|png|fit|fits|tif|tiff|webp))\)\s*\)*$/i);
      const cleanReAnalyzeFilename = trailingFileMatch
        ? trailingFileMatch[1].trim()
        : /\.(?:jpg|jpeg|png|fit|fits|tif|tiff|webp)$/i.test(rawOrigName.trim())
        ? rawOrigName.trim()
        : formatTitleWithCatalogPriority(solvedData.title || `Job #${solvedData.jobId}`);

      const result = await solvePlateLocallyInBrowser(imgSrc, {
        filename: cleanReAnalyzeFilename,
        targetHint,
        fovHintDeg: fovDeg,
        onProgress: (p) => {
          if (p.message) setReAnalyzeStatus(p.message);
        },
      });

      setSolvedData(result);
      setActiveJobId(result.jobId);
      setActiveMainTab('photo');
      saveToAccountJobs(result, result.rawImageUrl);
      setErrorNotice(null);
    } catch (err: any) {
      console.warn('Direct re-solve fallback to modal:', err);
      const imgSrc = solvedData.rawImageUrl || solvedData.imageUrl;
      if (imgSrc && !imgSrc.startsWith('blob:') && !imgSrc.startsWith('data:')) {
        setModalInitialUrl(imgSrc);
        setModalInitialTab('url');
      } else {
        setModalInitialTab('upload');
      }
      setIsUploadModalOpen(true);
    } finally {
      setIsReAnalyzing(false);
      setReAnalyzeStatus(null);
    }
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

    // Read remembered account jobs from local storage (with legacy fallback)
    let localJobs: AnalysisHistoryItem[] = [];
    try {
      const stored = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          localJobs = parsed
            .filter(
              (item) =>
                item &&
                item.jobId &&
                !isJobDeleted(item.jobId) &&
                !(String(item.jobId).startsWith('local_') && item.raDeg === 280 && item.decDeg === -28)
            )
            .sort((a, b) => {
              const timeA = typeof a.timestamp === 'number' && !isNaN(a.timestamp) ? a.timestamp : 0;
              const timeB = typeof b.timestamp === 'number' && !isNaN(b.timestamp) ? b.timestamp : 0;
              if (timeB !== timeA) return timeB - timeA;
              const numA = Number(String(a.jobId).replace(/\D/g, '')) || 0;
              const numB = Number(String(b.jobId).replace(/\D/g, '')) || 0;
              return numB - numA;
            });
        }
      }
    } catch (e) {
      console.error('Failed to parse localStorage account jobs:', e);
    }

    const validLocalJobs = localJobs
      .filter((item) => !isJobDeleted(item.jobId))
      .map((item) => ({
        ...item,
        primaryConstellationKo: getConstellationObjectTitle(
          item.primaryConstellationKo,
          item.raDeg,
          item.decDeg,
          item.objects || [],
          item.title,
          item.solvedData?.title
        ),
      }));

    setAccountJobs(validLocalJobs);
    setSolvedData(null);
    setActiveJobId(null);
    setLoading(false);
  }, []);

  // Sync with job update / delete events across components
  useEffect(() => {
    const handleJobsSync = (e: any) => {
      const deleted = getDeletedJobIds();
      setAccountJobs((prev) => {
        const filtered = prev.filter((j) => !deleted.has(String(j.jobId)));
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
        } catch (e) {}
        return filtered;
      });
      if (e?.detail?.action === 'clearAll') {
        setAccountJobs([]);
        setSolvedData(null);
        setActiveJobId(null);
      }
    };
    window.addEventListener('astroplate_jobs_updated', handleJobsSync);
    return () => window.removeEventListener('astroplate_jobs_updated', handleJobsSync);
  }, []);

  // Save item to account jobs keyed by Job ID with full solved data cache
  const saveToAccountJobs = useCallback((solved: SolvedAstroData, customImgUrl?: string) => {
    const safeAnnotations = Array.isArray(solved.annotations) ? solved.annotations : [];
    const primaryConst = solved.matchedConstellations?.[0];
    const constTitle = getConstellationObjectTitle(
      primaryConst?.nameKo,
      solved.calibration.ra,
      solved.calibration.dec,
      [...(solved.info?.objects_in_field || []), ...(solved.info?.tags || [])],
      solved.info?.original_filename,
      solved.title
    );
    const starsCount = safeAnnotations.filter(
      (a) => a.type === 'bright' || a.type === 'star' || a.type === 'hd'
    ).length;
    const dsosCount = safeAnnotations.length - starsCount;

    // Use reliable image URLs linked to Job ID (preserve Data URLs for local in-browser jobs)
    const isLocalJob = String(solved.jobId).startsWith('local_');
    const validImgUrl = isLocalJob
      ? solved.imageUrl
      : `/api/astrometry/image-proxy/${solved.jobId}/annotated`;
    const validRawImgUrl = isLocalJob
      ? solved.rawImageUrl || solved.imageUrl
      : solved.rawImageUrl ||
        (customImgUrl && !customImgUrl.startsWith('blob:')
          ? customImgUrl
          : `/api/astrometry/image-proxy/${solved.jobId}/original`);

    const formattedSolvedTitle = formatTitleWithCatalogPriority(
      solved.title || solved.info?.original_filename || '',
      [...(solved.info?.objects_in_field || []), ...(solved.info?.tags || [])]
    );
    const isGenericSolvedTitle =
      !formattedSolvedTitle ||
      /^(image|img|photo|dsc|stacked|astrometry|plate|capture|test|frame|light)[_\-\d\s.]*\.(jpg|jpeg|png|fit|fits|tif|tiff|webp)$/i.test(
        formattedSolvedTitle.trim()
      ) ||
      /^Astrometry Plate Solve #/i.test(formattedSolvedTitle.trim());

    const effectiveTitle = isGenericSolvedTitle ? constTitle : formattedSolvedTitle;

    const newItem: AnalysisHistoryItem = {
      id: `job_${solved.jobId}`,
      jobId: solved.jobId,
      title: effectiveTitle || `Job #${solved.jobId}`,
      imageUrl: validImgUrl,
      rawImageUrl: validRawImgUrl,
      timestamp: Date.now(),
      raDeg: solved.calibration.ra,
      decDeg: solved.calibration.dec,
      radiusDeg: solved.calibration.radius,
      primaryConstellationKo: constTitle,
      primaryConstellationCode: primaryConst?.code || '',
      starsCount,
      dsosCount,
      objects: solved.info?.objects_in_field || solved.info?.tags || [],
      solvedData: {
        ...solved,
        annotations: safeAnnotations,
        imageUrl: validImgUrl,
        rawImageUrl: validRawImgUrl,
      },
    };

    // Remember Job ID in accountJobs store
    rememberAccountJob(
      solved.jobId,
      solved.title,
      solved.info?.objects_in_field || [],
      'success',
      solved.calibration
    );

    setAccountJobs((prev) => {
      const filtered = prev.filter((h) => String(h.jobId) !== String(solved.jobId));
      const updated = [newItem, ...filtered].sort((a, b) => {
        const timeA = typeof a.timestamp === 'number' && !isNaN(a.timestamp) ? a.timestamp : 0;
        const timeB = typeof b.timestamp === 'number' && !isNaN(b.timestamp) ? b.timestamp : 0;
        if (timeB !== timeA) return timeB - timeA;
        const numA = Number(String(a.jobId).replace(/\D/g, '')) || 0;
        const numB = Number(String(b.jobId).replace(/\D/g, '')) || 0;
        return numB - numA;
      });
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
    shouldSaveToAccountJobs = true
  ) => {
    setLoading(true);
    setErrorNotice(null);
    setActiveMainTab('photo');

    const strJobId = String(jobId);
    const isLocalJob = strJobId.startsWith('local_');

    // 1. Search cached job record in accountJobs or localStorage
    let existingJob = accountJobs.find((h) => String(h.jobId) === strJobId);
    if (!existingJob) {
      try {
        const stored = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            existingJob = parsed.find((h: any) => String(h?.jobId) === strJobId);
          }
        }
      } catch {}
    }

    // If full solvedData is already preserved
    if (existingJob?.solvedData && String(existingJob.solvedData.jobId) === strJobId) {
      const cachedData: SolvedAstroData = {
        ...existingJob.solvedData,
        annotations: Array.isArray(existingJob.solvedData.annotations)
          ? existingJob.solvedData.annotations
          : [],
      };
      setSolvedData(cachedData);
      setActiveJobId(jobId);
      setLoading(false);
      return;
    }

    // 2. Check pre-computed sample jobs
    const sample = SAMPLE_SOLVED_JOBS.find((s) => String(s.jobId) === strJobId);
    if (sample && (!customImageUrl || customImageUrl.startsWith('blob:'))) {
      setSolvedData(sample);
      setActiveJobId(sample.jobId);
      if (shouldSaveToAccountJobs) {
        saveToAccountJobs(sample);
      }
      setLoading(false);
      return;
    }

    // 3. Reconstruct local in-browser job if record exists in storage
    if (existingJob && (isLocalJob || typeof existingJob.raDeg === 'number')) {
      const ra = typeof existingJob.raDeg === 'number' ? existingJob.raDeg : 0;
      const dec = typeof existingJob.decDeg === 'number' ? existingJob.decDeg : 0;
      const radius =
        typeof existingJob.radiusDeg === 'number' && existingJob.radiusDeg > 0
          ? existingJob.radiusDeg
          : 1;
      const matched = identifyConstellations(ra, dec, radius);
      const dualIndexTelemetry = buildDualIndexTelemetryForCalibration(ra, dec, radius);
      const resolvedImg =
        existingJob.imageUrl ||
        customImageUrl ||
        (isLocalJob ? '' : `/api/astrometry/image-proxy/${jobId}/annotated`);
      const resolvedRaw =
        existingJob.rawImageUrl ||
        customImageUrl ||
        (isLocalJob ? '' : `/api/astrometry/image-proxy/${jobId}/original`) ||
        resolvedImg;

      const reconstructed: SolvedAstroData = {
        jobId,
        title: existingJob.title || `Job #${jobId}`,
        imageUrl: resolvedImg,
        rawImageUrl: resolvedRaw,
        calibration: {
          ra,
          dec,
          radius,
          pixscale: 1.5,
          orientation: 0,
          parity: 1,
          width_arcsec: Math.round(radius * 3600),
          height_arcsec: Math.round(radius * 3600),
        },
        matchedConstellations: matched,
        annotations: Array.isArray(existingJob.objects)
          ? existingJob.objects.map((name, i) => ({
              names: [name],
              type: 'star' as const,
              pixelx: 200 + (i * 60) % 400,
              pixely: 150 + (i * 50) % 300,
              radius: 6,
            }))
          : [],
        dualIndexTelemetry,
        info: {
          original_filename: existingJob.title || `Job #${jobId}`,
          objects_in_field: existingJob.objects || [],
        },
      };

      setSolvedData(reconstructed);
      setActiveJobId(jobId);
      setLoading(false);
      return;
    }

    // 4. If this is a local job with no local cache, never hit external Astrometry API
    if (isLocalJob) {
      if (sample) {
        setSolvedData(sample);
        setActiveJobId(sample.jobId);
      } else {
        setErrorNotice(
          `로컬 계산 작업 #${jobId}의 상세 캐시를 찾을 수 없습니다. 원본 사진 파일을 다시 선택하여 솔빙해주세요.`
        );
      }
      setLoading(false);
      return;
    }

    // 5. Fetch from Astrometry.net API using Job ID
    try {
      const resp = await fetch(`/api/astrometry/jobs/${jobId}/full`);
      if (!resp.ok) {
        if (sample) {
          setSolvedData(sample);
          setActiveJobId(sample.jobId);
          if (shouldSaveToAccountJobs) saveToAccountJobs(sample);
          return;
        }
        if (existingJob) {
          setErrorNotice(`Job #${jobId} 원격 데이터를 불러올 수 없어 저장된 요약 정보로 표시합니다.`);
          return;
        }
        setErrorNotice(`Job #${jobId} 데이터 조회 실패 (HTTP ${resp.status})`);
        return;
      }

      const raw = await resp.json();
      const calibration = raw.calibration;
      const rawAnnotations = Array.isArray(raw.annotations)
        ? raw.annotations
        : Array.isArray(raw.annotations?.annotations)
        ? raw.annotations.annotations
        : [];
      const info = raw.info && typeof raw.info === 'object' ? raw.info : {};

      // Determine photo URLs: canonical Astrometry image proxies for this specific Job ID
      const resolvedImageUrl = `/api/astrometry/image-proxy/${jobId}/annotated`;
      const resolvedRawImageUrl =
        customImageUrl || `/api/astrometry/image-proxy/${jobId}/original`;

      // Extract real image dimensions and detected star centroids from the photo so star labels match actual stars and never float in empty space
      let calW =
        calibration?.width_arcsec && calibration?.pixscale && calibration.pixscale > 0
          ? Math.round(calibration.width_arcsec / calibration.pixscale)
          : 0;
      let calH =
        calibration?.height_arcsec && calibration?.pixscale && calibration.pixscale > 0
          ? Math.round(calibration.height_arcsec / calibration.pixscale)
          : 0;
      let detectedStarsList: SolvedAstroData['detectedStars'] = undefined;
      let nebulaPipelineTelemetry: SolvedAstroData['nebulaPipelineTelemetry'] = undefined;
      let verifiedAnnotations = Array.isArray(rawAnnotations) ? rawAnnotations : [];

      try {
        const ext = await extractStarsImage2XY(resolvedRawImageUrl, { keepOriginalCoords: true });
        if (ext.width > 0 && ext.height > 0) {
          if (!calW || !calH) {
            calW = ext.width;
            calH = ext.height;
          }
          if (calibration && calibration.pixscale > 0) {
            if (!calibration.width_arcsec) {
              calibration.width_arcsec = Number((calW * calibration.pixscale).toFixed(2));
            }
            if (!calibration.height_arcsec) {
              calibration.height_arcsec = Number((calH * calibration.pixscale).toFixed(2));
            }
          }
          nebulaPipelineTelemetry = ext.pipelineTelemetry;
          detectedStarsList = ext.stars.map((ds) => ({
            x: Number(ds.x.toFixed(1)),
            y: Number(ds.y.toFixed(1)),
            flux: Number(ds.flux.toFixed(1)),
            peak: Number((ds.peak || 0).toFixed(1)),
            radius: Number(ds.radius.toFixed(1)),
            instMag: ds.instMag,
            fwhm: ds.fwhm,
            ellipticity: ds.ellipticity,
            axisRatio: ds.axisRatio,
            snr: ds.snr,
          }));
          if (ext.stars.length > 0) {
            verifiedAnnotations = verifyAndSnapAnnotationsToDetectedStars(
              rawAnnotations,
              ext.stars,
              calW,
              calH
            );
          }
        }
      } catch {
        // Fallback if image proxy could not be decoded on canvas
      }

      if (!Array.isArray(verifiedAnnotations)) {
        verifiedAnnotations = [];
      }

      if (!calW) calW = 1920;
      if (!calH) calH = 1080;

      // Match constellations using IAU definitions, Astrometry tags, coordinates, and verified star annotations
      const matched = identifyConstellations(
        Array.isArray(info.tags) ? info.tags : [],
        Array.isArray(info.objects_in_field) ? info.objects_in_field : [],
        calibration?.ra || 0,
        calibration?.dec || 0,
        verifiedAnnotations
      );

      const starAnnCount = verifiedAnnotations.filter((a: any) => {
        const t = (a?.type || '').toLowerCase();
        return t === 'bright' || t === 'hd' || t === 'star';
      }).length;

      const dualIndexTelemetry = calibration
        ? buildDualIndexTelemetryForCalibration(calibration, starAnnCount)
        : undefined;

      const primaryMatchedConstKo = matched[0]?.nameKo;
      const computedConstellationTitle = getConstellationObjectTitle(
        primaryMatchedConstKo,
        calibration?.ra || 0,
        calibration?.dec || 0,
        [
          ...(Array.isArray(info.objects_in_field) ? info.objects_in_field : []),
          ...(Array.isArray(info.tags) ? info.tags : []),
        ],
        info.original_filename
      );
      const rawOriginalTitle = info.original_filename || '';
      const isGenericOriginalFilename =
        !rawOriginalTitle ||
        /^(image|img|photo|dsc|stacked|astrometry|plate|capture|test|frame|light)[_\-\d\s.]*\.(jpg|jpeg|png|fit|fits|tif|tiff|webp)$/i.test(
          rawOriginalTitle.trim()
        );
      const resolvedTitle = isGenericOriginalFilename
        ? computedConstellationTitle
        : formatTitleWithCatalogPriority(rawOriginalTitle, [
            ...(Array.isArray(info.objects_in_field) ? info.objects_in_field : []),
            ...(Array.isArray(info.tags) ? info.tags : []),
          ]);

      const solved: SolvedAstroData = {
        jobId,
        title: resolvedTitle || `Astrometry Plate Solve #${jobId}`,
        imageUrl: resolvedImageUrl,
        rawImageUrl: resolvedRawImageUrl,
        imageWidth: calW,
        imageHeight: calH,
        calibration,
        annotations: verifiedAnnotations,
        detectedStars: detectedStarsList,
        dualIndexTelemetry,
        nebulaPipelineTelemetry,
        info,
        matchedConstellations: matched,
      };

      setSolvedData(solved);
      setActiveJobId(jobId);

      // Automatically remember analyzed photo in account jobs
      if (shouldSaveToAccountJobs) {
        saveToAccountJobs(solved, resolvedRawImageUrl);
      }
    } catch (err: any) {
      console.warn('Job data load fallback warning:', err);
      if (existingJob?.solvedData) {
        setSolvedData({
          ...existingJob.solvedData,
          annotations: Array.isArray(existingJob.solvedData.annotations)
            ? existingJob.solvedData.annotations
            : [],
        });
        setActiveJobId(jobId);
      } else if (sample) {
        setSolvedData(sample);
        setActiveJobId(sample.jobId);
        if (shouldSaveToAccountJobs) saveToAccountJobs(sample);
      } else {
        setErrorNotice(err.message || `Astrometry.net Job #${jobId} 데이터 로드 중 오류가 발생했습니다.`);
      }
    } finally {
      setLoading(false);
    }
  };

  // Delete single account job
  const handleDeleteAccountJob = (jobId: string | number) => {
    deleteRememberedAccountJob(jobId);
    setAccountJobs((prev) => {
      const updated = prev.filter(
        (item) => String(item.jobId) !== String(jobId) && item.id !== `job_${jobId}`
      );
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {}

      // If active job was deleted, switch to first item or null
      if (String(activeJobId) === String(jobId)) {
        if (updated.length > 0) {
          loadJobData(updated[0].jobId, updated[0].imageUrl, false);
        } else {
          setSolvedData(null);
          setActiveJobId(null);
        }
      }
      return updated;
    });

    fetch(`/api/astrometry/my-jobs/${jobId}`, { method: 'DELETE' }).catch(() => {});
    fetch(`/api/astrometry/history/${jobId}`, { method: 'DELETE' }).catch(() => {});
  };

  // Clear all account jobs
  const handleClearAllAccountJobs = () => {
    const ids = accountJobs.map((j) => j.jobId);
    clearAllRememberedAccountJobs(ids);
    setAccountJobs([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(LEGACY_STORAGE_KEY);
    } catch (e) {}
    setSolvedData(null);
    setActiveJobId(null);
    fetch('/api/astrometry/my-jobs', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobIds: ids, all: true }),
    }).catch(() => {});
    fetch('/api/astrometry/history', { method: 'DELETE' }).catch(() => {});
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-sky-500 selection:text-white">
      {/* Navigation Header */}
      <Navbar
        onOpenUpload={handleOpenNewPhoto}
        onOpenJobInput={handleOpenJobInput}
        onOpenAccountJobs={() => setIsAccountJobsDrawerOpen(true)}
        onOpenDualIndex={() => setIsDualIndexModalOpen(true)}
        onReset={handleResetHome}
        accountJobsCount={accountJobs.length}
        hasApiKey={hasApiKey}
        globalTheme={globalTheme}
        onToggleTheme={handleToggleGlobalTheme}
      />

      {/* Top Sub-Navigation Tabs (Shown only when a photo is analyzed) */}
      {!loading && solvedData && (
        <div className="bg-slate-900/95 backdrop-blur-md border-b border-slate-800 sticky top-16 z-20 shadow-xl">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5">
            <div className="flex flex-wrap lg:flex-nowrap items-center justify-between gap-3">
              {/* Segmented Island Container for High Distinction */}
              <nav
                className="flex items-center gap-1.5 sm:gap-2 p-1.5 rounded-2xl bg-slate-950 border border-slate-700/80 shadow-inner overflow-x-auto scrollbar-none"
                aria-label="천체 관측 분석 탭"
              >
                {/* 1. 천체사진 분석 */}
                <button
                  type="button"
                  onClick={() => setActiveMainTab('photo')}
                  className={`px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center space-x-2 transition-all cursor-pointer whitespace-nowrap ${
                    activeMainTab === 'photo'
                      ? 'bg-gradient-to-r from-sky-500 via-indigo-600 to-purple-600 text-white shadow-lg shadow-sky-500/30 ring-2 ring-sky-300/50 scale-[1.02]'
                      : 'bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60 hover:border-slate-500'
                  }`}
                >
                  <Camera className={`w-4 h-4 ${activeMainTab === 'photo' ? 'text-white' : 'text-sky-400'}`} />
                  <span>천체사진 분석</span>
                  {activeMainTab === 'photo' && (
                    <span className="w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_6px_#fff]" />
                  )}
                </button>

                {/* 2. 천체좌표 및 세부내용 */}
                <button
                  type="button"
                  onClick={() => setActiveMainTab('telemetry')}
                  className={`px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center space-x-2 transition-all cursor-pointer whitespace-nowrap ${
                    activeMainTab === 'telemetry'
                      ? 'bg-gradient-to-r from-sky-500 via-indigo-600 to-purple-600 text-white shadow-lg shadow-sky-500/30 ring-2 ring-sky-300/50 scale-[1.02]'
                      : 'bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60 hover:border-slate-500'
                  }`}
                >
                  <Activity className={`w-4 h-4 ${activeMainTab === 'telemetry' ? 'text-white' : 'text-indigo-400'}`} />
                  <span>천체좌표 및 세부내용</span>
                  {activeMainTab === 'telemetry' && (
                    <span className="w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_6px_#fff]" />
                  )}
                </button>

                {/* 3. 실시간 전천성도 */}
                <button
                  type="button"
                  onClick={() => setActiveMainTab('chart')}
                  className={`px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center space-x-2 transition-all cursor-pointer whitespace-nowrap ${
                    activeMainTab === 'chart'
                      ? 'bg-gradient-to-r from-sky-500 via-indigo-600 to-purple-600 text-white shadow-lg shadow-sky-500/30 ring-2 ring-sky-300/50 scale-[1.02]'
                      : 'bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60 hover:border-slate-500'
                  }`}
                >
                  <Compass className={`w-4 h-4 ${activeMainTab === 'chart' ? 'text-white' : 'text-purple-400'}`} />
                  <span>실시간 전천성도</span>
                  {activeMainTab === 'chart' && (
                    <span className="w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_6px_#fff]" />
                  )}
                </button>
              </nav>

              {/* Target Quick Info Chip */}
              <div className="hidden lg:flex items-center space-x-2.5 text-xs text-slate-400 px-3.5 py-2 rounded-xl bg-slate-950/70 border border-slate-800 shrink-0">
                <span className="font-mono text-sky-400 font-bold px-1.5 py-0.5 rounded bg-sky-950/80 border border-sky-800/80">
                  Job #{solvedData.jobId}
                </span>
                <span className="text-white font-medium truncate max-w-xs">
                  {formatTitleWithCatalogPriority(
                    solvedData.title,
                    solvedData.info?.objects_in_field || solvedData.info?.tags || []
                  )}
                </span>
                <span>•</span>
                <span className="text-indigo-300 font-medium">
                  {solvedData.matchedConstellations[0]?.nameKo || '천구 별자리'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

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
              setActiveMainTab('photo');
              saveToAccountJobs(sample);
            }}
            hasApiKey={hasApiKey}
          />
        )}

        {/* Target Header Banner (When photo is solved) */}
        {!loading && solvedData && (
          <div className="bg-slate-900/80 rounded-2xl border border-slate-800 p-5 shadow-xl flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center flex-wrap gap-2">
                <span className="text-xs uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-sky-950 text-sky-400 border border-sky-800">
                  실시간 솔빙 완료 (Solved)
                </span>
                {!String(solvedData.jobId).startsWith('local_') ? (
                  <span className="text-xs px-2 py-0.5 rounded bg-indigo-950/90 text-indigo-300 border border-indigo-500/60 flex items-center gap-1 font-semibold">
                    <Globe className="w-3 h-3 text-indigo-400" />
                    Astrometry.net 분석
                  </span>
                ) : (
                  <span className="text-xs px-2 py-0.5 rounded bg-emerald-950/90 text-emerald-300 border border-emerald-500/60 flex items-center gap-1 font-semibold">
                    <Cpu className="w-3 h-3 text-emerald-400" />
                    브라우저 자체 계산
                  </span>
                )}
                <span className="text-xs font-mono text-slate-400">
                  Job ID: #{solvedData.jobId}
                </span>
                <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 flex items-center gap-1">
                  <Database className="w-3 h-3 text-sky-400" />
                  작업 히스토리에 저장됨
                </span>
              </div>

              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-1">
                {formatTitleWithCatalogPriority(
                  solvedData.title || `천체 관측 사진 #${solvedData.jobId}`,
                  solvedData.info?.objects_in_field || solvedData.info?.tags || []
                )}
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
                  RA: <strong className="text-sky-400">{degToRA_HMS(solvedData?.calibration?.ra ?? 0)}</strong>
                </span>
                <span className="text-slate-600">•</span>
                <span className="font-mono text-slate-300">
                  Dec: <strong className="text-sky-400">{degToDec_DMS(solvedData?.calibration?.dec ?? 0)}</strong>
                </span>
                <span className="text-slate-600">•</span>
                <span>
                  화각: <strong className="text-indigo-300">
                    {typeof solvedData?.calibration?.radius === 'number' && !isNaN(solvedData.calibration.radius)
                      ? `${solvedData.calibration.radius.toFixed(2)}°`
                      : '1.00°'}
                  </strong>
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={handleReAnalyzeCurrentPhoto}
                disabled={isReAnalyzing}
                className="text-xs px-3.5 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-bold border border-sky-400/40 flex items-center space-x-1.5 transition-all shadow-md shadow-sky-500/25 cursor-pointer disabled:opacity-60 hover:scale-[1.02] active:scale-[0.98]"
                title="현재 천체사진으로 플레이트 솔빙 분석 다시 실행"
              >
                <RotateCcw className={`w-3.5 h-3.5 ${isReAnalyzing ? 'animate-spin' : ''}`} />
                <span>{isReAnalyzing ? '분석 중...' : '천체사진 다시 분석'}</span>
              </button>
              <button
                onClick={() => setIsAccountJobsDrawerOpen(true)}
                className="text-xs px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center space-x-1.5 transition-colors shadow-sm cursor-pointer"
                title="Astrometry.net 및 로컬 솔빙 작업 히스토리 열기"
              >
                <Database className="w-3.5 h-3.5 text-sky-400" />
                <span>작업 히스토리 ({accountJobs.length})</span>
              </button>
            </div>
          </div>
        )}

        {/* Tab 1: 천체사진 분석 */}
        {!loading && solvedData && activeMainTab === 'photo' && (
          <section aria-label="천체사진 분석" className="space-y-3">
            {reAnalyzeStatus && (
              <div className="p-3 bg-sky-950/80 border border-sky-700/70 rounded-2xl text-xs text-sky-200 flex items-center space-x-2 shadow-lg animate-pulse">
                <Loader2 className="w-4 h-4 text-sky-400 animate-spin shrink-0" />
                <span className="font-medium">{reAnalyzeStatus}</span>
              </div>
            )}
            <StarPhotoViewer
              data={solvedData}
              onSelectObject={(obj) => setSelectedTargetForSimbad(obj)}
              onReAnalyze={handleReAnalyzeCurrentPhoto}
              onOpenUploadModal={handleOpenNewPhoto}
              isReAnalyzing={isReAnalyzing}
            />
          </section>
        )}

        {/* Tab 2: 천체좌표 및 세부내용 */}
        {!loading && solvedData && activeMainTab === 'telemetry' && (
          <section aria-label="천체좌표 및 세부내용">
            <AstroTelemetryPanel
              data={solvedData}
              onSelectObject={(obj) => setSelectedTargetForSimbad(obj)}
              onOpenDualIndexModal={() => setIsDualIndexModalOpen(true)}
            />
          </section>
        )}

        {/* Tab 3: 실시간 전천성도 (마지막 탭) */}
        {!loading && solvedData && activeMainTab === 'chart' && (
          <section aria-label="실시간 전천성도">
            <CelestialStarChart
              data={solvedData}
              onSelectConstellation={(code) => {
                console.log('Selected constellation:', code);
              }}
            />
          </section>
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
              onClick={() => setIsAccountJobsDrawerOpen(true)}
              className="hover:text-sky-400 transition-colors flex items-center gap-1 cursor-pointer"
              title="Astrometry.net 및 로컬 솔빙 작업 히스토리 열기"
            >
              <Database className="w-3 h-3 text-sky-400" />
              <span>작업 히스토리 ({accountJobs.length})</span>
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
          setModalInitialTab('upload');
        }}
        onSolveSuccess={(jobId, imgUrl) => loadJobData(jobId, imgUrl, true)}
        onLocalSolveSuccess={(solvedResult) => {
          setSolvedData(solvedResult);
          setActiveJobId(solvedResult.jobId);
          setActiveMainTab('photo');
          setErrorNotice(null);
          setLoading(false);
          saveToAccountJobs(solvedResult, solvedResult.rawImageUrl);
        }}
        hasApiKey={hasApiKey}
        initialFile={modalInitialFile}
        initialUrl={modalInitialUrl}
        initialTab={modalInitialTab}
        accountJobs={accountJobs}
      />

      {/* My Astrometry Account Jobs Drawer */}
      <MyAccountJobsDrawer
        isOpen={isAccountJobsDrawerOpen}
        onClose={() => setIsAccountJobsDrawerOpen(false)}
        jobs={accountJobs}
        activeJobId={activeJobId}
        onSelectJob={(jobId) => loadJobData(jobId, undefined, false)}
        onReAnalyzeJob={(item) => {
          loadJobData(item.jobId, item.rawImageUrl, false);
          const targetUrl =
            item.rawImageUrl ||
            item.imageUrl ||
            `/api/astrometry/image-proxy/${item.jobId}/original`;
          setModalInitialFile(null);
          setModalInitialUrl(targetUrl);
          setModalInitialTab('url');
          setIsUploadModalOpen(true);
        }}
        onDeleteJob={handleDeleteAccountJob}
        onClearAllJobs={handleClearAllAccountJobs}
      />

      {/* CDS SIMBAD Real-time Database Inspector Modal */}
      <SimbadInspectorModal
        targetName={selectedTargetForSimbad}
        onClose={() => setSelectedTargetForSimbad(null)}
      />

      {/* Dual-Index (Tycho-2 Wide-Field vs Gaia DR3 Deep-Sky) Catalog & Download Modal */}
      <DualIndexCatalogModal
        isOpen={isDualIndexModalOpen}
        onClose={() => setIsDualIndexModalOpen(false)}
        solvedData={solvedData}
      />
    </div>
  );
}
