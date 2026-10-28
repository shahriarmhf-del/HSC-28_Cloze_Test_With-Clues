import React from 'react';
import { ScoreAttempt } from '../types';
import { X, Trash2, Award, Calendar, BarChart3 } from 'lucide-react';

interface ScoreHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  attempts: ScoreAttempt[];
  onClearHistory: () => void;
}

export const ScoreHistoryModal: React.FC<ScoreHistoryModalProps> = ({
  isOpen,
  onClose,
  attempts,
  onClearHistory,
}) => {
  if (!isOpen) return null;

  const totalAttempts = attempts.length;
  const totalScore = attempts.reduce((acc, curr) => acc + curr.score, 0);
  const totalPossible = attempts.reduce((acc, curr) => acc + curr.total, 0);
  const averageAccuracy = totalPossible ? Math.round((totalScore / totalPossible) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-pop-in">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-xl max-h-[85vh] flex flex-col overflow-hidden">
        {/* Modal Head */}
        <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-300 flex items-center justify-center">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white">
                Score History & Analytics
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {totalAttempts} completed attempt{totalAttempts === 1 ? '' : 's'} · Average {averageAccuracy}% accuracy
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stats Strip */}
        <div className="grid grid-cols-3 border-b border-slate-100 dark:border-slate-800 p-4 text-center bg-indigo-50/30 dark:bg-indigo-950/20 text-xs">
          <div>
            <div className="text-lg font-extrabold text-indigo-600 dark:text-indigo-400">
              {totalAttempts}
            </div>
            <div className="text-slate-500 font-medium">Tests Done</div>
          </div>
          <div>
            <div className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400">
              {averageAccuracy}%
            </div>
            <div className="text-slate-500 font-medium">Avg Accuracy</div>
          </div>
          <div>
            <div className="text-lg font-extrabold text-purple-600 dark:text-purple-400">
              {totalScore}
            </div>
            <div className="text-slate-500 font-medium">Total Marks</div>
          </div>
        </div>

        {/* Attempt List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-2.5">
          {attempts.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <Award className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-700 mb-2 stroke-1" />
              <p className="text-sm font-semibold">No practice history recorded yet.</p>
              <p className="text-xs text-slate-400 mt-1">
                Complete any question set to start tracking your performance.
              </p>
            </div>
          ) : (
            attempts
              .slice()
              .reverse()
              .map((att, i) => {
                const percent = Math.round((att.score / att.total) * 100);
                const isGood = percent >= 70;

                return (
                  <div
                    key={i}
                    className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-800/40 hover:bg-slate-50 dark:hover:bg-slate-800 transition flex items-center justify-between gap-3 text-xs sm:text-sm"
                  >
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white">
                        {att.title}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-0.5">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{new Date(att.ts).toLocaleString()}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`text-sm sm:text-base font-extrabold px-2.5 py-1 rounded-xl ${
                          isGood
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                        }`}
                      >
                        {att.score} / {att.total}
                      </span>
                    </div>
                  </div>
                );
              })
          )}
        </div>

        {/* Modal Foot */}
        <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
          {attempts.length > 0 && (
            <button
              onClick={() => {
                if (confirm('Clear all score history records? This cannot be undone.')) {
                  onClearHistory();
                }
              }}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-600 hover:text-rose-700 cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              Clear History
            </button>
          )}
          <button
            onClick={onClose}
            className="ml-auto px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
