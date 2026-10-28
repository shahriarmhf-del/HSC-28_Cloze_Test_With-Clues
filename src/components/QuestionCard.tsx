import React from 'react';
import { motion, type Variants } from 'framer-motion';
import { ClozeQuestion } from '../types';
import { getQuestionStats } from '../utils/storage';
import { Play, Edit3, Trash2, CheckCircle2, Award, Sparkles } from 'lucide-react';

export const cardItemVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 24,
    scale: 0.97,
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 280,
      damping: 22,
      mass: 0.8,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.96,
    y: -8,
    transition: {
      duration: 0.2,
      ease: 'easeOut',
    },
  },
};

interface QuestionCardProps {
  question: ClozeQuestion;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  onPractice: (id: string) => void;
  onEdit: (question: ClozeQuestion) => void;
  onDelete: (id: string) => void;
}

export const QuestionCard: React.FC<QuestionCardProps> = ({
  question,
  isSelected,
  onToggleSelect,
  onPractice,
  onEdit,
  onDelete,
}) => {
  const stats = getQuestionStats(question.id);
  const blankCount = question.answers.length;

  return (
    <motion.article
      layout
      variants={cardItemVariants}
      whileHover={{ y: -4, transition: { duration: 0.18, ease: 'easeOut' } }}
      className={`group relative rounded-2xl border transition-colors duration-150 p-5 flex flex-col justify-between overflow-hidden ${
        isSelected
          ? 'border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/30 shadow-md ring-2 ring-indigo-500/20'
          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-lg hover:border-indigo-300 dark:hover:border-indigo-700/60'
      }`}
    >
      {/* Top accent line */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-80" />

      <div>
        {/* Top bar: Checkbox + Tags */}
        <div className="flex items-start gap-3 justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <input
              type="checkbox"
              id={`select-${question.id}`}
              checked={isSelected}
              onChange={() => onToggleSelect(question.id)}
              className="h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 dark:border-slate-700 cursor-pointer"
              aria-label={`Select ${question.title}`}
            />
            <label
              htmlFor={`select-${question.id}`}
              className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300 cursor-pointer"
            >
              {blankCount} Blanks
            </label>
            {question.ai && (
              <span className="flex items-center gap-1 text-[11px] font-semibold text-purple-600 dark:text-purple-300 bg-purple-50 dark:bg-purple-900/40 px-2 py-0.5 rounded-full border border-purple-200 dark:border-purple-800">
                <Sparkles className="w-3 h-3 text-purple-500" />
                AI Verified
              </span>
            )}
          </div>

          {question.year && (
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {question.board ? `${question.board} ` : ''} {question.year}
            </span>
          )}
        </div>

        {/* Title */}
        <h3 className="text-base font-bold text-slate-900 dark:text-white line-clamp-2 leading-snug group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
          {question.title}
        </h3>

        {/* Note / Source */}
        {question.note && (
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">
            {question.note}
          </p>
        )}

        {/* Clue Words Chips Preview */}
        <div className="mt-3 flex flex-wrap gap-1.5 max-h-16 overflow-hidden">
          {question.words.slice(0, 6).map((word, idx) => (
            <span
              key={idx}
              className="text-xs px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-medium"
            >
              {word}
            </span>
          ))}
          {question.words.length > 6 && (
            <span className="text-xs px-1.5 py-0.5 rounded-md text-slate-400 font-medium">
              +{question.words.length - 6} more
            </span>
          )}
        </div>

        {/* Stats summary */}
        <div className="mt-3.5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          {stats.attemptsCount > 0 ? (
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                <Award className="w-3.5 h-3.5" />
                Best: {stats.bestScore?.score}/{stats.bestScore?.total}
              </span>
              <span>
                Last: {stats.lastScore?.score}/{stats.lastScore?.total}
              </span>
              <span className="text-slate-400">({stats.attemptsCount} {stats.attemptsCount === 1 ? 'try' : 'tries'})</span>
            </div>
          ) : (
            <span className="text-slate-400 italic">Not attempted yet</span>
          )}
        </div>
      </div>

      {/* Action buttons */}
      <div className="mt-4 pt-3 flex items-center justify-between gap-2">
        <button
          onClick={() => onPractice(question.id)}
          className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] transition shadow-sm cursor-pointer"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          Practice
        </button>

        <button
          onClick={() => onEdit(question)}
          className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition border border-slate-200 dark:border-slate-700 cursor-pointer"
          title="Edit question set"
          aria-label="Edit"
        >
          <Edit3 className="w-4 h-4" />
        </button>

        <button
          onClick={() => onDelete(question.id)}
          className="p-2 rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition border border-rose-200 dark:border-rose-900/50 cursor-pointer"
          title="Delete question set"
          aria-label="Delete"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </motion.article>
  );
};
