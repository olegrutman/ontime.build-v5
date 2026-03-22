import { useState, useCallback, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Building2, Home, Castle, Factory, Store, Layers, Check, ChevronRight, ChevronLeft, Minus, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  WIZARD_STEPS, FOUNDATION_OPTIONS, ROOF_OPTIONS,
  GARAGE_TYPE_OPTIONS, BASEMENT_TYPE_OPTIONS, STAIR_TYPE_OPTIONS,
  getSmartDefaults, checkItemFeature,
  type ProfileDraft, type ProjectType,
} from '@/types/projectProfile';
import { useProjectTypes, useProjectProfile, useSaveProjectProfile } from '@/hooks/useProjectProfile';
import { useScopeSections, useScopeItems, filterSections, filterItems } from '@/hooks/useScopeWizard';

const TYPE_ICONS: Record<string, typeof Building2> = {
  apartment: Building2, townhome: Home, custom_home: Castle,
  production_home: Factory, commercial: Store, mixed_use: Layers,
};
const TYPE_DESCRIPTIONS: Record<string, string> = {
  apartment: 'Multi-unit · 3–10+ stories',
  townhome: 'Attached · 2–3 stories',
  custom_home: 'Single family · any style',
  production_home: 'Tract · repeated plans',
  commercial: 'Office, retail, mixed-use',
  mixed_use: 'Residential + commercial',
};

function emptyDraft(projectId: string): ProfileDraft {
  return {
    project_id: projectId,
    project_type_id: '',
    stories: 2,
    units_per_building: null,
    number_of_buildings: 1,
    foundation_types: [],
    roof_type: null,
    has_garage: false, garage_types: [],
    has_basement: false, basement_type: null,
    has_stairs: false, stair_types: [],
    has_deck_balcony: false, has_pool: false, has_elevator: false,
    has_clubhouse: false, has_commercial_spaces: false, has_shed: false,
    is_complete: false,
  };
}

/* ─── Progress Bar ─────────────────────────────────────────── */
function ProgressBar({ step, onNav, onClose }: { step: number; onNav: (s: number) => void; onClose: () => void }) {
  return (
    <div className="sticky top-0 z-30 bg-card border-b px-4 py-3">
      <div className="flex items-center gap-1 sm:gap-2 max-w-3xl mx-auto">
        <button onClick={onClose} className="mr-2 p-1.5 rounded-md hover:bg-muted transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center" aria-label="Exit wizard">
          <X className="w-5 h-5 text-muted-foreground" />
        </button>
        {WIZARD_STEPS.map((label, i) => {
          const done = i < step;
          const active = i === step;
          return (
            <button
              key={i}
              disabled={i > step}
              onClick={() => i < step && onNav(i)}
              className={cn(
                'flex items-center gap-1.5 text-xs font-medium transition-colors min-h-[44px] px-1',
                done && 'text-green-600 cursor-pointer',
                active && 'text-primary font-bold',
                !done && !active && 'text-muted-foreground',
                i > step && 'opacity-40 cursor-not-allowed',
              )}
            >
              <span className={cn(
                'w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0',
                done && 'bg-green-600 text-white',
                active && 'bg-secondary text-secondary-foreground',
                !done && !active && 'bg-muted/30 text-muted-foreground',
              )}>
                {done ? <Check className="w-3.5 h-3.5" /> : i + 1}
              </span>
              <span className="hidden sm:inline">{label}</span>
              {i < WIZARD_STEPS.length - 1 && <ChevronRight className="w-3 h-3 text-muted-foreground hidden sm:block" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Chip selector ────────────────────────────────────────── */
function ChipSelect({ options, selected, onToggle, multi = false }: {
  options: readonly string[];
  selected: string | string[] | null;
  onToggle: (val: string) => void;
  multi?: boolean;
}) {
  const isSelected = (o: string) =>
    multi ? (Array.isArray(selected) && selected.includes(o)) : selected === o;
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(o => (
        <button
          key={o}
          type="button"
          onClick={() => onToggle(o)}
          className={cn(
            'px-3 py-2 rounded-lg text-sm font-medium border min-h-[44px] transition-all',
            isSelected(o)
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-card text-foreground border-border hover:border-primary/50',
          )}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

/* ─── Toggle row ───────────────────────────────────────────── */
function ToggleRow({ label, subtitle, checked, onChange, children }: {
  label: string;
  subtitle?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  children?: React.ReactNode;
}) {
  return (
    <Collapsible open={checked}>
      <div className="flex items-center justify-between py-3 min-h-[56px]">
        <div>
          <p className="font-medium text-sm">{label}</p>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        <Switch checked={checked} onCheckedChange={onChange} />
      </div>
      {children && (
        <CollapsibleContent className="pb-4 pl-1">
          {children}
        </CollapsibleContent>
      )}
    </Collapsible>
  );
}

/* ─── Main wizard ──────────────────────────────────────────── */
export default function ProjectDetailsWizard() {
  const { id: projectId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const { data: projectTypes = [] } = useProjectTypes();
  const { data: existingProfile } = useProjectProfile(projectId);
  const saveMutation = useSaveProjectProfile(projectId!);

  const { data: allSections = [] } = useScopeSections();
  const { data: allItems = [] } = useScopeItems();

  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<ProfileDraft>(() => {
    if (existingProfile) return { ...existingProfile } as ProfileDraft;
    return emptyDraft(projectId!);
  });
  const [defaultsApplied, setDefaultsApplied] = useState(false);

  // Keep draft in sync with loaded profile
  useEffect(() => {
    if (existingProfile && !draft.project_type_id) {
      setDraft({ ...existingProfile } as ProfileDraft);
    }
  }, [existingProfile]);

  const selectedType = useMemo(
    () => projectTypes.find(t => t.id === draft.project_type_id),
    [projectTypes, draft.project_type_id],
  );

  const update = useCallback(<K extends keyof ProfileDraft>(key: K, val: ProfileDraft[K]) => {
    setDraft(prev => ({ ...prev, [key]: val }));
  }, []);

  const toggleArray = useCallback((key: 'foundation_types' | 'garage_types' | 'stair_types', val: string) => {
    setDraft(prev => {
      const arr = prev[key] as string[];
      return { ...prev, [key]: arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val] };
    });
  }, []);

  const selectType = useCallback((pt: ProjectType) => {
    const defaults = getSmartDefaults(pt.slug);
    setDraft(prev => ({
      ...prev,
      ...defaults,
      project_type_id: pt.id,
      project_id: projectId!,
    }));
    setDefaultsApplied(true);
    setTimeout(() => setDefaultsApplied(false), 3000);
  }, [projectId]);

  const canAdvance = useMemo(() => {
    if (step === 0) return !!draft.project_type_id;
    if (step === 1) return draft.stories >= 1 && draft.foundation_types.length > 0;
    return true;
  }, [step, draft]);

  const handleSave = async () => {
    try {
      await saveMutation.mutateAsync({ ...draft, is_complete: true });
      toast({ title: 'Profile saved', description: 'Opening Scope Wizard...' });
      navigate(`/project/${projectId}/scope-wizard`);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  /* ── STEP RENDERERS ──────────────────────────────────────── */
  const renderStep0 = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold font-heading">What type of project is this?</h2>
        <p className="text-sm text-muted-foreground">This defines your scope sections, default items, and contract structure.</p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {projectTypes.map(pt => {
          const Icon = TYPE_ICONS[pt.slug] || Building2;
          const sel = draft.project_type_id === pt.id;
          return (
            <button
              key={pt.id}
              onClick={() => selectType(pt)}
              className={cn(
                'flex flex-col items-center gap-2 p-4 rounded-xl border-2 text-center min-h-[120px] transition-all',
                sel ? 'border-primary bg-primary/5' : 'border-border bg-card hover:border-primary/40',
              )}
            >
              <Icon className={cn('w-8 h-8', sel ? 'text-primary' : 'text-muted-foreground')} />
              <span className="font-semibold text-sm">{pt.name}</span>
              <span className="text-xs text-muted-foreground">{TYPE_DESCRIPTIONS[pt.slug]}</span>
            </button>
          );
        })}
      </div>
      {defaultsApplied && (
        <div className="flex items-center gap-2 text-xs text-primary bg-primary/10 rounded-lg px-3 py-2">
          <Check className="w-4 h-4" /> Defaults applied — you can adjust on the next pages.
        </div>
      )}
    </div>
  );

  const renderStep1 = () => {
    const showUnits = selectedType?.is_multifamily || selectedType?.slug === 'mixed_use';
    const showBuildings = selectedType?.slug === 'apartment' || selectedType?.slug === 'production_home';
    return (
      <div className="space-y-8">
        <div>
          <h2 className="text-xl font-bold font-heading">Building scale & structure</h2>
          <p className="text-sm text-muted-foreground">These numbers drive floor level options and contract scope.</p>
        </div>

        <Card><CardContent className="p-4 space-y-4">
          <Label className="font-semibold">Building Scale</Label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground">Stories</Label>
              <div className="flex items-center gap-2 mt-1">
                <Button variant="outline" size="icon" className="h-10 w-10"
                  onClick={() => update('stories', Math.max(1, draft.stories - 1))}><Minus className="w-4 h-4" /></Button>
                <Input type="number" min={1} max={20} value={draft.stories}
                  onChange={e => update('stories', Math.max(1, Math.min(20, +e.target.value)))}
                  className="w-20 text-center" />
                <Button variant="outline" size="icon" className="h-10 w-10"
                  onClick={() => update('stories', Math.min(20, draft.stories + 1))}><Plus className="w-4 h-4" /></Button>
              </div>
            </div>
            {showUnits && (
              <div>
                <Label className="text-xs text-muted-foreground">Units per building</Label>
                <Input type="number" min={1} value={draft.units_per_building ?? ''}
                  onChange={e => update('units_per_building', e.target.value ? +e.target.value : null)}
                  className="mt-1" />
              </div>
            )}
            {showBuildings && (
              <div>
                <Label className="text-xs text-muted-foreground">Number of buildings</Label>
                <Input type="number" min={1} value={draft.number_of_buildings}
                  onChange={e => update('number_of_buildings', Math.max(1, +e.target.value))}
                  className="mt-1" />
              </div>
            )}
          </div>
        </CardContent></Card>

        <Card><CardContent className="p-4 space-y-3">
          <Label className="font-semibold">Foundation Type</Label>
          <p className="text-xs text-muted-foreground">Select all that apply</p>
          <ChipSelect options={FOUNDATION_OPTIONS} selected={draft.foundation_types}
            onToggle={v => toggleArray('foundation_types', v)} multi />
        </CardContent></Card>

        <Card><CardContent className="p-4 space-y-3">
          <Label className="font-semibold">Roof Type</Label>
          <ChipSelect options={ROOF_OPTIONS} selected={draft.roof_type}
            onToggle={v => update('roof_type', draft.roof_type === v ? null : v)} />
        </CardContent></Card>
      </div>
    );
  };

  const renderStep2 = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold font-heading">Structural elements</h2>
        <p className="text-sm text-muted-foreground">Toggle each element included in this project.</p>
      </div>
      <Card><CardContent className="p-4 divide-y">
        <ToggleRow label="Garage" subtitle="Attached, detached, or tuck-under"
          checked={draft.has_garage} onChange={v => update('has_garage', v)}>
          <ChipSelect options={GARAGE_TYPE_OPTIONS} selected={draft.garage_types}
            onToggle={v => toggleArray('garage_types', v)} multi />
        </ToggleRow>
        <ToggleRow label="Basement" subtitle="Full, partial, walk-out, or daylight"
          checked={draft.has_basement} onChange={v => update('has_basement', v)}>
          <ChipSelect options={BASEMENT_TYPE_OPTIONS} selected={draft.basement_type}
            onToggle={v => update('basement_type', draft.basement_type === v ? null : v)} />
        </ToggleRow>
        <ToggleRow label="Stairs in scope" subtitle="Interior and exterior stair types"
          checked={draft.has_stairs} onChange={v => update('has_stairs', v)}>
          <ChipSelect options={STAIR_TYPE_OPTIONS} selected={draft.stair_types}
            onToggle={v => toggleArray('stair_types', v)} multi />
        </ToggleRow>
      </CardContent></Card>
    </div>
  );

  const renderStep3 = () => {
    const slug = selectedType?.slug ?? '';
    const showElevator = ['apartment', 'commercial', 'mixed_use'].includes(slug);
    const showClubhouse = ['apartment', 'mixed_use'].includes(slug);
    const showCommercial = slug === 'mixed_use';
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold font-[Barlow_Condensed]">Special features & amenities</h2>
          <p className="text-sm text-muted-foreground">Each feature unlocks a dedicated scope section.</p>
        </div>
        <Card><CardContent className="p-4 divide-y">
          <ToggleRow label="Decks & Balconies" checked={draft.has_deck_balcony}
            onChange={v => update('has_deck_balcony', v)} />
          <ToggleRow label="Pool / Spa" checked={draft.has_pool}
            onChange={v => update('has_pool', v)} />
          {showElevator && <ToggleRow label="Elevator Shaft" checked={draft.has_elevator}
            onChange={v => update('has_elevator', v)} />}
          {showClubhouse && <ToggleRow label="Clubhouse / Amenity Building" checked={draft.has_clubhouse}
            onChange={v => update('has_clubhouse', v)} />}
          {showCommercial && <ToggleRow label="Commercial / Retail Spaces" checked={draft.has_commercial_spaces}
            onChange={v => update('has_commercial_spaces', v)} />}
          <ToggleRow label="Shed / Outbuilding" checked={draft.has_shed}
            onChange={v => update('has_shed', v)} />
        </CardContent></Card>
      </div>
    );
  };

  const renderReview = () => {
    const activeSections = filterSections(allSections, draft);
    const totalSections = allSections.length;

    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold font-[Barlow_Condensed]">Project Profile</h2>
          <p className="text-sm text-muted-foreground">Review your selections. This profile locks your scope wizard contents.</p>
        </div>

        {/* Summary */}
        <Card><CardContent className="p-4 space-y-3">
          <Label className="font-semibold">Profile Summary</Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <Row label="Project Type" value={selectedType?.name ?? '—'} />
            <Row label="Stories" value={String(draft.stories)} />
            {draft.units_per_building && <Row label="Units / Building" value={String(draft.units_per_building)} />}
            {draft.number_of_buildings > 1 && <Row label="Buildings" value={String(draft.number_of_buildings)} />}
          </div>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {draft.foundation_types.map(f => <Badge key={f} className="bg-primary/15 text-primary border-0">{f}</Badge>)}
            {draft.roof_type && <Badge className="bg-primary/15 text-primary border-0">{draft.roof_type}</Badge>}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {draft.has_garage && draft.garage_types.map(g => <Badge key={g} variant="secondary">{g}</Badge>)}
            {draft.has_basement && draft.basement_type && <Badge variant="secondary">{draft.basement_type}</Badge>}
            {draft.has_stairs && draft.stair_types.map(s => <Badge key={s} variant="secondary">{s}</Badge>)}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {[
              draft.has_deck_balcony && 'Decks & Balconies',
              draft.has_pool && 'Pool / Spa',
              draft.has_elevator && 'Elevator',
              draft.has_clubhouse && 'Clubhouse',
              draft.has_commercial_spaces && 'Commercial Spaces',
              draft.has_shed && 'Shed',
            ].filter(Boolean).map(f => (
              <Badge key={f as string} className="bg-green-100 text-green-800 border-0">{f}</Badge>
            ))}
          </div>
        </CardContent></Card>

        {/* Scope sections */}
        <Card><CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <Label className="font-semibold">Scope Sections</Label>
            <span className="text-xs text-muted-foreground">{activeSections.length} of {totalSections} active</span>
          </div>
          <div className="space-y-1">
            {allSections.map(s => {
              const active = activeSections.some(a => a.id === s.id);
              const visibleItems = active ? filterItems(allItems, s.id, draft, selectedType?.slug ?? '') : [];
              const totalItems = allItems.filter(i => i.section_id === s.id).length;
              const filtered = active && visibleItems.length < totalItems;
              return (
                <div key={s.id} className="flex items-center gap-2 py-1.5">
                  <span className={cn(
                    'w-2.5 h-2.5 rounded-full shrink-0',
                    active && !filtered && 'bg-green-500',
                    active && filtered && 'bg-primary',
                    !active && 'bg-muted-foreground/30',
                  )} />
                  <span className={cn('text-sm', !active && 'text-muted-foreground')}>{s.label}</span>
                  {filtered && <span className="text-[10px] text-primary">({visibleItems.length}/{totalItems})</span>}
                </div>
              );
            })}
          </div>
        </CardContent></Card>
      </div>
    );
  };

  const steps = [renderStep0, renderStep1, renderStep2, renderStep3, renderReview];

  return (
    <div className="min-h-screen bg-background">
      <ProgressBar step={step} onNav={setStep} onClose={() => navigate(`/project/${projectId}?tab=scope-details`)} />
      <div className="max-w-2xl mx-auto px-4 py-6">
        {steps[step]()}
      </div>
      {/* Sticky footer */}
      <div className="sticky bottom-0 bg-card border-t px-4 py-3">
        <div className="max-w-2xl mx-auto flex justify-between">
          <Button variant="outline" disabled={step === 0} onClick={() => setStep(s => s - 1)}
            className="min-h-[44px]">
            <ChevronLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          {step < 4 ? (
            <Button disabled={!canAdvance} onClick={() => setStep(s => s + 1)}
              className="min-h-[44px]">
              Next <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={handleSave} disabled={saveMutation.isPending}
              className="min-h-[44px]">
              {saveMutation.isPending ? 'Saving...' : 'Save Profile & Open Scope Wizard'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
