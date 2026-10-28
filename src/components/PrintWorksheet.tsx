import React from 'react';
import { ClozeQuestion } from '../types';

interface PrintWorksheetProps {
  questions: ClozeQuestion[];
  includeAnswerKey: boolean;
}

export const PrintWorksheet: React.FC<PrintWorksheetProps> = ({
  questions,
  includeAnswerKey,
}) => {
  return (
    <div id="print-area">
      {questions.map((q, idx) => {
        const letters = [...q.passage.matchAll(/\{\{([a-z])\}\}/g)].map((m) => m[1]);
        const formattedPassage = q.passage.replace(
          /\{\{([a-z])\}\}/g,
          (_, l) => ` (${l}) ____________ `
        );

        return (
          <div key={q.id || idx} className="print-page font-serif">
            {/* Exam Header */}
            <div className="border-b-2 border-black pb-3 mb-4">
              <div className="flex justify-between items-center text-xs font-sans uppercase font-bold tracking-wider">
                <span>HSC English Examination Practice</span>
                <span>Question 4/5: Cloze Test with Clues</span>
              </div>
              <div className="flex justify-between items-center text-xs font-sans mt-3">
                <span>Name: _____________________________________</span>
                <span>Roll: _________ &nbsp; Marks: ___ / {letters.length}</span>
              </div>
            </div>

            {/* Title & Instructions */}
            <h2 className="text-lg font-bold font-sans mt-3 text-black">
              {idx + 1}. {q.title}
            </h2>
            <p className="text-xs font-sans italic text-gray-700 mt-1 mb-3">
              Fill in the blanks with the right form of words from the box. You may need to change the forms of some words. You may need to use one word more than once.
            </p>

            {/* Clue Words Box */}
            <div className="border border-black p-2.5 my-3 bg-gray-50 text-center font-sans font-bold text-sm leading-loose">
              {q.words.join('   •   ')}
            </div>

            {/* Reading Passage */}
            <div className="text-base leading-[2.6] text-black mt-4 text-justify font-serif">
              {formattedPassage}
            </div>

            {/* Bottom blank answers grid */}
            <div className="mt-8 pt-4 border-t border-dashed border-gray-400 font-sans text-xs">
              <div className="font-bold mb-2">Answers:</div>
              <div className="grid grid-cols-5 gap-2">
                {letters.map((l) => (
                  <div key={l} className="border-b border-black py-1">
                    ({l}) _________________
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })}

      {/* Optional Answer Key Section */}
      {includeAnswerKey && (
        <div className="print-page font-sans">
          <div className="border-b-2 border-black pb-3 mb-6">
            <h2 className="text-xl font-bold uppercase tracking-wider text-black">
              Answer Key Sheet
            </h2>
            <div className="text-xs text-gray-600">HSC Cloze Lab Practice Solutions</div>
          </div>

          <div className="space-y-6">
            {questions.map((q, idx) => (
              <div key={q.id || idx} className="p-3 border border-gray-300 rounded-lg">
                <div className="font-bold text-sm text-black mb-2">
                  {idx + 1}. {q.title}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                  {q.answers.map((ans, aIdx) => (
                    <div key={aIdx} className="bg-gray-100 p-1.5 rounded">
                      <span className="font-bold">({String.fromCharCode(97 + aIdx)})</span>{' '}
                      {ans}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
