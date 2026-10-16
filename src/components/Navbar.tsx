import React from 'react';
import { Telescope, Clock, Database, Upload, Compass, HelpCircle } from 'lucide-react';

interface NavbarProps {
  onOpenUpload: () => void;
  onOpenJobInput: () => void;
  onOpenHistory: () => void;
  historyCount: number;
  hasApiKey: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenUpload,
  onOpenJobInput,
  onOpenHistory,
  historyCount,
  hasApiKey,
}) => {
  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-30 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-sky-500 to-teal-400 p-0.5 flex items-center justify-center shadow-md shadow-sky-500/20">
              <div className="w-full h-full bg-slate-900 rounded-[10px] flex items-center justify-center">
                <Telescope className="w-5 h-5 text-sky-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-sky-400 via-indigo-300 to-purple-300 bg-clip-text text-transparent">
                  AstroPlate
                </span>
                <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-sky-950/80 text-sky-300 border border-sky-800/60">
                  Astrometry.net API
                </span>
              </div>
              <p className="text-xs text-slate-400">성도 및 별자리 자동 매칭 &amp; 정밀 좌표 오버레이</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* My Analyzed Photos History Button */}
            <button
              onClick={onOpenHistory}
              title="내가 분석했던 사진 목록 보기"
              className="text-xs px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center space-x-1.5 transition-colors relative"
            >
              <Clock className="w-3.5 h-3.5 text-sky-400" />
              <span className="font-medium">분석 기록</span>
              {historyCount > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full bg-sky-500 text-white text-[10px] font-bold">
                  {historyCount}
                </span>
              )}
            </button>

            {/* Direct Job ID Lookup */}
            <button
              onClick={onOpenJobInput}
              title="Astrometry.net Job ID 직접 조회"
              className="text-xs px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 hidden sm:flex items-center space-x-1.5 transition-colors"
            >
              <Database className="w-3.5 h-3.5 text-indigo-400" />
              <span>Job ID 조회</span>
            </button>

            {/* Analyze New Photo */}
            <button
              onClick={onOpenUpload}
              title="새로운 천체 사진 선택 및 플레이트 솔빙 분석"
              className="text-xs px-3.5 py-2 rounded-lg bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-medium shadow-md shadow-sky-500/25 flex items-center space-x-1.5 transition-all transform active:scale-95"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>새 사진분석</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
