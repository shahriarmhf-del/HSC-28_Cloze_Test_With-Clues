export interface ClozeQuestion {
  id: string;
  title: string;
  words: string[];
  passage: string;
  answers: string[];
  note?: string;
  bn?: string;
  meanings?: Record<string, string>;
  v?: number;
  ai?: boolean;
  board?: string;
  year?: string;
}

export interface ScoreAttempt {
  id: string;
  title: string;
  score: number;
  total: number;
  ts: number;
  day: string; // YYYY-MM-DD
}

export interface GradeResultItem {
  letter: string;
  userAnswer: string;
  correctAnswers: string[];
  isCorrect: boolean;
}
