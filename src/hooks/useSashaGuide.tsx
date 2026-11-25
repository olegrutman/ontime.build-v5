import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useDemo } from '@/contexts/DemoContext';
import { guidesForRole, resolveGuideSteps } from '@/data/sashaGuides';
import { markGuideCompleted, pathMatches, readCompletedGuides } from '@/lib/sashaGuideProgress';
import { SASHA_GUIDE_ACTION_EVENT } from '@/lib/sashaGuideActions';
import type { SashaGuideContextValue, SashaGuideDefinition, SashaGuideRole, SashaGuideStep } from '@/types/sashaGuide';
import { SashaGuideOverlay } from '@/components/sasha/SashaGuideOverlay';

const SashaGuideContext = createContext<SashaGuideContextValue | undefined>(undefined);

const ROLES: SashaGuideRole[] = ['GC', 'TC', 'FC', 'SUPPLIER'];

export function SashaGuideProvider({ children }: { children: ReactNode }) {
  const { user, userOrgRoles } = useAuth();
  const { isDemoMode, demoRole } = useDemo();
  const location = useLocation();
  const navigate = useNavigate();
  const candidateRole = isDemoMode ? demoRole : userOrgRoles[0]?.organization?.type;
  const role = ROLES.includes(candidateRole as SashaGuideRole) ? candidateRole as SashaGuideRole : null;
  const ownerId = user?.id ?? (isDemoMode ? `demo-${demoRole ?? 'guest'}` : null);
  const availableGuides = useMemo(() => guidesForRole(role), [role]);
  const currentProjectId = location.pathname.match(/^\/project\/([^/]+)/)?.[1] ?? null;

  const [activeGuide, setActiveGuide] = useState<SashaGuideDefinition | null>(null);
  const [activeSteps, setActiveSteps] = useState<SashaGuideStep[]>([]);
  const [stepIndex, setStepIndex] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [completedGuides, setCompletedGuides] = useState<string[]>(() => readCompletedGuides(ownerId));

  useEffect(() => setCompletedGuides(readCompletedGuides(ownerId)), [ownerId]);

  const stopGuide = useCallback(() => {
    setActiveGuide(null);
    setActiveSteps([]);
    setStepIndex(0);
    setIsComplete(false);
  }, []);

  useEffect(() => {
    if (activeGuide && !availableGuides.some((guide) => guide.id === activeGuide.id)) stopGuide();
  }, [activeGuide, availableGuides, stopGuide]);

  const completeGuide = useCallback(() => {
    if (!activeGuide) return;
    setCompletedGuides(markGuideCompleted(ownerId, activeGuide.id));
    setIsComplete(true);
  }, [activeGuide, ownerId]);

  const nextStep = useCallback(() => {
    if (isComplete) return;
    if (stepIndex >= activeSteps.length - 1) completeGuide();
    else setStepIndex((index) => index + 1);
  }, [activeSteps.length, completeGuide, isComplete, stepIndex]);

  const previousStep = useCallback(() => {
    setIsComplete(false);
    setStepIndex((index) => Math.max(0, index - 1));
  }, []);

  const startGuide = useCallback((guideId: string) => {
    const guide = availableGuides.find((candidate) => candidate.id === guideId);
    if (!guide) return;
    setActiveGuide(guide);
    setActiveSteps(resolveGuideSteps(guide, currentProjectId));
    setStepIndex(0);
    setIsComplete(false);
  }, [availableGuides, currentProjectId]);

  const finishGuide = useCallback(() => stopGuide(), [stopGuide]);
  const currentStep = isComplete ? null : activeSteps[stepIndex] ?? null;

  useEffect(() => {
    if (!activeGuide || !currentStep || isComplete) return;
    // A route-advancing step already satisfied by the current page must not be redirected away.
    if (currentStep.advanceOn === 'route' && pathMatches(currentStep.matchPath, location.pathname)) return;
    const destination = currentStep.route?.(currentProjectId);
    if (destination && destination !== location.pathname) navigate(destination);
  }, [activeGuide, currentStep, currentProjectId, isComplete, location.pathname, navigate]);

  useEffect(() => {
    if (!activeGuide || !currentStep || currentStep.advanceOn !== 'route') return;
    if (pathMatches(currentStep.matchPath, location.pathname)) nextStep();
  }, [activeGuide, currentStep, location.pathname, nextStep]);

  useEffect(() => {
    if (!activeGuide || !currentStep || currentStep.advanceOn !== 'action' || !currentStep.action) return;
    const expectedAction = currentStep.action;
    const onAction = (event: Event) => {
      if ((event as CustomEvent<string>).detail === expectedAction) nextStep();
    };
    window.addEventListener(SASHA_GUIDE_ACTION_EVENT, onAction);
    return () => window.removeEventListener(SASHA_GUIDE_ACTION_EVENT, onAction);
  }, [activeGuide, currentStep, nextStep]);

  useEffect(() => {
    if (!activeGuide || !currentStep || currentStep.advanceOn !== 'click' || !currentStep.targetSelector) return;
    const onClick = (event: MouseEvent) => {
      const eventTarget = event.target as HTMLElement | null;
      if (eventTarget?.closest('[data-sasha-guide-ui]')) return;
      // Any matching control counts, including copies inside phone sheets.
      if (eventTarget?.closest(currentStep.targetSelector!)) nextStep();
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [activeGuide, currentStep, nextStep]);

  const value = useMemo<SashaGuideContextValue>(() => ({
    role,
    availableGuides,
    activeGuide,
    currentStep,
    stepIndex,
    isComplete,
    startGuide,
    nextStep,
    previousStep,
    stopGuide,
    finishGuide,
    isGuideCompleted: (guideId) => completedGuides.includes(guideId),
  }), [role, availableGuides, activeGuide, currentStep, stepIndex, isComplete, startGuide, nextStep, previousStep, stopGuide, finishGuide, completedGuides]);

  return (
    <SashaGuideContext.Provider value={value}>
      {children}
      {activeGuide && (
        <SashaGuideOverlay
          guide={activeGuide}
          step={currentStep}
          stepIndex={stepIndex}
          totalSteps={activeSteps.length}
          isComplete={isComplete}
          onNext={nextStep}
          onPrevious={previousStep}
          onStop={stopGuide}
          onFinish={finishGuide}
          onRestart={() => startGuide(activeGuide.id)}
        />
      )}
    </SashaGuideContext.Provider>
  );
}

export function useSashaGuide() {
  const context = useContext(SashaGuideContext);
  if (!context) throw new Error('useSashaGuide must be used within SashaGuideProvider');
  return context;
}
