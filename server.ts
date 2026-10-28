import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

const DATA_DIR = path.resolve(process.cwd(), 'data');
const QUESTIONS_FILE = path.join(DATA_DIR, 'custom_questions.json');

function ensureDataFile() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(QUESTIONS_FILE)) {
    fs.writeFileSync(QUESTIONS_FILE, JSON.stringify([], null, 2), 'utf-8');
  }
}

function readStoredQuestions(): any[] {
  try {
    ensureDataFile();
    const raw = fs.readFileSync(QUESTIONS_FILE, 'utf-8');
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.error('Error reading stored questions:', err);
    return [];
  }
}

function writeStoredQuestions(questions: any[]) {
  ensureDataFile();
  fs.writeFileSync(QUESTIONS_FILE, JSON.stringify(questions, null, 2), 'utf-8');
}

// GET all stored custom questions from server
app.get('/api/questions', (req, res) => {
  const custom = readStoredQuestions();
  res.json({ success: true, customQuestions: custom });
});

// POST import questions permanently to server
app.post('/api/questions/import', (req, res) => {
  try {
    const rawList = Array.isArray(req.body)
      ? req.body
      : req.body.sets || req.body.questions || [];

    if (!Array.isArray(rawList) || rawList.length === 0) {
      return res.status(400).json({ error: 'No valid questions array found in JSON payload.' });
    }

    const current = readStoredQuestions();
    const currentMap = new Map(current.map((q) => [q.id, q]));
    let importedCount = 0;

    for (const item of rawList) {
      if (!item.title || !item.passage) continue;
      const id = item.id || `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const cleanItem = {
        ...item,
        id,
        v: 2,
        words: Array.isArray(item.words) ? item.words : [],
        answers: Array.isArray(item.answers) ? item.answers : [],
      };
      currentMap.set(id, cleanItem);
      importedCount++;
    }

    const updated = Array.from(currentMap.values());
    writeStoredQuestions(updated);

    return res.json({
      success: true,
      importedCount,
      totalStored: updated.length,
      customQuestions: updated,
    });
  } catch (err: any) {
    console.error('Error importing questions:', err);
    return res.status(500).json({ error: err.message || 'Failed to save questions to server' });
  }
});

// DELETE a question from server permanent storage
app.delete('/api/questions/:id', (req, res) => {
  try {
    const { id } = req.params;
    const current = readStoredQuestions();
    const filtered = current.filter((q) => q.id !== id);
    writeStoredQuestions(filtered);
    return res.json({ success: true, remaining: filtered.length });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// AI OCR and Cloze Parser from uploaded images or raw text
app.post('/api/ai/scan-cloze', async (req, res) => {
  try {
    const { questionImages, answerImages, rawText, enrich = true } = req.body;

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        error: 'GEMINI_API_KEY is not configured in the server environment.',
      });
    }

    const parts: any[] = [];

    // Attach question images
    if (Array.isArray(questionImages)) {
      for (const img of questionImages) {
        if (img && img.data && img.mimeType) {
          parts.push({
            inlineData: {
              mimeType: img.mimeType,
              data: img.data.replace(/^data:image\/[a-zA-Z]+;base64,/, ''),
            },
          });
        }
      }
    }

    // Attach answer images
    if (Array.isArray(answerImages)) {
      for (const img of answerImages) {
        if (img && img.data && img.mimeType) {
          parts.push({
            inlineData: {
              mimeType: img.mimeType,
              data: img.data.replace(/^data:image\/[a-zA-Z]+;base64,/, ''),
            },
          });
        }
      }
    }

    // Prompt instructions
    const promptText = `
You are an expert English teacher specializing in Bangladesh HSC (Higher Secondary Certificate) English 1st / 2nd paper Board Examinations (Question 4/5: Fill in the blanks with clues / Cloze test with clues).

Task:
Extract or generate structured cloze question sets from the provided photos and/or text input.
${rawText ? `Input text: """${rawText}"""` : ''}

For each cloze test found or constructed:
1. "title": Board name, year and topic (e.g. "D.B. 2024 — Environment & Ecology" or topic title).
2. "words": Array of 10 to 14 clue words from the word box (in base/root or given form).
3. "passage": The reading passage text with 10 standard blanks marked EXACTLY as {{a}}, {{b}}, {{c}}, {{d}}, {{e}}, {{f}}, {{g}}, {{h}}, {{i}}, {{j}}. Make sure the passage flows grammatically and punctuation is preserved.
4. "answers": Array of EXACTLY 10 correct answers corresponding to blanks a, b, c, d, e, f, g, h, i, j. If there are valid alternative forms (e.g. US/UK spelling or infinitive variations like "realize/realise" or "working/to work"), separate them with a slash "/".
5. "bn": A fluent, natural, accurate Bangla (Bengali) translation of the complete passage with blanks filled in, so students understand the whole text context.
6. "meanings": A dictionary mapping each word from the "words" box to its concise, accurate Bangla meaning.
7. "note": Contextual note (e.g. "Board Question · Cloze test with clues").

Return an array of question set objects formatted strictly according to the JSON schema.
`;

    parts.push({ text: promptText });

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: { parts },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              words: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              passage: { type: Type.STRING },
              answers: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              bn: { type: Type.STRING },
              meanings: {
                type: Type.OBJECT,
                description: 'Word to Bangla meaning mapping',
              },
              note: { type: Type.STRING },
            },
            required: ['title', 'words', 'passage', 'answers', 'bn'],
          },
        },
      },
    });

    const parsed = JSON.parse(response.text || '[]');
    return res.json({ success: true, sets: parsed });
  } catch (error: any) {
    console.error('Error scanning cloze pages:', error);
    return res.status(500).json({
      error: error.message || 'Failed to process cloze pages with Gemini.',
    });
  }
});

// AI Generate Practice Set from Topic
app.post('/api/ai/generate-topic', async (req, res) => {
  try {
    const { topic, difficulty = 'HSC Standard' } = req.body;

    if (!topic || !topic.trim()) {
      return res.status(400).json({ error: 'Topic is required.' });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: `Create an authentic Bangladesh HSC English Board Exam standard "Cloze Test with Clues" on the topic: "${topic}".
Difficulty level: ${difficulty}.

Requirements:
- 10 blanks in the passage labelled {{a}}, {{b}}, {{c}}, {{d}}, {{e}}, {{f}}, {{g}}, {{h}}, {{i}}, {{j}}.
- Word box with 10-14 clue words (words can need grammatical transformation, e.g. tense change, noun to adjective, or direct placement).
- Exactly 10 answers corresponding in order to {{a}} through {{j}} (include alternatives with slash if applicable).
- High quality Bangla translation of the complete passage.
- Word-by-word Bangla meanings for all clue words.
`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            words: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            passage: { type: Type.STRING },
            answers: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            bn: { type: Type.STRING },
            meanings: {
              type: Type.OBJECT,
            },
            note: { type: Type.STRING },
          },
          required: ['title', 'words', 'passage', 'answers', 'bn', 'meanings'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json({ success: true, set: parsed });
  } catch (error: any) {
    console.error('Error generating cloze test:', error);
    return res.status(500).json({ error: error.message || 'Generation failed' });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

async function startServer() {
  const distPath = path.resolve(__dirname, 'dist');
  const isProduction =
    process.env.NODE_ENV === 'production' ||
    (fs.existsSync(distPath) && process.env.NODE_ENV !== 'development');

  if (isProduction) {
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (req, res, next) => {
        if (req.path.startsWith('/api')) {
          return next();
        }
        res.sendFile(path.resolve(distPath, 'index.html'));
      });
    } else {
      console.warn('Production mode requested but dist directory not found at', distPath);
    }
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`HSC Cloze Lab server listening on 0.0.0.0:${PORT} (env: ${process.env.NODE_ENV || 'development'})`);
  });
}

startServer();
