import React, { useRef, useState, useEffect } from 'react';
import {
  Telescope,
  Upload,
  Link as LinkIcon,
  Database,
  Sparkles,
  FileImage,
  ArrowRight,
  ShieldCheck,
  Clock,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { SolvedAstroData } from '../types/astronomy';
import { SAMPLE_SOLVED_JOBS } from '../data/sampleShowcase';

interface EmptyStateProps {
  onStartUpload: (file: File) => void;
  onSubmitUrl: (url: string) => void;
  onSubmitJobId: (jobId: string) => void;
  onSelectSampleJob?: (sample: SolvedAstroData) => void;
  hasApiKey: boolean;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  onStartUpload,
  onSubmitUrl,
  onSubmitJobId,
  onSelectSampleJob,
  hasApiKey,
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'myJobs' | 'url' | 'jobId'>('upload');
  const [urlInput, setUrlInput] = useState('');
  const [jobIdInput, setJobIdInput] = useState('');
  const [myJobs, setMyJobs] = useState<any[]>([]);
  const [loadingMyJobs, setLoadingMyJobs] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch user account jobs from nova.astrometry.net
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
    if (activeTab === 'myJobs' && myJobs.length === 0) {
      fetchMyJobs();
    }
  }, [activeTab]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      onStartUpload(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onStartUpload(file);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-10 px-4">
      {/* Central Hero */}
      <div className="text-center space-y-3 mb-8">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-sky-500 via-indigo-600 to-purple-600 p-0.5 mx-auto shadow-xl shadow-sky-500/20 flex items-center justify-center">
          <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
            <Telescope className="w-8 h-8 text-sky-400" />
          </div>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
          천체 사진 성도 매칭 &amp; 정밀 좌표 분석
        </h1>
        <p className="text-sm text-slate-400 max-w-xl mx-auto">
          밤하늘 성야 및 천체 사진을 입력하면 <strong className="text-sky-300">nova.astrometry.net API</strong>를 통해 적경/적위 좌표를 추출하고, IAU 성도 및 별자리 연결선을 실시간으로 자동 매칭합니다.
        </p>
      </div>

      {/* Main Upload Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
        {/* Tab switcher */}
        <div className="flex border-b border-slate-800 pb-3 gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('upload')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 whitespace-nowrap ${
              activeTab === 'upload'
                ? 'bg-sky-500 text-white shadow-md shadow-sky-500/25'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>사진 파일 업로드</span>
          </button>

          <button
            onClick={() => setActiveTab('myJobs')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 whitespace-nowrap ${
              activeTab === 'myJobs'
                ? 'bg-sky-500 text-white shadow-md shadow-sky-500/25'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>내 Astrometry 계정 작업 ({myJobs.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('jobId')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 whitespace-nowrap ${
              activeTab === 'jobId'
                ? 'bg-sky-500 text-white shadow-md shadow-sky-500/25'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Job ID 직접 조회</span>
          </button>

          <button
            onClick={() => setActiveTab('url')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 whitespace-nowrap ${
              activeTab === 'url'
                ? 'bg-sky-500 text-white shadow-md shadow-sky-500/25'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <LinkIcon className="w-3.5 h-3.5" />
            <span>이미지 URL</span>
          </button>
        </div>

        {/* Upload Mode */}
        {activeTab === 'upload' && (
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-700 hover:border-sky-500/70 rounded-2xl p-10 text-center cursor-pointer transition-all bg-slate-950/50 hover:bg-slate-950/80 group"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/tiff,.fits,.fit"
              className="hidden"
              onChange={handleFileChange}
            />
            <div className="w-14 h-14 rounded-2xl bg-slate-800 group-hover:bg-sky-500/10 flex items-center justify-center text-slate-400 group-hover:text-sky-400 transition-colors mx-auto mb-4">
              <FileImage className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold text-white group-hover:text-sky-300 transition-colors">
              새 사진 분석: 천체 사진을 이곳에 드래그하거나 클릭하세요
            </h3>
            <p className="text-xs text-slate-400 mt-1.5">
              JPEG, PNG, WebP, TIFF, FITS 포맷 지원 (직접 업로드 및 Astrometry.net 정밀 플레이트 솔빙 분석)
            </p>
            <div className="mt-5 flex items-center justify-center">
              <span className="inline-flex items-center space-x-2 text-sm font-bold px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white shadow-lg shadow-sky-500/25 transition-all">
                <Upload className="w-4 h-4" />
                <span>새 사진 분석 파일 가져오기</span>
              </span>
            </div>
          </div>
        )}

        {/* My Jobs Mode */}
        {activeTab === 'myJobs' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 font-medium">
                내 Astrometry.net 계정에서 최근 솔빙된 관측 작업:
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
                <p className="text-xs">내 Astrometry.net 계정 작업 목록 동기화 중...</p>
              </div>
            ) : myJobs.length > 0 ? (
              <div className="max-h-64 overflow-y-auto divide-y divide-slate-800 border border-slate-800 rounded-xl bg-slate-950/60">
                {myJobs.map((j) => (
                  <div
                    key={j.jobId}
                    className="p-3 hover:bg-slate-800/50 flex items-center justify-between transition-colors cursor-pointer group"
                    onClick={() => onSubmitJobId(String(j.jobId))}
                  >
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-mono font-bold text-sky-400">#{j.jobId}</span>
                        <span className="text-xs font-semibold text-white truncate max-w-xs">{j.filename}</span>
                      </div>
                      {j.objects && j.objects.length > 0 && (
                        <p className="text-[11px] text-slate-400 mt-0.5 truncate max-w-sm">
                          {j.objects.slice(0, 3).join(', ')}
                        </p>
                      )}
                    </div>
                    <button className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 group-hover:bg-sky-600 text-slate-300 group-hover:text-white transition-all shrink-0 font-medium">
                      성도 불러오기
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-xs text-slate-400 bg-slate-950/40 rounded-xl border border-slate-800">
                계정 작업을 불러오는 중이거나 작업이 없습니다. 상단의 새로고침을 눌러보세요.
              </div>
            )}
          </div>
        )}

        {/* Job ID Mode */}
        {activeTab === 'jobId' && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (jobIdInput.trim()) onSubmitJobId(jobIdInput.trim());
            }}
            className="space-y-4"
          >
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                기존 Astrometry.net Job ID 입력:
              </label>
              <input
                type="text"
                required
                placeholder="예: 17097621 또는 17100843"
                value={jobIdInput}
                onChange={(e) => setJobIdInput(e.target.value)}
                className="w-full text-sm px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 font-mono"
              />
              <p className="text-[11px] text-slate-400 mt-1.5">
                nova.astrometry.net에서 이미 솔빙이 완료된 Job 번호를 입력하면 즉시 성도 및 별자리 오버레이가 생성됩니다.
              </p>
            </div>
            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white font-bold text-sm shadow-lg shadow-indigo-500/20 flex items-center justify-center space-x-2 transition-all"
            >
              <span>Astrometry Job 결과 불러오기</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* URL Mode */}
        {activeTab === 'url' && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (urlInput.trim()) onSubmitUrl(urlInput.trim());
            }}
            className="space-y-4"
          >
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                천체 사진 웹 이미지 URL:
              </label>
              <input
                type="url"
                required
                placeholder="https://example.com/deepsky-photo.jpg"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                className="w-full text-sm px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
              />
            </div>
            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-bold text-sm shadow-lg shadow-sky-500/20 flex items-center justify-center space-x-2 transition-all"
            >
              <span>URL로 플레이트 솔빙 시작</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* Feature Highlights Footer */}
        <div className="pt-4 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-400">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-sky-400 shrink-0" />
            <span>별자리 선 &amp; 항성 자동 매칭</span>
          </div>
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-indigo-400 shrink-0" />
            <span>분석했던 사진 자동 영구 보관</span>
          </div>
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>실시간 WCS 정밀 천체 좌표계</span>
          </div>
        </div>

        {/* Sample Targets Showcase for Instant Experience on GitHub & First-time visits */}
        {onSelectSampleJob && (
          <div className="pt-4 border-t border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-sky-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                샘플 천체 사진으로 즉시 체험하기:
              </span>
              <span className="text-[11px] text-slate-400">API 키 없이 즉시 분석 결과 로드</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {SAMPLE_SOLVED_JOBS.map((sample) => (
                <div
                  key={sample.jobId}
                  onClick={() => onSelectSampleJob(sample)}
                  className="p-3 bg-slate-950/70 hover:bg-slate-800/90 border border-slate-800 hover:border-sky-500/50 rounded-xl cursor-pointer transition-all flex items-center space-x-3 group shadow-sm active:scale-98"
                >
                  <img
                    src={sample.imageUrl}
                    alt={sample.title}
                    className="w-12 h-12 object-cover rounded-lg border border-slate-700 shrink-0 group-hover:scale-105 transition-transform"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-white group-hover:text-sky-300 transition-colors truncate">
                      {sample.title}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {sample.matchedConstellations[0]?.nameKo} ({sample.matchedConstellations[0]?.code}) • Job #{sample.jobId}
                    </p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-sky-400 transition-colors shrink-0" />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
