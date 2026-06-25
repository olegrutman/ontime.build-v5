import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Circle, X, Rocket } from 'lucide-react';
import { SurfaceCard, SurfaceCardHeader, SurfaceCardBody } from '@/components/ui/surface-card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

interface OnboardingChecklistProps {
  profileComplete: boolean;
  orgComplete: boolean;
  teamInvited: boolean;
  projectCreated: boolean;
  orgType?: string | null;
  onDismiss: () => void;
  onMarkSoleMember?: () => void;
  onMarkPartOfTeam?: () => void;
}

export function OnboardingChecklist({
  profileComplete,
  orgComplete,
  teamInvited,
  projectCreated,
  orgType,
  onDismiss,
  onMarkSoleMember,
  onMarkPartOfTeam,
}: OnboardingChecklistProps) {
  const navigate = useNavigate();

  const isProjectOrg = orgType === 'GC' || orgType === 'TC';

  const steps = [
    { label: 'Complete your profile', done: profileComplete, path: '/profile' },
    { label: 'Set up organization details', done: orgComplete, path: '/profile' },
    { label: 'Invite a team member (optional)', done: teamInvited, path: '/profile', isSoleMemberStep: true },
    ...(isProjectOrg
      ? [{ label: 'Create or join your first project', done: projectCreated, path: '/create-project' }]
      : []),
  ];

  const completedCount = steps.filter((s) => s.done).length;
  const progress = (completedCount / steps.length) * 100;

  if (completedCount === steps.length) return null;

  return (
    <SurfaceCard data-sasha-card="Onboarding" className="border-primary/20 bg-primary/[0.02]">
      <SurfaceCardHeader
        title="Get Started"
        action={
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onDismiss}>
            <X className="h-4 w-4" />
          </Button>
        }
      >
        <Progress value={progress} className="h-1.5 mt-2" />
        <p className="text-xs text-muted-foreground mt-1">
          {completedCount} of {steps.length} complete
        </p>
      </SurfaceCardHeader>
      <SurfaceCardBody className="space-y-2">
        {steps.map((step) => (
          <div key={step.label} className="flex items-center gap-2">
            <button
              onClick={() => !step.done && navigate(step.path)}
              className={`flex items-center gap-3 flex-1 text-left rounded-xl px-3 py-2 text-sm transition-colors ${
                step.done
                  ? 'text-muted-foreground'
                  : 'hover:bg-muted cursor-pointer'
              }`}
              disabled={step.done}
            >
              {step.done ? (
                <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
              ) : (
                <Circle className="h-4 w-4 text-muted-foreground shrink-0" />
              )}
              <span className={step.done ? 'line-through' : ''}>{step.label}</span>
            </button>
            {step.isSoleMemberStep && !step.done && (
              <div className="flex items-center gap-2 pr-3">
                {onMarkPartOfTeam && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onMarkPartOfTeam(); }}
                    className="text-xs text-muted-foreground hover:text-foreground underline whitespace-nowrap"
                  >
                    I'm part of the team
                  </button>
                )}
                {onMarkSoleMember && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onMarkSoleMember(); }}
                    className="text-xs text-muted-foreground hover:text-foreground underline whitespace-nowrap"
                  >
                    I'm a sole member
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </SurfaceCardBody>
    </SurfaceCard>
  );
}
