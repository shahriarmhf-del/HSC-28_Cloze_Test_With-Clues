import React from 'react';
import { 
  Sun, 
  Moon, 
  Flame, 
  Target, 
  BookOpen, 
  Sparkles, 
  History, 
  Printer, 
  Plus, 
  Download, 
  Upload 
} from 'lucide-react';

interface HeaderProps {
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  totalSets: number;
  streak: number;
  todayCount: number;
  dailyGoal: number;
  onOpenGoalModal: () => void;
  onOpenScanModal: () => void;
  onOpenHistoryModal: () => void;
  onOpenAddModal: () => void;
  onOpenJsonModal: () => void;
  onExport: () => void;
  onImportClick: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  theme,
  onToggleTheme,
  totalSets,
  streak,
  todayCount,
  dailyGoal,
  onOpenGoalModal,
  onOpenScanModal,
  onOpenHistoryModal,
  onOpenAddModal,
  onOpenJsonModal,
  onExport,
  onImportClick,
}) => {
  const goalPercent = Math.min(100, Math.round((todayCount / dailyGoal) * 100));

  return (
    <header className="relative overflow-hidden bg-gradient-to-r from-indigo-900 via-indigo-700 to-purple-700 text-white shadow-lg">
      {/* Background ambient lighting */}
      <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-purple-500/20 blur-3xl pointer-events-none" />
      <div className="absolute left-1/3 -bottom-12 h-48 w-48 rounded-full bg-pink-500/20 blur-2xl pointer-events-none" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          
          {/* Brand */}
          <div className="flex items-center gap-3.5">
            <div className="h-12 w-12 rounded-2xl bg-white/15 backdrop-blur-md border border-white/30 flex items-center justify-center text-2xl shadow-inner">
              ✍
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">HSC Cloze Lab</h1>
                <span className="px-2 py-0.5 text-xs font-semibold uppercase tracking-wider bg-white/20 text-white rounded-full border border-white/30 backdrop-blur-sm">
                  Practice
                </span>
              </div>
              <p className="text-sm text-indigo-100 font-medium mt-0.5">
                Master HSC English cloze tests with clues, Bangla translation & vocabulary
              </p>
            </div>
          </div>

          {/* Quick Stats & Theme Toggle */}
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
            {/* Streak Badge */}
            <div 
              className="flex items-center gap-2 bg-white/10 hover:bg-white/15 transition backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-white/20 text-sm font-semibold shadow-sm"
              title="Daily Practice Streak"
            >
              <Flame className="w-4 h-4 text-amber-400 fill-amber-400 animate-pulse" />
              <span>{streak} Day{streak === 1 ? '' : 's'}</span>
            </div>

            {/* Daily Goal Badge */}
            <button
              onClick={onOpenGoalModal}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 transition backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-white/20 text-sm font-semibold shadow-sm cursor-pointer"
              title="Click to customize daily practice goal"
            >
              <Target className="w-4 h-4 text-emerald-300" />
              <span>Today: {todayCount}/{dailyGoal}</span>
              <div className="w-12 h-2 bg-white/20 rounded-full overflow-hidden ml-1 hidden sm:block">
                <div 
                  className="h-full bg-gradient-to-r from-emerald-400 to-teal-300 transition-all duration-300"
                  style={{ width: `${goalPercent}%` }}
                />
              </div>
            </button>

            {/* Upload JSON Button */}
            <button
              onClick={onOpenJsonModal}
              className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 transition backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/20 text-xs sm:text-sm font-semibold shadow-sm cursor-pointer text-indigo-100 hover:text-white"
              title="Upload question sets via JSON (saves permanently to website)"
            >
              <Upload className="w-4 h-4 text-purple-300" />
              <span>Upload JSON</span>
            </button>

            {/* Theme Toggle */}
            <button
              onClick={onToggleTheme}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 transition border border-white/20 backdrop-blur-md text-xs sm:text-sm font-semibold text-white cursor-pointer"
              aria-label="Toggle Dark / Light Theme"
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {theme === 'dark' ? (
                <>
                  <Sun className="w-4 h-4 text-amber-300" />
                  <span className="hidden sm:inline">Light</span>
                </>
              ) : (
                <>
                  <Moon className="w-4 h-4 text-indigo-200" />
                  <span className="hidden sm:inline">Dark</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
