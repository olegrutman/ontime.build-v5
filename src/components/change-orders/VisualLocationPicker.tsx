import { useState, useMemo } from 'react';
import { Home, Trees, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { useProjectProfile } from '@/hooks/useProjectProfile';
import {
  useProjectScope,
  getLevelOptions,
  getAreaOptionsForLevel,
  getUnitRoomOptions,
  getElevationOptions,
  getProjectContextHint,
} from '@/hooks/useProjectScope';
import { getComponentGroups } from '@/lib/buildingComponents';

interface VisualLocationPickerProps {
  projectId: string;
  onConfirm: (tag: string) => void;
  savedLocation?: string | null;
  compact?: boolean;
}

type InsideOutside = 'inside' | 'outside' | null;

export function VisualLocationPicker({
  projectId,
  onConfirm,
  savedLocation,
  compact = false,
}: VisualLocationPickerProps) {
  const { data: profile } = useProjectProfile(projectId);
  const { data: scope } = useProjectScope(projectId);

  const [insideOutside, setInsideOutside] = useState<InsideOutside>(null);
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);
  const [selectedArea, setSelectedArea] = useState<string | null>(null);
  const [customArea, setCustomArea] = useState('');
  const [unitNumber, setUnitNumber] = useState('');
  const [roomInUnit, setRoomInUnit] = useState<string | null>(null);
  const [customRoom, setCustomRoom] = useState('');
  const [selectedElevation, setSelectedElevation] = useState<string | null>(null);
  const [customElevation, setCustomElevation] = useState('');
  const [selectedComponentGroup, setSelectedComponentGroup] = useState<string | null>(null);
  const [selectedSubComponent, setSelectedSubComponent] = useState<string | null>(null);
  const [customComponent, setCustomComponent] = useState('');

  // Derive building characteristics
  const homeType = scope?.home_type ?? null;
  const isMultifamily = useMemo(() => {
    return ['apartments_mf', 'townhomes', 'hotel_hospitality', 'senior_living'].includes(homeType ?? '');
  }, [homeType]);

  // Level options from project scope
  const levelOptions = useMemo(() => {
    if (scope) return getLevelOptions(scope);
    const stories = profile?.stories ?? 2;
    const levels: string[] = [];
    if (profile?.has_basement) levels.push('Basement');
    levels.push('Ground');
    for (let i = 2; i <= stories; i++) levels.push(`Level ${i}`);
    if (stories > 2) levels.push('Attic');
    return levels;
  }, [scope, profile]);

  // Dynamic area options based on selected level + scope
  const areaOptions = useMemo(() => {
    if (!selectedLevel) return [];
    return getAreaOptionsForLevel(scope ?? null, selectedLevel, isMultifamily);
  }, [scope, selectedLevel, isMultifamily]);

  // Unit room options (multifamily)
  const unitRoomOptions = useMemo(() => {
    return getUnitRoomOptions(scope ?? null);
  }, [scope]);

  // Scope-driven elevation options
  const elevationOptions = useMemo(() => {
    return getElevationOptions(scope ?? null, isMultifamily);
  }, [scope, isMultifamily]);

  // Context hint
  const contextHint = useMemo(() => getProjectContextHint(scope ?? null), [scope]);

  // Unit hint for multifamily
  const unitHint = useMemo(() => {
    if (!isMultifamily || !scope?.num_units) return '';
    return `1–${scope.num_units} units`;
  }, [isMultifamily, scope]);

  // Component groups based on scope + selected context
  const componentGroups = useMemo(() => {
    if (insideOutside === 'inside') {
      if (!selectedArea) return [];
      return getComponentGroups(scope ?? null, selectedLevel, false);
    }
    if (insideOutside === 'outside') {
      if (!selectedElevation) return [];
      return getComponentGroups(scope ?? null, null, true);
    }
    return [];
  }, [scope, selectedLevel, selectedArea, selectedElevation, insideOutside]);

  const subComponentOptions = useMemo(() => {
    if (!selectedComponentGroup) return [];
    return componentGroups.find(g => g.label === selectedComponentGroup)?.options ?? [];
  }, [componentGroups, selectedComponentGroup]);

  // Resolve final component string for the tag
  const componentTagPart = useMemo(() => {
    if (!selectedComponentGroup) return '';
    if (selectedComponentGroup === 'Other') {
      return customComponent.trim();
    }
    if (selectedSubComponent === 'Other') {
      return customComponent.trim()
        ? `${selectedComponentGroup} / ${customComponent.trim()}`
        : selectedComponentGroup;
    }
    if (selectedSubComponent) {
      return `${selectedComponentGroup} / ${selectedSubComponent}`;
    }
    return selectedComponentGroup;
  }, [selectedComponentGroup, selectedSubComponent, customComponent]);

  // Build the tag live
  const assembledTag = useMemo(() => {
    if (insideOutside === 'inside') {
      const parts = ['Interior'];
      if (selectedLevel) parts.push(selectedLevel);
      if (selectedArea === 'Other' && customArea.trim()) {
        parts.push(customArea.trim());
      } else if (selectedArea && selectedArea !== 'Other') {
        if (selectedArea === 'Unit interior') {
          if (unitNumber.trim()) parts.push(`Unit ${unitNumber.trim()}`);
          if (roomInUnit === 'Other' && customRoom.trim()) {
            parts.push(customRoom.trim());
          } else if (roomInUnit && roomInUnit !== 'Other') {
            parts.push(roomInUnit);
          }
        } else {
          parts.push(selectedArea);
        }
      }
      if (componentTagPart) parts.push(componentTagPart);
      return parts.join(' · ');
    }
    if (insideOutside === 'outside') {
      const parts = ['Exterior'];
      if (selectedElevation === 'Other' && customElevation.trim()) {
        parts.push(customElevation.trim());
      } else if (selectedElevation && selectedElevation !== 'Other') {
        parts.push(selectedElevation);
      }
      if (componentTagPart) parts.push(componentTagPart);
      return parts.join(' · ');
    }
    return '';
  }, [insideOutside, selectedLevel, selectedArea, customArea, unitNumber, roomInUnit, customRoom, selectedElevation, customElevation, componentTagPart]);

  // Completion check
  const isComplete = useMemo(() => {
    if (insideOutside === 'inside') {
      if (!selectedLevel) return false;
      if (!selectedArea) return false;
      if (selectedArea === 'Other' && !customArea.trim()) return false;
      if (selectedArea === 'Unit interior') {
        if (!unitNumber.trim()) return false;
        if (!roomInUnit) return false;
        if (roomInUnit === 'Other' && !customRoom.trim()) return false;
      }
      return true;
    }
    if (insideOutside === 'outside') {
      if (!selectedElevation) return false;
      if (selectedElevation === 'Other' && !customElevation.trim()) return false;
      return true;
    }
    return false;
  }, [insideOutside, selectedLevel, selectedArea, customArea, unitNumber, roomInUnit, customRoom, selectedElevation, customElevation]);

  function TapCard({
    label,
    icon,
    selected,
    onClick,
  }: {
    label: string;
    icon: React.ReactNode;
    selected: boolean;
    onClick: () => void;
  }) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          'flex flex-col items-center justify-center gap-1.5 p-4 rounded-xl border-2 transition-all min-h-[64px]',
          selected
            ? 'border-primary bg-primary/10 text-foreground'
            : 'border-border bg-card text-muted-foreground hover:border-primary/40 hover:bg-accent',
        )}
      >
        <span className="text-lg">{icon}</span>
        <span className="text-sm font-medium">{label}</span>
      </button>
    );
  }

  const containerClass = compact ? 'space-y-3' : 'space-y-4';

  return (
    <div className={containerClass}>
      {/* Shortcut banner */}
      {savedLocation && (
        <button
          type="button"
          onClick={() => onConfirm(savedLocation)}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-primary/40 bg-primary/5 text-left transition-colors hover:bg-primary/10"
        >
          <span className="text-primary text-lg">📍</span>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-primary">Same as last time?</p>
            <p className="text-sm text-foreground truncate">{savedLocation}</p>
          </div>
          <span className="shrink-0 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold">
            Use it
          </span>
        </button>
      )}

      {/* Inside / Outside */}
      <div className="grid grid-cols-2 gap-3">
        <TapCard
          label="Interior"
          icon={<Home className="h-5 w-5" />}
          selected={insideOutside === 'inside'}
          onClick={() => {
            setInsideOutside('inside');
            setSelectedElevation(null);
            setCustomElevation('');
            setSelectedComponentGroup(null);
            setSelectedSubComponent(null);
            setCustomComponent('');
          }}
        />
        <TapCard
          label="Exterior"
          icon={<Trees className="h-5 w-5" />}
          selected={insideOutside === 'outside'}
          onClick={() => {
            setInsideOutside('outside');
            setSelectedLevel(null);
            setSelectedArea(null);
            setCustomArea('');
            setSelectedComponentGroup(null);
            setSelectedSubComponent(null);
            setCustomComponent('');
          }}
        />
      </div>

      {/* INSIDE PATH */}
      {insideOutside === 'inside' && (
        <div className="space-y-4 animate-fade-in">
          {/* Context hint */}
          {contextHint && (
            <p className="text-xs text-muted-foreground italic">{contextHint}</p>
          )}

          {/* Level pills */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Level</p>
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {levelOptions.map(level => (
                <button
                  key={level}
                  type="button"
                  onClick={() => {
                    setSelectedLevel(level);
                    setSelectedArea(null);
                    setCustomArea('');
                    setUnitNumber('');
                    setRoomInUnit(null);
                    setCustomRoom('');
                    setSelectedComponentGroup(null);
                    setSelectedSubComponent(null);
                    setCustomComponent('');
                  }}
                  className={cn(
                    'shrink-0 px-4 py-2 rounded-full text-sm font-medium border transition-colors min-h-[40px]',
                    selectedLevel === level
                      ? 'bg-secondary text-secondary-foreground border-secondary'
                      : 'bg-card text-muted-foreground border-border hover:border-foreground/30',
                  )}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>

          {/* Area grid */}
          {selectedLevel && (
            <div className="animate-fade-in">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Area</p>
              <div className="grid grid-cols-2 gap-3">
                {areaOptions.map(a => (
                  <TapCard
                    key={a.label}
                    label={a.label}
                    icon={a.icon}
                    selected={selectedArea === a.label}
                    onClick={() => {
                      setSelectedArea(a.label);
                      if (a.label !== 'Unit interior') {
                        setUnitNumber('');
                        setRoomInUnit(null);
                        setCustomRoom('');
                      }
                      setSelectedComponentGroup(null);
                      setSelectedSubComponent(null);
                      setCustomComponent('');
                    }}
                  />
                ))}
              </div>
              {selectedArea === 'Other' && (
                <div className="mt-3 animate-fade-in">
                  <Input
                    value={customArea}
                    onChange={e => setCustomArea(e.target.value)}
                    placeholder="Describe the area…"
                    className="h-11"
                    autoFocus
                  />
                </div>
              )}
              {selectedArea === 'Unit interior' && (
                <div className="space-y-4 mt-3 animate-fade-in">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Unit #</p>
                    <Input
                      value={unitNumber}
                      onChange={e => setUnitNumber(e.target.value)}
                      placeholder={unitHint ? `e.g. 304 (${unitHint})` : 'e.g. 304, A12'}
                      className="h-11"
                      autoFocus
                    />
                  </div>
                  {unitNumber.trim() && (
                    <div className="animate-fade-in">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Room / Area</p>
                      <div className="grid grid-cols-2 gap-3">
                        {unitRoomOptions.map(r => (
                          <TapCard
                            key={r.label}
                            label={r.label}
                            icon={r.icon}
                            selected={roomInUnit === r.label}
                            onClick={() => setRoomInUnit(r.label)}
                          />
                        ))}
                      </div>
                      {roomInUnit === 'Other' && (
                        <div className="mt-3 animate-fade-in">
                          <Input
                            value={customRoom}
                            onChange={e => setCustomRoom(e.target.value)}
                            placeholder="Describe the room…"
                            className="h-11"
                            autoFocus
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* OUTSIDE PATH */}
      {insideOutside === 'outside' && (
        <div className="space-y-4 animate-fade-in">
          {contextHint && (
            <p className="text-xs text-muted-foreground italic">{contextHint}</p>
          )}
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Elevation</p>
          <div className="grid grid-cols-2 gap-3">
            {elevationOptions.map(e => (
              <TapCard
                key={e.label}
                label={e.label}
                icon={e.icon}
                selected={selectedElevation === e.label}
                onClick={() => {
                  setSelectedElevation(e.label);
                  setSelectedComponentGroup(null);
                  setSelectedSubComponent(null);
                  setCustomComponent('');
                }}
              />
            ))}
          </div>
          {selectedElevation === 'Other' && (
            <div className="mt-3 animate-fade-in">
              <Input
                value={customElevation}
                onChange={e => setCustomElevation(e.target.value)}
                placeholder="Describe the location…"
                className="h-11"
                autoFocus
              />
            </div>
          )}
        </div>
      )}

      {/* Building Component picker (optional) */}
      {componentGroups.length > 0 && (
        <div className="space-y-3 animate-fade-in pt-1 border-t border-border">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Component <span className="font-normal normal-case">(optional)</span>
            </p>
            {selectedComponentGroup && (
              <button
                type="button"
                onClick={() => {
                  setSelectedComponentGroup(null);
                  setSelectedSubComponent(null);
                  setCustomComponent('');
                }}
                className="text-xs text-muted-foreground hover:text-foreground underline"
              >
                Skip component
              </button>
            )}
          </div>

          {/* Top-level component group pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {componentGroups.map(g => (
              <button
                key={g.label}
                type="button"
                onClick={() => {
                  setSelectedComponentGroup(g.label);
                  setSelectedSubComponent(null);
                  setCustomComponent('');
                }}
                className={cn(
                  'shrink-0 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors min-h-[36px] flex items-center gap-1.5',
                  selectedComponentGroup === g.label
                    ? 'bg-secondary text-secondary-foreground border-secondary'
                    : 'bg-card text-muted-foreground border-border hover:border-foreground/30',
                )}
              >
                <span>{g.icon}</span>
                <span>{g.label}</span>
              </button>
            ))}
          </div>

          {/* Sub-component pills */}
          {selectedComponentGroup && selectedComponentGroup !== 'Other' && subComponentOptions.length > 0 && (
            <div className="animate-fade-in">
              <div className="flex items-center flex-wrap gap-2">
                {subComponentOptions.map(sub => (
                  <button
                    key={sub.label}
                    type="button"
                    onClick={() => {
                      setSelectedSubComponent(sub.label);
                      if (sub.label !== 'Other') setCustomComponent('');
                    }}
                    className={cn(
                      'px-3 py-1.5 rounded-full text-xs font-medium border transition-colors min-h-[32px]',
                      selectedSubComponent === sub.label
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-card text-muted-foreground border-border hover:border-foreground/30',
                    )}
                  >
                    {sub.label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setSelectedSubComponent('Other')}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-xs font-medium border transition-colors min-h-[32px]',
                    selectedSubComponent === 'Other'
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-card text-muted-foreground border-border hover:border-foreground/30',
                  )}
                >
                  Other
                </button>
              </div>
            </div>
          )}

          {/* Custom component input */}
          {(selectedComponentGroup === 'Other' || selectedSubComponent === 'Other') && (
            <div className="animate-fade-in">
              <Input
                value={customComponent}
                onChange={e => setCustomComponent(e.target.value)}
                placeholder="Describe the component…"
                className="h-10"
                autoFocus
              />
            </div>
          )}
        </div>
      )}

      {/* Live preview pill */}
      {assembledTag && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary text-secondary-foreground animate-fade-in">
          <ChevronRight className="h-3 w-3 shrink-0" />
          <span className="text-sm font-medium">{assembledTag}</span>
        </div>
      )}

      {/* Confirm button */}
      {!compact && isComplete && (
        <button
          type="button"
          onClick={() => onConfirm(assembledTag)}
          className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm transition-colors hover:bg-primary/90 min-h-[48px]"
        >
          Confirm location
        </button>
      )}
      {compact && isComplete && (
        <button
          type="button"
          onClick={() => onConfirm(assembledTag)}
          className="w-full py-2 rounded-lg bg-primary text-primary-foreground font-medium text-xs transition-colors hover:bg-primary/90"
        >
          Set location
        </button>
      )}
    </div>
  );
}
