import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { ClozeQuestion, ScoreAttempt } from './types';

const gridContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.04,
    },
  },
};
import { 
  loadQuestions, 
  saveQuestions, 
  getHistory, 
  clearHistory as clearHistoryStorage, 
  getDailyGoal, 
  setDailyGoal as setDailyGoalStorage, 
  getTodayUniqueCount, 
  calculateStreak, 
  getStoredTheme, 
  setStoredTheme,
  hideQuestionLocally,
  unhideAllQuestionsLocally,
  getHiddenQuestionIds
} from './utils/storage';
import { Header } from './components/Header';
import { QuestionCard } from './components/QuestionCard';
import { PracticeView } from './components/PracticeView';
import { QuestionEditorModal } from './components/QuestionEditorModal';
import { AiScanModal } from './components/AiScanModal';
import { ScoreHistoryModal } from './components/ScoreHistoryModal';
import { GoalModal } from './components/GoalModal';
import { PrintWorksheet } from './components/PrintWorksheet';
import { PrintModal } from './components/PrintModal';
import { JsonImportModal } from './components/JsonImportModal';
import { 
  Search, 
  Play, 
  CheckSquare, 
  Square, 
  Plus, 
  Camera, 
  History, 
  Printer, 
  Download, 
  Upload, 
  FileCode,
  Filter, 
  BookOpen,
  Sparkles,
  RotateCcw
} from 'lucide-react';

export default function App() {
  const [questions, setQuestions] = useState<ClozeQuestion[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [boardFilter, setBoardFilter] = useState('ALL');
  const [yearFilter, setYearFilter] = useState('ALL');

  const [currentView, setCurrentView] = useState<'library' | 'practice'>('library');
  const [practiceQueue, setPracticeQueue] = useState<ClozeQuestion[]>([]);
  const [practiceInitialIndex, setPracticeInitialIndex] = useState(0);

  // Modals state
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<ClozeQuestion | null>(null);
  const [isAiScanOpen, setIsAiScanOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isGoalOpen, setIsGoalOpen] = useState(false);
  const [isJsonModalOpen, setIsJsonModalOpen] = useState(false);

  // Storage / stats state
  const [history, setHistory] = useState<ScoreAttempt[]>([]);
  const [dailyGoal, setDailyGoal] = useState(3);
  const [todayCount, setTodayCount] = useState(0);
  const [streak, setStreak] = useState(0);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [hiddenCount, setHiddenCount] = useState(0);

  // Print state
  const [printQueue, setPrintQueue] = useState<ClozeQuestion[]>([]);
  const [includePrintKey, setIncludePrintKey] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize
  useEffect(() => {
    const loadedQuestions = loadQuestions();
    setQuestions(loadedQuestions);
    setHiddenCount(getHiddenQuestionIds().size);

    // Fetch server-stored questions for permanent cross-device access
    fetch('/api/questions')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.customQuestions && data.customQuestions.length > 0) {
          const hidden = getHiddenQuestionIds();
          setQuestions((prev) => {
            const map = new Map(prev.map((q) => [q.id, q]));
            data.customQuestions.forEach((q: ClozeQuestion) => {
              if (!hidden.has(q.id)) {
                map.set(q.id, q);
              }
            });
            const merged = Array.from(map.values()).filter((q) => !hidden.has(q.id));
            saveQuestions(merged);
            return merged;
          });
        }
      })
      .catch((err) => console.log('Notice: running offline or server questions endpoint unavailable:', err));

    const initialTheme = getStoredTheme();
    setTheme(initialTheme);
    setStoredTheme(initialTheme);

    refreshStats();
  }, []);

  const refreshStats = () => {
    setHistory(getHistory());
    setDailyGoal(getDailyGoal());
    setTodayCount(getTodayUniqueCount());
    setStreak(calculateStreak());
  };

  const handleToggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    setStoredTheme(next);
  };

  // Distinct boards and years for filter dropdowns
  const availableBoards = useMemo(() => {
    const boards = new Set<string>();
    questions.forEach((q) => {
      if (q.board) boards.add(q.board);
    });
    return Array.from(boards).sort();
  }, [questions]);

  const availableYears = useMemo(() => {
    const years = new Set<string>();
    questions.forEach((q) => {
      if (q.year) years.add(q.year);
    });
    return Array.from(years).sort().reverse();
  }, [questions]);

  // Filtered questions
  const filteredQuestions = useMemo(() => {
    return questions.filter((q) => {
      const matchSearch =
        !searchQuery.trim() ||
        (q.title + ' ' + (q.note || '') + ' ' + q.words.join(' '))
          .toLowerCase()
          .includes(searchQuery.toLowerCase());

      const matchBoard =
        boardFilter === 'ALL' ||
        (q.board && q.board.toLowerCase() === boardFilter.toLowerCase());

      const matchYear =
        yearFilter === 'ALL' ||
        (q.year && q.year.toLowerCase() === yearFilter.toLowerCase());

      return matchSearch && matchBoard && matchYear;
    });
  }, [questions, searchQuery, boardFilter, yearFilter]);

  // Selection handlers
  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAllVisible = () => {
    setSelectedIds(new Set(filteredQuestions.map((q) => q.id)));
  };

  const handleClearSelection = () => {
    setSelectedIds(new Set());
  };

  // Practice navigation
  const handleStartPractice = (idsToPractice: string[]) => {
    const targetSets = questions.filter((q) => idsToPractice.includes(q.id));
    if (!targetSets.length) return;
    setPracticeQueue(targetSets);
    setPracticeInitialIndex(0);
    setCurrentView('practice');
  };

  const handlePracticeSingle = (id: string) => {
    handleStartPractice([id]);
  };

  const handlePracticeSelected = () => {
    if (selectedIds.size === 0) {
      if (filteredQuestions.length > 0) {
        handleStartPractice(filteredQuestions.map((q) => q.id));
      }
      return;
    }
    handleStartPractice(Array.from(selectedIds));
  };

  // Question Set CRUD
  const handleSaveQuestion = (saved: ClozeQuestion) => {
    setQuestions((prev) => {
      const existingIdx = prev.findIndex((q) => q.id === saved.id);
      let updated: ClozeQuestion[];
      if (existingIdx >= 0) {
        updated = [...prev];
        updated[existingIdx] = saved;
      } else {
        updated = [saved, ...prev];
      }
      saveQuestions(updated);
      return updated;
    });

    // Also persist permanently to server
    fetch('/api/questions/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify([saved]),
    }).catch(() => {});
  };

  const handleDeleteQuestion = (id: string) => {
    const item = questions.find((q) => q.id === id);
    if (!item) return;
    if (
      confirm(
        `Remove "${item.title}" from your view?\n\nNote: The question set will remain intact on the website server for other students, but it will be removed from your personal interface.`
      )
    ) {
      hideQuestionLocally(id);
      setQuestions((prev) => {
        const updated = prev.filter((q) => q.id !== id);
        return updated;
      });
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      setHiddenCount(getHiddenQuestionIds().size);
    }
  };

  const handleRestoreHidden = () => {
    unhideAllQuestionsLocally();
    const restored = loadQuestions();
    setQuestions(restored);
    setHiddenCount(0);

    // Also re-sync server questions
    fetch('/api/questions')
      .then((res) => res.json())
      .then((data) => {
        if (data.customQuestions && data.customQuestions.length > 0) {
          setQuestions((prev) => {
            const map = new Map(prev.map((q) => [q.id, q]));
            data.customQuestions.forEach((q: ClozeQuestion) => map.set(q.id, q));
            const merged = Array.from(map.values());
            saveQuestions(merged);
            return merged;
          });
        }
      })
      .catch(() => {});
  };

  const handleOpenEdit = (q: ClozeQuestion) => {
    setEditingQuestion(q);
    setIsEditorOpen(true);
  };

  const handleOpenAdd = () => {
    setEditingQuestion(null);
    setIsEditorOpen(true);
  };

  // Import / Export
  const handleExportLibrary = () => {
    const exportData = {
      format: 'HSC-Cloze-Lab',
      version: 2,
      exportedAt: new Date().toISOString(),
      sets: questions,
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `hsc-cloze-lab-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const incoming: ClozeQuestion[] = Array.isArray(parsed)
        ? parsed
        : parsed.sets || [];

      if (!Array.isArray(incoming) || incoming.length === 0) {
        throw new Error('No valid question sets found in JSON file.');
      }

      setQuestions((prev) => {
        const map = new Map(prev.map((q) => [q.id, q]));
        incoming.forEach((q) => map.set(q.id, q));
        const updated = Array.from(map.values());
        saveQuestions(updated);
        return updated;
      });

      alert(`Successfully imported ${incoming.length} question set(s)!`);
    } catch (err: any) {
      alert('Import failed: ' + (err.message || 'Invalid JSON file'));
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Printing
  const handlePrintSets = (setsToPrint: ClozeQuestion[]) => {
    const list = setsToPrint && setsToPrint.length > 0 ? setsToPrint : filteredQuestions;
    if (!list || list.length === 0) return;
    setPrintQueue(list);
    setIsPrintModalOpen(true);
  };

  const handleSaveGoal = (newGoal: number) => {
    setDailyGoalStorage(newGoal);
    setDailyGoal(newGoal);
  };

  const handleClearHistory = () => {
    clearHistoryStorage();
    refreshStats();
  };

  return (
    <div className={`${theme === 'dark' ? 'dark ' : ''}min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors flex flex-col font-sans`}>
      {/* Hidden file input for JSON import */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImportFile}
        accept="application/json,.json"
        className="hidden"
      />

      {/* Main Header */}
      <Header
        theme={theme}
        onToggleTheme={handleToggleTheme}
        totalSets={questions.length}
        streak={streak}
        todayCount={todayCount}
        dailyGoal={dailyGoal}
        onOpenGoalModal={() => setIsGoalOpen(true)}
        onOpenScanModal={() => setIsAiScanOpen(true)}
        onOpenHistoryModal={() => {
          refreshStats();
          setIsHistoryOpen(true);
        }}
        onOpenAddModal={handleOpenAdd}
        onOpenJsonModal={() => setIsJsonModalOpen(true)}
        onExport={handleExportLibrary}
        onImportClick={() => setIsJsonModalOpen(true)}
      />

      {/* Main Container */}
      <main className={`flex-1 w-full mx-auto py-5 sm:py-8 ${currentView === 'practice' ? 'max-w-7xl px-3 sm:px-6' : 'max-w-6xl px-4 sm:px-6'}`}>
        {currentView === 'practice' ? (
          <PracticeView
            questions={practiceQueue}
            initialIndex={practiceInitialIndex}
            onBackToLibrary={() => {
              refreshStats();
              setCurrentView('library');
            }}
            onPrintOne={(q) => handlePrintSets([q])}
          />
        ) : (
          <section className="space-y-6">
            {/* Action Bar & Search */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              {/* Search input */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search question sets by board, topic, or word clues..."
                  className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              {/* Filters & Add buttons */}
              <div className="flex flex-wrap items-center gap-2.5">
                {/* Board filter */}
                <select
                  value={boardFilter}
                  onChange={(e) => setBoardFilter(e.target.value)}
                  className="px-3 py-2 text-xs sm:text-sm font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
                >
                  <option value="ALL">All Boards</option>
                  {availableBoards.map((b) => (
                    <option key={b} value={b}>
                      {b} Board
                    </option>
                  ))}
                </select>

                {/* Year filter */}
                <select
                  value={yearFilter}
                  onChange={(e) => setYearFilter(e.target.value)}
                  className="px-3 py-2 text-xs sm:text-sm font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
                >
                  <option value="ALL">All Years</option>
                  {availableYears.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>

                <button
                  onClick={() => setIsJsonModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900 transition shadow-sm cursor-pointer"
                  title="Upload questions from JSON file"
                >
                  <FileCode className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  Upload JSON
                </button>

                <button
                  onClick={handleOpenAdd}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] transition shadow-sm cursor-pointer ml-auto md:ml-0"
                >
                  <Plus className="w-4 h-4" />
                  Add Question
                </button>
              </div>
            </div>

            {/* Bulk Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-indigo-50/50 dark:bg-slate-900/40 p-3 sm:px-4 rounded-xl border border-indigo-100 dark:border-slate-800 text-xs sm:text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleSelectAllVisible}
                  className="font-semibold text-indigo-700 dark:text-indigo-400 hover:underline cursor-pointer"
                >
                  Select all visible ({filteredQuestions.length})
                </button>
                <span className="text-slate-300 dark:text-slate-700">|</span>
                <button
                  onClick={handleClearSelection}
                  className="font-semibold text-slate-500 hover:underline cursor-pointer"
                >
                  Clear selection
                </button>
                {selectedIds.size > 0 && (
                  <span className="font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700">
                    {selectedIds.size} selected
                  </span>
                )}
                {hiddenCount > 0 && (
                  <>
                    <span className="text-slate-300 dark:text-slate-700">|</span>
                    <button
                      onClick={handleRestoreHidden}
                      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/60 hover:bg-amber-100 dark:hover:bg-amber-900 transition cursor-pointer"
                      title="Restore all question sets you hid from your view"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Restore {hiddenCount} Hidden Set{hiddenCount > 1 ? 's' : ''}
                    </button>
                  </>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsAiScanOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/40 font-semibold hover:bg-purple-100 transition cursor-pointer text-xs"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  AI Studio / Scan
                </button>

                <button
                  onClick={() =>
                    handlePrintSets(
                      selectedIds.size
                        ? questions.filter((q) => selectedIds.has(q.id))
                        : filteredQuestions
                    )
                  }
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer text-xs"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Print Worksheets
                </button>

                <button
                  onClick={handlePracticeSelected}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] transition shadow-sm cursor-pointer text-xs"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  Practice Selected ({selectedIds.size})
                </button>
              </div>
            </div>

            {/* Questions Grid */}
            {filteredQuestions.length === 0 ? (
              <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
                <BookOpen className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-700 mb-3 stroke-1" />
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
                  No question sets match your search.
                </h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Try clearing your search keyword, changing the board filter, or click "Add Question" to create one.
                </p>
                {hiddenCount > 0 && (
                  <div className="mt-4">
                    <button
                      onClick={handleRestoreHidden}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 hover:bg-amber-100 transition cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Restore {hiddenCount} Hidden Question Set{hiddenCount > 1 ? 's' : ''}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <motion.div
                key={`grid-${boardFilter}-${yearFilter}`}
                variants={gridContainerVariants}
                initial="hidden"
                animate="visible"
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
              >
                <AnimatePresence mode="popLayout">
                  {filteredQuestions.map((q) => (
                    <QuestionCard
                      key={q.id}
                      question={q}
                      isSelected={selectedIds.has(q.id)}
                      onToggleSelect={handleToggleSelect}
                      onPractice={handlePracticeSingle}
                      onEdit={handleOpenEdit}
                      onDelete={handleDeleteQuestion}
                    />
                  ))}
                </AnimatePresence>
              </motion.div>
            )}
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto py-6 border-t border-slate-200 dark:border-slate-800 text-center text-xs text-slate-500 dark:text-slate-400">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div>
            HSC Cloze Lab · Designed for HSC English Examination Board Preparation
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <span>Offline-friendly</span>
            <span>·</span>
            <button
              onClick={handleExportLibrary}
              className="hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer"
            >
              Export Library Backup
            </button>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <QuestionEditorModal
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        onSave={handleSaveQuestion}
        editingQuestion={editingQuestion}
      />

      <AiScanModal
        isOpen={isAiScanOpen}
        onClose={() => setIsAiScanOpen(false)}
        onImportSets={(imported) => {
          setQuestions((prev) => {
            const map = new Map(prev.map((q) => [q.id, q]));
            imported.forEach((item) => map.set(item.id, item));
            const updated = Array.from(map.values());
            saveQuestions(updated);
            return updated;
          });
          refreshStats();
        }}
      />

      <ScoreHistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        attempts={history}
        onClearHistory={handleClearHistory}
      />

      <GoalModal
        isOpen={isGoalOpen}
        onClose={() => setIsGoalOpen(false)}
        currentGoal={dailyGoal}
        onSaveGoal={handleSaveGoal}
      />

      <JsonImportModal
        isOpen={isJsonModalOpen}
        onClose={() => setIsJsonModalOpen(false)}
        onImportComplete={(imported) => {
          setQuestions((prev) => {
            const map = new Map(prev.map((q) => [q.id, q]));
            imported.forEach((item) => map.set(item.id, item));
            const updated = Array.from(map.values());
            saveQuestions(updated);
            return updated;
          });
          refreshStats();
        }}
      />

      {/* Interactive Print & Worksheet Modal */}
      <PrintModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        questions={printQueue}
      />

      {/* Printable Sheet for native browser print */}
      <PrintWorksheet
        questions={printQueue}
        includeAnswerKey={includePrintKey}
      />
    </div>
  );
}
