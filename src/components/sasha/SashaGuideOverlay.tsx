import { useEffect, useId, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, HelpCircle, RotateCcw, Volume2, VolumeX, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GuideSpotlightMask, useGuideTarget } from './SashaGuideSpotlight';
import { useSashaVoice } from '@/hooks/useSashaVoice';
import sashaAvatar from '@/assets/sasha-avatar.png';
import type { SashaGuideDefinition, SashaGuideStep } from '@/types/sashaGuide';

interface SashaGuideOverlayProps {
  guide: SashaGuideDefinition;
  step: SashaGuideStep | null;
  stepIndex: number;
  totalSteps: number;
  isComplete: boolean;
  onNext: () => void;
  onPrevious: () => void;
  onStop: () => void;
  onFinish: () => void;
  onRestart: () => void;
}

export function SashaGuideOverlay({
  guide,
  step,
  stepIndex,
  totalSteps,
  isComplete,
  onNext,
  onPrevious,
  onStop,
  onFinish,
  onRestart,
}: SashaGuideOverlayProps) {
  const maskId = `sasha-guide-${useId().replace(/:/g, '')}`;
  const rect = useGuideTarget(step?.targetSelector, !isComplete);
  const { speak, stop: stopSpeaking, isSpeaking, isPreparing } = useSashaVoice();
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [showWhy, setShowWhy] = useState(false);

  useEffect(() => setShowWhy(false), [step?.id]);

  useEffect(() => {
    if (!voiceEnabled) return;
    const text = isComplete ? guide.completion : step ? `${step.title}. ${step.instruction}` : '';
    if (text) void speak(text);
  }, [voiceEnabled, isComplete, guide.completion, step?.id, speak]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return;
      // Let an open material picker, photo preview, or other modal consume Escape first.
      if (document.querySelector('[role="dialog"]:not([aria-modal="false"])')) return;
      onStop();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onStop]);

  const cardStyle = useMemo(() => {
    if (!rect || typeof window === 'undefined' || window.innerWidth < 640 || isComplete) return undefined;
    const cardWidth = 384;
    const cardHeight = 310;
    const left = Math.max(16, Math.min(
      rect.right + 18 + cardWidth < window.innerWidth ? rect.right + 18 : rect.left,
      window.innerWidth - cardWidth - 16,
    ));
    const top = Math.max(16, rect.bottom + cardHeight + 18 < window.innerHeight ? rect.bottom + 18 : rect.top - cardHeight - 18);
    return { left, top, width: cardWidth };
  }, [rect, isComplete]);

  const isLast = stepIndex >= totalSteps - 1;

  return (
    <div className="pointer-events-none fixed inset-0 z-[80]" data-sasha-guide-ui>
      {rect && !isComplete && <GuideSpotlightMask rect={rect} maskId={maskId} />}

      <section
        role="dialog"
        aria-modal="false"
        aria-label={isComplete ? `${guide.title} complete` : `Sasha guide: ${step?.title ?? guide.title}`}
        className="pointer-events-auto fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom,0px)+6.5rem)] overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-2xl sm:inset-x-auto sm:bottom-auto sm:w-96"
        style={cardStyle ?? (isComplete && typeof window !== 'undefined' && window.innerWidth >= 640 ? { right: 24, top: 80, width: 384 } : undefined)}
      >
        <div className="flex items-center gap-3 border-b border-border bg-primary px-4 py-3 text-primary-foreground">
          <img src={sashaAvatar} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover ring-2 ring-white/30" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">Sasha · {guide.title}</p>
            <p className="text-[11px] text-primary-foreground/75">
              {isComplete ? 'Guide complete' : `Step ${stepIndex + 1} of ${totalSteps}`}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0 text-primary-foreground hover:bg-white/15 hover:text-primary-foreground"
            onClick={() => {
              if (voiceEnabled) stopSpeaking();
              setVoiceEnabled((enabled) => !enabled);
            }}
            aria-label={voiceEnabled ? 'Turn off guide narration' : 'Hear guide narration'}
            title={voiceEnabled ? 'Turn off narration' : 'Hear narration'}
          >
            {voiceEnabled ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0 text-primary-foreground hover:bg-white/15 hover:text-primary-foreground"
            onClick={onStop}
            aria-label="Exit guide"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="h-1 bg-muted">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${isComplete ? 100 : ((stepIndex + 1) / totalSteps) * 100}%` }}
          />
        </div>

        <div className="max-h-[45dvh] space-y-3 overflow-y-auto p-4 sm:max-h-none">
          {isComplete ? (
            <>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-state-approved-bg text-state-approved">
                <Check className="h-5 w-5" />
              </div>
              <h2 className="font-heading text-2xl font-semibold">You’re ready for the next step</h2>
              <p className="text-sm leading-relaxed text-muted-foreground">{guide.completion}</p>
            </>
          ) : step ? (
            <>
              <h2 className="font-heading text-2xl font-semibold">{step.title}</h2>
              <p className="text-sm leading-relaxed text-foreground">{step.instruction}</p>
              {step.targetSelector && !rect && (
                <p className="rounded-lg bg-state-open-bg px-3 py-2 text-xs leading-relaxed text-state-open-foreground">
                  This control is not visible yet. Wait for the page to load, or use Back or Next to continue safely.
                </p>
              )}
              {step.explanation && (
                <button
                  type="button"
                  className="flex items-center gap-1.5 text-xs font-medium text-primary"
                  onClick={() => setShowWhy((shown) => !shown)}
                  aria-expanded={showWhy}
                >
                  <HelpCircle className="h-3.5 w-3.5" />
                  {showWhy ? 'Hide explanation' : 'Why this step?'}
                </button>
              )}
              {showWhy && step.explanation && (
                <p className="rounded-lg bg-muted/50 p-3 text-xs leading-relaxed text-muted-foreground">{step.explanation}</p>
              )}
              {(isSpeaking || isPreparing) && <p className="text-xs text-muted-foreground">Sasha is narrating this step…</p>}
            </>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-border px-4 py-3">
          {isComplete ? (
            <>
              <Button variant="outline" size="sm" onClick={onRestart} className="gap-1.5">
                <RotateCcw className="h-3.5 w-3.5" /> Replay
              </Button>
              <Button size="sm" onClick={onFinish} className="ml-auto gap-1.5">
                Done <Check className="h-3.5 w-3.5" />
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={onPrevious} disabled={stepIndex === 0} className="gap-1 px-2">
                <ArrowLeft className="h-4 w-4" /> Back
              </Button>
              <Button variant="ghost" size="sm" onClick={onStop} className="text-muted-foreground">Exit</Button>
              <Button size="sm" onClick={onNext} className="ml-auto gap-1.5">
                {isLast ? 'Finish' : 'Next'} {isLast ? <Check className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
              </Button>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
