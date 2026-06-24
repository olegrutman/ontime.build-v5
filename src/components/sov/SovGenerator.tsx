import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  Home, 
  Building, 
  Layers, 
  Hotel,
  Building2,
  Check,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import { 
  generateSovItems, 
  mergeWithCustomItems,
  ProjectTypeForSOV, 
  GeneratedSovItem 
} from '@/lib/sovTemplates';
import SovEditor from './SovEditor';
import SovTemplateManager from './SovTemplateManager';

interface SovGeneratorProps {
  initialProjectType?: ProjectTypeForSOV;
  initialFloors?: number;
  contractValue?: number;
  existingItems?: GeneratedSovItem[];
  onItemsChange: (items: GeneratedSovItem[]) => void;
  showProjectTypeSelector?: boolean;
  showFloorSelector?: boolean;
  disabled?: boolean;
}

const PROJECT_TYPE_OPTIONS = [
  { value: 'single_family' as ProjectTypeForSOV, label: 'Single Family', icon: Home },
  { value: 'townhomes' as ProjectTypeForSOV, label: 'Townhomes', icon: Building },
  { value: 'apartments' as ProjectTypeForSOV, label: 'Apartments', icon: Layers },
  { value: 'hotel' as ProjectTypeForSOV, label: 'Hotel', icon: Hotel },
  { value: 'mixed_use' as ProjectTypeForSOV, label: 'Mixed-Use', icon: Building2 },
];

export default function SovGenerator({
  initialProjectType = 'single_family',
  initialFloors = 1,
  contractValue = 0,
  existingItems = [],
  onItemsChange,
  showProjectTypeSelector = true,
  showFloorSelector = true,
  disabled = false,
}: SovGeneratorProps) {
  // Initialize state directly from props to ensure correct values on first render
  const [projectType, setProjectType] = useState<ProjectTypeForSOV>(initialProjectType);
  const [numFloors, setNumFloors] = useState(initialFloors);
  const [hasPodium, setHasPodium] = useState(false);
  const [partialFloors, setPartialFloors] = useState(false);
  const [items, setItems] = useState<GeneratedSovItem[]>(() => {
    // Generate items immediately on mount if no existing items
    if (existingItems.length === 0) {
      return generateSovItems(initialProjectType, initialFloors, contractValue, false, false);
    }
    return existingItems;
  });
  const [initialized, setInitialized] = useState(existingItems.length > 0);

  // Sync project type from props when it changes
  useEffect(() => {
    if (initialProjectType !== projectType && !initialized) {
      setProjectType(initialProjectType);
    }
  }, [initialProjectType]);

  // Sync floors from props when it changes  
  useEffect(() => {
    if (initialFloors !== numFloors && !initialized) {
      setNumFloors(initialFloors);
    }
  }, [initialFloors]);
  
  const [showRegenerateWarning, setShowRegenerateWarning] = useState(false);
  const [pendingRegenerate, setPendingRegenerate] = useState<{
    type: ProjectTypeForSOV;
    floors: number;
    hasPodium: boolean;
    partialFloors: boolean;
  } | null>(null);

  const showPodiumOption = projectType === 'apartments' || projectType === 'hotel' || projectType === 'mixed_use';

  // Notify parent of initial items and handle regeneration when props change
  useEffect(() => {
    if (!initialized && existingItems.length === 0) {
      // Items were generated in useState initializer, just notify parent
      onItemsChange(items);
      setInitialized(true);
    }
  }, []);

  // Regenerate when project type or floors change after initialization
  useEffect(() => {
    if (initialized && existingItems.length === 0) {
      const generated = generateSovItems(projectType, numFloors, contractValue, hasPodium, partialFloors);
      setItems(generated);
      onItemsChange(generated);
    }
  }, [projectType, numFloors]);

  const hasCustomItems = items.some(item => item.source === 'custom');

  const handleProjectTypeChange = (newType: ProjectTypeForSOV) => {
    if (newType === projectType) return;
    
    if (hasCustomItems) {
      setPendingRegenerate({ type: newType, floors: numFloors, hasPodium, partialFloors });
      setShowRegenerateWarning(true);
    } else {
      applyRegeneration(newType, numFloors, hasPodium, partialFloors);
    }
  };

  const handleFloorsChange = (newFloors: number) => {
    const clampedFloors = Math.max(1, Math.min(20, newFloors));
    
    if (clampedFloors === numFloors) return;
    
    if (hasCustomItems) {
      setPendingRegenerate({ type: projectType, floors: clampedFloors, hasPodium, partialFloors });
      setShowRegenerateWarning(true);
    } else {
      applyRegeneration(projectType, clampedFloors, hasPodium, partialFloors);
    }
  };

  const handlePodiumChange = (newValue: boolean) => {
    if (hasCustomItems) {
      setPendingRegenerate({ type: projectType, floors: numFloors, hasPodium: newValue, partialFloors });
      setShowRegenerateWarning(true);
    } else {
      applyRegeneration(projectType, numFloors, newValue, partialFloors);
    }
  };

  const handlePartialFloorsChange = (newValue: boolean) => {
    if (hasCustomItems) {
      setPendingRegenerate({ type: projectType, floors: numFloors, hasPodium, partialFloors: newValue });
      setShowRegenerateWarning(true);
    } else {
      applyRegeneration(projectType, numFloors, hasPodium, newValue);
    }
  };

  const applyRegeneration = (type: ProjectTypeForSOV, floors: number, podium: boolean, partial: boolean) => {
    setProjectType(type);
    setNumFloors(floors);
    setHasPodium(podium);
    setPartialFloors(partial);
    
    const newAutoItems = generateSovItems(type, floors, contractValue, podium, partial);
    const merged = mergeWithCustomItems(newAutoItems, items);
    
    setItems(merged);
    onItemsChange(merged);
  };

  const confirmRegenerate = () => {
    if (pendingRegenerate) {
      applyRegeneration(
        pendingRegenerate.type, 
        pendingRegenerate.floors,
        pendingRegenerate.hasPodium,
        pendingRegenerate.partialFloors
      );
    }
    setShowRegenerateWarning(false);
    setPendingRegenerate(null);
  };

  const handleItemsChange = (updatedItems: GeneratedSovItem[]) => {
    setItems(updatedItems);
    onItemsChange(updatedItems);
  };

  return (
    <div className="space-y-6">
      {/* Project Type Selector */}
      {showProjectTypeSelector && (
        <div className="space-y-3">
          <Label className="text-base">Project Type</Label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {PROJECT_TYPE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => !disabled && handleProjectTypeChange(option.value)}
                disabled={disabled}
                className={`p-3 rounded-xl border-2 transition-all flex items-center gap-2 ${
                  projectType === option.value
                    ? 'border-accent bg-accent/10 shadow-md ring-2 ring-accent/20'
                    : 'border-border hover:border-accent/50'
                } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <option.icon className="h-5 w-5 text-accent flex-shrink-0" />
                <span className="font-medium text-foreground text-sm">{option.label}</span>
                {projectType === option.value && (
                  <Check className="h-4 w-4 text-accent ml-auto" />
                )}
              </button>
            ))}
          </div>
          {(projectType === 'hotel' || projectType === 'mixed_use') && (
            <p className="text-xs text-muted-foreground mt-1">
              {projectType === 'hotel' ? 'Hotel' : 'Mixed-Use'} uses the Apartment SOV template
            </p>
          )}
        </div>
      )}

      {/* Floor Selector */}
      {showFloorSelector && (
        <div className="space-y-2">
          <Label htmlFor="numFloors" className="text-base">Number of Floors</Label>
          <div className="flex items-center gap-3">
            <Input
              id="numFloors"
              type="number"
              min={1}
              max={20}
              value={numFloors}
              onChange={(e) => handleFloorsChange(parseInt(e.target.value) || 1)}
              className="h-12 w-24 text-center text-lg"
              disabled={disabled}
            />
            <span className="text-muted-foreground">
              {numFloors === 1 ? '1 floor' : `${numFloors} floors`}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Floor-based items auto-expand (e.g., "1st Floor Walls", "2nd Floor Trusses")
          </p>
        </div>
      )}

      {/* Podium & Partial Floors Options */}
      {(showPodiumOption || showFloorSelector) && (
        <div className="space-y-4">
          {showPodiumOption && (
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div>
                <Label className="text-sm font-medium">Podium Construction</Label>
                <p className="text-xs text-muted-foreground">
                  Add podium slab interface, shear walls, and fire stopping
                </p>
              </div>
              <Switch
                checked={hasPodium}
                onCheckedChange={handlePodiumChange}
                disabled={disabled}
              />
            </div>
          )}
        </div>
      )}

      {/* SOV Editor */}
      <div className="space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <Label className="text-base">Schedule of Values</Label>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Template Manager */}
            <SovTemplateManager disabled={disabled} />
            {!disabled && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (hasCustomItems) {
                    setPendingRegenerate({ type: projectType, floors: numFloors, hasPodium, partialFloors });
                    setShowRegenerateWarning(true);
                  } else {
                    applyRegeneration(projectType, numFloors, hasPodium, partialFloors);
                  }
                }}
                className="text-muted-foreground hover:text-foreground"
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                Regenerate
              </Button>
            )}
          </div>
        </div>
        <SovEditor
          items={items}
          onChange={handleItemsChange}
          contractValue={contractValue}
          showWarnings={true}
          disabled={disabled}
        />
      </div>

      {/* Regeneration Warning Dialog */}
      <Dialog open={showRegenerateWarning} onOpenChange={setShowRegenerateWarning}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Regenerate SOV?
            </DialogTitle>
            <DialogDescription>
              Changing project structure will regenerate the SOV. Your custom items will be preserved and appended at the end.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              <strong className="text-foreground">What will happen:</strong>
            </p>
            <ul className="text-sm text-muted-foreground list-disc list-inside mt-2 space-y-1">
              <li>Auto-generated items will be rebuilt based on new settings</li>
              <li>Your {items.filter(i => i.source === 'custom').length} custom item(s) will be preserved</li>
              <li>Custom items will appear at the end of the list</li>
            </ul>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRegenerateWarning(false)}>
              Cancel
            </Button>
            <Button onClick={confirmRegenerate}>
              Regenerate SOV
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
