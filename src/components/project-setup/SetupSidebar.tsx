import { cn } from '@/lib/utils';
import { Check, Building2, ClipboardList, FileText, DollarSign, Lock } from 'lucide-react';
import { DT } from '@/lib/design-tokens';

export type SetupPhase = 'building' | 'scope' | 'contracts' | 'sov';

interface PhaseStep {
  id: string;
  label: string;
}

interface PhaseDef {
  key: SetupPhase;
  label: string;
  icon: React.ElementType;
  steps: PhaseStep[];
}

const PHASES: PhaseDef[] = [
  {
    key: 'building',
    label: 'Project & Building',
    icon: Building2,
    steps: [
      { id: 'basics', label: 'Project Basics' },
      { id: 'team', label: 'Team Setup' },
      { id: 'profile', label: 'Building Profile' },
    ],
  },
  {
    key: 'scope',
    label: 'Framing Scope',
    icon: ClipboardList,
    steps: [
      { id: 'method', label: 'Method & Materials' },
      { id: 'structure', label: 'Building Features' },
      { id: 'sheathing', label: 'Sheathing & WRB' },
      { id: 'exterior', label: 'Fascia & Soffit' },
      { id: 'siding', label: 'Siding' },
      { id: 'openings', label: 'Openings' },
      { id: 'blocking', label: 'Blocking' },
      { id: 'fire', label: 'Fire & Smoke' },
      { id: 'hardware', label: 'Hardware' },
      { id: 'dryin', label: 'Dry-in' },
      { id: 'cleanup', label: 'Cleanup' },
    ],
  },
  {
    key: 'contracts',
    label: 'Contracts',
    icon: FileText,
    steps: [
      { id: 'upstream', label: 'GC Contract' },
      { id: 'downstream', label: 'FC Contracts' },
    ],
  },
  {
    key: 'sov',
    label: 'SOV & Finish',
    icon: DollarSign,
    steps: [
      { id: 'generate', label: 'Generate SOV' },
      { id: 'review', label: 'Review & Lock' },
    ],
  },
];

export interface SetupProgress {
  buildingComplete: boolean;
  scopeComplete: boolean;
  contractsComplete: boolean;
  sovComplete: boolean;
}

interface SetupSidebarProps {
  currentPhase: SetupPhase;
  currentStep?: string;
  progress: SetupProgress;
  onPhaseSelect: (phase: SetupPhase) => void;
}

export function SetupSidebar({ currentPhase, currentStep, progress, onPhaseSelect }: SetupSidebarProps) {
  const isPhaseComplete = (key: SetupPhase) => {
    switch (key) {
      case 'building': return progress.buildingComplete;
      case 'scope': return progress.scopeComplete;
      case 'contracts': return progress.contractsComplete;
      case 'sov': return progress.sovComplete;
    }
  };

  const isPhaseUnlocked = (key: SetupPhase) => {
    switch (key) {
      case 'building': return true;
      case 'scope': return progress.buildingComplete;
      case 'contracts': return progress.scopeComplete;
      case 'sov': return progress.contractsComplete;
    }
  };

  return (
    <div className="w-[220px] shrink-0 border-r border-border overflow-y-auto bg-muted/10 hidden md:block">
      <div className="px-3 pt-4 pb-2">
        <p className="font-heading text-[10px] font-bold uppercase tracking-[0.5px] text-muted-foreground">
          Project Setup
        </p>
      </div>

      {PHASES.map((phase, pi) => {
        const complete = isPhaseComplete(phase.key);
        const unlocked = isPhaseUnlocked(phase.key);
        const isActive = currentPhase === phase.key;
        const Icon = phase.icon;

        return (
          <div key={phase.key} className="mb-0.5">
            <button
              onClick={() => unlocked && onPhaseSelect(phase.key)}
              disabled={!unlocked}
              className={cn(
                'flex items-center gap-2 w-full text-left px-3 py-2 text-xs transition-all',
                isActive
                  ? 'bg-primary/10 text-primary font-semibold'
                  : unlocked
                    ? 'text-foreground hover:bg-muted/30'
                    : 'text-muted-foreground/50 cursor-not-allowed',
              )}
            >
              <div className={cn(
                'w-5 h-5 rounded-full flex items-center justify-center shrink-0',
                complete
                  ? 'bg-emerald-500 text-white'
                  : isActive
                    ? 'bg-primary text-primary-foreground'
                    : !unlocked
                      ? 'bg-muted/50 text-muted-foreground/50'
                      : 'bg-muted text-muted-foreground',
              )}>
                {complete ? (
                  <Check className="w-3 h-3" />
                ) : !unlocked ? (
                  <Lock className="w-2.5 h-2.5" />
                ) : (
                  <Icon className="w-3 h-3" />
                )}
              </div>
              <span className="truncate">{phase.label}</span>
            </button>

            {/* Sub-steps visible when active */}
            {isActive && unlocked && (
              <div className="ml-5 border-l border-border/50">
                {phase.steps.map((step) => {
                  const isStepActive = currentStep === step.id;
                  return (
                    <div
                      key={step.id}
                      className={cn(
                        'pl-3 py-1 text-[10px] transition-colors',
                        isStepActive
                          ? 'text-primary font-medium'
                          : 'text-muted-foreground',
                      )}
                    >
                      {step.label}
                    </div>
                  );
                })}
              </div>
            )}

            {pi < PHASES.length - 1 && (
              <div className="flex justify-center my-0.5">
                <div className={cn(
                  'w-px h-3',
                  complete ? 'bg-emerald-400' : 'bg-border',
                )} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
