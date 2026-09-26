// ============================================================================
// File: client/src/components/QuizModal.tsx
// Active Recall Interactive Quiz Modal with Node Feedback
// ============================================================================
import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import {
  X,
  Sparkles,
  CheckCircle2,
  XCircle,
  ArrowRight,
  RotateCcw,
  Trophy,
  Brain,
  HelpCircle,
  Loader2,
} from 'lucide-react';
import { api } from '../services/api';
import type { QuizRecord, QuizQuestion } from '../../../shared/schema';

interface QuizModalProps {
  mapId: string;
  mapTitle: string;
  isOpen: boolean;
  onClose: () => void;
  onSelectNodeRef?: (nodeId: string) => void;
}

export const QuizModal: React.FC<QuizModalProps> = ({
  mapId,
  mapTitle,
  isOpen,
  onClose,
  onSelectNodeRef,
}) => {
  const [loading, setLoading] = useState(true);
  const [quiz, setQuiz] = useState<QuizRecord | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [score, setScore] = useState(0);
  const [isFinished, setIsFinished] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadOrGenerateQuiz();
    } else {
      // Reset
      setCurrentIndex(0);
      setSelectedOption(null);
      setShowExplanation(false);
      setScore(0);
      setIsFinished(false);
    }
  }, [isOpen, mapId]);

  const loadOrGenerateQuiz = async () => {
    try {
      setLoading(true);
      // Try fetching existing quiz
      const existing = await api.getQuiz(mapId);
      if (existing && existing.questions?.length > 0) {
        setQuiz(existing);
      } else {
        // Generate new quiz
        const generated = await api.generateQuiz(mapId, 5);
        setQuiz(generated);
      }
    } catch (err) {
      console.error('Quiz load error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const questions: QuizQuestion[] = quiz?.questions || [];
  const currentQ = questions[currentIndex];

  const handleSelectOption = (idx: number) => {
    if (showExplanation) return; // Already answered
    setSelectedOption(idx);
    setShowExplanation(true);

    if (idx === currentQ.correct_index) {
      setScore((s) => s + 1);
    }
  };

  const handleNext = () => {
    if (currentIndex + 1 < questions.length) {
      setCurrentIndex(currentIndex + 1);
      setSelectedOption(null);
      setShowExplanation(false);
    } else {
      setIsFinished(true);
      if (score >= questions.length - 1) {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      }
    }
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setSelectedOption(null);
    setShowExplanation(false);
    setScore(0);
    setIsFinished(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
      <div className="relative w-full max-w-2xl rounded-3xl border border-slate-800 bg-slate-950 p-6 sm:p-8 shadow-2xl overflow-hidden">
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-4 mb-6">
          <div className="flex items-center space-x-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Brain className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Active Recall Assessment</h3>
              <p className="text-xs text-slate-400 truncate max-w-sm">{mapTitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-900 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-16 space-y-3">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
            <p className="text-sm font-semibold text-slate-200">
              Synthesizing 5 Active Recall Practice Questions...
            </p>
            <p className="text-xs text-slate-500">Grounded in visual concept nodes & lecture formulas</p>
          </div>
        )}

        {/* Finished State */}
        {!loading && isFinished && (
          <div className="flex flex-col items-center text-center py-8 space-y-5">
            <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-tr from-amber-500/20 to-emerald-500/20 text-amber-400 border border-amber-500/30">
              <Trophy className="h-10 w-10 text-amber-400" />
            </div>
            <div>
              <h4 className="text-2xl font-black text-white">Assessment Complete!</h4>
              <p className="mt-1 text-sm text-slate-400">
                You scored <span className="font-bold text-emerald-400">{score}</span> out of{' '}
                <span className="font-bold text-white">{questions.length}</span>
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 max-w-md w-full text-xs text-slate-300">
              {score === questions.length ? (
                <p className="text-emerald-300 font-semibold">
                  🌟 Outstanding! You demonstrated 100% active recall comprehension of this lecture's core architecture.
                </p>
              ) : score >= 3 ? (
                <p className="text-indigo-300 font-semibold">
                  👍 Strong grasp! Review the flagged nodes in the Source Drawer to cement remaining edge cases.
                </p>
              ) : (
                <p className="text-amber-300 font-semibold">
                  💡 Study Recommendation: Inspect the highlighted slide citations in the Source Drawer before retaking.
                </p>
              )}
            </div>

            <div className="flex items-center space-x-3 pt-2">
              <button
                onClick={handleRestart}
                className="inline-flex items-center space-x-2 rounded-xl border border-slate-800 bg-slate-900 px-5 py-2.5 text-xs font-semibold text-slate-200 hover:bg-slate-800 transition-colors"
              >
                <RotateCcw className="h-4 w-4" />
                <span>Retake Quiz</span>
              </button>
              <button
                onClick={onClose}
                className="inline-flex items-center space-x-2 rounded-xl bg-indigo-600 px-6 py-2.5 text-xs font-bold text-white hover:bg-indigo-500 transition-colors"
              >
                <span>Back to Knowledge Map</span>
              </button>
            </div>
          </div>
        )}

        {/* Active Question State */}
        {!loading && !isFinished && currentQ && (
          <div className="space-y-6">
            {/* Progress Bar & Counter */}
            <div>
              <div className="flex items-center justify-between text-xs font-semibold text-slate-400 mb-2">
                <span>
                  Question {currentIndex + 1} of {questions.length}
                </span>
                <span className="text-emerald-400">Score: {score}</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-indigo-500 transition-all duration-300"
                  style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
                />
              </div>
            </div>

            {/* Question Text */}
            <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5">
              <div className="flex items-center space-x-2 text-xs font-bold text-indigo-400 uppercase tracking-wider mb-2">
                <HelpCircle className="h-3.5 w-3.5" />
                <span>Concept Node Check</span>
                {currentQ.node_ref && (
                  <span className="rounded bg-indigo-500/20 px-2 py-0.5 text-[10px] text-indigo-300 border border-indigo-500/30">
                    Node: {currentQ.node_ref}
                  </span>
                )}
              </div>
              <h4 className="text-base font-bold text-white leading-snug">{currentQ.question}</h4>
            </div>

            {/* Multiple Choice Options */}
            <div className="space-y-2.5">
              {currentQ.options.map((option, idx) => {
                const isSelected = selectedOption === idx;
                const isCorrect = idx === currentQ.correct_index;

                let btnStyles = 'border-slate-800 bg-slate-900/50 text-slate-200 hover:border-slate-700 hover:bg-slate-900';
                if (showExplanation) {
                  if (isCorrect) {
                    btnStyles = 'border-emerald-500/60 bg-emerald-950/40 text-emerald-200 font-semibold shadow-md shadow-emerald-500/10';
                  } else if (isSelected) {
                    btnStyles = 'border-rose-500/60 bg-rose-950/40 text-rose-200';
                  } else {
                    btnStyles = 'border-slate-800/40 bg-slate-950 text-slate-500 opacity-60';
                  }
                }

                return (
                  <button
                    key={idx}
                    onClick={() => handleSelectOption(idx)}
                    disabled={showExplanation}
                    className={`w-full flex items-start space-x-3 rounded-xl border p-4 text-left text-xs transition-all ${btnStyles}`}
                  >
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-800 text-[11px] font-bold text-slate-400 flex-shrink-0">
                      {String.fromCharCode(65 + idx)}
                    </span>
                    <span className="flex-1 leading-relaxed text-[12.5px]">{option}</span>
                    {showExplanation && isCorrect && (
                      <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                    )}
                    {showExplanation && isSelected && !isCorrect && (
                      <XCircle className="h-4 w-4 text-rose-400 flex-shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Instant Feedback Card */}
            {showExplanation && (
              <div className="rounded-xl border border-indigo-500/30 bg-indigo-950/20 p-4 animate-in fade-in">
                <span className="text-xs font-bold text-indigo-300 uppercase tracking-wider block mb-1">
                  Active Recall Explanation
                </span>
                <p className="text-xs text-slate-300 leading-relaxed">{currentQ.explanation}</p>
                {currentQ.node_ref && onSelectNodeRef && (
                  <button
                    onClick={() => onSelectNodeRef(currentQ.node_ref!)}
                    className="mt-2 text-xs text-indigo-400 hover:text-indigo-300 underline inline-flex items-center space-x-1"
                  >
                    <span>Highlight {currentQ.node_ref} in Source Drawer</span>
                    <ArrowRight className="h-3 w-3" />
                  </button>
                )}
              </div>
            )}

            {/* Next Button */}
            {showExplanation && (
              <div className="flex justify-end pt-2">
                <button
                  onClick={handleNext}
                  className="inline-flex items-center space-x-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-6 py-2.5 text-xs font-bold text-white shadow-lg shadow-emerald-500/20 hover:from-emerald-600 transition-all"
                >
                  <span>
                    {currentIndex + 1 === questions.length ? 'See Final Score' : 'Next Question'}
                  </span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
