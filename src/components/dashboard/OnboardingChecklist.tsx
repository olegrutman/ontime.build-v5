import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Circle, X, Rocket } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

interface OnboardingChecklistProps {
  profileComplete: boolean;
  orgComplete: boolean;
  teamInvited: boolean;
  projectCreated: boolean;
  onDismiss: () => void;
}

export function OnboardingChecklist({
  profileComplete,
  orgComplete,
  teamInvited,
  projectCreated,
  onDismiss,
}: OnboardingChecklistProps) {
  const navigate = useNavigate();

  const steps = [
    { label: 'Complete your profile', done: profileComplete, path: '/profile' },
    { label: 'Set up organization details', done: orgComplete, path: '/profile' },
    { label: 'Invite a team member', done: teamInvited, path: '/profile' },
    { label: 'Create your first project', done: projectCreated, path: '/create-project' },
  ];

  const completedCount = steps.filter((s) => s.done).length;
  const progress = (completedCount / steps.length) * 100;

  if (completedCount === steps.length) return null;

  return (
    <Card className="border-primary/20 bg-primary/[0.02]">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Rocket className="h-4 w-4 text-primary" />
            Get Started
          </CardTitle>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onDismiss}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <Progress value={progress} className="h-1.5 mt-2" />
        <p className="text-xs text-muted-foreground mt-1">
          {completedCount} of {steps.length} complete
        </p>
      </CardHeader>
      <CardContent className="pt-0 space-y-2">
        {steps.map((step) => (
          <button
            key={step.label}
            onClick={() => !step.done && navigate(step.path)}
            className={`flex items-center gap-3 w-full text-left rounded-md px-3 py-2 text-sm transition-colors ${
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
        ))}
      </CardContent>
    </Card>
  );
}
