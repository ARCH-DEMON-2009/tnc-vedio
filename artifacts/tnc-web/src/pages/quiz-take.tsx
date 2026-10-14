import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, Link } from "wouter";
import { useGetQuiz, getGetQuizQueryKey } from "@/lib/api-client";
import { markQuizCompleted } from "@/lib/streak";
import {
  ArrowLeft, ArrowRight, Clock, CheckCircle2, XCircle, Circle,
  Trophy, RotateCcw, Brain, AlertTriangle, BookOpen, Target
} from "lucide-react";
import Layout from "@/components/Layout";
import { motion, AnimatePresence } from "framer-motion";

type Phase = "loading" | "ready" | "active" | "results";

interface ResultData {
  score: number;
  correct: number;
  wrong: number;
  unattempted: number;
  percentage: number;
}

function formatTime(secs: number) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function stripHtml(html: string) {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

const OPTION_KEYS = ["A", "B", "C", "D"] as const;
type OptionKey = typeof OPTION_KEYS[number];

export default function QuizTakePage() {
  const { examId } = useParams<{ examId: string }>();

  const { data: quiz, isLoading, isError } = useGetQuiz(examId ?? "", {
    query: { queryKey: getGetQuizQueryKey(examId ?? "") },
  });

  const [phase, setPhase] = useState<Phase>("ready");
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [results, setResults] = useState<ResultData | null>(null);
  const [showExplanation, setShowExplanation] = useState<Record<string, boolean>>({});
  const answersRef = useRef(answers);

  useEffect(() => { answersRef.current = answers; }, [answers]);

  const questions = quiz?.questions ?? [];
  const durationSeconds = parseInt(quiz?.durationMinutes ?? "60") * 60;

  const submitQuiz = useCallback(() => {
    const currentAnswers = answersRef.current;
    let score = 0;
    let correct = 0;
    let wrong = 0;
    let unattempted = 0;
    const marksPerQuestion = questions.length > 0 ? (quiz?.maxMarks ?? 0) / questions.length : 0;

    for (const q of questions) {
      const selected = currentAnswers[q.rowId];
      if (!selected) {
        unattempted++;
        continue;
      }
      if (selected.toUpperCase() === q.correctAnswer.toUpperCase()) {
        score += marksPerQuestion;
        correct++;
      } else {
        score -= (quiz?.negativeMarks ?? 0.25);
        wrong++;
      }
    }

    const percentage = questions.length > 0
      ? Math.round((correct / questions.length) * 100)
      : 0;

    setResults({ score, correct, wrong, unattempted, percentage });
    markQuizCompleted(examId ?? "");
    setPhase("results");
  }, [questions, quiz?.maxMarks, quiz?.negativeMarks, examId]);

  // Timer
  useEffect(() => {
    if (phase !== "active") return;
    setTimeLeft(durationSeconds);

    const interval = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(interval);
          submitQuiz();
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [phase]);

  const handleAnswer = (rowId: string, option: string) => {
    setAnswers((prev) => ({ ...prev, [rowId]: option }));
  };

  const handleStart = () => {
    setPhase("active");
    setCurrentIdx(0);
    setAnswers({});
    setResults(null);
  };

  const handleRetry = () => {
    setPhase("ready");
    setCurrentIdx(0);
    setAnswers({});
    setResults(null);
    setShowExplanation({});
  };

  const currentQ = questions[currentIdx];
  const attemptedCount = Object.keys(answers).length;
  const timerWarning = timeLeft < 60 && phase === "active";

  if (isLoading) {
    return (
      <Layout>
        <div className="max-w-3xl mx-auto px-4 py-8">
          <div className="h-8 skeleton rounded w-1/2 mb-6" />
          <div className="h-64 skeleton rounded-2xl mb-4" />
          <div className="space-y-3">
            {[1,2,3,4].map(i => <div key={i} className="h-14 skeleton rounded-xl" />)}
          </div>
        </div>
      </Layout>
    );
  }

  if (isError || !quiz) {
    return (
      <Layout>
        <div className="text-center py-20">
          <AlertTriangle size={48} className="mx-auto text-gray-200 mb-3" />
          <p className="text-gray-500 font-medium">Quiz not found</p>
          <Link href="/quiz" className="text-blue-600 text-sm mt-2 inline-block">Back to quizzes</Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-3xl mx-auto px-4 py-6">
        <Link href="/quiz" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-5 w-fit">
          <ArrowLeft size={14} /> Back to quizzes
        </Link>

        {/* READY SCREEN */}
        {phase === "ready" && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="tnc-brand-gradient p-6 text-white">
                <div className="flex items-center gap-3 mb-1">
                  <Brain size={28} />
                  <h1 className="text-xl font-black leading-tight">{quiz.name}</h1>
                </div>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                  <div className="bg-blue-50 rounded-xl p-3 text-center">
                    <p className="text-2xl font-black text-blue-700">{questions.length}</p>
                    <p className="text-xs text-blue-500 mt-0.5">Questions</p>
                  </div>
                  <div className="bg-green-50 rounded-xl p-3 text-center">
                    <p className="text-2xl font-black text-green-700">{quiz.maxMarks}</p>
                    <p className="text-xs text-green-500 mt-0.5">Max Marks</p>
                  </div>
                  <div className="bg-red-50 rounded-xl p-3 text-center">
                    <p className="text-2xl font-black text-red-700">−{quiz.negativeMarks}</p>
                    <p className="text-xs text-red-500 mt-0.5">Per Wrong</p>
                  </div>
                  <div className="bg-amber-50 rounded-xl p-3 text-center">
                    <p className="text-2xl font-black text-amber-700">{quiz.durationMinutes}m</p>
                    <p className="text-xs text-amber-500 mt-0.5">Duration</p>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-xl p-4 mb-6 space-y-2">
                  <p className="text-sm font-semibold text-gray-700 mb-2">Instructions:</p>
                  <div className="flex items-start gap-2 text-sm text-gray-600">
                    <CheckCircle2 size={14} className="text-green-500 mt-0.5 shrink-0" />
                    Each correct answer awards +1 mark
                  </div>
                  <div className="flex items-start gap-2 text-sm text-gray-600">
                    <XCircle size={14} className="text-red-500 mt-0.5 shrink-0" />
                    Each wrong answer deducts {quiz.negativeMarks} marks
                  </div>
                  <div className="flex items-start gap-2 text-sm text-gray-600">
                    <Circle size={14} className="text-gray-400 mt-0.5 shrink-0" />
                    Unattempted questions carry no penalty
                  </div>
                  <div className="flex items-start gap-2 text-sm text-gray-600">
                    <Clock size={14} className="text-amber-500 mt-0.5 shrink-0" />
                    Quiz auto-submits when time runs out
                  </div>
                </div>

                {questions.length === 0 ? (
                  <div className="text-center py-4 text-gray-500 text-sm">
                    <AlertTriangle size={28} className="mx-auto text-gray-300 mb-2" />
                    Questions are loading… try again in a moment.
                  </div>
                ) : (
                  <button
                    onClick={handleStart}
                    className="w-full py-3.5 rounded-xl tnc-brand-gradient text-white font-bold text-base hover:opacity-90 transition-opacity"
                  >
                    Start Quiz
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* ACTIVE QUIZ SCREEN */}
        {phase === "active" && currentQ && (
          <div className="space-y-4">
            {/* Header bar */}
            <div className="bg-white rounded-2xl border border-gray-100 p-3 flex items-center justify-between">
              <div className="text-sm text-gray-500">
                <span className="font-bold text-gray-900">{currentIdx + 1}</span> / {questions.length}
                <span className="ml-3 text-xs text-green-600 font-medium">{attemptedCount} answered</span>
              </div>
              <div className={`flex items-center gap-1.5 font-mono text-sm font-bold px-3 py-1.5 rounded-lg ${timerWarning ? "bg-red-100 text-red-700 animate-pulse" : "bg-blue-50 text-blue-700"}`}>
                <Clock size={14} />
                {formatTime(timeLeft)}
              </div>
            </div>

            {/* Progress bar */}
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <motion.div
                className="h-full tnc-brand-gradient"
                initial={{ width: 0 }}
                animate={{ width: `${((currentIdx + 1) / questions.length) * 100}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>

            {/* Question */}
            <AnimatePresence mode="wait">
              <motion.div
                key={currentQ.rowId}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                <div className="bg-white rounded-2xl border border-gray-100 p-5">
                  <p className="text-xs text-gray-400 mb-2 font-medium">
                    Q{currentIdx + 1}{currentQ.questionNo ? ` (#${currentQ.questionNo})` : ""}
                  </p>
                  <p className="text-base font-semibold text-gray-900 leading-relaxed mb-5">
                    {currentQ.questionText}
                  </p>

                  <div className="space-y-2.5">
                    {OPTION_KEYS.map((key) => {
                      const text = currentQ[`option${key}` as keyof typeof currentQ] as string;
                      if (!text) return null;
                      const selected = answers[currentQ.rowId] === key;
                      return (
                        <button
                          key={key}
                          onClick={() => handleAnswer(currentQ.rowId, key)}
                          className={`w-full text-left flex items-start gap-3 px-4 py-3 rounded-xl border-2 transition-all text-sm font-medium ${
                            selected
                              ? "border-blue-500 bg-blue-50 text-blue-800"
                              : "border-gray-200 hover:border-blue-300 hover:bg-blue-50/50 text-gray-700"
                          }`}
                        >
                          <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${
                            selected ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-600"
                          }`}>
                            {key}
                          </span>
                          <span className="leading-relaxed">{text}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Navigation */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}
                disabled={currentIdx === 0}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ArrowLeft size={15} /> Previous
              </button>

              {currentIdx < questions.length - 1 ? (
                <button
                  onClick={() => setCurrentIdx((i) => i + 1)}
                  className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  Next <ArrowRight size={15} />
                </button>
              ) : (
                <button
                  onClick={submitQuiz}
                  className="flex-1 py-2.5 rounded-xl tnc-brand-gradient text-white text-sm font-bold hover:opacity-90 transition-opacity"
                >
                  Submit Quiz
                </button>
              )}
            </div>

            {/* Question navigator dots */}
            <div className="bg-white rounded-2xl border border-gray-100 p-4">
              <p className="text-xs text-gray-500 font-medium mb-3">Jump to question</p>
              <div className="flex flex-wrap gap-1.5">
                {questions.map((q, i) => (
                  <button
                    key={q.rowId}
                    onClick={() => setCurrentIdx(i)}
                    className={`w-8 h-8 rounded-lg text-xs font-semibold transition-all ${
                      i === currentIdx
                        ? "bg-blue-600 text-white"
                        : answers[q.rowId]
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-100 inline-block" /> Answered</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-gray-100 inline-block" /> Unanswered</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-600 inline-block" /> Current</span>
              </div>
            </div>
          </div>
        )}

        {/* RESULTS SCREEN */}
        {phase === "results" && results && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="space-y-5">
              {/* Score card */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="tnc-brand-gradient p-6 text-white text-center">
                  <Trophy size={36} className="mx-auto mb-2 opacity-90" />
                  <p className="text-4xl font-black">{results.score.toFixed(2)}</p>
                  <p className="text-white/70 text-sm mt-1">out of {quiz.maxMarks} marks</p>
                  <div className="mt-3 inline-flex items-center gap-2 bg-white/20 rounded-full px-4 py-1.5">
                    <Target size={14} />
                    <span className="font-bold">{results.percentage}% accuracy</span>
                  </div>
                </div>
                <div className="p-5">
                  <div className="grid grid-cols-3 gap-3 mb-5">
                    <div className="bg-green-50 rounded-xl p-3 text-center">
                      <p className="text-xl font-black text-green-700">{results.correct}</p>
                      <p className="text-xs text-green-500">Correct</p>
                    </div>
                    <div className="bg-red-50 rounded-xl p-3 text-center">
                      <p className="text-xl font-black text-red-700">{results.wrong}</p>
                      <p className="text-xs text-red-500">Wrong</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3 text-center">
                      <p className="text-xl font-black text-gray-500">{results.unattempted}</p>
                      <p className="text-xs text-gray-400">Skipped</p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={handleRetry}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-blue-600 text-blue-600 text-sm font-semibold hover:bg-blue-50 transition-colors"
                    >
                      <RotateCcw size={15} /> Retry
                    </button>
                    <Link href="/quiz" className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl tnc-brand-gradient text-white text-sm font-semibold hover:opacity-90 transition-opacity">
                      <BookOpen size={15} /> More Quizzes
                    </Link>
                  </div>
                </div>
              </div>

              {/* Question review */}
              <h2 className="text-base font-bold text-gray-700 px-1">Answer Review</h2>
              {questions.map((q, i) => {
                const selected = answers[q.rowId];
                const correct = q.correctAnswer.toUpperCase();
                const isCorrect = selected?.toUpperCase() === correct;
                const isWrong = selected && !isCorrect;
                const showExp = showExplanation[q.rowId];

                return (
                  <div
                    key={q.rowId}
                    className={`bg-white rounded-2xl border p-4 ${
                      isCorrect ? "border-green-200" : isWrong ? "border-red-200" : "border-gray-100"
                    }`}
                  >
                    <div className="flex items-start gap-2 mb-3">
                      <span className={`shrink-0 mt-0.5 ${isCorrect ? "text-green-500" : isWrong ? "text-red-500" : "text-gray-300"}`}>
                        {isCorrect ? <CheckCircle2 size={18} /> : isWrong ? <XCircle size={18} /> : <Circle size={18} />}
                      </span>
                      <p className="text-sm font-semibold text-gray-900 leading-relaxed">
                        <span className="text-gray-400 mr-1 font-normal">Q{i + 1}.</span>
                        {q.questionText}
                      </p>
                    </div>

                    <div className="pl-6 space-y-1.5 mb-3">
                      {OPTION_KEYS.map((key) => {
                        const text = q[`option${key}` as keyof typeof q] as string;
                        if (!text) return null;
                        const isCorrectOption = key === correct;
                        const isSelectedWrong = key === selected?.toUpperCase() && !isCorrectOption;
                        return (
                          <div
                            key={key}
                            className={`flex items-start gap-2 text-sm px-3 py-2 rounded-lg ${
                              isCorrectOption
                                ? "bg-green-50 text-green-800 font-semibold"
                                : isSelectedWrong
                                  ? "bg-red-50 text-red-700 line-through"
                                  : "text-gray-500"
                            }`}
                          >
                            <span className={`w-5 h-5 rounded text-xs font-bold flex items-center justify-center shrink-0 ${
                              isCorrectOption ? "bg-green-500 text-white" : isSelectedWrong ? "bg-red-400 text-white" : "bg-gray-100"
                            }`}>
                              {key}
                            </span>
                            {text}
                          </div>
                        );
                      })}
                    </div>

                    {q.explanation && (
                      <div className="pl-6">
                        <button
                          onClick={() => setShowExplanation((p) => ({ ...p, [q.rowId]: !p[q.rowId] }))}
                          className="text-xs text-blue-600 font-medium hover:underline"
                        >
                          {showExp ? "Hide" : "Show"} explanation
                        </button>
                        {showExp && (
                          <div className="mt-2 bg-blue-50 rounded-xl p-3 text-xs text-blue-800 leading-relaxed">
                            {stripHtml(q.explanation)}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </div>
    </Layout>
  );
}
