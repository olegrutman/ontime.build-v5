import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useFramingScope } from '@/hooks/useFramingScope';
import { SECTIONS, type FramingBuildingType, type MaterialResponsibility } from '@/types/framingScope';
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
import { Check, ChevronLeft, ChevronRight, ClipboardList, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useIsMobile } from '@/hooks/use-mobile';
import { Drawer, DrawerContent, DrawerTitle } from '@/components/ui/drawer';

interface Props {
  projectId: string;
  buildingType?: FramingBuildingType;
  projectName?: string;
}

export function FramingScopeWizard({ projectId, buildingType = 'SFR', projectName }: Props) {
  const {
    answers, setAnswer, currentSection, goToSection,
    scopeComplete, markComplete, editScope,
    isLoading, hasLoaded, isSaving, hasExistingRecord,
  } = useFramingScope(projectId);

  const [started, setStarted] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const isMobile = useIsMobile();

  const matResp = answers.method.material_responsibility;

  // Show loading
  if (isLoading || !hasLoaded) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  // Completed scope — show document
  if (scopeComplete) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-md px-4 py-2 text-sm text-amber-800 mb-4">
          Editing scope after contract execution may require a change order — confirm with GC before saving.
        </div>
        <Button variant="outline" size="sm" onClick={editScope} className="mb-6">
          Edit scope
        </Button>
        <ScopeDocument answers={answers} matResp={matResp} projectName={projectName} buildingType={buildingType} />
      </div>
    );
  }

  // First visit — landing
  if (!started && !hasExistingRecord) {
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

  // Resumed — auto-start
  if (!started && hasExistingRecord) {
    setStarted(true);
  }

  const sectionProps = { answers, setAnswer, buildingType, matResp };

  const renderSection = () => {
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
    <div className="flex h-full min-h-[calc(100vh-200px)]">
      {/* Left nav — desktop only */}
      {!isMobile && (
        <div className="w-[200px] shrink-0 border-r border-border p-3 overflow-y-auto">
          <p className={cn(DT.sectionHeader, 'mb-3')}>Sections</p>
          {SECTIONS.map((s, i) => (
            <button
              key={s.id}
              onClick={() => goToSection(i)}
              className={cn(
                'flex items-center gap-2 w-full text-left px-2 py-1.5 rounded-md text-xs transition-all mb-0.5',
                i === currentSection
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'
              )}
            >
              <div className={cn(
                'w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0',
                i < currentSection ? 'bg-emerald-500 text-white' : i === currentSection ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              )}>
                {i < currentSection ? <Check className="w-2.5 h-2.5" /> : s.id}
              </div>
              <span className="truncate">{s.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Center content */}
      <div className="flex-1 overflow-y-auto">
        {/* Mobile progress */}
        {isMobile && (
          <div className="px-4 py-2 border-b border-border flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Section {currentSection + 1} of {SECTIONS.length}</span>
            <button onClick={() => setSummaryOpen(true)} className="text-xs text-primary font-medium">Preview scope</button>
          </div>
        )}

        {/* Resume banner */}
        {hasExistingRecord && (
          <div className="px-6 pt-3">
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-md px-3 py-1.5 text-xs text-blue-800">
              Scope in progress — {currentSection + 1} of {SECTIONS.length} sections
            </div>
          </div>
        )}

        <div className="max-w-[680px] mx-auto px-6 py-4">
          {currentSection > 0 && (
            <MaterialBanner matResp={matResp} onEdit={() => goToSection(0)} />
          )}

          {renderSection()}

          {/* Navigation */}
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
        </div>
      </div>

      {/* Right summary — desktop only */}
      {!isMobile && (
        <div className="w-[240px] shrink-0 border-l border-border p-3 overflow-y-auto bg-muted/20">
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
  );
}
