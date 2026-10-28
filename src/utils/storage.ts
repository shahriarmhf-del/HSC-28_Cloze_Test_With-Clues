import { ClozeQuestion, ScoreAttempt } from '../types';
import { SEED_QUESTIONS } from '../data/seedQuestions';

const SETS_KEY = 'hscClozeLabSets';
const HIST_KEY = 'hscClozeLabHistory';
const GOAL_KEY = 'hscClozeLabGoal';
const THEME_KEY = 'hscClozeLabTheme';
const HIDDEN_KEY = 'hscClozeLabHidden';

export function getHiddenQuestionIds(): Set<string> {
  try {
    const raw = localStorage.getItem(HIDDEN_KEY);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) return new Set(arr);
    }
  } catch {}
  return new Set();
}

export function hideQuestionLocally(id: string): void {
  const hidden = getHiddenQuestionIds();
  hidden.add(id);
  localStorage.setItem(HIDDEN_KEY, JSON.stringify(Array.from(hidden)));
}

export function unhideAllQuestionsLocally(): void {
  localStorage.removeItem(HIDDEN_KEY);
}

export function normalizeAnswer(s: string): string {
  return String(s || '')
    .trim()
    .toLowerCase()
    .replace(/[.,;:!?]+$/, '')
    .replace(/\s+/g, ' ');
}

export function checkAnswerMatch(given: string, expectedString: string): boolean {
  if (!given || !given.trim()) return false;
  const normalizedGiven = normalizeAnswer(given);
  const options = expectedString.split('/').map(normalizeAnswer);
  return options.includes(normalizedGiven);
}

export function getTodayKey(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function loadQuestions(): ClozeQuestion[] {
  const hidden = getHiddenQuestionIds();
  try {
    const raw = localStorage.getItem(SETS_KEY);
    if (raw) {
      const saved: ClozeQuestion[] = JSON.parse(raw);
      if (Array.isArray(saved) && saved.length > 0) {
        const savedMap = new Map(saved.map((x) => [x.id, x]));
        const merged = SEED_QUESTIONS.map((seed) =>
          savedMap.has(seed.id) ? { ...seed, ...savedMap.get(seed.id), v: 2 } : { ...seed }
        );
        // append any custom user-added sets not in seed
        saved.forEach((item) => {
          if (!SEED_QUESTIONS.some((x) => x.id === item.id)) {
            merged.push(item);
          }
        });
        return merged.filter((q) => !hidden.has(q.id));
      }
    }
  } catch (err) {
    console.error('Error loading questions from localStorage:', err);
  }
  return SEED_QUESTIONS.filter((q) => !hidden.has(q.id)).map((x) => ({ ...x }));
}

export function saveQuestions(questions: ClozeQuestion[]): void {
  try {
    localStorage.setItem(SETS_KEY, JSON.stringify(questions));
  } catch (err) {
    console.error('Error saving questions to localStorage:', err);
  }
}

export function getHistory(): ScoreAttempt[] {
  try {
    const raw = localStorage.getItem(HIST_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      if (Array.isArray(data)) return data;
    }
  } catch (err) {
    console.error('Error loading history:', err);
  }
  return [];
}

export function logAttempt(question: ClozeQuestion, score: number, total: number): void {
  try {
    const attempts = getHistory();
    attempts.push({
      id: question.id,
      title: question.title,
      score,
      total,
      ts: Date.now(),
      day: getTodayKey(),
    });
    localStorage.setItem(HIST_KEY, JSON.stringify(attempts.slice(-500)));
  } catch (err) {
    console.error('Error logging score attempt:', err);
  }
}

export function clearHistory(): void {
  localStorage.removeItem(HIST_KEY);
}

export function getDailyGoal(): number {
  try {
    const val = parseInt(localStorage.getItem(GOAL_KEY) || '3', 10);
    return isNaN(val) || val <= 0 ? 3 : val;
  } catch {
    return 3;
  }
}

export function setDailyGoal(goal: number): void {
  localStorage.setItem(GOAL_KEY, String(Math.max(1, goal)));
}

export function getTodayUniqueCount(): number {
  const today = getTodayKey();
  const hist = getHistory().filter((a) => a.day === today);
  return new Set(hist.map((a) => a.id)).size;
}

export function calculateStreak(): number {
  const attempts = getHistory();
  const daySet = new Set(attempts.map((a) => a.day));
  let curr = new Date();
  let count = 0;

  // If today isn't completed yet, check if yesterday was active
  if (!daySet.has(getTodayKey(curr))) {
    curr.setDate(curr.getDate() - 1);
  }

  while (daySet.has(getTodayKey(curr))) {
    count++;
    curr.setDate(curr.getDate() - 1);
  }
  return count;
}

export function getQuestionStats(questionId: string): {
  attemptsCount: number;
  bestScore?: { score: number; total: number };
  lastScore?: { score: number; total: number };
} {
  const attempts = getHistory().filter((x) => x.id === questionId);
  if (!attempts.length) return { attemptsCount: 0 };
  const best = attempts.reduce((prev, curr) => (curr.score > prev.score ? curr : prev));
  const last = attempts[attempts.length - 1];
  return {
    attemptsCount: attempts.length,
    bestScore: { score: best.score, total: best.total },
    lastScore: { score: last.score, total: last.total },
  };
}

export function getStoredTheme(): 'light' | 'dark' {
  const stored = localStorage.getItem(THEME_KEY);
  if (stored === 'light' || stored === 'dark') return stored;
  return 'light';
}

export function setStoredTheme(theme: 'light' | 'dark'): void {
  localStorage.setItem(THEME_KEY, theme);
  if (theme === 'dark') {
    document.documentElement.classList.add('dark');
    document.documentElement.dataset.theme = 'dark';
    if (document.body) {
      document.body.classList.add('dark');
    }
  } else {
    document.documentElement.classList.remove('dark');
    document.documentElement.dataset.theme = 'light';
    if (document.body) {
      document.body.classList.remove('dark');
    }
  }
}
