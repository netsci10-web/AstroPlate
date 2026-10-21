import React from 'react';
import {
  X,
  Database,
  Trash2,
  ArrowRight,
  Calendar,
  RefreshCw,
} from 'lucide-react';
import { AnalysisHistoryItem } from '../types/astronomy';
import { degToRA_HMS, degToDec_DMS } from '../utils/coordinateMath';
import {
  getConstellationObjectTitle,
  formatTitleWithCatalogPriority,
} from '../utils/constellations';

interface MyAccountJobsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  jobs: AnalysisHistoryItem[];
  activeJobId: number | string | null;
  onSelectJob: (jobId: number | string) => void;
  onDeleteJob: (jobId: number | string) => void;
  onClearAllJobs: () => void;
  onSyncAccountJobs?: () => void;
  isSyncing?: boolean;
}

export const MyAccountJobsDrawer: React.FC<MyAccountJobsDrawerProps> = ({
  isOpen,
  onClose,
  jobs,
  activeJobId,
  onSelectJob,
  onDeleteJob,
  onClearAllJobs,
  onSyncAccountJobs,
  isSyncing = false,
}) => {
  if (!isOpen) return null;

  const formatDate = (ts: number) => {
    const d = new Date(ts);
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  // Sort jobs: Most recent at the top, oldest at the bottom
  const sortedJobs = React.useMemo(() => {
    return [...jobs].sort((a, b) => {
      const timeA = typeof a.timestamp === 'number' && !isNaN(a.timestamp) ? a.timestamp : 0;
      const timeB = typeof b.timestamp === 'number' && !isNaN(b.timestamp) ? b.timestamp : 0;
      if (timeB !== timeA) {
        return timeB - timeA; // Descending: Most recent on top, oldest at bottom
      }
      const numA = Number(String(a.jobId).replace(/\D/g, '')) || 0;
      const numB = Number(String(b.jobId).replace(/\D/g, '')) || 0;
      return numB - numA;
    });
  }, [jobs]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border-l border-slate-800 w-full max-w-md h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
        {/* Drawer Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-950 border border-sky-800 flex items-center justify-center">
              <Database className="w-4 h-4 text-sky-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                작업 히스토리
              </h3>
              <p className="text-xs text-slate-400">
                기억된 작업 {sortedJobs.length}개 보관 중 (최신순)
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-1.5">
            {onSyncAccountJobs && (
              <button
                type="button"
                onClick={onSyncAccountJobs}
                disabled={isSyncing}
                title="Astrometry.net 계정의 작업 목록 새로고침 동기화"
                className="text-xs px-2.5 py-1.5 rounded-lg bg-sky-950 text-sky-300 border border-sky-800 hover:bg-sky-900 transition-colors flex items-center space-x-1 cursor-pointer"
              >
                <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">동기화</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title="닫기"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Notice Banner */}
        <div className="bg-sky-950/30 border-b border-sky-900/40 px-4 py-2 text-[11px] text-sky-300 flex items-center justify-between">
          <span>작업을 클릭하면 해당 솔빙 데이터를 즉시 불러옵니다. (최근 작업 순 정렬)</span>
        </div>

        {/* Jobs List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {sortedJobs.length > 0 ? (
            sortedJobs.map((item) => {
              const isActive = String(item.jobId) === String(activeJobId);
              const constellationTitle = getConstellationObjectTitle(
                item.primaryConstellationKo,
                item.raDeg ?? 0,
                item.decDeg ?? 0,
                item.objects || item.solvedData?.info?.objects_in_field || [],
                item.title,
                item.solvedData?.title
              );

              const raText = typeof item.raDeg === 'number' && !isNaN(item.raDeg)
                ? `${item.raDeg.toFixed(2)}°`
                : '0.00°';
              const radiusText = typeof item.radiusDeg === 'number' && !isNaN(item.radiusDeg)
                ? `${item.radiusDeg.toFixed(1)}°`
                : '1.0°';

              return (
                <div
                  key={item.id || item.jobId}
                  onClick={() => {
                    onSelectJob(item.jobId);
                    onClose();
                  }}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer relative group ${
                    isActive
                      ? 'bg-sky-950/50 border-sky-500/60 shadow-md ring-1 ring-sky-500/40'
                      : 'bg-slate-800/40 border-slate-800 hover:border-sky-600/50 hover:bg-slate-800/70'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    {/* Thumbnail preview linked to Job ID */}
                    <div className="w-16 h-16 rounded-lg bg-slate-950 overflow-hidden shrink-0 border border-slate-700/60 relative">
                      <img
                        src={item.imageUrl || `/api/astrometry/image-proxy/${item.jobId}/annotated`}
                        alt={item.title}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.currentTarget as HTMLImageElement;
                          const isLocal = String(item.jobId).startsWith('local_');
                          if (!isLocal && !target.src.includes('nova.astrometry.net')) {
                            target.src = `https://nova.astrometry.net/annotated_display/${item.jobId}`;
                          }
                        }}
                      />
                      <span className="absolute bottom-0 right-0 bg-slate-950/90 text-[9px] px-1 font-mono text-sky-400 font-bold border-t border-l border-slate-800">
                        #{item.jobId}
                      </span>
                    </div>

                    {/* Metadata */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-sky-950 text-sky-300 border border-sky-800 font-mono">
                          Job #{item.jobId}
                        </span>
                        <span className="text-xs font-bold text-sky-300 bg-sky-950/70 border border-sky-800/60 px-1.5 py-0.5 rounded truncate max-w-[200px]" title={constellationTitle}>
                          {constellationTitle}
                        </span>
                      </div>

                      <p className="text-xs text-slate-300 font-medium truncate mt-1">
                        {formatTitleWithCatalogPriority(
                          item.title || `Astrometry Job #${item.jobId}`,
                          item.objects || item.solvedData?.info?.objects_in_field || []
                        )}
                      </p>

                      <div className="text-[11px] text-slate-400 font-mono mt-1 space-y-0.5">
                        <p>RA: {degToRA_HMS(item.raDeg ?? 0)} ({raText})</p>
                        <p>Dec: {degToDec_DMS(item.decDeg ?? 0)} (화각 {radiusText})</p>
                      </div>

                      <div className="flex items-center space-x-2 mt-1.5 text-[10px] text-slate-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(item.timestamp || Date.now())}
                        </span>
                        <span>•</span>
                        <span>천체 {(item.starsCount || 0) + (item.dsosCount || 0)}개</span>
                      </div>
                    </div>
                  </div>

                  {/* Action buttons: Single delete & Load from Astrometry */}
                  <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between">
                    {/* Individual Job Deletion: instant 1-click delete */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteJob(item.jobId);
                      }}
                      className="text-slate-400 hover:text-rose-400 hover:bg-rose-950/50 px-2.5 py-1.5 rounded-lg transition-colors text-xs flex items-center space-x-1.5 border border-slate-700/60 hover:border-rose-900/60 cursor-pointer group/del"
                      title="이 작업 삭제"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-slate-400 group-hover/del:text-rose-400" />
                      <span className="text-[11px] font-semibold text-slate-300 group-hover/del:text-rose-300">한개 삭제</span>
                    </button>

                    {/* Load button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectJob(item.jobId);
                        onClose();
                      }}
                      className={`text-xs px-3 py-1.5 rounded-lg font-medium flex items-center space-x-1 transition-all ${
                        isActive
                          ? 'bg-sky-500 text-white font-semibold shadow-sm'
                          : 'bg-slate-700 hover:bg-sky-600 text-slate-200 hover:text-white cursor-pointer'
                      }`}
                    >
                      <span>{isActive ? '현재 분석 중' : '작업 불러오기'}</span>
                      {!isActive && <ArrowRight className="w-3 h-3" />}
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="py-16 text-center text-slate-500 space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
                <Database className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-300">저장된 작업 히스토리가 없습니다</p>
                <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                  사진을 업로드하여 솔빙하거나 Job ID를 입력하면 작업 히스토리가 자동으로 기억되어 언제든지 다시 불러올 수 있습니다.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Drawer Footer: Delete all jobs & status */}
        {sortedJobs.length > 0 && (
          <div className="p-4 border-t border-slate-800 bg-slate-950/70 flex items-center justify-between">
            <span className="text-xs text-slate-400">총 {sortedJobs.length}개의 작업 히스토리 보관됨</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClearAllJobs();
              }}
              className="text-xs text-rose-400 hover:text-rose-300 bg-rose-950/40 hover:bg-rose-950/80 px-3 py-1.5 rounded-lg border border-rose-800/60 hover:border-rose-700 transition-colors flex items-center space-x-1.5 font-bold cursor-pointer shadow-sm active:scale-95"
              title="보관된 모든 작업 히스토리 삭제"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>전부 삭제</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
