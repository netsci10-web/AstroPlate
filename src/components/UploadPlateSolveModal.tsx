import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Upload,
  Link as LinkIcon,
  Database,
  Loader2,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  FileImage,
  ArrowRight,
  Sparkles,
  ExternalLink,
  RefreshCw,
  Trash2,
  Cpu,
  Globe,
  Download,
  Compass,
  RotateCcw,
} from 'lucide-react';
import {
  getRememberedAccountJobs,
  saveRememberedAccountJobs,
  rememberAccountJob,
  deleteRememberedAccountJob,
  clearAllRememberedAccountJobs,
  getDeletedJobIds,
  isJobDeleted,
} from '../utils/accountJobs';
import { getConstellationObjectTitle } from '../utils/constellations';
import { solvePlateLocallyInBrowser } from '../utils/localPlateSolver';
import { getLocalDualIndexStats } from '../utils/dualIndexCatalog';
import { SolvedAstroData, AnalysisHistoryItem } from '../types/astronomy';

interface UploadPlateSolveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSolveSuccess: (jobId: number | string, customImageUrl?: string) => void;
  onLocalSolveSuccess?: (solvedData: SolvedAstroData) => void;
  hasApiKey: boolean;
  initialFile?: File | null;
  initialUrl?: string;
  initialJobId?: string;
  initialTab?: 'upload' | 'url' | 'jobId' | 'myJobs';
  accountJobs?: AnalysisHistoryItem[];
}

export const UploadPlateSolveModal: React.FC<UploadPlateSolveModalProps> = ({
  isOpen,
  onClose,
  onSolveSuccess,
  onLocalSolveSuccess,
  hasApiKey,
  initialFile = null,
  initialUrl = '',
  initialJobId = '',
  initialTab = 'upload',
  accountJobs = [],
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'url' | 'jobId' | 'myJobs'>(initialTab);
  const [solverMode, setSolverMode] = useState<'local' | 'api'>('local');
  const [localTargetHint, setLocalTargetHint] = useState('');
  const [localProgressPct, setLocalProgressPct] = useState(0);
  const [localDetectedCount, setLocalDetectedCount] = useState<number | null>(null);
  const [imageUrl, setImageUrl] = useState('');
  const [jobIdInput, setJobIdInput] = useState('');
  const [reAnalyzeTargetJobId, setReAnalyzeTargetJobId] = useState<string | number | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const dualIndexStats = getLocalDualIndexStats();

  // Advanced solver options
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [scaleUnits, setScaleUnits] = useState('arcsecperpix');
  const [scaleLower, setScaleLower] = useState('');
  const [scaleUpper, setScaleUpper] = useState('');

  // Status & Progress
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState<string>('');
  const [activeSubid, setActiveSubid] = useState<number | string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // User's account jobs
  const [myJobs, setMyJobs] = useState<any[]>([]);
  const [loadingMyJobs, setLoadingMyJobs] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync initial props when opened
  useEffect(() => {
    if (isOpen) {
      setLocalTargetHint('');
      if (initialFile) {
        setSelectedFile(initialFile);
        setPreviewUrl(URL.createObjectURL(initialFile));
        setReAnalyzeTargetJobId(null);
        setActiveTab('upload');
      } else if (initialUrl) {
        setImageUrl(initialUrl);
        setReAnalyzeTargetJobId(initialJobId || null);
        setActiveTab('url');
      } else if (initialJobId) {
        setJobIdInput(initialJobId);
        setReAnalyzeTargetJobId(null);
        setActiveTab('jobId');
      } else if (initialTab) {
        setActiveTab(initialTab);
        setReAnalyzeTargetJobId(null);
        if (initialTab !== 'upload') {
          setSelectedFile(null);
          setPreviewUrl(null);
        }
      } else {
        // Reset state so user can immediately accept and analyze a new photo
        setSelectedFile(null);
        setPreviewUrl(null);
        setReAnalyzeTargetJobId(null);
        setErrorMessage(null);
        setIsProcessing(false);
        setActiveTab('upload');
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    }
  }, [isOpen, initialFile, initialUrl, initialJobId, initialTab]);

  // Fetch user account jobs from Astrometry.net and remembered jobs
  const buildLocalMergedJobs = () => {
    const remembered = getRememberedAccountJobs().filter((r) => !isJobDeleted(r.jobId));
    const map = new Map<string, any>();
    accountJobs
      .filter((item) => !isJobDeleted(item.jobId))
      .forEach((item) => {
        map.set(String(item.jobId), {
          jobId: item.jobId,
          status: 'success',
          filename: item.title || `Astrometry Job #${item.jobId}`,
          objects: item.objects || [],
          constellationKo: item.primaryConstellationKo,
          calibration: {
            ra: item.raDeg,
            dec: item.decDeg,
            radius: item.radiusDeg,
          },
          rawImageUrl: item.rawImageUrl || item.imageUrl,
          timestamp: item.timestamp || 0,
        });
      });
    remembered.forEach((r) => {
      if (!map.has(String(r.jobId))) {
        map.set(String(r.jobId), {
          jobId: r.jobId,
          status: r.status || 'success',
          filename: r.filename || `Astrometry Job #${r.jobId}`,
          objects: r.objects || [],
          calibration: r.calibration,
          timestamp: (r as any).timestamp || 0,
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => {
      const timeA = typeof a.timestamp === 'number' && !isNaN(a.timestamp) ? a.timestamp : 0;
      const timeB = typeof b.timestamp === 'number' && !isNaN(b.timestamp) ? b.timestamp : 0;
      if (timeB !== timeA) return timeB - timeA;
      const numA = Number(String(a.jobId).replace(/\D/g, '')) || 0;
      const numB = Number(String(b.jobId).replace(/\D/g, '')) || 0;
      return numB - numA;
    });
  };

  const handleDeleteJob = (jobId: string | number) => {
    deleteRememberedAccountJob(jobId);
    setMyJobs((prev) => prev.filter((j) => String(j.jobId) !== String(jobId)));
    fetch(`/api/astrometry/my-jobs/${jobId}`, { method: 'DELETE' }).catch(() => {});
  };

  const handleClearAllJobs = () => {
    const ids = myJobs.map((j) => j.jobId);
    clearAllRememberedAccountJobs(ids);
    setMyJobs([]);
    fetch('/api/astrometry/my-jobs', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobIds: ids, all: true }),
    }).catch(() => {});
  };

  useEffect(() => {
    const handleSync = () => {
      const deleted = getDeletedJobIds();
      setMyJobs((prev) => prev.filter((j) => !deleted.has(String(j.jobId))));
    };
    window.addEventListener('astroplate_jobs_updated', handleSync);
    return () => window.removeEventListener('astroplate_jobs_updated', handleSync);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setMyJobs(buildLocalMergedJobs());
    }
  }, [isOpen, accountJobs]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      setErrorMessage(null);
      setReAnalyzeTargetJobId(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      setErrorMessage(null);
      setReAnalyzeTargetJobId(null);
    }
  };

  // Poll submission until job is generated and solved
  const pollSubmission = (subid: number | string, localImgUrl?: string) => {
    setActiveSubid(subid);
    setCurrentStep(`Astrometry.net 작업 등록 완료 (#${subid}). solve-field 대기 큐 확인 중...`);
    setElapsedSeconds(0);

    const startTime = Date.now();
    const timer = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    let attempts = 0;
    const maxAttempts = 90; // Up to 6 minutes

    const pollInterval = setInterval(async () => {
      attempts++;
      if (attempts > maxAttempts) {
        clearInterval(pollInterval);
        clearInterval(timer);
        setIsProcessing(false);
        setErrorMessage(
          `Astrometry.net 대기 큐에서 솔빙 시간이 지연되고 있습니다. Submission #${subid}에서 계속 처리 중입니다.`
        );
        return;
      }

      try {
        const subResp = await fetch(`/api/astrometry/submissions/${subid}`);
        if (!subResp.ok) return;

        const subData = await subResp.json();

        // 1. Check for fatal errors in submission
        if (subData.error_message) {
          clearInterval(pollInterval);
          clearInterval(timer);
          setIsProcessing(false);
          setErrorMessage(`Astrometry.net 분석 에러: ${subData.error_message}`);
          return;
        }

        // 2. Check if job calibrations are already present
        if (subData.job_calibrations && subData.job_calibrations.length > 0) {
          const solvedJobId = subData.job_calibrations[0][0];
          clearInterval(pollInterval);
          clearInterval(timer);
          setCurrentStep('좌표 및 성도 데이터 추출 완료!');
          setTimeout(() => {
            setIsProcessing(false);
            rememberAccountJob(solvedJobId, selectedFile?.name || 'Uploaded Astrophoto');
            onSolveSuccess(solvedJobId, localImgUrl);
            onClose();
          }, 800);
          return;
        }

        // 3. Check jobs list
        const rawJobs = subData.jobs || [];
        const validJobs = rawJobs.filter((j: any) => j !== null && j !== undefined && !isNaN(Number(j)));

        if (validJobs.length > 0) {
          let anyJobSucceeded = false;
          let allJobsFinished = true;
          let activeJobIdForDisplay = validJobs[0];

          for (const jId of validJobs) {
            try {
              const jobResp = await fetch(`/api/astrometry/jobs/${jId}/status`);
              if (jobResp.ok) {
                const jobData = await jobResp.json();
                if (jobData.status === 'success') {
                  anyJobSucceeded = true;
                  clearInterval(pollInterval);
                  clearInterval(timer);
                  setCurrentStep(`WCS 정밀 좌표 보정 완료! 성도 로드 중 (Job #${jId})...`);
                  setTimeout(() => {
                    setIsProcessing(false);
                    rememberAccountJob(jId, selectedFile?.name || 'Uploaded Astrophoto');
                    onSolveSuccess(jId, localImgUrl);
                    onClose();
                  }, 800);
                  return;
                } else if (jobData.status === 'solving' || jobData.status === 'queued') {
                  allJobsFinished = false;
                  activeJobIdForDisplay = jId;
                }
              }
            } catch (e) {
              allJobsFinished = false;
            }
          }

          if (!anyJobSucceeded) {
            if (allJobsFinished && subData.processing_finished) {
              clearInterval(pollInterval);
              clearInterval(timer);
              setIsProcessing(false);
              setErrorMessage(
                `Astrometry.net 플레이트 솔빙 실패: 사진 속 항성 패턴을 성도 카탈로그와 매칭하지 못했습니다. 더 넓은 화각이나 선명한 성야 사진을 시도해보세요.`
              );
              return;
            } else {
              setCurrentStep(`플레이트 솔빙 패턴 매칭 진행 중 (Job #${activeJobIdForDisplay})...`);
            }
          }
        } else if (subData.processing_finished && validJobs.length === 0 && attempts > 10) {
          // Finished submission extraction without creating any valid solve jobs
          clearInterval(pollInterval);
          clearInterval(timer);
          setIsProcessing(false);
          setErrorMessage(
            'Astrometry.net 소스 추출 완료: 사진 속에서 유효한 항성(별) 패턴을 검출하지 못하여 솔빙 작업이 생성되지 않았습니다. 별이 더 선명하게 드러난 성야 사진을 업로드해 보세요.'
          );
        } else {
          setCurrentStep(
            attempts < 5
              ? `Astrometry.net 작업 대기 중 (#${subid})... 항성 소스 패턴 추출 중...`
              : `Astrometry.net 카탈로그 대조 큐 대기 중 (#${subid})... (${Math.max(0, 90 - attempts * 3)}초 남음)`
          );
        }
      } catch (err: any) {
        console.error('Polling error:', err);
      }
    }, 3500);
  };

  // Submit plate solve job
  const handleStartSolve = async () => {
    setErrorMessage(null);
    setIsProcessing(true);

    try {
      if (activeTab === 'jobId') {
        if (!jobIdInput.trim()) {
          setErrorMessage('조회할 Astrometry.net Job ID를 입력해주세요.');
          setIsProcessing(false);
          return;
        }

        setCurrentStep(`Astrometry.net Job #${jobIdInput.trim()} 데이터 조회 중...`);
        const resp = await fetch(`/api/astrometry/jobs/${jobIdInput.trim()}/calibration`);
        if (!resp.ok) {
          throw new Error(`Job #${jobIdInput.trim()}을 찾을 수 없거나 분석되지 않은 작업입니다.`);
        }

        setIsProcessing(false);
        onSolveSuccess(jobIdInput.trim());
        onClose();
        return;
      }

      // Check upload or url
      if (activeTab === 'upload' && !selectedFile) {
        setErrorMessage('분석할 천체 사진 파일을 선택해주세요.');
        setIsProcessing(false);
        return;
      }

      if (activeTab === 'url' && !imageUrl.trim()) {
        setErrorMessage('천체 사진 이미지 URL을 입력해주세요.');
        setIsProcessing(false);
        return;
      }

      const runBrowserDirectSolve = async (reasonMsg?: string) => {
        setLocalProgressPct(10);
        setLocalDetectedCount(null);
        if (reasonMsg) {
          setCurrentStep(reasonMsg);
        }
        const sourceToSolve = activeTab === 'upload' && selectedFile ? selectedFile : imageUrl.trim();
        const proxyJobMatch =
          activeTab === 'url' ? imageUrl.trim().match(/image-proxy\/([^/?#]+)/i) : null;
        const targetIdToMatch = reAnalyzeTargetJobId || (proxyJobMatch ? proxyJobMatch[1] : null);
        const matchedHistJob = targetIdToMatch
          ? myJobs.find((j) => String(j.jobId) === String(targetIdToMatch)) ||
            accountJobs.find((j) => String(j.jobId) === String(targetIdToMatch))
          : activeTab === 'url'
          ? myJobs.find((j) => j.rawImageUrl && j.rawImageUrl === imageUrl.trim()) ||
            accountJobs.find(
              (j) =>
                (j.rawImageUrl && j.rawImageUrl === imageUrl.trim()) ||
                (j.imageUrl && j.imageUrl === imageUrl.trim())
            )
          : null;

        const fileNameForSolve =
          activeTab === 'upload' && selectedFile
            ? selectedFile.name
            : matchedHistJob?.filename ||
              (matchedHistJob as any)?.title ||
              (proxyJobMatch ? `Astrometry Job #${proxyJobMatch[1]}` : imageUrl.trim().split('/').pop() || 'astrophoto.jpg');

        const effectiveHint =
          localTargetHint.trim() ||
          matchedHistJob?.objects?.[0] ||
          (matchedHistJob as any)?.solvedData?.info?.objects_in_field?.[0] ||
          '';

        const effectiveCalibration =
          matchedHistJob?.calibration || (matchedHistJob as any)?.solvedData?.calibration;

        const effectiveFovDeg =
          effectiveCalibration?.radius && effectiveCalibration.radius > 0
            ? effectiveCalibration.radius * 2
            : (matchedHistJob as any)?.radiusDeg && (matchedHistJob as any).radiusDeg > 0
            ? (matchedHistJob as any).radiusDeg * 2
            : undefined;

        const existingJobIdToReuse =
          reAnalyzeTargetJobId || matchedHistJob?.jobId || undefined;

        const solvedResult = await solvePlateLocallyInBrowser(sourceToSolve, {
          targetHint: effectiveHint,
          fovHintDeg: effectiveFovDeg,
          filename: fileNameForSolve,
          existingJobId: existingJobIdToReuse,
          calibrationHint: effectiveCalibration,
          existingAnnotations: (matchedHistJob as any)?.solvedData?.annotations,
          existingObjectsInField:
            matchedHistJob?.objects || (matchedHistJob as any)?.solvedData?.info?.objects_in_field,
          onProgress: (prog) => {
            setCurrentStep(prog.message);
            setLocalProgressPct(prog.progressPct);
            if (prog.detectedStarsCount !== undefined) {
              setLocalDetectedCount(prog.detectedStarsCount);
            }
          },
        });

        setIsProcessing(false);
        if (onLocalSolveSuccess) {
          onLocalSolveSuccess(solvedResult);
        } else {
          onSolveSuccess(solvedResult.jobId, solvedResult.rawImageUrl);
        }
        onClose();
      };

      // 1. LOCAL IN-BROWSER SOLVER ENGINE (Zero External API, dstndstn/astrometry.net algorithm)
      if (solverMode === 'local' && (activeTab === 'upload' || activeTab === 'url')) {
        await runBrowserDirectSolve();
        return;
      }

      setCurrentStep('Astrometry.net 서버로 업로드 및 분석 요청 중...');

      const hasScaleLower = Boolean(scaleLower && !isNaN(parseFloat(scaleLower)));
      const hasScaleUpper = Boolean(scaleUpper && !isNaN(parseFloat(scaleUpper)));

      // Direct multipart file upload via FormData (no Base64 JSON overhead)
      if (activeTab === 'upload' && selectedFile) {
        let uploadResp: Response | null = null;

        try {
          const formData = new FormData();
          formData.append('file', selectedFile);
          if (hasScaleLower) formData.append('scaleLower', scaleLower);
          if (hasScaleUpper) formData.append('scaleUpper', scaleUpper);
          if ((hasScaleLower || hasScaleUpper) && scaleUnits) {
            formData.append('scaleUnits', scaleUnits);
          }

          uploadResp = await fetch('/api/astrometry/upload-file', {
            method: 'POST',
            body: formData,
          });
        } catch {
          uploadResp = null;
        }

        // If multipart failed (and not 405 static host), fallback to Base64 JSON upload
        if ((!uploadResp || !uploadResp.ok) && uploadResp?.status !== 405) {
          try {
            setCurrentStep('보조 전송 채널(JSON Base64)로 재시도 중...');
            const reader = new FileReader();
            const base64Data: string = await new Promise((resolve, reject) => {
              reader.onload = () => resolve(reader.result as string);
              reader.onerror = reject;
              reader.readAsDataURL(selectedFile);
            });

            const payload: Record<string, any> = {
              imageBase64: base64Data,
              filename: selectedFile.name,
              mimeType: selectedFile.type,
            };
            if (hasScaleLower) payload.scaleLower = parseFloat(scaleLower);
            if (hasScaleUpper) payload.scaleUpper = parseFloat(scaleUpper);
            if ((hasScaleLower || hasScaleUpper) && scaleUnits) {
              payload.scaleUnits = scaleUnits;
            }

            uploadResp = await fetch('/api/astrometry/solve', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
            });
          } catch {
            // Will seamlessly fall back to browser direct solver below
          }
        }

        const contentType = uploadResp?.headers.get('content-type') || '';
        if (
          !uploadResp ||
          uploadResp.status === 405 ||
          uploadResp.status === 404 ||
          uploadResp.status === 401 ||
          uploadResp.status >= 500 ||
          !contentType.includes('application/json')
        ) {
          // Static hosting (e.g., GitHub Pages / static preview returning HTTP 405) or unavailable API proxy:
          // Automatically solve using the built-in browser Astrometry.net + CDS VizieR engine
          await runBrowserDirectSolve(
            '외부 API 프록시 대신 브라우저 내장 Astrometry.net + CDS VizieR 엔진으로 정밀 플레이트 솔빙 중...'
          );
          return;
        }

        const uploadData = await uploadResp.json();
        if (!uploadResp.ok || uploadData.error) {
          await runBrowserDirectSolve(
            'Astrometry.net 대기열 대신 브라우저 내장 Astrometry.net + CDS VizieR 엔진으로 즉시 솔빙 중...'
          );
          return;
        }

        const subid = uploadData.subid;
        pollSubmission(subid, previewUrl || undefined);
        return;
      }

      // URL upload
      if (activeTab === 'url') {
        const payload: Record<string, any> = { imageUrl: imageUrl.trim() };
        if (hasScaleLower) payload.scaleLower = parseFloat(scaleLower);
        if (hasScaleUpper) payload.scaleUpper = parseFloat(scaleUpper);
        if ((hasScaleLower || hasScaleUpper) && scaleUnits) {
          payload.scaleUnits = scaleUnits;
        }

        let solveResp: Response | null = null;
        try {
          solveResp = await fetch('/api/astrometry/solve', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
        } catch {
          solveResp = null;
        }

        const contentType = solveResp?.headers.get('content-type') || '';
        if (
          !solveResp ||
          solveResp.status === 405 ||
          solveResp.status === 404 ||
          solveResp.status === 401 ||
          solveResp.status >= 500 ||
          !contentType.includes('application/json')
        ) {
          await runBrowserDirectSolve(
            '외부 API 프록시 대신 브라우저 내장 Astrometry.net + CDS VizieR 엔진으로 정밀 플레이트 솔빙 중...'
          );
          return;
        }

        const solveData = await solveResp.json();
        if (!solveResp.ok || solveData.error) {
          await runBrowserDirectSolve(
            'Astrometry.net 대기열 대신 브라우저 내장 Astrometry.net + CDS VizieR 엔진으로 즉시 솔빙 중...'
          );
          return;
        }

        const subid = solveData.subid;
        pollSubmission(subid, imageUrl.trim());
        return;
      }
    } catch (err: any) {
      setIsProcessing(false);
      let msg = err.message || '오류가 발생했습니다.';
      if (
        msg === 'Failed to fetch' ||
        msg.includes('Failed to fetch') ||
        msg.includes('NetworkError') ||
        msg.includes('network error')
      ) {
        msg = '서버 통신 지연 또는 일시적 네트워크 연결 지연이 발생했습니다. 아래 [다시 시도] 버튼을 누르시면 즉시 연결됩니다.';
      }
      setErrorMessage(msg);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-xl max-h-[90vh] shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60 shrink-0">
          <div className="flex items-center space-x-2">
            <Upload className="w-5 h-5 text-sky-400" />
            <h3 className="text-base font-bold text-white">
              천체 사진 플레이트 솔빙 &amp; 성도 매칭
            </h3>
          </div>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 px-5 pt-2.5 overflow-x-auto shrink-0">
          <button
            onClick={() => setActiveTab('upload')}
            className={`pb-3 px-3 text-xs font-semibold flex items-center space-x-1.5 border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'upload'
                ? 'border-sky-400 text-sky-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>사진 파일 업로드</span>
          </button>

          <button
            onClick={() => setActiveTab('myJobs')}
            className={`pb-3 px-3 text-xs font-semibold flex items-center space-x-1.5 border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'myJobs'
                ? 'border-sky-400 text-sky-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>작업 히스토리 ({myJobs.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('jobId')}
            className={`pb-3 px-3 text-xs font-semibold flex items-center space-x-1.5 border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'jobId'
                ? 'border-sky-400 text-sky-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Job ID 직접 입력</span>
          </button>

          <button
            onClick={() => setActiveTab('url')}
            className={`pb-3 px-3 text-xs font-semibold flex items-center space-x-1.5 border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'url'
                ? 'border-sky-400 text-sky-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <LinkIcon className="w-3.5 h-3.5" />
            <span>이미지 URL</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="p-4 sm:p-5 space-y-3.5 overflow-y-auto flex-1">
          {/* Solver Engine Mode Selector (Shown on Upload & URL Tabs) */}
          {(activeTab === 'upload' || activeTab === 'url') && (
            <div className="p-3 bg-slate-950/90 border border-slate-800 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-emerald-400" />
                  <span>솔빙 연산 엔진 선택</span>
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-800/60 font-semibold">
                  {solverMode === 'local' ? 'API 무사용 · 브라우저 즉시 계산' : '클라우드 서버 API'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSolverMode('local')}
                  className={`p-2 rounded-xl border text-left transition-all flex items-start space-x-2 ${
                    solverMode === 'local'
                      ? 'bg-emerald-950/40 border-emerald-500/80 text-white shadow-md shadow-emerald-500/10'
                      : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                  }`}
                >
                  <Cpu className={`w-4 h-4 shrink-0 mt-0.5 ${solverMode === 'local' ? 'text-emerald-400' : 'text-slate-500'}`} />
                  <div>
                    <div className="text-xs font-bold flex items-center gap-1">
                      <span>웹 브라우저 직접 계산</span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5 leading-tight">
                      astrometry.net 코어 내장 · 1초 완료
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setSolverMode('api')}
                  className={`p-2 rounded-xl border text-left transition-all flex items-start space-x-2 ${
                    solverMode === 'api'
                      ? 'bg-sky-950/40 border-sky-500/80 text-white shadow-md shadow-sky-500/10'
                      : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                  }`}
                >
                  <Globe className={`w-4 h-4 shrink-0 mt-0.5 ${solverMode === 'api' ? 'text-sky-400' : 'text-slate-500'}`} />
                  <div>
                    <div className="text-xs font-bold">Astrometry.net API</div>
                    <p className="text-[10px] text-slate-400 mt-0.5 leading-tight">
                      원격 서버 인덱스 대조
                    </p>
                  </div>
                </button>
              </div>

              {solverMode === 'local' && (
                <div className="pt-0.5">
                  <label className="text-[11px] font-medium text-slate-400 block mb-1">
                    선택적 천체/별자리 힌트 (비워두면 자동 전천 기하 해시 탐색):
                  </label>
                  <input
                    type="text"
                    placeholder="예: 비워두면 자동 기하 해시 탐색 (또는 이중성단, NGC 869, IC 434, M78, M42 입력)"
                    value={localTargetHint}
                    onChange={(e) => setLocalTargetHint(e.target.value)}
                    className="w-full text-xs px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              )}
            </div>
          )}

          {/* File Upload Tab */}
          {activeTab === 'upload' && (
            <div>
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-700 hover:border-sky-500/60 rounded-2xl p-6 text-center cursor-pointer transition-all bg-slate-950/40 hover:bg-slate-950/80 group"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/tiff,.fits,.fit"
                  className="hidden"
                  onClick={(e) => {
                    (e.target as HTMLInputElement).value = '';
                  }}
                  onChange={handleFileChange}
                />

                {previewUrl ? (
                  <div className="flex flex-col items-center">
                    <img
                      src={previewUrl}
                      alt="Preview"
                      className="max-h-40 object-contain rounded-lg shadow-lg border border-slate-700"
                    />
                    <p className="text-xs text-sky-400 font-medium mt-3 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {selectedFile?.name} ({((selectedFile?.size || 0) / 1024 / 1024).toFixed(2)} MB)
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (fileInputRef.current) {
                            fileInputRef.current.value = '';
                            fileInputRef.current.click();
                          }
                        }}
                        className="text-xs px-3 py-1 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-medium shadow-sm transition-colors"
                      >
                        다른 사진으로 변경
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedFile(null);
                          setPreviewUrl(null);
                          if (fileInputRef.current) fileInputRef.current.value = '';
                        }}
                        className="text-xs px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                      >
                        사진 지우기
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">또는 다른 사진 파일을 여기에 드래그하여 놓으세요</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center py-4">
                    <div className="w-12 h-12 rounded-full bg-slate-800 group-hover:bg-sky-500/10 flex items-center justify-center text-slate-400 group-hover:text-sky-400 transition-colors mb-3">
                      <FileImage className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-semibold text-white">
                      천체 사진 파일을 여기에 드래그하거나 클릭하여 선택
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      JPEG, PNG, WebP, TIFF, FITS 포맷 지원 (브라우저 자체 계산 또는 API 업로드)
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* My Account Jobs Tab */}
          {activeTab === 'myJobs' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 font-medium">
                  저장된 플레이트 솔빙 작업 히스토리 (Astrometry.net &amp; 브라우저 계산):
                </span>
              </div>

              {myJobs.length > 0 ? (
                <div className="max-h-64 overflow-y-auto divide-y divide-slate-800 border border-slate-800 rounded-xl bg-slate-950/60">
                  {myJobs.map((j) => {
                    const isSuccess = j.status === 'success';
                    const isAstrometryJob = !String(j.jobId).startsWith('local_');
                    const targetImageUrl =
                      j.rawImageUrl || `/api/astrometry/image-proxy/${j.jobId}/original`;
                    return (
                      <div
                        key={j.jobId}
                        className={`p-3 flex items-center justify-between gap-2 transition-colors ${
                          isSuccess
                            ? 'hover:bg-slate-800/50 cursor-pointer group'
                            : 'opacity-60 cursor-not-allowed bg-rose-950/10'
                        }`}
                        onClick={() => {
                          if (isSuccess) {
                            onSolveSuccess(j.jobId, j.rawImageUrl);
                            onClose();
                          }
                        }}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center flex-wrap gap-1.5">
                            {isAstrometryJob ? (
                              <span
                                className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-950/90 text-indigo-300 border border-indigo-500/60 shadow-sm"
                                title="Astrometry.net 서버에서 분석된 작업"
                              >
                                <Globe className="w-2.5 h-2.5 text-indigo-400" />
                                <span>Astrometry.net 분석</span>
                              </span>
                            ) : (
                              <span
                                className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-950/90 text-emerald-300 border border-emerald-500/60"
                                title="웹 브라우저 내장 엔진에서 계산된 작업"
                              >
                                <Cpu className="w-2.5 h-2.5 text-emerald-400" />
                                <span>브라우저 자체 계산</span>
                              </span>
                            )}
                            <span className="text-xs font-mono font-bold text-sky-400">#{j.jobId}</span>
                            <span className="text-[10px] font-bold text-sky-300 bg-sky-950/80 border border-sky-800/60 px-1.5 py-0.5 rounded truncate max-w-[150px]">
                              {getConstellationObjectTitle(j.constellationKo, j.calibration?.ra, j.calibration?.dec, j.objects, j.filename)}
                            </span>
                            <span className="text-xs font-semibold text-white truncate max-w-[180px]">{j.filename}</span>
                          </div>
                          {j.objects && j.objects.length > 0 && (
                            <p className="text-[11px] text-slate-400 mt-1 truncate max-w-sm">
                              {j.objects.slice(0, 4).join(', ')}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center space-x-1.5 shrink-0">
                          {isSuccess ? (
                            <>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setErrorMessage(null);
                                  setReAnalyzeTargetJobId(j.jobId);
                                  setImageUrl(targetImageUrl);
                                  setActiveTab('url');
                                }}
                                className="text-[11px] px-2.5 py-1 rounded bg-indigo-950/80 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-700/60 transition-all font-semibold flex items-center gap-1"
                                title="이 작업의 원본 천체사진을 다시 불러와 재분석 실행"
                              >
                                <RotateCcw className="w-3 h-3" />
                                <span>다시 분석</span>
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onSolveSuccess(j.jobId, j.rawImageUrl);
                                  onClose();
                                }}
                                className="text-[11px] px-2.5 py-1 rounded bg-slate-800 hover:bg-sky-600 text-slate-200 hover:text-white transition-all font-semibold"
                                title="저장된 분석 결과 불러오기"
                              >
                                불러오기
                              </button>
                            </>
                          ) : (
                            <span className="text-[11px] text-slate-500">매칭 실패</span>
                          )}

                          {/* Delete individual job */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteJob(j.jobId);
                            }}
                            className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 transition-colors"
                            title="이 작업 삭제"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-8 text-center text-xs text-slate-500 bg-slate-950/40 rounded-xl border border-slate-800">
                  저장된 작업 히스토리가 없습니다. 천체 사진을 업로드하여 분석해보세요.
                </div>
              )}

              {/* Clear all jobs button */}
              {myJobs.length > 0 && (
                <div className="flex justify-between items-center pt-1 text-xs">
                  <span className="text-slate-400">총 {myJobs.length}개 작업</span>
                  <button
                    type="button"
                    onClick={handleClearAllJobs}
                    className="text-rose-400 hover:text-rose-300 flex items-center space-x-1 text-[11px] px-2 py-1 rounded hover:bg-rose-950/30 transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>전부 삭제</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Job ID Tab */}
          {activeTab === 'jobId' && (
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 block">
                Astrometry.net Job ID 입력 (예: 17097621, 17100843):
              </label>
              <input
                type="text"
                autoFocus
                placeholder="예: 17097621"
                value={jobIdInput}
                onChange={(e) => setJobIdInput(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 font-mono"
              />
              <p className="text-[11px] text-slate-400">
                nova.astrometry.net에서 이미 솔빙이 완료된 작업 ID를 입력하면 즉시 성도 및 별자리 오버레이가 생성됩니다.
              </p>
            </div>
          )}

          {/* URL Tab */}
          {activeTab === 'url' && (
            <div className="space-y-2.5">
              <label className="text-xs font-semibold text-slate-300 block">
                천체 사진 이미지 URL 또는 히스토리 원본 경로 입력:
              </label>
              <input
                type="text"
                placeholder="https://example.com/astrophoto.jpg 또는 /api/astrometry/image-proxy/..."
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 font-mono"
              />
              {imageUrl.trim() && (
                <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center gap-3">
                  <img
                    src={imageUrl.trim()}
                    alt="불러온 천체사진 미리보기"
                    className="w-16 h-16 object-cover rounded-lg border border-slate-700 bg-slate-900 shrink-0"
                    onError={(e) => {
                      const target = e.currentTarget as HTMLImageElement;
                      const match = imageUrl.trim().match(/image-proxy\/([^/?#]+)/);
                      if (match && !target.dataset.fallbackTried) {
                        target.dataset.fallbackTried = '1';
                        target.src = `/api/astrometry/image-proxy/${match[1]}/extraction`;
                      } else {
                        target.style.display = 'none';
                      }
                    }}
                  />
                  <div className="min-w-0 flex-1 space-y-1">
                    {imageUrl.includes('/api/astrometry/image-proxy/') ? (
                      <div className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-950/90 text-indigo-300 border border-indigo-500/60">
                        <Globe className="w-2.5 h-2.5 text-indigo-400" />
                        <span>
                          Astrometry.net 작업 #{imageUrl.match(/image-proxy\/([^/]+)/)?.[1] || ''} 원본 사진 준비됨
                        </span>
                      </div>
                    ) : (
                      <div className="text-[11px] font-semibold text-sky-400">
                        외부 천체 사진 이미지 로드됨
                      </div>
                    )}
                    <p className="text-[11px] text-slate-400 leading-snug">
                      하단의 <strong className="text-white">솔빙 시작</strong> 버튼을 누르면 선택된 엔진({solverMode === 'local' ? '웹 브라우저 직접 계산' : 'Astrometry.net API'})으로 즉시 재분석합니다.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <div className="p-3.5 bg-rose-950/50 border border-rose-800/80 rounded-xl text-xs text-rose-300 flex flex-col gap-2.5 shadow-lg animate-in fade-in">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-rose-200">{errorMessage}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleStartSolve}
                  className="px-2.5 py-1 bg-rose-900/80 hover:bg-rose-800 text-rose-100 rounded-lg text-xs font-semibold shrink-0 transition-colors border border-rose-700/60 cursor-pointer shadow-sm active:scale-95"
                >
                  다시 시도
                </button>
              </div>
              {solverMode === 'api' && (activeTab === 'upload' || activeTab === 'url') && (
                <button
                  type="button"
                  onClick={() => {
                    setSolverMode('local');
                    setErrorMessage(null);
                  }}
                  className="w-full py-2 px-3 bg-emerald-600/30 hover:bg-emerald-600/50 border border-emerald-500/60 rounded-lg text-emerald-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Cpu className="w-3.5 h-3.5" />
                  <span>API 없이 웹 브라우저 자체 엔진으로 즉시 계산하기</span>
                </button>
              )}
            </div>
          )}

          {/* Processing Status Banner */}
          {isProcessing && (
            <div className="p-4 bg-sky-950/40 border border-sky-800/60 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Loader2 className="w-4 h-4 text-sky-400 animate-spin shrink-0" />
                  <span className="text-xs font-bold text-sky-300">
                    {solverMode === 'local' && activeTab !== 'jobId'
                      ? '브라우저 내장 솔버 엔진 (image2xy + Quad Hash) 계산 중'
                      : '실시간 플레이트 솔빙 분석 중'}
                  </span>
                </div>
                <span className="text-[11px] font-mono text-slate-400">
                  {solverMode === 'local' && activeTab !== 'jobId'
                    ? `${localProgressPct}%`
                    : `경과 시간: ${elapsedSeconds}초`}
                </span>
              </div>
              <p className="text-xs text-slate-300">{currentStep}</p>
              {solverMode === 'local' && localDetectedCount !== null && (
                <p className="text-[11px] text-emerald-300 font-mono">
                  ✦ 검출된 별 중심점(image2xy centroids): {localDetectedCount}개
                </p>
              )}
              {activeSubid && (
                <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 text-[11px] text-slate-400">
                  <span>Astrometry Submission ID: #{activeSubid}</span>
                  <a
                    href={`https://nova.astrometry.net/status/${activeSubid}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sky-400 hover:text-sky-300 flex items-center gap-1"
                  >
                    <span>웹 상태 보기</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between shrink-0">
          <div className="text-[11px] text-slate-400">
            {solverMode === 'local' && activeTab !== 'jobId' ? (
              <span>
                엔진: <strong className="text-emerald-400">Local Browser Solver (No-API)</strong>
              </span>
            ) : (
              <span>
                Astrometry API: <strong className="text-slate-300">nova.astrometry.net</strong>
              </span>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              disabled={isProcessing}
              className="text-xs px-3.5 py-2 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              취소
            </button>
            {activeTab !== 'myJobs' && (
              <button
                onClick={handleStartSolve}
                disabled={isProcessing}
                className={`text-xs px-4 py-2 rounded-lg text-white font-bold shadow-md flex items-center space-x-1.5 transition-all cursor-pointer disabled:opacity-50 ${
                  solverMode === 'local' && activeTab !== 'jobId'
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 shadow-emerald-500/20'
                    : 'bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 shadow-sky-500/20'
                }`}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>솔빙 계산 중...</span>
                  </>
                ) : (
                  <>
                    <span>
                      {activeTab === 'jobId'
                        ? 'Job ID 불러오기'
                        : solverMode === 'local'
                        ? '플레이트 솔빙 시작 (즉시 계산)'
                        : 'API 플레이트 솔빙 시작'}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
