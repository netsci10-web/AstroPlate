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
} from 'lucide-react';

interface UploadPlateSolveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSolveSuccess: (jobId: number | string, customImageUrl?: string) => void;
  hasApiKey: boolean;
  initialFile?: File | null;
  initialUrl?: string;
  initialJobId?: string;
}

export const UploadPlateSolveModal: React.FC<UploadPlateSolveModalProps> = ({
  isOpen,
  onClose,
  onSolveSuccess,
  hasApiKey,
  initialFile = null,
  initialUrl = '',
  initialJobId = '',
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'url' | 'jobId' | 'myJobs'>('upload');
  const [imageUrl, setImageUrl] = useState('');
  const [jobIdInput, setJobIdInput] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

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
      if (initialFile) {
        setSelectedFile(initialFile);
        setPreviewUrl(URL.createObjectURL(initialFile));
        setActiveTab('upload');
      } else if (initialUrl) {
        setImageUrl(initialUrl);
        setActiveTab('url');
      } else if (initialJobId) {
        setJobIdInput(initialJobId);
        setActiveTab('jobId');
      }
    }
  }, [isOpen, initialFile, initialUrl, initialJobId]);

  // Fetch user account jobs when myJobs tab is opened
  const fetchMyJobs = async () => {
    setLoadingMyJobs(true);
    try {
      const resp = await fetch('/api/astrometry/my-jobs');
      if (resp.ok) {
        const data = await resp.json();
        setMyJobs(data.detailed || []);
      }
    } catch (e) {
      console.error('Failed to fetch my jobs:', e);
    } finally {
      setLoadingMyJobs(false);
    }
  };

  useEffect(() => {
    if (isOpen && activeTab === 'myJobs' && myJobs.length === 0) {
      fetchMyJobs();
    }
  }, [isOpen, activeTab]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      setErrorMessage(null);
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

      setCurrentStep('Astrometry.net 서버로 업로드 및 분석 요청 중...');

      const hasScaleLower = Boolean(scaleLower && !isNaN(parseFloat(scaleLower)));
      const hasScaleUpper = Boolean(scaleUpper && !isNaN(parseFloat(scaleUpper)));

      // Direct multipart file upload via FormData (no Base64 JSON overhead)
      if (activeTab === 'upload' && selectedFile) {
        const formData = new FormData();
        formData.append('file', selectedFile);
        if (hasScaleLower) formData.append('scaleLower', scaleLower);
        if (hasScaleUpper) formData.append('scaleUpper', scaleUpper);
        if ((hasScaleLower || hasScaleUpper) && scaleUnits) {
          formData.append('scaleUnits', scaleUnits);
        }

        const uploadResp = await fetch('/api/astrometry/upload-file', {
          method: 'POST',
          body: formData,
        });

        const uploadData = await uploadResp.json();
        if (!uploadResp.ok || uploadData.error) {
          throw new Error(uploadData.error || uploadData.message || '파일 업로드 실패');
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

        const solveResp = await fetch('/api/astrometry/solve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const solveData = await solveResp.json();
        if (!solveResp.ok || solveData.error) {
          throw new Error(solveData.error || solveData.message || 'URL 제출 실패');
        }

        const subid = solveData.subid;
        pollSubmission(subid, imageUrl.trim());
        return;
      }
    } catch (err: any) {
      setIsProcessing(false);
      setErrorMessage(err.message || '오류가 발생했습니다.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
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
        <div className="flex border-b border-slate-800 bg-slate-950/40 px-5 pt-3 overflow-x-auto">
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
            <span>내 계정 작업 ({myJobs.length})</span>
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
        <div className="p-5 space-y-4">
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
                  onChange={handleFileChange}
                />

                {previewUrl ? (
                  <div className="flex flex-col items-center">
                    <img
                      src={previewUrl}
                      alt="Preview"
                      className="max-h-36 object-contain rounded-lg shadow-lg border border-slate-700"
                    />
                    <p className="text-xs text-sky-400 font-medium mt-3 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {selectedFile?.name} ({((selectedFile?.size || 0) / 1024 / 1024).toFixed(2)} MB)
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1">다른 사진을 선택하려면 클릭하거나 드래그하세요</p>
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
                      JPEG, PNG, WebP, TIFF, FITS 포맷 지원 (최대 150MB 직접 업로드 가능)
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
                  Astrometry.net 계정에 등록된 솔빙 작업 목록:
                </span>
                <button
                  onClick={fetchMyJobs}
                  disabled={loadingMyJobs}
                  className="text-xs text-sky-400 hover:text-sky-300 flex items-center gap-1 transition-colors"
                >
                  <RefreshCw className={`w-3 h-3 ${loadingMyJobs ? 'animate-spin' : ''}`} />
                  <span>새로고침</span>
                </button>
              </div>

              {loadingMyJobs ? (
                <div className="py-12 flex flex-col items-center justify-center space-y-2 text-slate-400">
                  <Loader2 className="w-6 h-6 text-sky-400 animate-spin" />
                  <p className="text-xs">내 계정 작업 목록 동기화 중...</p>
                </div>
              ) : myJobs.length > 0 ? (
                <div className="max-h-60 overflow-y-auto divide-y divide-slate-800 border border-slate-800 rounded-xl bg-slate-950/60">
                  {myJobs.map((j) => {
                    const isSuccess = j.status === 'success';
                    return (
                      <div
                        key={j.jobId}
                        className={`p-3 flex items-center justify-between transition-colors ${
                          isSuccess
                            ? 'hover:bg-slate-800/50 cursor-pointer group'
                            : 'opacity-60 cursor-not-allowed bg-rose-950/10'
                        }`}
                        onClick={() => {
                          if (isSuccess) {
                            onSolveSuccess(j.jobId);
                            onClose();
                          }
                        }}
                      >
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs font-mono font-bold text-sky-400">#{j.jobId}</span>
                            <span className="text-xs font-semibold text-white truncate max-w-xs">{j.filename}</span>
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                                isSuccess
                                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60'
                                  : 'bg-rose-950 text-rose-400 border border-rose-800/60'
                              }`}
                            >
                              {isSuccess ? '솔빙 성공' : '솔빙 실패'}
                            </span>
                          </div>
                          {j.objects && j.objects.length > 0 && (
                            <p className="text-[11px] text-slate-400 mt-0.5 truncate max-w-sm">
                              {j.objects.slice(0, 3).join(', ')}
                            </p>
                          )}
                        </div>
                        {isSuccess ? (
                          <button className="text-xs px-2.5 py-1 rounded bg-slate-800 group-hover:bg-sky-600 text-slate-300 group-hover:text-white transition-all shrink-0">
                            불러오기
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-500 shrink-0">매칭 실패</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-8 text-center text-xs text-slate-500 bg-slate-950/40 rounded-xl border border-slate-800">
                  계정 작업을 불러오는 중이거나 작업이 없습니다. 상단의 새로고침을 눌러보세요.
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
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 block">
                웹 상의 천체 사진 이미지 URL 입력:
              </label>
              <input
                type="url"
                placeholder="https://example.com/astrophoto.jpg"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
              />
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <div className="p-3 bg-rose-950/40 border border-rose-800/60 rounded-xl text-xs text-rose-300 flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">{errorMessage}</p>
                {!hasApiKey && activeTab !== 'jobId' && (
                  <p className="mt-1 text-slate-400 text-[11px]">
                    Tip: 새로운 사진 직접 업로드 분석에는 nova.astrometry.net API 키가 필요합니다 (Settings &gt; Secrets에서 ASTROMETRY_API_KEY 등록).
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Processing Status Banner */}
          {isProcessing && (
            <div className="p-4 bg-sky-950/40 border border-sky-800/60 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Loader2 className="w-4 h-4 text-sky-400 animate-spin shrink-0" />
                  <span className="text-xs font-bold text-sky-300">실시간 플레이트 솔빙 분석 중</span>
                </div>
                <span className="text-[11px] font-mono text-slate-400">경과 시간: {elapsedSeconds}초</span>
              </div>
              <p className="text-xs text-slate-300">{currentStep}</p>
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
        <div className="px-5 py-3.5 bg-slate-950/60 border-t border-slate-800 flex items-center justify-between">
          <div className="text-[11px] text-slate-400">
            Astrometry API: <strong className="text-slate-300">nova.astrometry.net</strong>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              disabled={isProcessing}
              className="text-xs px-3.5 py-2 rounded-lg text-slate-400 hover:text-white transition-colors"
            >
              취소
            </button>
            {activeTab !== 'myJobs' && (
              <button
                onClick={handleStartSolve}
                disabled={isProcessing}
                className="text-xs px-4 py-2 rounded-lg bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-medium shadow-md shadow-sky-500/20 flex items-center space-x-1.5 transition-all disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>솔빙 대기 중...</span>
                  </>
                ) : (
                  <>
                    <span>{activeTab === 'jobId' ? 'Job ID 불러오기' : '플레이트 솔빙 시작'}</span>
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
