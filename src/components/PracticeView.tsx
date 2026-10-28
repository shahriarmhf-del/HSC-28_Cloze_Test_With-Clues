import React, { useState, useEffect, useRef } from 'react';
import { ClozeQuestion, GradeResultItem } from '../types';
import { normalizeAnswer, checkAnswerMatch, logAttempt } from '../utils/storage';
import { 
  ArrowLeft, 
  RotateCcw, 
  Printer, 
  CheckCircle2, 
  XCircle, 
  ChevronRight, 
  ChevronLeft, 
  Volume2, 
  Sparkles, 
  BookOpen, 
  HelpCircle,
  Trophy,
  Languages,
  Check
} from 'lucide-react';

interface PracticeViewProps {
  questions: ClozeQuestion[];
  initialIndex?: number;
  onBackToLibrary: () => void;
  onPrintOne: (question: ClozeQuestion) => void;
}

export const PracticeView: React.FC<PracticeViewProps> = ({
  questions,
  initialIndex = 0,
  onBackToLibrary,
  onPrintOne,
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const currentQuestion = questions[currentIndex] || questions[0];

  // Map of blank letter -> user value: e.g. { a: 'manners', b: 'are' }
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [armedWord, setArmedWord] = useState<string | null>(null);
  const [activePopupLetter, setActivePopupLetter] = useState<string | null>(null);
  const [isGraded, setIsGraded] = useState(false);
  const [gradeResults, setGradeResults] = useState<GradeResultItem[]>([]);
  const [score, setScore] = useState(0);
  const [showBengali, setShowBengali] = useState(false);
  const [resetToast, setResetToast] = useState(false);
  const [lastClearedAnswers, setLastClearedAnswers] = useState<Record<string, string> | null>(null);

  const passageRef = useRef<HTMLDivElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  // Extract blank letters from current passage: ['a', 'b', 'c', ...]
  const blankLetters = React.useMemo(() => {
    if (!currentQuestion) return [];
    const matches = [...currentQuestion.passage.matchAll(/\{\{([a-z])\}\}/g)];
    return matches.map((m) => m[1]);
  }, [currentQuestion]);

  // Reset or initialize when question changes
  useEffect(() => {
    setAnswers({});
    setArmedWord(null);
    setActivePopupLetter(null);
    setIsGraded(false);
    setGradeResults([]);
    setScore(0);
    setShowBengali(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentIndex, currentQuestion]);

  // Audio pronunciation helper
  const pronounceWord = (word: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(word);
      utterance.lang = 'en-US';
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    }
  };

  const getMeaning = (word: string): string => {
    if (!currentQuestion?.meanings) return '';
    const key = word.trim().toLowerCase();
    for (const [k, v] of Object.entries(currentQuestion.meanings)) {
      if (k.toLowerCase() === key) return v;
    }
    return '';
  };

  // Used words list (for strike-through)
  const usedWords = React.useMemo(() => {
    return Object.values(answers)
      .map(normalizeAnswer)
      .filter(Boolean);
  }, [answers]);

  const handleBlankChange = (letter: string, value: string) => {
    setAnswers((prev) => ({
      ...prev,
      [letter]: value,
    }));
  };

  const fillBlank = (letter: string, word: string) => {
    handleBlankChange(letter, word);
    setArmedWord(null);
    setActivePopupLetter(null);
  };

  const handleBlankClick = (letter: string) => {
    if (isGraded) return;
    if (armedWord) {
      fillBlank(letter, armedWord);
    } else {
      setActivePopupLetter((prev) => (prev === letter ? null : letter));
    }
  };

  const handleGrade = () => {
    if (!currentQuestion) return;
    let totalScore = 0;
    const results: GradeResultItem[] = blankLetters.map((letter, idx) => {
      const userAnswer = answers[letter] || '';
      const expected = currentQuestion.answers[idx] || '';
      const isCorrect = checkAnswerMatch(userAnswer, expected);
      if (isCorrect) totalScore++;
      return {
        letter,
        userAnswer,
        correctAnswers: expected.split('/').map((s) => s.trim()),
        isCorrect,
      };
    });

    setGradeResults(results);
    setScore(totalScore);
    setIsGraded(true);
    setShowBengali(true);

    logAttempt(currentQuestion, totalScore, blankLetters.length);

    setTimeout(() => {
      resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 100);
  };

  const handleReset = () => {
    if (Object.keys(answers).length > 0) {
      setLastClearedAnswers(answers);
    }
    setAnswers({});
    setArmedWord(null);
    setActivePopupLetter(null);
    setIsGraded(false);
    setGradeResults([]);
    setScore(0);
    setResetToast(true);
    setTimeout(() => {
      setResetToast(false);
    }, 4500);
  };

  const handleUndoReset = () => {
    if (lastClearedAnswers) {
      setAnswers(lastClearedAnswers);
      setLastClearedAnswers(null);
      setResetToast(false);
    }
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const answeredCount = blankLetters.filter((l) => answers[l] && answers[l].trim()).length;
  const progressPercent = blankLetters.length
    ? Math.round((answeredCount / blankLetters.length) * 100)
    : 0;

  // Render passage with inputs
  const renderPassageWithBlanks = () => {
    const parts = currentQuestion.passage.split(/(\{\{[a-z]\}\})/g);

    return parts.map((part, index) => {
      const match = part.match(/^\{\{([a-z])\}\}$/);
      if (!match) {
        return <span key={index}>{part}</span>;
      }

      const letter = match[1];
      const val = answers[letter] || '';
      const gradedItem = isGraded ? gradeResults.find((r) => r.letter === letter) : null;
      const isCorrect = gradedItem?.isCorrect;

      return (
        <span key={index} className="inline-flex align-baseline items-center mx-1 my-0.5 relative">
          <span className="inline-flex items-center">
            <span className="text-[11px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-900/60 px-1.5 py-0.5 rounded-l-md border border-r-0 border-indigo-300 dark:border-indigo-700 select-none">
              ({letter})
            </span>
            <input
              type="text"
              value={val}
              disabled={isGraded}
              onChange={(e) => handleBlankChange(letter, e.target.value)}
              onClick={() => handleBlankClick(letter)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const droppedWord = e.dataTransfer.getData('text/plain');
                if (droppedWord) fillBlank(letter, droppedWord);
              }}
              placeholder="____"
              autoComplete="off"
              spellCheck="false"
              className={`w-20 sm:w-24 md:w-28 px-2 py-0.5 text-xs sm:text-sm font-semibold rounded-r-md border transition-all focus:outline-none ${
                isGraded
                  ? isCorrect
                    ? 'bg-emerald-50 text-emerald-900 border-emerald-400 font-bold dark:bg-emerald-950/40 dark:text-emerald-200'
                    : 'bg-rose-50 text-rose-900 border-rose-400 font-bold line-through dark:bg-rose-950/40 dark:text-rose-200'
                  : armedWord
                  ? 'border-indigo-500 bg-indigo-50/50 cursor-pointer animate-pulse'
                  : val
                  ? 'border-indigo-400 bg-indigo-50/40 dark:bg-indigo-950/30 text-indigo-900 dark:text-indigo-200 dark:border-indigo-600'
                  : 'border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:border-indigo-500 focus:border-solid focus:ring-2 focus:ring-indigo-500/20'
              }`}
            />
          </span>

          {/* Quick word popup picker */}
          {activePopupLetter === letter && !isGraded && (
            <div className="absolute z-30 left-0 top-full mt-1.5 w-64 max-h-56 overflow-y-auto bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 p-2 text-xs font-sans animate-pop-in">
              <div className="text-[11px] font-bold text-slate-400 px-2 py-1 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 mb-1">
                Choose Clue for ({letter})
              </div>
              <div className="grid gap-1">
                {currentQuestion.words.map((w, idx) => {
                  const m = getMeaning(w);
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => fillBlank(letter, w)}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950/50 flex items-center justify-between text-slate-700 dark:text-slate-200 cursor-pointer group"
                    >
                      <span className="font-semibold group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                        {w}
                      </span>
                      {m && <span className="text-[11px] text-slate-400 font-bn">{m}</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </span>
      );
    });
  };

  return (
    <div className="w-full max-w-6xl xl:max-w-7xl mx-auto px-1 sm:px-3 py-3 sm:py-5">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 sm:p-8 lg:p-10">
        {/* Practice Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                PRACTICE SET {currentIndex + 1} OF {questions.length}
              </span>
              {currentQuestion.year && (
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {currentQuestion.board} {currentQuestion.year}
                </span>
              )}
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
              {currentQuestion.title}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {blankLetters.length} blanks · {blankLetters.length} marks · Fill in the blanks with the right form of words from the box.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onBackToLibrary}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              Library
            </button>
            <button
              onClick={handleReset}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              title="Reset current answers"
            >
              <RotateCcw className="w-4 h-4" />
              Reset
            </button>
            <button
              onClick={() => onPrintOne(currentQuestion)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              title="Print worksheet"
            >
              <Printer className="w-4 h-4" />
              Print
            </button>
          </div>
        </div>

        {/* Reset Feedback Notification */}
        {resetToast && (
          <div className="mt-4 p-3 px-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs font-semibold text-amber-900 dark:text-amber-200 flex items-center justify-between animate-pop-in shadow-sm">
            <div className="flex items-center gap-2">
              <RotateCcw className="w-3.5 h-3.5 text-amber-600 animate-spin" style={{ animationIterationCount: 1, animationDuration: '0.5s' }} />
              <span>All blanks have been reset. Ready for a fresh attempt!</span>
            </div>
            {lastClearedAnswers && Object.keys(lastClearedAnswers).length > 0 && (
              <button
                type="button"
                onClick={handleUndoReset}
                className="font-bold underline text-amber-800 dark:text-amber-300 hover:text-amber-950 dark:hover:text-amber-100 cursor-pointer ml-3 px-2 py-0.5 rounded hover:bg-amber-100 dark:hover:bg-amber-900/50 transition"
              >
                Undo Reset
              </button>
            )}
          </div>
        )}

        {/* Progress Bar */}
        <div className="mt-5">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
            <span>Progress: {answeredCount} of {blankLetters.length} answered</span>
            <span>{progressPercent}%</span>
          </div>
          <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 transition-all duration-300 rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Clue Words Bank */}
        <div className="mt-6 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/50 p-4 sm:p-5">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-bold text-indigo-950 dark:text-indigo-200">
                Word Box / Clues
              </span>
              <span className="text-xs text-indigo-600/80 dark:text-indigo-400/80">
                (Drag into a blank, or click to arm)
              </span>
            </div>
            {armedWord && (
              <button
                onClick={() => setArmedWord(null)}
                className="text-xs text-rose-500 hover:underline font-semibold cursor-pointer"
              >
                Clear armed word
              </button>
            )}
          </div>

          {/* Chips */}
          <div className="flex flex-wrap gap-2">
            {currentQuestion.words.map((word, idx) => {
              const isUsed = usedWords.includes(normalizeAnswer(word));
              const isArmed = armedWord === word;

              return (
                <div
                  key={idx}
                  draggable={!isGraded}
                  onDragStart={(e) => {
                    e.dataTransfer.setData('text/plain', word);
                    e.dataTransfer.effectAllowed = 'copy';
                  }}
                  onClick={() => {
                    if (isGraded) return;
                    setArmedWord((prev) => (prev === word ? null : word));
                  }}
                  className={`group relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold border transition-all cursor-grab active:cursor-grabbing select-none ${
                    isArmed
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-md ring-2 ring-indigo-400'
                      : isUsed
                      ? 'bg-slate-100 dark:bg-slate-800/60 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-800 line-through opacity-60'
                      : 'bg-white dark:bg-slate-800 text-indigo-950 dark:text-indigo-200 border-indigo-200 dark:border-indigo-800/70 hover:border-indigo-400 hover:shadow-sm'
                  }`}
                >
                  <span>{word}</span>
                  <button
                    type="button"
                    onClick={(e) => pronounceWord(word, e)}
                    className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-indigo-400 transition"
                    title={`Pronounce "${word}"`}
                    aria-label={`Pronounce ${word}`}
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Meaning bar */}
          <div className="mt-3 pt-2.5 border-t border-indigo-100 dark:border-indigo-900/40 min-h-6 flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
            {armedWord ? (
              <div className="flex items-center gap-2">
                <span className="font-bold text-indigo-600 dark:text-indigo-400">
                  Target word: "{armedWord}"
                </span>
                <span className="text-slate-400">·</span>
                <span className="font-bn font-medium">
                  {getMeaning(armedWord) || 'অর্থ পাওয়া যায়নি'}
                </span>
                <span className="text-xs text-indigo-500 italic ml-2">
                  (Now click any blank to insert)
                </span>
              </div>
            ) : (
              <span className="text-slate-400 text-xs">
                Tap any word above to view its Bengali meaning and arm it for insertion.
              </span>
            )}
          </div>
        </div>

        {/* Reading Passage */}
        <div
          ref={passageRef}
          className="mt-6 p-6 sm:p-10 lg:p-12 rounded-2xl bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 font-passage text-[16px] sm:text-[17px] md:text-[18px] leading-[2.6] sm:leading-[2.8] text-slate-900 dark:text-slate-100 shadow-sm tracking-normal"
        >
          {renderPassageWithBlanks()}
        </div>

        {/* Practice Footer Navigation */}
        <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrev}
              disabled={currentIndex === 0}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous Set
            </button>
            <button
              onClick={handleNext}
              disabled={currentIndex === questions.length - 1}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              Next Set
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-3">
            {!isGraded ? (
              <button
                onClick={handleGrade}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md hover:shadow-lg active:scale-[0.98] transition cursor-pointer"
              >
                <Check className="w-4 h-4" />
                Check Result
              </button>
            ) : (
              <button
                onClick={() => {
                  setIsGraded(false);
                  setGradeResults([]);
                  setScore(0);
                }}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-indigo-300 dark:border-indigo-700 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950 font-bold text-sm transition cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                Try Again
              </button>
            )}
          </div>
        </div>

        {/* Graded Result Section */}
        {isGraded && (
          <div
            ref={resultRef}
            className="mt-8 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 sm:p-8 animate-pop-in shadow-sm"
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-3.5">
                <div className="h-12 w-12 rounded-xl bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200 dark:border-amber-800/70 flex items-center justify-center shrink-0 shadow-sm">
                  <Trophy className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                    Result Evaluation
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl sm:text-4xl font-extrabold text-indigo-600 dark:text-indigo-400">
                      {score} / {blankLetters.length}
                    </span>
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                      {score === blankLetters.length
                        ? '🌟 Outstanding! Perfect score!'
                        : score >= 8
                        ? '👏 Excellent work! Almost perfect!'
                        : score >= 5
                        ? '👍 Good attempt! Review corrections below.'
                        : '💪 Keep practicing! Check the answer key.'}
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowBengali((prev) => !prev)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-700/70 border border-slate-200 dark:border-slate-600 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition shadow-sm cursor-pointer"
              >
                <Languages className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                {showBengali ? 'Hide Bangla' : 'Show Bangla Translation'}
              </button>
            </div>

            {/* Answer details list */}
            <div className="mt-5 grid sm:grid-cols-2 gap-2.5">
              {gradeResults.map((item) => (
                <div
                  key={item.letter}
                  className={`p-3 rounded-xl border flex items-center justify-between gap-2 text-xs sm:text-sm font-sans transition-colors ${
                    item.isCorrect
                      ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/60 text-emerald-950 dark:text-emerald-200'
                      : 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/60 text-rose-950 dark:text-rose-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {item.isCorrect ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    )}
                    <span className="font-bold">({item.letter})</span>
                    <span>
                      {item.userAnswer ? (
                        <span className={item.isCorrect ? 'font-medium' : 'line-through text-rose-700 dark:text-rose-300'}>
                          {item.userAnswer}
                        </span>
                      ) : (
                        <span className="italic text-slate-400">Not answered</span>
                      )}
                    </span>
                  </div>

                  {!item.isCorrect && (
                    <span className="font-bold text-emerald-700 dark:text-emerald-300 text-right">
                      {item.correctAnswers.join(' / ')}
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* Full Bangla Translation */}
            {showBengali && currentQuestion.bn && (
              <div className="mt-6 p-5 sm:p-6 rounded-xl bg-slate-50 dark:bg-slate-700/40 border border-slate-200 dark:border-slate-700 shadow-sm">
                <div className="flex items-center gap-2 text-sm font-bold text-indigo-900 dark:text-indigo-300 mb-2">
                  <Languages className="w-4 h-4 text-indigo-600" />
                  বাংলা অনুবাদ (Full Bangla Translation)
                </div>
                <p className="font-bn text-base leading-relaxed text-slate-800 dark:text-slate-100">
                  {currentQuestion.bn}
                </p>
              </div>
            )}

            {/* Clue Words Glossary */}
            {currentQuestion.meanings && Object.keys(currentQuestion.meanings).length > 0 && (
              <div className="mt-4 p-5 sm:p-6 rounded-xl bg-slate-50 dark:bg-slate-700/40 border border-slate-200 dark:border-slate-700 shadow-sm">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2.5">
                  Word Meanings (শব্দার্থ)
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 text-xs">
                  {Object.entries(currentQuestion.meanings).map(([word, meaning], i) => (
                    <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600/70 shadow-sm">
                      <span className="font-semibold text-slate-900 dark:text-slate-100">{word}</span>
                      <span className="font-bn text-slate-600 dark:text-slate-400">{meaning}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
