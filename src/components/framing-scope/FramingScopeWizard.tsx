import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { useFramingScope } from '@/hooks/useFramingScope';
import { SECTIONS, type FramingBuildingType, type FramingScopeAnswers } from '@/types/framingScope';
import { MaterialBanner } from './controls/MaterialBanner';
import { ScopeSummaryPanel } from './ScopeSummaryPanel';
import { ScopeDocument } from './ScopeDocument';
import { MethodSection } from './sections/MethodSection';
import { StructureSection } from './sections/StructureSection';
import { SheathingSection } from './sections/SheathingSection';
import { ExteriorSection } from './sections/ExteriorSection';
import { SidingSection } from './sections/SidingSection';
import { OpeningsSection } from './sections/OpeningsSection';
import { BlockingSection } from './sections/BlockingSection';
import { FireSection } from './sections/FireSection';
import { HardwareSection } from './sections/HardwareSection';
import { DryinSection } from './sections/DryinSection';
import { CleanupSection } from './sections/CleanupSection';
import { DT } from '@/lib/design-tokens';
import { Button } from '@/components/ui/button';
import { Check, ChevronLeft, ChevronRight, ClipboardList, Loader2, FileText, Package } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useIsMobile } from '@/hooks/use-mobile';
import { Drawer, DrawerContent, DrawerTitle } from '@/components/ui/drawer';

interface Props {
  projectId: string;
  buildingType?: FramingBuildingType;
  projectName?: string;
  embedded?: boolean;
  onComplete?: () => void;
}

/* ── Count included / excluded from answers ────────────────────────── */
function countScope(a: FramingScopeAnswers) {
  let inc = 0, exc = 0;
  const check = (v: string | null | undefined) => {
    if (v === 'yes') inc++;
    else if (v === 'no') exc++;
  };
  // structure
  check(a.structure.wood_stairs); check(a.structure.elevator_shaft);
  check(a.structure.enclosed_corridors); check(a.structure.balconies);
  check(a.structure.tuck_under_garages);
  // sheathing
  check(a.sheathing.wall_sheathing_install || (a.sheathing.wall_sheathing_type ? 'yes' : null));
  check(a.sheathing.roof_sheathing); check(a.sheathing.roof_underlayment);
  // exterior
  check(a.exterior.rough_fascia); check(a.exterior.finished_fascia); check(a.exterior.finished_soffit);
  // siding
  check(a.siding.siding_in_scope);
  // blocking
  check(a.blocking.backout);
  // fire
  check(a.fire.fire_blocking); check(a.fire.demising_walls);
  // hardware
  check(a.hardware.structural_connectors);
  // cleanup
  check(a.cleanup.daily_cleanup);
  return { inc, exc };
}

/* ── Nav group definitions ─────────────────────────────────────────── */
const NAV_GROUPS = [
  { label: 'SETUP', sections: [0, 1] },
  { label: 'SCOPE', sections: [2, 3, 4, 5, 6, 7, 8, 9] },
  { label: 'SCOPE CLOSEOUT', sections: [10] },
];

const BUILDING_LABELS: Record<string, string> = {
  SFR: 'Single Family',
  TOWNHOMES: 'Townhomes',
  MULTI_FAMILY: 'Multifamily',
  HOTEL: 'Hotel / Hospitality',
  COMMERCIAL: 'Commercial',
};

export function FramingScopeWizard({ projectId, buildingType = 'SFR', projectName, embedded = false, onComplete }: Props) {
  const {
    answers, setAnswer, currentSection, goToSection,
    scopeComplete, markComplete, editScope,
    isLoading, hasLoaded, isSaving, hasExistingRecord,
  } = useFramingScope(projectId);

  const [started, setStarted] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [showDocument, setShowDocument] = useState(false);
  const isMobile = useIsMobile();

  const matResp = answers.method.material_responsibility;
  const { inc, exc } = useMemo(() => countScope(answers), [answers]);

  // Loading
  if (isLoading || !hasLoaded) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  // Completed scope — in embedded mode, notify parent
  if (scopeComplete && embedded) {
    // Auto-call onComplete if provided
    if (onComplete) {
      onComplete();
    }
    return (
      <div className="max-w-3xl mx-auto p-6 w-full space-y-4">
        <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-md px-4 py-3 text-sm text-emerald-800">
          <Check className="w-4 h-4" />
          Framing scope is complete. Proceed to the next phase.
        </div>
        <Button variant="outline" size="sm" onClick={editScope}>
          Edit scope
        </Button>
      </div>
    );
  }

  // Completed scope — show document (standalone mode)
  if (scopeComplete) {
    return (
      <div className="flex flex-col h-full min-h-[calc(100vh-200px)]">
        <WizardHeader projectName={projectName} buildingType={buildingType} inc={inc} exc={exc} />
        <div className="max-w-3xl mx-auto p-6 w-full">
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-md px-4 py-2 text-sm text-amber-800 mb-4">
            Editing scope after contract execution may require a change order — confirm with GC before saving.
          </div>
          <Button variant="outline" size="sm" onClick={editScope} className="mb-6">
            Edit scope
          </Button>
          <ScopeDocument answers={answers} matResp={matResp} projectName={projectName} buildingType={buildingType} inc={inc} exc={exc} />
        </div>
      </div>
    );
  }

  // First visit — landing (skip in embedded mode, auto-start)
  if (!started && !hasExistingRecord) {
    if (embedded) {
      setStarted(true);
    } else {
      return (
        <div className="flex flex-col items-center justify-center py-16 px-6 text-center max-w-md mx-auto">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <ClipboardList className="w-7 h-7 text-primary" />
          </div>
          <h2 className="font-heading text-xl font-bold" style={DT.heading}>
            Framing Scope Setup
          </h2>
          <p className="text-sm text-muted-foreground mt-2 mb-6">
            Define what is and isn't included in your rough framing subcontract.
            This wizard generates a Division 06100 Scope of Work document.
          </p>
          <Button onClick={() => setStarted(true)} className="px-8">
            Start scope setup
          </Button>
          <button
            onClick={() => {/* skip for now */}}
            className="text-xs text-muted-foreground underline mt-3 hover:text-foreground"
          >
            Skip for now
          </button>
        </div>
      );
    }
  }

  // Resumed — auto-start
  if (!started && hasExistingRecord) {
    setStarted(true);
  }

  const sectionProps = { answers, setAnswer, buildingType, matResp };

  const renderSection = () => {
    if (showDocument) {
      return <ScopeDocument answers={answers} matResp={matResp} projectName={projectName} buildingType={buildingType} inc={inc} exc={exc} />;
    }
    switch (currentSection) {
      case 0: return <MethodSection {...sectionProps} />;
      case 1: return <StructureSection {...sectionProps} />;
      case 2: return <SheathingSection {...sectionProps} />;
      case 3: return <ExteriorSection {...sectionProps} />;
      case 4: return <SidingSection {...sectionProps} />;
      case 5: return <OpeningsSection {...sectionProps} />;
      case 6: return <BlockingSection {...sectionProps} />;
      case 7: return <FireSection {...sectionProps} />;
      case 8: return <HardwareSection {...sectionProps} />;
      case 9: return <DryinSection {...sectionProps} />;
      case 10: return <CleanupSection {...sectionProps} />;
      default: return null;
    }
  };

  const isLast = currentSection === SECTIONS.length - 1;

  return (
    <div className="flex flex-col h-full min-h-[calc(100vh-200px)]">
      {/* Header bar */}
      <WizardHeader projectName={projectName} buildingType={buildingType} inc={inc} exc={exc} />

      <div className="flex flex-1 overflow-hidden">
        {/* Left nav — desktop */}
        {!isMobile && (
          <div className="w-[200px] shrink-0 border-r border-border overflow-y-auto bg-muted/10">
            {NAV_GROUPS.map((group) => (
              <div key={group.label} className="mb-1">
                <p className="text-[9px] font-bold uppercase tracking-[0.5px] text-muted-foreground px-3 pt-3 pb-1">
                  {group.label}
                </p>
                {group.sections.map((i) => {
                  const s = SECTIONS[i];
                  const isActive = !showDocument && i === currentSection;
                  return (
                    <button
                      key={s.id}
                      onClick={() => { setShowDocument(false); goToSection(i); }}
                      className={cn(
                        'flex items-center gap-2 w-full text-left px-3 py-1.5 text-xs transition-all',
                        isActive
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'
                      )}
                    >
                      <div className={cn(
                        'w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0',
                        i < currentSection ? 'bg-emerald-500 text-white' : isActive ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                      )}>
                        {i < currentSection ? <Check className="w-2.5 h-2.5" /> : Number(s.id)}
                      </div>
                      <span className="truncate">{s.label}</span>
                    </button>
                  );
                })}
              </div>
            ))}
            {/* Scope document nav item */}
            <div className="border-t border-border mt-1 pt-1">
              <button
                onClick={() => setShowDocument(true)}
                className={cn(
                  'flex items-center gap-2 w-full text-left px-3 py-2 text-xs transition-all',
                  showDocument
                    ? 'bg-amber-500/15 text-amber-700 font-medium'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'
                )}
              >
                <FileText className="w-4 h-4 shrink-0" />
                <span>Scope document</span>
              </button>
            </div>
          </div>
        )}

        {/* Center content */}
        <div className="flex-1 overflow-y-auto">
          {/* Mobile progress */}
          {isMobile && (
            <div className="px-4 py-2 border-b border-border flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {showDocument ? 'Scope Document' : `Section ${currentSection + 1} of ${SECTIONS.length}`}
              </span>
              <button onClick={() => setSummaryOpen(true)} className="text-xs text-primary font-medium">Preview scope</button>
            </div>
          )}

          {/* Resume banner */}
          {hasExistingRecord && !showDocument && (
            <div className="px-6 pt-3">
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-md px-3 py-1.5 text-xs text-blue-800">
                Scope in progress — {currentSection + 1} of {SECTIONS.length} sections
              </div>
            </div>
          )}

          <div className="max-w-[680px] mx-auto px-6 py-4">
            {!showDocument && currentSection > 0 && (
              <MaterialBanner matResp={matResp} onEdit={() => goToSection(0)} />
            )}

            {renderSection()}

            {/* Navigation — only when not showing document */}
            {!showDocument && (
              <div className="flex items-center justify-between mt-8 pt-4 border-t border-border">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={currentSection === 0}
                  onClick={() => goToSection(currentSection - 1)}
                >
                  <ChevronLeft className="w-4 h-4 mr-1" /> Back
                </Button>

                <div className="flex items-center gap-2">
                  {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />}
                  {isLast ? (
                    <Button size="sm" onClick={markComplete}>
                      Complete & Generate Document
                    </Button>
                  ) : (
                    <Button size="sm" onClick={() => goToSection(currentSection + 1)}>
                      Next <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right summary — desktop */}
        {!isMobile && (
          <div className="w-[240px] shrink-0 border-l border-border overflow-y-auto bg-muted/10 p-3">
            <ScopeSummaryPanel answers={answers} matResp={matResp} />
          </div>
        )}

        {/* Mobile summary drawer */}
        {isMobile && (
          <Drawer open={summaryOpen} onOpenChange={setSummaryOpen}>
            <DrawerContent>
              <DrawerTitle className="sr-only">Scope Summary</DrawerTitle>
              <div className="p-4 pb-8 max-h-[70vh] overflow-y-auto">
                <ScopeSummaryPanel answers={answers} matResp={matResp} />
              </div>
            </DrawerContent>
          </Drawer>
        )}
      </div>
    </div>
  );
}

/* ── Header bar sub-component ──────────────────────────────────────── */
function WizardHeader({ projectName, buildingType, inc, exc }: {
  projectName?: string; buildingType?: string; inc: number; exc: number;
}) {
  return (
    <div className="border-b border-border bg-card px-4 py-3 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <Package className="w-4 h-4 text-primary" />
        </div>
        <div className="min-w-0">
          <h2 className="font-heading text-sm font-bold truncate" style={DT.heading}>
            Framing Scope{projectName ? ` — ${projectName}` : ''}
          </h2>
          <p className="text-[10px] text-muted-foreground" style={DT.mono}>
            Rough carpentry · {BUILDING_LABELS[buildingType || 'SFR'] || buildingType}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {inc > 0 && (
          <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-emerald-500/15 text-emerald-700 border border-emerald-500/30">
            {inc} included
          </span>
        )}
        {exc > 0 && (
          <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-red-500/10 text-red-600 border border-red-400/30">
            {exc} excluded
          </span>
        )}
      </div>
    </div>
  );
}
