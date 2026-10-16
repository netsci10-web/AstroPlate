import React from 'react';
import {
  X,
  Clock,
  Trash2,
  ExternalLink,
  Sparkles,
  Target,
  ArrowRight,
  Database,
  Calendar,
} from 'lucide-react';
import { AnalysisHistoryItem } from '../types/astronomy';
import { degToRA_HMS, degToDec_DMS } from '../utils/coordinateMath';

interface AnalysisHistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  history: AnalysisHistoryItem[];
  activeJobId: number | string | null;
  onSelectJob: (jobId: number | string, customImageUrl?: string) => void;
  onDeleteItem: (id: string) => void;
  onClearAll: () => void;
  onSyncMyJobs?: () => void;
}

export const AnalysisHistoryDrawer: React.FC<AnalysisHistoryDrawerProps> = ({
  isOpen,
  onClose,
  history,
  activeJobId,
  onSelectJob,
  onDeleteItem,
  onClearAll,
  onSyncMyJobs,
}) => {
  if (!isOpen) return null;

  const formatDate = (ts: number) => {
    const d = new Date(ts);
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border-l border-slate-800 w-full max-w-md h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
        {/* Drawer Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center space-x-2">
            <Clock className="w-5 h-5 text-sky-400" />
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                내 천체 사진 분석 기록
              </h3>
              <p className="text-xs text-slate-400">총 {history.length}개의 분석 결과 저장됨</p>
            </div>
          </div>
          <div className="flex items-center space-x-1.5">
            {onSyncMyJobs && (
              <button
                onClick={onSyncMyJobs}
                title="Astrometry.net 계정의 작업 목록 새로고침 동기화"
                className="text-xs px-2.5 py-1 rounded-lg bg-sky-950 text-sky-300 border border-sky-800 hover:bg-sky-900 transition-colors"
              >
                계정 동기화
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* History List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {history.length > 0 ? (
            history.map((item) => {
              const isActive = String(item.jobId) === String(activeJobId);
              return (
                <div
                  key={item.id}
                  className={`p-3 rounded-xl border transition-all ${
                    isActive
                      ? 'bg-sky-950/40 border-sky-500/50 shadow-md ring-1 ring-sky-500/30'
                      : 'bg-slate-800/40 border-slate-800 hover:border-slate-700 hover:bg-slate-800/70'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    {/* Thumbnail preview */}
                    <div className="w-16 h-16 rounded-lg bg-slate-950 overflow-hidden shrink-0 border border-slate-700/60 relative">
                      <img
                        src={item.imageUrl}
                        alt={item.title}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          // Fallback to proxy
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                      <span className="absolute bottom-0 right-0 bg-slate-950/80 text-[9px] px-1 font-mono text-slate-300">
                        #{item.jobId}
                      </span>
                    </div>

                    {/* Metadata */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-1.5">
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-sky-950 text-sky-300 border border-sky-800 font-mono">
                          {item.primaryConstellationCode || 'Constellation'}
                        </span>
                        <span className="text-xs font-bold text-white truncate">
                          {item.primaryConstellationKo || '성도 매칭 결과'}
                        </span>
                      </div>

                      <p className="text-xs text-slate-300 font-medium truncate mt-0.5">
                        {item.title}
                      </p>

                      <div className="text-[11px] text-slate-400 font-mono mt-1 space-y-0.5">
                        <p>RA: {degToRA_HMS(item.raDeg)}</p>
                        <p>Dec: {degToDec_DMS(item.decDeg)} (화각 {item.radiusDeg.toFixed(1)}°)</p>
                      </div>

                      <div className="flex items-center space-x-2 mt-1.5 text-[10px] text-slate-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(item.timestamp)}
                        </span>
                        <span>•</span>
                        <span>천체 {item.starsCount + item.dsosCount}개</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between">
                    <button
                      onClick={() => onDeleteItem(item.id)}
                      className="text-slate-400 hover:text-rose-400 p-1 rounded transition-colors text-xs flex items-center space-x-1"
                      title="기록에서 삭제"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span className="text-[11px]">삭제</span>
                    </button>

                    <button
                      onClick={() => {
                        onSelectJob(item.jobId, item.imageUrl);
                        onClose();
                      }}
                      className={`text-xs px-3 py-1.5 rounded-lg font-medium flex items-center space-x-1 transition-all ${
                        isActive
                          ? 'bg-sky-500 text-white font-semibold shadow-sm'
                          : 'bg-slate-700 hover:bg-sky-600 text-slate-200 hover:text-white'
                      }`}
                    >
                      <span>{isActive ? '현재 보는 중' : '성도 불러오기'}</span>
                      {!isActive && <ArrowRight className="w-3 h-3" />}
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="py-16 text-center text-slate-500 space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-300">저장된 분석 기록이 없습니다</p>
                <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                  천체 사진을 업로드하거나 분석하면 자동으로 이곳에 기억되어 언제든지 다시 불러올 수 있습니다.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Drawer Footer */}
        {history.length > 0 && (
          <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between">
            <span className="text-xs text-slate-400">브라우저 및 로컬에 자동 보관됨</span>
            <button
              onClick={() => {
                if (window.confirm('저장된 분석 기록을 모두 삭제하시겠습니까?')) {
                  onClearAll();
                }
              }}
              className="text-xs text-rose-400 hover:text-rose-300 px-2 py-1 rounded transition-colors flex items-center space-x-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>전체 기록 삭제</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
