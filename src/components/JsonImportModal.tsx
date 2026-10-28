import React, { useState, useRef } from 'react';
import { ClozeQuestion } from '../types';
import { 
  X, 
  Upload, 
  FileCode, 
  Download, 
  CheckCircle2, 
  AlertCircle, 
  Server, 
  Layers, 
  Eye, 
  Loader2 
} from 'lucide-react';

interface JsonImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: (importedQuestions: ClozeQuestion[]) => void;
}

const SAMPLE_TEMPLATE: ClozeQuestion[] = [
  {
    id: "sample-db-2026",
    title: "D.B. 2026 — Tree Plantation & Ecology",
    words: [
      "indiscriminate",
      "maintain",
      "plant",
      "ecosystem",
      "breathe",
      "disaster",
      "produce",
      "shelter",
      "essential",
      "prevent",
      "destroy"
    ],
    passage: "Trees are {{a}} for our existence. They supply us with oxygen to {{b}} and absorb harmful carbon dioxide. In addition, trees {{c}} us from natural catastrophes and {{d}} soil erosion. Wild animals find their {{e}} in forests. But men are cutting down trees {{f}}. If we continue to {{g}} forests, the ecological {{h}} will be shattered. So, massive tree {{i}} campaigns should be launched to {{j}} a healthy environment.",
    answers: [
      "essential",
      "breathe",
      "protect/prevent",
      "prevent",
      "shelter",
      "indiscriminately",
      "destroy",
      "balance/ecosystem",
      "plantation",
      "maintain"
    ],
    note: "Sample Question · Cloze test with clues",
    bn: "আমাদের অস্তিত্বের জন্য গাছপালা অপরিহার্য। তারা আমাদের শ্বাস নেওয়ার জন্য অক্সিজেন সরবরাহ করে এবং ক্ষতিকারক কার্বন ডাই অক্সাইড শোষণ করে। উপরন্তু, গাছপালা আমাদের প্রাকৃতিক বিপর্যয় থেকে রক্ষা করে এবং মাটি ক্ষয় রোধ করে। বন্যপ্রাণীরা বনে তাদের আশ্রয় খুঁজে পায়। কিন্তু মানুষ নির্বিচারে গাছ কাটছে। আমরা যদি এভাবে বন ধ্বংস করতে থাকি তবে পরিবেশগত ভারসাম্য নষ্ট হয়ে যাবে। তাই একটি স্বাস্থ্যকর পরিবেশ বজায় রাখতে ব্যাপক বৃক্ষরোপণ কর্মসূচি শুরু করা উচিত।",
    meanings: {
      "indiscriminate": "নির্বিচার",
      "maintain": "বজায় রাখা",
      "plant": "রোপণ করা",
      "ecosystem": "বাস্তুতন্ত্র",
      "breathe": "শ্বাস নেওয়া",
      "disaster": "দুর্যোগ",
      "produce": "উৎপাদন করা",
      "shelter": "আশ্রয়",
      "essential": "অপরিহার্য",
      "prevent": "প্রতিরোধ করা",
      "destroy": "ধ্বংস করা"
    },
    board: "Dhaka",
    year: "2026"
  }
];

export const JsonImportModal: React.FC<JsonImportModalProps> = ({
  isOpen,
  onClose,
  onImportComplete,
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'paste'>('upload');
  const [jsonText, setJsonText] = useState('');
  const [parsedSets, setParsedSets] = useState<ClozeQuestion[]>([]);
  const [saveToServer, setSaveToServer] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [fileName, setFileName] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const validateAndParse = (rawText: string) => {
    setErrorMsg('');
    try {
      if (!rawText.trim()) {
        setParsedSets([]);
        return;
      }
      const data = JSON.parse(rawText);
      const list: any[] = Array.isArray(data)
        ? data
        : data.sets || data.questions || [];

      if (!Array.isArray(list) || list.length === 0) {
        throw new Error('JSON must contain an array of question set objects.');
      }

      const validated: ClozeQuestion[] = [];
      list.forEach((item, index) => {
        if (!item.title || !item.passage) {
          throw new Error(`Item #${index + 1} is missing a required "title" or "passage" property.`);
        }
        const blanks = [...item.passage.matchAll(/\{\{([a-z])\}\}/g)].map((m) => m[1]);
        if (blanks.length === 0) {
          throw new Error(`Item "${item.title}" does not contain any {{a}}, {{b}} blank markers in its passage.`);
        }
        const words = Array.isArray(item.words) ? item.words : [];
        const answers = Array.isArray(item.answers) ? item.answers : [];

        validated.push({
          id: item.id || `custom-${Date.now()}-${index}`,
          title: item.title,
          words,
          passage: item.passage,
          answers,
          note: item.note,
          bn: item.bn,
          meanings: item.meanings || {},
          board: item.board,
          year: item.year,
          v: 2,
          ai: Boolean(item.ai),
        });
      });

      setParsedSets(validated);
    } catch (err: any) {
      setErrorMsg(err.message || 'Invalid JSON syntax or structure.');
      setParsedSets([]);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      const content = reader.result as string;
      setJsonText(content);
      validateAndParse(content);
    };
    reader.readAsText(file);
  };

  const handleDownloadSample = () => {
    const blob = new Blob([JSON.stringify(SAMPLE_TEMPLATE, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'hsc-cloze-sample-template.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSave = async () => {
    if (parsedSets.length === 0) {
      setErrorMsg('No valid question sets to save.');
      return;
    }

    setIsSaving(true);
    setErrorMsg('');

    try {
      if (saveToServer) {
        // Attempt to persist to server (works when running with Node backend)
        try {
          const res = await fetch('/api/questions/import', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(parsedSets),
          });
          if (!res.ok) {
            console.warn('Server storage returned status', res.status);
          }
        } catch (serverErr) {
          // Normal on static platforms like GitHub Pages
          console.info('Server storage unavailable on static hosting, saving locally to browser storage.');
        }
      }

      onImportComplete(parsedSets);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error saving questions.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-pop-in">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Head */}
        <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-300 flex items-center justify-center">
              <FileCode className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white">
                Upload Questions via JSON
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Bulk add or update cloze test sets permanently on the website
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadSample}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition shadow-sm cursor-pointer"
              title="Download sample JSON schema"
            >
              <Download className="w-3.5 h-3.5 text-indigo-500" />
              Download Template JSON
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-slate-100 dark:border-slate-800 px-6 pt-3 gap-6 bg-slate-50/30 dark:bg-slate-800/20 text-xs font-bold uppercase tracking-wider">
          <button
            onClick={() => setActiveTab('upload')}
            className={`pb-3 border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'upload'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Upload className="w-4 h-4" />
            Select File (.json)
          </button>
          <button
            onClick={() => setActiveTab('paste')}
            className={`pb-3 border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'paste'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <FileCode className="w-4 h-4" />
            Paste JSON Code
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {activeTab === 'upload' ? (
            <div>
              <input
                type="file"
                ref={fileInputRef}
                accept="application/json,.json"
                onChange={handleFileUpload}
                className="hidden"
              />
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const file = e.dataTransfer.files?.[0];
                  if (file) {
                    setFileName(file.name);
                    const reader = new FileReader();
                    reader.onload = () => {
                      const text = reader.result as string;
                      setJsonText(text);
                      validateAndParse(text);
                    };
                    reader.readAsText(file);
                  }
                }}
                className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-500 rounded-2xl p-8 text-center bg-slate-50/50 dark:bg-slate-800/30 hover:bg-indigo-50/20 dark:hover:bg-indigo-950/10 transition cursor-pointer"
              >
                <Upload className="w-10 h-10 mx-auto text-indigo-500/80 mb-3" />
                <div className="font-bold text-sm text-slate-800 dark:text-slate-200">
                  {fileName ? `Selected file: ${fileName}` : 'Click to select or drag and drop your .json file here'}
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Upload single or multiple question sets formatted in JSON
                </p>
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                Paste JSON Array of Questions
              </label>
              <textarea
                rows={7}
                value={jsonText}
                onChange={(e) => {
                  setJsonText(e.target.value);
                  validateAndParse(e.target.value);
                }}
                placeholder='[&#10;  {&#10;    "title": "D.B. 2026 — Topic",&#10;    "words": ["word1", "word2"],&#10;    "passage": "Passage with {{a}} and {{b}}...",&#10;    "answers": ["ans1", "ans2"]&#10;  }&#10;]'
                className="w-full px-3.5 py-2 font-mono text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          )}

          {/* Validation & Preview Summary */}
          {parsedSets.length > 0 && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" />
                  Validated: {parsedSets.length} Question Set{parsedSets.length === 1 ? '' : 's'} Ready to Import
                </span>
              </div>

              {/* Preview Cards */}
              <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                {parsedSets.map((set, idx) => {
                  const blanks = [...set.passage.matchAll(/\{\{([a-z])\}\}/g)].map((m) => m[1]);
                  return (
                    <div
                      key={idx}
                      className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs flex flex-col gap-1"
                    >
                      <div className="flex items-center justify-between font-bold text-slate-900 dark:text-white">
                        <span>{idx + 1}. {set.title}</span>
                        <span className="text-indigo-600 dark:text-indigo-400 text-[11px]">
                          {blanks.length} Blanks · {set.words.length} Clues
                        </span>
                      </div>
                      <p className="text-slate-500 dark:text-slate-400 line-clamp-1 italic font-passage">
                        {set.passage}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Permanence Switch */}
          <div className="p-3.5 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Server className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <div>
                <div className="text-xs font-bold text-slate-900 dark:text-white">
                  Save Permanently to Website Server
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  Saves to server storage so these questions stay permanently accessible to all users.
                </div>
              </div>
            </div>
            <input
              type="checkbox"
              checked={saveToServer}
              onChange={(e) => setSaveToServer(e.target.checked)}
              className="h-4 w-4 rounded text-indigo-600 cursor-pointer"
            />
          </div>
        </div>

        {/* Modal Foot */}
        <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={parsedSets.length === 0 || isSaving}
            onClick={handleSave}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm shadow-md disabled:opacity-50 transition cursor-pointer"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving to Website...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Import & Save ({parsedSets.length})
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
