import { useBoltGuide } from '@/hooks/useBoltGuide';
import { BoltSpotlight } from './BoltSpotlight';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ChevronLeft, ChevronRight, X, HelpCircle, Zap } from 'lucide-react';

// Emoji-based poses as placeholder
const POSE_EMOJI: Record<string, string> = {
  wave: '👋',
  point: '👉',
  thumbsup: '👍',
  thinking: '🤔',
  celebrate: '🎉',
  hardhat: '👷',
};

export function BoltGuide() {
  const {
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
  } = useBoltGuide();

  if (!isDemoMode) return null;

  return (
    <>
      {/* Spotlight overlay */}
      {isOpen && currentStep?.targetSelector && (
        <BoltSpotlight targetSelector={currentStep.targetSelector} />
      )}

      {/* Floating button */}
      <button
        onClick={isOpen ? toggleOpen : startTour}
        className="fixed bottom-20 right-4 z-[70] w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:scale-110 transition-transform"
        aria-label="Bolt Guide"
      >
        <Zap className="w-6 h-6" />
      </button>

      {/* Guide Panel */}
      {isOpen && currentStep && (
        <Card className="fixed bottom-36 right-4 z-[70] w-80 shadow-xl animate-slide-up">
          <CardContent className="p-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{POSE_EMOJI[currentStep.pose] || '⚡'}</span>
                <span className="text-xs font-medium text-muted-foreground">
                  Step {stepIndex + 1} of {totalSteps}
                </span>
              </div>
              <button onClick={skipTour} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Progress bar */}
            <div className="w-full h-1 bg-muted rounded-full mb-3">
              <div
                className="h-1 bg-primary rounded-full transition-all"
                style={{ width: `${((stepIndex + 1) / totalSteps) * 100}%` }}
              />
            </div>

            {/* Instruction */}
            <p className="text-sm font-medium mb-2">{currentStep.instruction}</p>

            {/* Show me why */}
            {!showExplanation && (
              <button
                onClick={() => setShowExplanation(true)}
                className="text-xs text-primary flex items-center gap-1 mb-3 hover:underline"
              >
                <HelpCircle className="w-3 h-3" /> Show me why
              </button>
            )}
            {showExplanation && (
              <p className="text-xs text-muted-foreground mb-3 p-2 bg-muted/30 rounded">
                {currentStep.explanation}
              </p>
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="sm" onClick={prevStep} disabled={isFirstStep} className="h-8">
                <ChevronLeft className="w-4 h-4 mr-1" /> Back
              </Button>
              <Button variant="ghost" size="sm" onClick={skipTour} className="h-8 text-muted-foreground">
                Skip
              </Button>
              <Button size="sm" onClick={nextStep} className="h-8">
                {isLastStep ? 'Finish' : 'Next'} {!isLastStep && <ChevronRight className="w-4 h-4 ml-1" />}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}
