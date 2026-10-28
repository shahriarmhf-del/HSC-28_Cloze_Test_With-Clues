import React, { useState } from 'react';
import { ClozeQuestion } from '../types';
import { 
  X, 
  Printer, 
  Copy, 
  Download, 
  Check, 
  FileText, 
  CheckSquare, 
  Square,
  Sparkles,
  ExternalLink
} from 'lucide-react';

interface PrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  questions: ClozeQuestion[];
}

export const PrintModal: React.FC<PrintModalProps> = ({
  isOpen,
  onClose,
  questions,
}) => {
  const [includeAnswerKey, setIncludeAnswerKey] = useState(true);
  const [copied, setCopied] = useState(false);
  const [printError, setPrintError] = useState('');

  if (!isOpen || !questions || questions.length === 0) return null;

  // Format passage replacing {{a}} with (a) ___________
  const formatPassageForPrint = (passage: string) => {
    return passage.replace(/\{\{([a-z])\}\}/g, (_, l) => ` (${l}) ________________ `);
  };

  // Generate plain text for copying
  const generatePlainText = () => {
    let text = `==========================================================\n`;
    text += `   HSC ENGLISH EXAMINATION PRACTICE — CLOZE TEST WITH CLUES\n`;
    text += `==========================================================\n\n`;

    questions.forEach((q, idx) => {
      const letters = [...q.passage.matchAll(/\{\{([a-z])\}\}/g)].map((m) => m[1]);
      text += `Set ${idx + 1}: ${q.title}\n`;
      if (q.board && q.year) text += `Board: ${q.board} Board (${q.year})\n`;
      text += `Total Marks: ${letters.length}\n`;
      text += `Name: _______________________   Roll: _________\n\n`;
      text += `Fill in the blanks with the suitable words from the box. You may need to change the forms of some words:\n\n`;
      text += `[ ${q.words.join('   |   ')} ]\n\n`;
      text += `${formatPassageForPrint(q.passage)}\n\n`;
      text += `Answers Space:\n`;
      letters.forEach((l) => {
        text += `(${l}) ____________________   `;
        if (l === 'e' || l === 'j') text += `\n`;
      });
      text += `\n\n----------------------------------------------------------\n\n`;
    });

    if (includeAnswerKey) {
      text += `==========================================================\n`;
      text += `                     ANSWER KEY SHEET                     \n`;
      text += `==========================================================\n\n`;
      questions.forEach((q, idx) => {
        text += `Set ${idx + 1} Answers (${q.title}):\n`;
        q.answers.forEach((ans, aIdx) => {
          text += `  (${String.fromCharCode(97 + aIdx)}) ${ans}\n`;
        });
        text += `\n`;
      });
    }

    return text;
  };

  const handleCopyText = async () => {
    try {
      const text = generatePlainText();
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback copy using textarea
      const textarea = document.createElement('textarea');
      textarea.value = generatePlainText();
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const generateHtmlDocument = () => {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>HSC Cloze Lab — Printable Worksheets</title>
  <style>
    @page { size: A4; margin: 20mm; }
    body { font-family: 'Times New Roman', Times, serif; color: #111; line-height: 2.2; margin: 0; padding: 20px; }
    .sheet { page-break-after: always; break-after: page; max-width: 800px; margin: 0 auto; }
    .header { border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 16px; font-family: Arial, sans-serif; }
    .header-top { display: flex; justify-content: space-between; font-weight: bold; font-size: 13px; text-transform: uppercase; }
    .header-sub { display: flex; justify-content: space-between; margin-top: 10px; font-size: 13px; }
    h2 { font-size: 17px; margin: 12px 0 4px 0; font-family: Arial, sans-serif; }
    .instruction { font-size: 12px; font-style: italic; color: #444; margin-bottom: 12px; font-family: Arial, sans-serif; }
    .word-box { border: 1.5px solid #000; background: #fbfbfb; padding: 10px 14px; text-align: center; font-weight: bold; font-family: Arial, sans-serif; font-size: 14px; margin: 14px 0; }
    .passage { font-size: 16px; text-align: justify; line-height: 2.4; margin-top: 16px; }
    .answers-grid { margin-top: 30px; border-top: 1px dashed #777; padding-top: 12px; font-family: Arial, sans-serif; font-size: 12px; display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; }
    .answer-line { border-bottom: 1px solid #000; padding: 4px 0; }
    .key-sheet { font-family: Arial, sans-serif; margin-top: 24px; }
    .key-card { border: 1px solid #ccc; border-radius: 8px; padding: 12px; margin-bottom: 16px; }
    .key-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; font-size: 13px; margin-top: 8px; }
    .key-pill { background: #f2f2f2; padding: 4px 8px; border-radius: 4px; }
    @media print {
      body { padding: 0; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  ${questions
    .map((q, idx) => {
      const letters = [...q.passage.matchAll(/\{\{([a-z])\}\}/g)].map((m) => m[1]);
      return `
    <div class="sheet">
      <div class="header">
        <div class="header-top">
          <span>HSC English 1st Paper Board Examination</span>
          <span>Cloze Test With Clues</span>
        </div>
        <div class="header-sub">
          <span>Name: _________________________________________</span>
          <span>Roll: ___________ &nbsp; Marks: ______ / ${letters.length}</span>
        </div>
      </div>
      <h2>Question ${idx + 1}: ${q.title}</h2>
      <div class="instruction">
        Fill in the blanks with the right form of words from the box. You may need to change the forms of some words. You may need to use one word more than once.
      </div>
      <div class="word-box">
        ${q.words.join(' &nbsp; &bull; &nbsp; ')}
      </div>
      <div class="passage">
        ${formatPassageForPrint(q.passage)}
      </div>
      <div class="answers-grid">
        ${letters
          .map((l) => `<div class="answer-line">(${l}) ________________</div>`)
          .join('')}
      </div>
    </div>
    `;
    })
    .join('')}

  ${
    includeAnswerKey
      ? `
    <div class="sheet key-sheet">
      <div class="header">
        <div class="header-top">
          <span>ANSWER KEY SHEET</span>
          <span>HSC Cloze Lab Solutions</span>
        </div>
      </div>
      ${questions
        .map(
          (q, idx) => `
        <div class="key-card">
          <strong>Question ${idx + 1}: ${q.title}</strong>
          <div class="key-grid">
            ${q.answers
              .map(
                (ans, aIdx) => `
              <div class="key-pill">
                <strong>(${String.fromCharCode(97 + aIdx)})</strong> ${ans}
              </div>
            `
              )
              .join('')}
          </div>
        </div>
      `
        )
        .join('')}
    </div>
  `
      : ''
  }
</body>
</html>`;
  };

  const handleDownloadHtml = () => {
    const html = generateHtmlDocument();
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `HSC-Cloze-Worksheet-${new Date().toISOString().slice(0, 10)}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrintNow = () => {
    setPrintError('');
    try {
      window.print();
    } catch (err: any) {
      console.warn('Iframe window.print blocked:', err);
      setPrintError('Browser blocked iframe print. Use "Download HTML" or "Copy Text" to print without restrictions.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/60 backdrop-blur-sm animate-pop-in">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
        
        {/* Modal Top Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/40">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-sm">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
                Worksheet & Print Center
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Print exam-ready paper worksheets or export to Word / Google Docs
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

        {/* Options Toolbar */}
        <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm">
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-700 dark:text-slate-200 select-none">
              <input
                type="checkbox"
                checked={includeAnswerKey}
                onChange={(e) => setIncludeAnswerKey(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 accent-indigo-600 cursor-pointer"
              />
              <span>Include Answer Key Sheet</span>
            </label>
            <span className="text-slate-400">|</span>
            <span className="text-slate-500">
              {questions.length} Question Set{questions.length > 1 ? 's' : ''} Selected
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyText}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition shadow-sm cursor-pointer ${
                copied
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
              }`}
              title="Copy clean formatted text for Word or Google Docs"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied to Clipboard!' : 'Copy Text for Word'}</span>
            </button>

            <button
              onClick={handleDownloadHtml}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition shadow-sm cursor-pointer"
              title="Download standalone HTML file ready for printing or offline practice"
            >
              <Download className="w-3.5 h-3.5 text-indigo-500" />
              <span>Download HTML</span>
            </button>

            <button
              onClick={handlePrintNow}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white text-xs font-bold shadow-sm transition cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Now</span>
            </button>
          </div>
        </div>

        {printError && (
          <div className="mx-5 mt-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-200 flex items-center justify-between">
            <span>{printError}</span>
            <button
              onClick={handleDownloadHtml}
              className="font-bold underline ml-2 cursor-pointer"
            >
              Download HTML instead
            </button>
          </div>
        )}

        {/* Live Preview Area Styled like Real Paper */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100 dark:bg-slate-950/60">
          <div className="max-w-2xl mx-auto space-y-6">
            {questions.map((q, idx) => {
              const letters = [...q.passage.matchAll(/\{\{([a-z])\}\}/g)].map((m) => m[1]);
              return (
                <div
                  key={q.id || idx}
                  className="bg-white text-slate-950 p-6 sm:p-8 rounded-2xl shadow-md border border-slate-300 font-serif"
                >
                  {/* Paper Header */}
                  <div className="border-b-2 border-slate-900 pb-3 mb-4 font-sans">
                    <div className="flex justify-between items-center text-xs font-bold uppercase tracking-wider text-slate-800">
                      <span>HSC English 1st Paper Board Practice</span>
                      <span>Cloze Test With Clues</span>
                    </div>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1.5 text-xs text-slate-700 mt-3">
                      <span>Name: __________________________________________</span>
                      <span>Roll: _________ &nbsp; Marks: ___ / {letters.length}</span>
                    </div>
                  </div>

                  {/* Title & Instructions */}
                  <div className="font-sans">
                    <h3 className="text-base font-extrabold text-slate-900">
                      Question {idx + 1}: {q.title}
                    </h3>
                    <p className="text-xs italic text-slate-600 mt-1 mb-3">
                      Fill in the blanks with the right form of words from the box. You may need to change the forms of some words. You may need to use one word more than once.
                    </p>
                  </div>

                  {/* Clue Words Box */}
                  <div className="border border-slate-800 p-2.5 my-3 bg-slate-50 text-center font-sans font-bold text-xs sm:text-sm text-slate-900 leading-relaxed rounded-md">
                    {q.words.join('   •   ')}
                  </div>

                  {/* Passage with blank lines */}
                  <div className="text-[14px] sm:text-[15px] leading-[2.5] text-slate-900 mt-4 text-justify font-serif">
                    {formatPassageForPrint(q.passage)}
                  </div>

                  {/* Bottom blank answers grid */}
                  <div className="mt-8 pt-4 border-t border-dashed border-slate-400 font-sans text-xs">
                    <div className="font-bold text-slate-800 mb-2">Candidate Answers:</div>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                      {letters.map((l) => (
                        <div key={l} className="border-b border-slate-800 py-1 font-mono text-[11px]">
                          ({l}) _________________
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Answer Key Preview */}
            {includeAnswerKey && (
              <div className="bg-white text-slate-950 p-6 sm:p-8 rounded-2xl shadow-md border border-slate-300 font-sans">
                <div className="border-b-2 border-slate-900 pb-3 mb-4">
                  <h3 className="text-base font-extrabold uppercase tracking-wider text-slate-900">
                    Official Answer Key Sheet
                  </h3>
                  <div className="text-xs text-slate-600">HSC Cloze Lab Solutions</div>
                </div>

                <div className="space-y-4">
                  {questions.map((q, idx) => (
                    <div key={q.id || idx} className="p-3 border border-slate-200 rounded-xl bg-slate-50">
                      <div className="font-bold text-xs sm:text-sm text-slate-900 mb-2">
                        Set {idx + 1}: {q.title}
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 text-xs">
                        {q.answers.map((ans, aIdx) => (
                          <div key={aIdx} className="bg-white px-2 py-1 rounded border border-slate-200">
                            <span className="font-bold text-indigo-700">({String.fromCharCode(97 + aIdx)})</span>{' '}
                            <span className="text-slate-800 font-medium">{ans}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
