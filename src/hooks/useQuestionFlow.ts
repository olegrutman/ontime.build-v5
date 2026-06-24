import { useState, useMemo, useCallback } from 'react';
import type { ScopeFlow, FlowContext } from '@/types/scopeQA';

export interface QuestionFlowSeed {
  /** Pre-set answers (e.g. seeded from the location component picked in Step 2) */
  initialAnswers?: Record<string, string | string[]>;
  /** Starting question index (defaults to 0). Use to skip pre-answered questions. */
  startIndex?: number;
}

export function useQuestionFlow(flow: ScopeFlow, ctx: FlowContext, seed?: QuestionFlowSeed) {
  // Helper: is the question at index `i` visible under current ctx?
  const isVisible = useCallback(
    (i: number) => {
      const q = flow.questions[i];
      if (!q) return false;
      return q.showFor ? q.showFor(ctx) : true;
    },
    [flow, ctx],
  );

  // Helper: walk forward from `from` (inclusive) until we hit a visible
  // question or run off the end of the flow.
  const nextVisible = useCallback(
    (from: number) => {
      let i = from;
      while (i < flow.questions.length && !isVisible(i)) i += 1;
      return i;
    },
    [flow, isVisible],
  );

  // Helper: walk backward from `from` (inclusive) until we hit a visible
  // question. Returns 0 if none found (clamped).
  const prevVisible = useCallback(
    (from: number) => {
      let i = from;
      while (i > 0 && !isVisible(i)) i -= 1;
      return i;
    },
    [flow, isVisible],
  );

  const [currentIdx, setCurrentIdx] = useState(() => nextVisible(seed?.startIndex ?? 0));
  const [answers, setAnswers] = useState<Record<string, string | string[]>>(
    seed?.initialAnswers ?? {}
  );

  const currentQuestion = flow.questions[currentIdx];
  const isComplete = currentIdx >= flow.questions.length;
  const progress = currentIdx / flow.questions.length;

  function answer(questionId: string, value: string | string[]) {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
    setCurrentIdx(prev => nextVisible(prev + 1));
  }

  function back() {
    if (currentIdx > 0) setCurrentIdx(prev => prevVisible(prev - 1));
  }

  function editAnswer(questionId: string) {
    const idx = flow.questions.findIndex(q => q.id === questionId);
    if (idx >= 0 && isVisible(idx)) setCurrentIdx(idx);
  }

  function reset() {
    setCurrentIdx(nextVisible(0));
    setAnswers({});
  }

  function finish() {
    setCurrentIdx(flow.questions.length);
  }

  const description = useMemo(
    () => (isComplete ? flow.summarize(ctx, answers) : ''),
    [isComplete, flow, ctx, answers]
  );

  // Visible-question count (drives accurate progress UI).
  const totalQuestions = useMemo(
    () => flow.questions.reduce((n, _q, i) => n + (isVisible(i) ? 1 : 0), 0),
    [flow, isVisible],
  );

  return {
    currentQuestion,
    currentIdx,
    totalQuestions,
    isComplete,
    progress,
    answers,
    description,
    answer,
    back,
    editAnswer,
    reset,
    finish,
  };
}
