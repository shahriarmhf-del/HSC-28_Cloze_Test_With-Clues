import React, { useState } from 'react';
import { ClozeQuestion } from '../types';
import { 
  X, 
  Camera, 
  Sparkles, 
  Upload, 
  Check, 
  AlertCircle, 
  BookOpen, 
  FileText,
  Loader2
} from 'lucide-react';

interface AiScanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSets: (sets: ClozeQuestion[]) => void;
}

export const AiScanModal: React.FC<AiScanModalProps> = ({
  isOpen,
  onClose,
  onImportSets,
}) => {
  const [activeTab, setActiveTab] = useState<'scan' | 'generate'>('scan');

  // Scanner state
  const [qFiles, setQFiles] = useState<File[]>([]);
  const [aFiles, setAFiles] = useState<File[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState<string>('');
  const [extractedSets, setExtractedSets] = useState<ClozeQuestion[]>([]);
  const [selectedExtractIndices, setSelectedExtractIndices] = useState<Set<number>>(new Set());
  const [errorMsg, setErrorMsg] = useState('');

  // Topic generator state
  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState('HSC Standard');
  const [isGenerating, setIsGenerating] = useState(false);

  if (!isOpen) return null;

  // Convert File to base64
  const fileToBase64 = (file: File): Promise<{ data: string; mimeType: string }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve({
          data: result,
          mimeType: file.type || 'image/jpeg',
        });
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  };

  const handleRunScan = async () => {
    if (qFiles.length === 0) {
      setErrorMsg('Please select at least one photo of the question page.');
      return;
    }

    setIsScanning(true);
    setErrorMsg('');
    setScanStatus('Reading and analyzing photos with Gemini...');

    try {
      const questionImages = await Promise.all(qFiles.map(fileToBase64));
      const answerImages = await Promise.all(aFiles.map(fileToBase64));

      const response = await fetch('/api/ai/scan-cloze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionImages,
          answerImages,
          enrich: true,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to analyze photos.');
      }

      if (data.sets && data.sets.length > 0) {
        const formatted: ClozeQuestion[] = data.sets.map((item: any, i: number) => ({
          id: `scanned-${Date.now()}-${i}`,
          title: item.title || `Scanned Question Set ${i + 1}`,
          words: item.words || [],
          passage: item.passage || '',
          answers: item.answers || [],
          bn: item.bn || '',
          meanings: item.meanings || {},
          note: item.note || 'Scanned with Gemini 3.8 Flash',
          v: 2,
          ai: true,
        }));

        setExtractedSets(formatted);
        setSelectedExtractIndices(new Set(formatted.map((_, idx) => idx)));
        setScanStatus(`Found ${formatted.length} question set(s)! Select and import below.`);
      } else {
        setScanStatus('No cloze test passages detected in these photos. Try clearer photos.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error occurred while scanning images.');
      setScanStatus('');
    } finally {
      setIsScanning(false);
    }
  };

  const handleGenerateTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;

    setIsGenerating(true);
    setErrorMsg('');

    try {
      const response = await fetch('/api/ai/generate-topic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: topic.trim(), difficulty }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate test.');
      }

      if (data.set) {
        const newSet: ClozeQuestion = {
          id: `ai-gen-${Date.now()}`,
          title: data.set.title || `AI: ${topic}`,
          words: data.set.words || [],
          passage: data.set.passage || '',
          answers: data.set.answers || [],
          bn: data.set.bn || '',
          meanings: data.set.meanings || {},
          note: data.set.note || `AI Generated · ${difficulty}`,
          v: 2,
          ai: true,
        };

        onImportSets([newSet]);
        onClose();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Generation failed.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleImportExtracted = () => {
    const toImport = extractedSets.filter((_, idx) => selectedExtractIndices.has(idx));
    if (toImport.length === 0) {
      setErrorMsg('Please select at least one set to import.');
      return;
    }
    onImportSets(toImport);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-pop-in">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Head */}
        <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-300 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white">
                AI Cloze Studio
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Scan exam papers from photos or generate custom tests on any topic
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

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-100 dark:border-slate-800 px-6 pt-3 gap-6 bg-slate-50/30 dark:bg-slate-800/20 text-xs font-bold uppercase tracking-wider">
          <button
            onClick={() => setActiveTab('scan')}
            className={`pb-3 border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'scan'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Camera className="w-4 h-4" />
            Scan Exam Paper Photos
          </button>
          <button
            onClick={() => setActiveTab('generate')}
            className={`pb-3 border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'generate'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            Generate from Topic
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

          {activeTab === 'scan' ? (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 text-xs text-indigo-950 dark:text-indigo-200 leading-relaxed">
                Take or upload photos of your textbook or model question paper. Gemini extracts the passage, builds the blanks &#123;&#123;a&#125;&#125; to &#123;&#123;j&#125;&#125;, grabs the word clues, matches answers, and generates full Bangla translation automatically!
              </div>

              {/* Question Photos Input */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  1) Question Page Photos (Passage + Word Box) *
                </label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => setQFiles(Array.from(e.target.files || []))}
                  className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 dark:file:bg-indigo-950 dark:file:text-indigo-300 cursor-pointer"
                />
                {qFiles.length > 0 && (
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                    ✓ {qFiles.length} question photo(s) selected
                  </p>
                )}
              </div>

              {/* Answer Photos Input */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  2) Answer Page Photos (Optional — AI can solve if missing)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => setAFiles(Array.from(e.target.files || []))}
                  className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 dark:file:bg-slate-800 dark:file:text-slate-300 cursor-pointer"
                />
                {aFiles.length > 0 && (
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                    ✓ {aFiles.length} answer photo(s) selected
                  </p>
                )}
              </div>

              {scanStatus && (
                <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  {isScanning && <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />}
                  <span>{scanStatus}</span>
                </div>
              )}

              {/* Extracted Sets Preview */}
              {extractedSets.length > 0 && (
                <div className="space-y-3 pt-2">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                    Preview & Select Questions to Import:
                  </div>
                  {extractedSets.map((set, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 flex items-start gap-3"
                    >
                      <input
                        type="checkbox"
                        checked={selectedExtractIndices.has(idx)}
                        onChange={(e) => {
                          const updated = new Set(selectedExtractIndices);
                          if (e.target.checked) updated.add(idx);
                          else updated.delete(idx);
                          setSelectedExtractIndices(updated);
                        }}
                        className="mt-1 h-4 w-4 rounded text-indigo-600 cursor-pointer"
                      />
                      <div className="flex-1">
                        <div className="font-bold text-sm text-slate-900 dark:text-white">
                          {set.title}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {set.words.length} clue words · {set.answers.length} blanks detected
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 line-clamp-2 font-passage">
                          {set.passage}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={handleGenerateTopic} className="space-y-4">
              <div className="p-4 rounded-2xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900/40 text-xs text-purple-950 dark:text-purple-200 leading-relaxed">
                Want to practice on a specific topic? Enter any theme (e.g. "Artificial Intelligence", "Metro Rail", "Sundarbans & Royal Bengal Tiger", "Traffic Jam") and Gemini will generate a standard 10-blank board cloze test with clues and full Bangla translation.
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Target Topic / Subject *
                </label>
                <input
                  type="text"
                  required
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g. Climate change and sea level rise in Bangladesh"
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Difficulty Level
                </label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                >
                  <option value="HSC Standard">HSC Standard (Board Exam Level)</option>
                  <option value="Advanced / Cadet College">Advanced / Cadet College Standard</option>
                  <option value="Foundational">Foundational / Easy</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={isGenerating}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs sm:text-sm shadow-md transition cursor-pointer"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Generating Cloze Test...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Generate & Add to Library
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
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

          {activeTab === 'scan' && (
            <div className="flex items-center gap-2">
              {extractedSets.length > 0 ? (
                <button
                  type="button"
                  onClick={handleImportExtracted}
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold shadow-md cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  Import Selected ({selectedExtractIndices.size})
                </button>
              ) : (
                <button
                  type="button"
                  disabled={isScanning || qFiles.length === 0}
                  onClick={handleRunScan}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold shadow-md disabled:opacity-50 transition cursor-pointer"
                >
                  {isScanning ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Scanning...
                    </>
                  ) : (
                    <>
                      <Camera className="w-4 h-4" />
                      Scan & Extract
                    </>
                  )}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
