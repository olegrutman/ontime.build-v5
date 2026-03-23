import { useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useDemo } from '@/contexts/DemoContext';
import { BOLT_SCRIPTS, type BoltStep } from '@/data/boltScripts';

export function useBoltGuide() {
  const { isDemoMode, demoRole, demoProjectId } = useDemo();
  const navigate = useNavigate();
  const [stepIndex, setStepIndex] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);

  const steps: BoltStep[] = demoRole ? BOLT_SCRIPTS[demoRole] : [];
  const currentStep = steps[stepIndex] || null;
  const totalSteps = steps.length;
  const isFirstStep = stepIndex === 0;
  const isLastStep = stepIndex >= totalSteps - 1;

  const navigateToStep = useCallback((step: BoltStep) => {
    if (step.targetTab && demoProjectId) {
      navigate(`/project/${demoProjectId}/${step.targetTab}?demo=true`);
    }
  }, [navigate, demoProjectId]);

  const nextStep = useCallback(() => {
    setShowExplanation(false);
    if (isLastStep) {
      setIsOpen(false);
      return;
    }
    const next = stepIndex + 1;
    setStepIndex(next);
    if (steps[next]) navigateToStep(steps[next]);
  }, [stepIndex, isLastStep, steps, navigateToStep]);

  const prevStep = useCallback(() => {
    setShowExplanation(false);
    if (stepIndex > 0) {
      const prev = stepIndex - 1;
      setStepIndex(prev);
      if (steps[prev]) navigateToStep(steps[prev]);
    }
  }, [stepIndex, steps, navigateToStep]);

  const skipTour = useCallback(() => {
    setIsOpen(false);
    setStepIndex(0);
    setShowExplanation(false);
  }, []);

  const startTour = useCallback(() => {
    setStepIndex(0);
    setIsOpen(true);
    setShowExplanation(false);
    if (steps[0]) navigateToStep(steps[0]);
  }, [steps, navigateToStep]);

  const toggleOpen = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []);

  return {
    isDemoMode,
    isOpen,
    toggleOpen,
    currentStep,
    stepIndex,
    totalSteps,
    isFirstStep,
    isLastStep,
    nextStep,
    prevStep,
    skipTour,
    startTour,
    showExplanation,
    setShowExplanation,
  };
}
