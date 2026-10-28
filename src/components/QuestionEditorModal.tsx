import React, { useState, useEffect } from 'react';
import { ClozeQuestion } from '../types';
import { X, Sparkles, Plus, AlertCircle, Check } from 'lucide-react';

interface QuestionEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (question: ClozeQuestion) => void;
  editingQuestion?: ClozeQuestion | null;
}

export const QuestionEditorModal: React.FC<QuestionEditorModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingQuestion,
}) => {
  const [title, setTitle] = useState('');
  const [wordsInput, setWordsInput] = useState('');
  const [passage, setPassage] = useState('');
  const [answersInput, setAnswersInput] = useState('');
  const [note, setNote] = useState('');
  const [bn, setBn] = useState('');
  const [meaningsInput, setMeaningsInput] = useState('');
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (editingQuestion) {
      setTitle(editingQuestion.title || '');
      setWordsInput((editingQuestion.words || []).join(', '));
      setPassage(editingQuestion.passage || '');
      setAnswersInput((editingQuestion.answers || []).join(', '));
      setNote(editingQuestion.note || '');
      setBn(editingQuestion.bn || '');
      setMeaningsInput(
        Object.entries(editingQuestion.meanings || {})
          .map(([k, v]) => `${k} = ${v}`)
          .join('\n')
      );
    } else {
      setTitle('');
      setWordsInput('');
      setPassage('');
      setAnswersInput('');
      setNote('');
      setBn('');
      setMeaningsInput('');
    }
    setErrorMsg('');
  }, [editingQuestion, isOpen]);

  if (!isOpen) return null;

  // Extract letters from passage
  const letters = [...passage.matchAll(/\{\{([a-z])\}\}/g)].map((m) => m[1]);
  const parsedAnswers = answersInput
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const insertNextBlank = () => {
    const nextChar = String.fromCharCode(97 + letters.length);
    if (letters.length >= 26) return;
    setPassage((prev) => prev + ` {{${nextChar}}} `);
  };

  const handleEnhanceWithAI = async () => {
    if (!passage.trim() && !wordsInput.trim()) {
      setErrorMsg('Please enter at least the passage or words to enhance with AI.');
      return;
    }
    setIsEnhancing(true);
    setErrorMsg('');
    try {
      const response = await fetch('/api/ai/scan-cloze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rawText: `Title: ${title}\nPassage: ${passage}\nWords: ${wordsInput}\nAnswers: ${answersInput}`,
        }),
      });
      const data = await response.json();
      if (data.sets && data.sets.length > 0) {
        const item = data.sets[0];
        if (item.title && !title) setTitle(item.title);
        if (item.words && item.words.length > 0 && !wordsInput) setWordsInput(item.words.join(', '));
        if (item.passage && !passage) setPassage(item.passage);
        if (item.answers && item.answers.length > 0 && !answersInput) setAnswersInput(item.answers.join(', '));
        if (item.bn) setBn(item.bn);
        if (item.meanings) {
          setMeaningsInput(
            Object.entries(item.meanings)
              .map(([k, v]) => `${k} = ${v}`)
              .join('\n')
          );
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'AI Enhancement failed. Please check your network.');
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      setErrorMsg('Title / Board name is required.');
      return;
    }

    const words = wordsInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    if (words.length < 5) {
      setErrorMsg('Please provide at least 5 clue words.');
      return;
    }

    if (letters.length === 0) {
      setErrorMsg('Please add blank markers like {{a}}, {{b}} in the passage.');
      return;
    }

    if (letters.length !== parsedAnswers.length) {
      setErrorMsg(
        `Passage has ${letters.length} blank markers, but you provided ${parsedAnswers.length} answers. They must match!`
      );
      return;
    }

    // Parse meanings
    const meanings: Record<string, string> = {};
    meaningsInput.split('\n').forEach((line) => {
      const idx = line.indexOf('=');
      if (idx > 0) {
        const k = line.slice(0, idx).trim();
        const v = line.slice(idx + 1).trim();
        if (k && v) meanings[k] = v;
      }
    });

    const question: ClozeQuestion = {
      id: editingQuestion?.id || `custom-${Date.now()}`,
      title: title.trim(),
      words,
      passage: passage.trim(),
      answers: parsedAnswers,
      note: note.trim() || undefined,
      bn: bn.trim() || undefined,
      meanings: Object.keys(meanings).length ? meanings : undefined,
      v: 2,
      ai: editingQuestion?.ai || false,
    };

    onSave(question);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-pop-in">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Modal Head */}
        <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
          <div>
            <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white">
              {editingQuestion ? 'Edit Question Set' : 'Add Question Set'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Use standard blank markers in the passage: {'{{a}}'}, {'{{b}}'} ... {'{{j}}'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Title / Board / Year *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Dhaka Board 2025 — Environment & Pollution"
              className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          {/* Clue Words */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Word Box / Clues (comma separated) *
            </label>
            <input
              type="text"
              required
              value={wordsInput}
              onChange={(e) => setWordsInput(e.target.value)}
              placeholder="e.g. manners, proper, appreciate, realize, behave, accepted"
              className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          {/* Passage */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Passage Text *
              </label>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-400">
                  {letters.length} blanks detected
                </span>
                <button
                  type="button"
                  onClick={insertNextBlank}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 text-xs font-semibold hover:bg-indigo-100 transition cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  Insert {'{{' + String.fromCharCode(97 + letters.length) + '}}'}
                </button>
              </div>
            </div>
            <textarea
              required
              rows={5}
              value={passage}
              onChange={(e) => setPassage(e.target.value)}
              placeholder="Write or paste your passage here. Use {{a}}, {{b}}, {{c}} for blank markers..."
              className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 leading-relaxed font-passage"
            />
          </div>

          {/* Answers */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Answer Key (in order, separated by commas) *
              </label>
              <span
                className={`text-xs font-semibold ${
                  letters.length === parsedAnswers.length
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-amber-600 dark:text-amber-400'
                }`}
              >
                {parsedAnswers.length} / {letters.length} answers provided
              </span>
            </div>
            <textarea
              required
              rows={2}
              value={answersInput}
              onChange={(e) => setAnswersInput(e.target.value)}
              placeholder="e.g. manners, are, accepted, behave, will realize/will realise"
              className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Tip: Use a slash "/" to accept alternate spellings, e.g. "realize/realise" or "working/to work".
            </p>
          </div>

          {/* AI Helper Button */}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleEnhanceWithAI}
              disabled={isEnhancing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 dark:bg-purple-950/50 border border-purple-200 dark:border-purple-800 text-xs font-bold text-purple-700 dark:text-purple-300 hover:bg-purple-100 transition cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {isEnhancing ? 'Generating with Gemini...' : 'Auto-Generate Bangla & Meanings with Gemini'}
            </button>
          </div>

          {/* Bangla Full Translation */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Bangla Translation of Passage (Optional)
            </label>
            <textarea
              rows={3}
              value={bn}
              onChange={(e) => setBn(e.target.value)}
              placeholder="প্যাসেজের পূর্ণাঙ্গ প্রাঞ্জল বাংলা অনুবাদ..."
              className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bn focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          {/* Word Meanings */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Clue Word Meanings (Optional, format: word = অর্থ)
            </label>
            <textarea
              rows={3}
              value={meaningsInput}
              onChange={(e) => setMeaningsInput(e.target.value)}
              placeholder="gentleperson = ভদ্রলোক&#10;appreciate = প্রশংসা করা&#10;proper = যথাযথ"
              className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bn focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Source / Reference Note (Optional)
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Advanced Learner's p.649 · Q07"
              className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          {/* Modal Footer */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold shadow-md active:scale-[0.98] transition cursor-pointer"
            >
              <Check className="w-4 h-4" />
              Save Question Set
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
