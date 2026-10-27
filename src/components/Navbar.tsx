import React from 'react';
import { Telescope, Database, Upload, Sun, Moon } from 'lucide-react';

export type GlobalAppTheme = 'deep_space' | 'daylight';

interface NavbarProps {
  onOpenUpload: () => void;
  onOpenJobInput: () => void;
  onOpenAccountJobs: () => void;
  onOpenDualIndex?: () => void;
  onReset?: () => void;
  accountJobsCount: number;
  hasApiKey: boolean;
  globalTheme: GlobalAppTheme;
  onToggleTheme: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenUpload,
  onOpenJobInput,
  onOpenAccountJobs,
  onReset,
  accountJobsCount,
  globalTheme,
  onToggleTheme,
}) => {
  const isDaylight = globalTheme === 'daylight';

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-40 shadow-lg transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Title: Clicking resets/initializes the app */}
          <button
            type="button"
            onClick={onReset}
            title="AstroPlate 홈으로 초기화 (메인 화면으로 이동)"
            className="flex items-center space-x-3 text-left group cursor-pointer focus:outline-none rounded-xl p-1 -m-1 hover:bg-slate-800/60 transition-all active:scale-95"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-sky-500 to-teal-400 p-0.5 flex items-center justify-center shadow-md shadow-sky-500/20 group-hover:shadow-sky-500/40 transition-shadow">
              <div className="w-full h-full bg-slate-900 rounded-[10px] flex items-center justify-center group-hover:bg-slate-800 transition-colors">
                <Telescope className="w-5 h-5 text-sky-400 group-hover:text-sky-300 transition-colors" />
              </div>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-sky-500 via-indigo-500 to-purple-500 bg-clip-text text-transparent">
                  AstroPlate
                </span>
              </div>
              <p className="text-xs text-slate-400 group-hover:text-slate-300 transition-colors">
                성도 및 별자리 자동 매칭 &amp; 정밀 좌표 오버레이
              </p>
            </div>
          </button>

          {/* Action Buttons */}
          <div className="flex items-center space-x-2 sm:space-x-2.5">
            {/* Global Theme Toggle: Deep Space vs Daylight */}
            <button
              type="button"
              onClick={onToggleTheme}
              aria-label={isDaylight ? 'Deep Space 다크 테마로 전환' : 'Daylight 라이트 테마로 전환'}
              title={
                isDaylight
                  ? '현재: Daylight (주간 라이트 테마) — 클릭하여 Deep Space (심우주 다크 테마)로 전환'
                  : '현재: Deep Space (심우주 다크 테마) — 클릭하여 Daylight (주간 라이트 테마)로 전환'
              }
              className="text-xs px-2.5 sm:px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center space-x-1.5 transition-all cursor-pointer"
            >
              {isDaylight ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                  <span className="font-semibold hidden sm:inline">Daylight</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-sky-400" />
                  <span className="font-semibold hidden sm:inline">Deep Space</span>
                </>
              )}
            </button>

            {/* Work History Button */}
            <button
              onClick={onOpenAccountJobs}
              title="Astrometry.net 및 로컬 솔빙 작업 히스토리 목록 보기"
              className="text-xs px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center space-x-1.5 transition-colors relative cursor-pointer"
            >
              <Database className="w-3.5 h-3.5 text-sky-400" />
              <span className="font-medium">작업 히스토리</span>
              {accountJobsCount > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full bg-sky-500 text-white text-[10px] font-bold">
                  {accountJobsCount}
                </span>
              )}
            </button>

            {/* Direct Job ID Lookup */}
            <button
              onClick={onOpenJobInput}
              title="Astrometry.net Job ID 직접 조회"
              className="text-xs px-2.5 sm:px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center space-x-1.5 transition-colors cursor-pointer"
            >
              <Database className="w-3.5 h-3.5 text-indigo-400" />
              <span>Job ID 조회</span>
            </button>

            {/* Analyze New Photo */}
            <button
              onClick={onOpenUpload}
              title="새로운 천체 사진 선택 및 플레이트 솔빙 분석"
              className="text-xs px-3.5 py-2 rounded-lg bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-medium shadow-md shadow-sky-500/25 flex items-center space-x-1.5 transition-all transform active:scale-95 cursor-pointer"
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
