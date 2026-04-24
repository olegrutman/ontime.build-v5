import { useState, useMemo } from 'react';
import type { ScopeFlow, FlowContext } from '@/types/scopeQA';

export function useQuestionFlow(flow: ScopeFlow, ctx: FlowContext) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});

  const currentQuestion = flow.questions[currentIdx];
  const isComplete = currentIdx >= flow.questions.length;
  const progress = currentIdx / flow.questions.length;

  function answer(questionId: string, value: string | string[]) {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
    setCurrentIdx(prev => prev + 1);
  }

  function back() {
    if (currentIdx > 0) setCurrentIdx(prev => prev - 1);
  }

  function editAnswer(questionId: string) {
    const idx = flow.questions.findIndex(q => q.id === questionId);
    if (idx >= 0) setCurrentIdx(idx);
  }

  function reset() {
    setCurrentIdx(0);
    setAnswers({});
  }

  function finish() {
    setCurrentIdx(flow.questions.length);
  }

  const description = useMemo(
    () => (isComplete ? flow.summarize(ctx, answers) : ''),
    [isComplete, flow, ctx, answers]
  );

  return {
    currentQuestion,
    currentIdx,
    totalQuestions: flow.questions.length,
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
