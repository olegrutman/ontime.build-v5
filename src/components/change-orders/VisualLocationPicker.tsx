import { useState, useEffect, useMemo } from 'react';
import { Home, Trees, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { useProjectProfile } from '@/hooks/useProjectProfile';
import { useProjectScope, getLevelOptions } from '@/hooks/useProjectScope';

interface VisualLocationPickerProps {
  projectId: string;
  onConfirm: (tag: string) => void;
  savedLocation?: string | null;
  compact?: boolean;
}

type InsideOutside = 'inside' | 'outside' | null;

// Residential area options
const RESIDENTIAL_AREAS = [
  { label: 'Unit interior', icon: '🏠' },
  { label: 'Corridor', icon: '🚶' },
  { label: 'Stairwell', icon: '🪜' },
  { label: 'Other', icon: '📍' },
];

// Room options shown after "Unit interior" is selected
const UNIT_ROOM_OPTIONS = [
  { label: 'Kitchen', icon: '🍳' },
  { label: 'Bathroom', icon: '🚿' },
  { label: 'Living Room', icon: '🛋️' },
  { label: 'Bedroom', icon: '🛏️' },
  { label: 'Laundry', icon: '🧺' },
  { label: 'Closet', icon: '🚪' },
  { label: 'Other', icon: '📍' },
];

// Commercial area options
const COMMERCIAL_AREAS = [
  { label: 'Office', icon: '🏢' },
  { label: 'Lobby', icon: '🚪' },
  { label: 'Restroom', icon: '🚻' },
  { label: 'Other', icon: '📍' },
];

// Multifamily elevation options
const MULTIFAMILY_ELEVATIONS = [
  { label: 'South elevation', icon: '🧭' },
  { label: 'North elevation', icon: '🧭' },
  { label: 'East elevation', icon: '🧭' },
  { label: 'West elevation', icon: '🧭' },
  { label: 'Roof', icon: '🏗️' },
  { label: 'Other', icon: '📍' },
];

// Single family elevation options
const SINGLE_FAMILY_ELEVATIONS = [
  { label: 'Front', icon: '🏠' },
  { label: 'Rear', icon: '🏡' },
  { label: 'Left side', icon: '◀️' },
  { label: 'Right side', icon: '▶️' },
  { label: 'Roof', icon: '🏗️' },
  { label: 'Other', icon: '📍' },
];

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

  // Determine project type characteristics
  const isCommercial = useMemo(() => {
    if (!profile) return false;
    // Check via project type name/slug pattern
    return false; // Will be resolved from project_types table
  }, [profile]);

  const isMultifamily = useMemo(() => {
    // Default to multifamily for apartments, townhomes, hotels, mixed-use
    return true; // Safe default — multifamily elevation labels are more universal
  }, []);

  // Level options from project scope
  const levelOptions = useMemo(() => {
    if (!scope) {
      // Generate from profile stories count
      const stories = profile?.stories ?? 2;
      const levels: string[] = [];
      if (profile?.has_basement) levels.push('Basement');
      levels.push('Ground');
      for (let i = 2; i <= stories; i++) levels.push(`Level ${i}`);
      if (stories > 2) levels.push('Attic');
      return levels;
    }
    return getLevelOptions(scope);
  }, [scope, profile]);

  const areaOptions = isCommercial ? COMMERCIAL_AREAS : RESIDENTIAL_AREAS;
  const elevationOptions = isMultifamily ? MULTIFAMILY_ELEVATIONS : SINGLE_FAMILY_ELEVATIONS;

  // Build the tag live
  const assembledTag = useMemo(() => {
    if (insideOutside === 'inside') {
      const parts = ['Inside'];
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
      return parts.join(' · ');
    }
    if (insideOutside === 'outside') {
      const parts = ['Outside'];
      if (selectedElevation === 'Other' && customElevation.trim()) {
        parts.push(customElevation.trim());
      } else if (selectedElevation && selectedElevation !== 'Other') {
        parts.push(selectedElevation);
      }
      return parts.join(' · ');
    }
    return '';
  }, [insideOutside, selectedLevel, selectedArea, customArea, unitNumber, roomInUnit, customRoom, selectedElevation, customElevation]);

  // Auto-confirm when complete
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

  // Shortcut banner handler
  function handleUseShortcut() {
    if (savedLocation) {
      onConfirm(savedLocation);
    }
  }

  // Tap target button component
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
          onClick={handleUseShortcut}
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

      {/* Inside / Outside selection */}
      <div className={cn('grid gap-3', compact ? 'grid-cols-2' : 'grid-cols-2')}>
        <TapCard
          label="Inside"
          icon={<Home className="h-5 w-5" />}
          selected={insideOutside === 'inside'}
          onClick={() => {
            setInsideOutside('inside');
            setSelectedElevation(null);
            setCustomElevation('');
          }}
        />
        <TapCard
          label="Outside"
          icon={<Trees className="h-5 w-5" />}
          selected={insideOutside === 'outside'}
          onClick={() => {
            setInsideOutside('outside');
            setSelectedLevel(null);
            setSelectedArea(null);
            setCustomArea('');
          }}
        />
      </div>

      {/* INSIDE PATH */}
      {insideOutside === 'inside' && (
        <div className="space-y-4 animate-fade-in">
          {/* Level — horizontal pill strip */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Level</p>
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {levelOptions.map(level => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setSelectedLevel(level)}
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

          {/* Area — 2x2 grid */}
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
            </div>
          )}
        </div>
      )}

      {/* OUTSIDE PATH */}
      {insideOutside === 'outside' && (
        <div className="space-y-4 animate-fade-in">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Elevation</p>
          <div className="grid grid-cols-2 gap-3">
            {elevationOptions.map(e => (
              <TapCard
                key={e.label}
                label={e.label}
                icon={e.icon}
                selected={selectedElevation === e.label}
                onClick={() => setSelectedElevation(e.label)}
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

      {/* Live preview pill */}
      {assembledTag && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary text-secondary-foreground animate-fade-in">
          <ChevronRight className="h-3 w-3 shrink-0" />
          <span className="text-sm font-medium">{assembledTag}</span>
        </div>
      )}

      {/* Confirm button when complete (non-compact mode) */}
      {!compact && isComplete && (
        <button
          type="button"
          onClick={() => onConfirm(assembledTag)}
          className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm transition-colors hover:bg-primary/90 min-h-[48px]"
        >
          Confirm location
        </button>
      )}

      {/* Auto-confirm for compact mode */}
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
