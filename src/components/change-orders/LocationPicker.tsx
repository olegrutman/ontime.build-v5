import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { Json } from '@/integrations/supabase/types';

interface LocationPickerProps {
  projectId: string;
  value: string;
  onChange: (location: string) => void;
}

interface ScopeFlags {
  roof?: boolean;
  decks?: boolean;
  garage?: boolean;
  porches?: boolean;
  basement?: boolean;
  hardware_installation?: boolean;
}

interface ProjectConfig {
  floors: number;
  structure_type: string;
  scope_flags: ScopeFlags;
}

const ROOM_TYPES = [
  'Kitchen',
  'Living Room',
  'Dining Room',
  'Master Bedroom',
  'Bedroom',
  'Bathroom',
  'Half Bath',
  'Laundry Room',
  'Garage',
  'Basement',
  'Attic',
  'Hallway',
  'Closet',
  'Office',
  'Exterior - Front',
  'Exterior - Back',
  'Exterior - Side',
  'Roof',
  'Deck',
  'Balcony',
  'Patio',
  'Other'
];

const COMMERCIAL_AREAS = [
  'Lobby',
  'Conference Room',
  'Office',
  'Suite',
  'Restroom',
  'Break Room',
  'Storage',
  'Elevator',
  'Stairwell',
  'Hallway',
  'Roof',
  'Exterior',
  'Parking',
  'Other'
];

export default function LocationPicker({ projectId, value, onChange }: LocationPickerProps) {
  const [config, setConfig] = useState<ProjectConfig | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [floor, setFloor] = useState('');
  const [area, setArea] = useState('');
  const [customArea, setCustomArea] = useState('');

  useEffect(() => {
    fetchProjectConfig();
  }, [projectId]);

  const fetchProjectConfig = async () => {
    const { data, error } = await supabase
      .from('projects')
      .select('floors, structure_type, scope_flags')
      .eq('id', projectId)
      .maybeSingle();

    if (!error && data) {
      const scopeFlags = (data.scope_flags as ScopeFlags) || {};
      setConfig({
        floors: data.floors,
        structure_type: data.structure_type,
        scope_flags: scopeFlags
      });
    }
    setLoading(false);
  };

  const getFloorOptions = (): string[] => {
    if (!config) return [];
    
    const floors: string[] = [];
    
    if (config.scope_flags?.basement) {
      floors.push('Basement');
    }
    
    for (let i = 1; i <= config.floors; i++) {
      floors.push(getOrdinal(i) + ' Floor');
    }
    
    if (config.scope_flags?.roof) {
      floors.push('Roof');
    }
    
    return floors;
  };

  const getAreaOptions = (): string[] => {
    if (!config) return ROOM_TYPES;
    
    if (config.structure_type === 'HOTEL') {
      return COMMERCIAL_AREAS;
    }
    
    return ROOM_TYPES;
  };

  const getOrdinal = (n: number): string => {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };

  useEffect(() => {
    if (!config) return;
    
    const parts: string[] = [];
    
    if (floor) parts.push(floor);
    if (area === 'Other' && customArea) {
      parts.push(customArea);
    } else if (area) {
      parts.push(area);
    }
    
    const locationStr = parts.join(', ');
    if (locationStr !== value) {
      onChange(locationStr);
    }
  }, [floor, area, customArea, config]);

  const showFloor = config && config.floors > 1;

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-10 bg-muted animate-pulse rounded-md" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {showFloor && (
        <div>
          <Label className="text-sm">Floor</Label>
          <Select value={floor} onValueChange={setFloor}>
            <SelectTrigger className="mt-1 bg-background">
              <SelectValue placeholder="Select floor..." />
            </SelectTrigger>
            <SelectContent className="bg-background border shadow-lg z-50">
              {getFloorOptions().map((f) => (
                <SelectItem key={f} value={f}>{f}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div>
        <Label className="text-sm">Area / Room</Label>
        <Select value={area} onValueChange={setArea}>
          <SelectTrigger className="mt-1 bg-background">
            <SelectValue placeholder="Select area..." />
          </SelectTrigger>
          <SelectContent className="bg-background border shadow-lg z-50 max-h-60">
            {getAreaOptions().map((a) => (
              <SelectItem key={a} value={a}>{a}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {area === 'Other' && (
        <div>
          <Label className="text-sm">Specify Area</Label>
          <Input
            placeholder="Describe the location..."
            value={customArea}
            onChange={(e) => setCustomArea(e.target.value)}
            className="mt-1"
          />
        </div>
      )}

      {value && (
        <div className="px-3 py-2 bg-muted/50 rounded-lg border border-border">
          <Label className="text-xs text-muted-foreground">Generated Location</Label>
          <p className="text-sm font-medium mt-1">{value}</p>
        </div>
      )}

      <div>
        <Label className="text-xs text-muted-foreground">Or enter manually</Label>
        <Input
          placeholder='e.g., "Exterior, South wall" or custom location'
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="mt-1"
        />
      </div>
    </div>
  );
}