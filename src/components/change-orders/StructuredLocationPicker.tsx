import { useState, useEffect, useMemo } from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { MapPin, Building2, Home, Layers, DoorOpen, ChevronRight, Edit2 } from 'lucide-react';

interface StructuredLocationPickerProps {
  projectId: string;
  value: StructuredLocation;
  onChange: (location: StructuredLocation) => void;
}

export interface StructuredLocation {
  location_primary: 'INSIDE' | 'OUTSIDE' | null;
  level: string | null;
  building_type: string | null;
  unit_id: string | null;
  room_or_area: string | null;
  custom_text: string | null;
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
  structure_type: 'SINGLE_FAMILY' | 'TOWNHOME' | 'APARTMENT' | 'HOTEL';
  scope_flags: ScopeFlags;
}

// Room definitions by building type and level
const SINGLE_FAMILY_ROOMS = {
  main: ['Living', 'Dining', 'Kitchen', 'Nook', 'Family', 'Office', 'Bath', 'Laundry', 'Mud', 'Entry', 'Hall', 'Stairs', 'Closet', 'Mechanical', 'Other'],
  upper: ['Bedroom', 'Bath', 'Closet', 'Loft', 'Hall', 'Laundry', 'Other'],
  basement: ['Mechanical', 'Storage', 'Utility', 'Living Area', 'Bedroom', 'Bath', 'Media', 'Gym', 'Spa', 'Other'],
  garage: ['Parking', 'Storage', 'Workshop', 'Mechanical', 'Other'],
  attic: ['Storage', 'Mechanical', 'Living Area', 'Other'],
  rooftop: ['Deck', 'Mechanical', 'Other'],
};

const TOWNHOUSE_EXTRA_ROOMS = ['Rooftop Deck', 'Balcony', 'Patio', 'Shared Stairs'];

const APARTMENT_UNIT_ROOMS = ['Living', 'Kitchen', 'Bedroom', 'Bath', 'Closet', 'Balcony', 'Laundry', 'Other'];
const APARTMENT_COMMON_AREAS = ['Corridor', 'Lobby', 'Stair', 'Elevator', 'Mechanical', 'Electrical', 'Trash', 'Office', 'Gym', 'Library', 'Community', 'Pool', 'Courtyard', 'Other'];

const HOTEL_GUEST_AREAS = ['Bedroom', 'Bath', 'Entry', 'Balcony', 'Closet', 'Other'];
const HOTEL_COMMON_AREAS = ['Lobby', 'Corridor', 'Front Desk', 'Lounge', 'Restaurant', 'Bar', 'Conference', 'Gym', 'Pool', 'Other'];
const HOTEL_BOH_AREAS = ['Mechanical', 'Laundry', 'Storage', 'Office', 'Kitchen', 'Other'];

const OUTSIDE_LOCATIONS = ['Front', 'Rear', 'Side', 'Roof', 'Rooftop Deck', 'Balcony', 'Courtyard', 'Pool', 'Parking', 'Driveway', 'Walkway', 'Fence', 'Other'];

const UNIT_ID_TYPES = [
  { value: 'ADDRESS', label: 'Address' },
  { value: 'NUMBER', label: 'Number' },
  { value: 'LETTER', label: 'Letter' },
];

export const getLocationDisplayString = (location: StructuredLocation): string => {
  const parts: string[] = [];
  
  if (location.location_primary === 'OUTSIDE') {
    parts.push('Outside');
    if (location.room_or_area === 'Other' && location.custom_text) {
      parts.push(location.custom_text);
    } else if (location.room_or_area) {
      parts.push(location.room_or_area);
    }
  } else if (location.location_primary === 'INSIDE') {
    if (location.level) parts.push(location.level);
    if (location.unit_id) parts.push(`Unit ${location.unit_id}`);
    if (location.room_or_area === 'Other' && location.custom_text) {
      parts.push(location.custom_text);
    } else if (location.room_or_area) {
      parts.push(location.room_or_area);
    }
  }
  
  return parts.join(' → ') || '';
};

export const createEmptyLocation = (): StructuredLocation => ({
  location_primary: null,
  level: null,
  building_type: null,
  unit_id: null,
  room_or_area: null,
  custom_text: null,
});

export default function StructuredLocationPicker({ 
  projectId, 
  value, 
  onChange 
}: StructuredLocationPickerProps) {
  const [config, setConfig] = useState<ProjectConfig | null>(null);
  const [loading, setLoading] = useState(true);
  
  // For apartment/hotel unit selection
  const [unitIdType, setUnitIdType] = useState<string>('NUMBER');
  const [hotelAreaType, setHotelAreaType] = useState<'GUEST' | 'COMMON' | 'BOH' | null>(null);
  const [apartmentAreaType, setApartmentAreaType] = useState<'UNIT' | 'COMMON' | null>(null);
  
  // Edit mode for summary
  const [showSummary, setShowSummary] = useState(false);

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
        structure_type: data.structure_type as ProjectConfig['structure_type'],
        scope_flags: scopeFlags
      });
    }
    setLoading(false);
  };

  const updateLocation = (updates: Partial<StructuredLocation>) => {
    onChange({ ...value, ...updates });
  };

  const resetFromStep = (step: 'primary' | 'level' | 'unit' | 'area') => {
    switch (step) {
      case 'primary':
        onChange(createEmptyLocation());
        setHotelAreaType(null);
        setApartmentAreaType(null);
        break;
      case 'level':
        updateLocation({ level: null, unit_id: null, room_or_area: null, custom_text: null });
        setHotelAreaType(null);
        setApartmentAreaType(null);
        break;
      case 'unit':
        updateLocation({ unit_id: null, room_or_area: null, custom_text: null });
        break;
      case 'area':
        updateLocation({ room_or_area: null, custom_text: null });
        break;
    }
  };

  const getOrdinal = (n: number): string => {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };

  const levelOptions = useMemo(() => {
    if (!config) return [];
    
    const levels: string[] = [];
    
    if (config.scope_flags?.basement) {
      levels.push('Basement');
    }
    
    if (config.scope_flags?.garage) {
      levels.push('Garage');
    }
    
    for (let i = 1; i <= config.floors; i++) {
      levels.push(`Floor ${i}`);
    }
    
    levels.push('Attic');
    levels.push('Rooftop');
    levels.push('Other');
    
    return levels;
  }, [config]);

  const getRoomOptions = (): string[] => {
    if (!config || !value.level) return [];
    
    const levelLower = value.level.toLowerCase();
    
    switch (config.structure_type) {
      case 'SINGLE_FAMILY':
        return getSingleFamilyRooms(levelLower);
      
      case 'TOWNHOME':
        return [...getSingleFamilyRooms(levelLower), ...TOWNHOUSE_EXTRA_ROOMS].filter((v, i, a) => a.indexOf(v) === i);
      
      case 'APARTMENT':
        if (apartmentAreaType === 'UNIT') {
          return APARTMENT_UNIT_ROOMS;
        } else if (apartmentAreaType === 'COMMON') {
          return APARTMENT_COMMON_AREAS;
        }
        return [];
      
      case 'HOTEL':
        if (hotelAreaType === 'GUEST') {
          return HOTEL_GUEST_AREAS;
        } else if (hotelAreaType === 'COMMON') {
          return HOTEL_COMMON_AREAS;
        } else if (hotelAreaType === 'BOH') {
          return HOTEL_BOH_AREAS;
        }
        return [];
      
      default:
        return SINGLE_FAMILY_ROOMS.main;
    }
  };

  const getSingleFamilyRooms = (levelLower: string): string[] => {
    if (levelLower.includes('basement')) {
      return SINGLE_FAMILY_ROOMS.basement;
    } else if (levelLower.includes('garage')) {
      return SINGLE_FAMILY_ROOMS.garage;
    } else if (levelLower.includes('attic')) {
      return SINGLE_FAMILY_ROOMS.attic;
    } else if (levelLower.includes('rooftop')) {
      return SINGLE_FAMILY_ROOMS.rooftop;
    } else if (levelLower.includes('floor 1') || levelLower === 'floor 1') {
      return SINGLE_FAMILY_ROOMS.main;
    } else if (levelLower.includes('floor')) {
      return SINGLE_FAMILY_ROOMS.upper;
    }
    return SINGLE_FAMILY_ROOMS.main;
  };

  const needsUnitSelection = config?.structure_type === 'TOWNHOME' || 
                              config?.structure_type === 'APARTMENT' || 
                              (config?.structure_type === 'HOTEL' && hotelAreaType === 'GUEST');

  const needsAreaTypeSelection = config?.structure_type === 'APARTMENT' || config?.structure_type === 'HOTEL';

  const isLocationComplete = (): boolean => {
    if (!value.location_primary) return false;
    
    if (value.location_primary === 'OUTSIDE') {
      if (!value.room_or_area) return false;
      if (value.room_or_area === 'Other' && !value.custom_text) return false;
      return true;
    }
    
    // Inside
    if (!value.level) return false;
    if (value.level === 'Other' && !value.custom_text) return false;
    if (value.level !== 'Other' && !value.room_or_area) return false;
    if (value.room_or_area === 'Other' && !value.custom_text) return false;
    
    return true;
  };

  // Show summary when complete
  useEffect(() => {
    if (isLocationComplete() && !showSummary) {
      setShowSummary(true);
    }
  }, [value]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-10 bg-muted animate-pulse rounded-md" />
      </div>
    );
  }

  // Summary view when complete
  if (showSummary && isLocationComplete()) {
    return (
      <Card className="border-2 border-accent bg-accent/5">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Location</Label>
              <p className="text-lg font-semibold mt-1 break-words">
                {getLocationDisplayString(value)}
              </p>
              <div className="flex flex-wrap gap-2 mt-2 text-xs text-muted-foreground">
                {value.location_primary && (
                  <span className="px-2 py-0.5 bg-muted rounded-full">{value.location_primary}</span>
                )}
                {value.level && value.level !== 'Other' && (
                  <span className="px-2 py-0.5 bg-muted rounded-full">{value.level}</span>
                )}
                {value.unit_id && (
                  <span className="px-2 py-0.5 bg-muted rounded-full">Unit {value.unit_id}</span>
                )}
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setShowSummary(false)}
              className="shrink-0"
            >
              <Edit2 className="h-4 w-4 mr-1" />
              Edit
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Step 1: Primary Location (Inside/Outside) */}
      <div className="space-y-2">
        <Label className="text-sm font-medium flex items-center gap-2">
          <MapPin className="h-4 w-4 text-accent" />
          Where is the work?
        </Label>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            className={`flex items-center justify-center gap-2 p-4 rounded-lg border-2 transition-all ${
              value.location_primary === 'INSIDE'
                ? 'bg-accent text-accent-foreground border-accent'
                : 'bg-background border-border hover:border-accent/50'
            }`}
            onClick={() => {
              resetFromStep('primary');
              updateLocation({ location_primary: 'INSIDE', building_type: config?.structure_type || null });
            }}
          >
            <Home className="h-5 w-5" />
            <span className="font-medium">Inside</span>
          </button>
          <button
            type="button"
            className={`flex items-center justify-center gap-2 p-4 rounded-lg border-2 transition-all ${
              value.location_primary === 'OUTSIDE'
                ? 'bg-accent text-accent-foreground border-accent'
                : 'bg-background border-border hover:border-accent/50'
            }`}
            onClick={() => {
              resetFromStep('primary');
              updateLocation({ location_primary: 'OUTSIDE', building_type: config?.structure_type || null });
            }}
          >
            <Building2 className="h-5 w-5" />
            <span className="font-medium">Outside</span>
          </button>
        </div>
      </div>

      {/* Outside Flow */}
      {value.location_primary === 'OUTSIDE' && (
        <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
          <Label className="text-sm font-medium flex items-center gap-2">
            <ChevronRight className="h-4 w-4 text-accent" />
            Select exterior area
          </Label>
          <Select 
            value={value.room_or_area || ''} 
            onValueChange={(v) => updateLocation({ room_or_area: v, custom_text: null })}
          >
            <SelectTrigger className="bg-background">
              <SelectValue placeholder="Select area..." />
            </SelectTrigger>
            <SelectContent className="bg-background border shadow-lg z-50 max-h-60">
              {OUTSIDE_LOCATIONS.map((loc) => (
                <SelectItem key={loc} value={loc}>{loc}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {value.room_or_area === 'Other' && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-200">
              <Label className="text-sm">Specify location</Label>
              <Input
                placeholder="Describe the exterior location..."
                value={value.custom_text || ''}
                onChange={(e) => updateLocation({ custom_text: e.target.value })}
                className="mt-1"
              />
            </div>
          )}
        </div>
      )}

      {/* Inside Flow - Step 2: Level Selection */}
      {value.location_primary === 'INSIDE' && (
        <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
          <Label className="text-sm font-medium flex items-center gap-2">
            <Layers className="h-4 w-4 text-accent" />
            Select level
          </Label>
          <Select 
            value={value.level || ''} 
            onValueChange={(v) => {
              resetFromStep('level');
              updateLocation({ level: v });
            }}
          >
            <SelectTrigger className="bg-background">
              <SelectValue placeholder="Select level..." />
            </SelectTrigger>
            <SelectContent className="bg-background border shadow-lg z-50 max-h-60">
              {levelOptions.map((level) => (
                <SelectItem key={level} value={level}>{level}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {value.level === 'Other' && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-200">
              <Label className="text-sm">Specify level</Label>
              <Input
                placeholder="Describe the level..."
                value={value.custom_text || ''}
                onChange={(e) => updateLocation({ custom_text: e.target.value })}
                className="mt-1"
              />
            </div>
          )}
        </div>
      )}

      {/* Apartment: Unit or Common Area */}
      {value.location_primary === 'INSIDE' && value.level && value.level !== 'Other' && config?.structure_type === 'APARTMENT' && (
        <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
          <Label className="text-sm font-medium">Unit or Common Area?</Label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              className={`p-3 rounded-lg border-2 transition-all text-sm font-medium ${
                apartmentAreaType === 'UNIT'
                  ? 'bg-accent text-accent-foreground border-accent'
                  : 'bg-background border-border hover:border-accent/50'
              }`}
              onClick={() => {
                setApartmentAreaType('UNIT');
                updateLocation({ room_or_area: null, unit_id: null, custom_text: null });
              }}
            >
              Unit
            </button>
            <button
              type="button"
              className={`p-3 rounded-lg border-2 transition-all text-sm font-medium ${
                apartmentAreaType === 'COMMON'
                  ? 'bg-accent text-accent-foreground border-accent'
                  : 'bg-background border-border hover:border-accent/50'
              }`}
              onClick={() => {
                setApartmentAreaType('COMMON');
                updateLocation({ room_or_area: null, unit_id: null, custom_text: null });
              }}
            >
              Common Area
            </button>
          </div>
        </div>
      )}

      {/* Hotel: Guest Room, Common Area, or Back-of-House */}
      {value.location_primary === 'INSIDE' && value.level && value.level !== 'Other' && config?.structure_type === 'HOTEL' && (
        <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
          <Label className="text-sm font-medium">Area type</Label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              className={`p-3 rounded-lg border-2 transition-all text-sm font-medium ${
                hotelAreaType === 'GUEST'
                  ? 'bg-accent text-accent-foreground border-accent'
                  : 'bg-background border-border hover:border-accent/50'
              }`}
              onClick={() => {
                setHotelAreaType('GUEST');
                updateLocation({ room_or_area: null, unit_id: null, custom_text: null });
              }}
            >
              Guest Room
            </button>
            <button
              type="button"
              className={`p-3 rounded-lg border-2 transition-all text-sm font-medium ${
                hotelAreaType === 'COMMON'
                  ? 'bg-accent text-accent-foreground border-accent'
                  : 'bg-background border-border hover:border-accent/50'
              }`}
              onClick={() => {
                setHotelAreaType('COMMON');
                updateLocation({ room_or_area: null, unit_id: null, custom_text: null });
              }}
            >
              Common
            </button>
            <button
              type="button"
              className={`p-3 rounded-lg border-2 transition-all text-sm font-medium ${
                hotelAreaType === 'BOH'
                  ? 'bg-accent text-accent-foreground border-accent'
                  : 'bg-background border-border hover:border-accent/50'
              }`}
              onClick={() => {
                setHotelAreaType('BOH');
                updateLocation({ room_or_area: null, unit_id: null, custom_text: null });
              }}
            >
              Back-of-House
            </button>
          </div>
        </div>
      )}

      {/* Unit ID input for Townhouse/Apartment/Hotel Guest */}
      {value.location_primary === 'INSIDE' && value.level && value.level !== 'Other' && (
        (config?.structure_type === 'TOWNHOME') ||
        (config?.structure_type === 'APARTMENT' && apartmentAreaType === 'UNIT') ||
        (config?.structure_type === 'HOTEL' && hotelAreaType === 'GUEST')
      ) && (
        <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
          {config?.structure_type === 'TOWNHOME' && (
            <div>
              <Label className="text-sm font-medium">Unit ID type</Label>
              <Select value={unitIdType} onValueChange={setUnitIdType}>
                <SelectTrigger className="mt-1 bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background border shadow-lg z-50">
                  {UNIT_ID_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div>
            <Label className="text-sm font-medium">
              {config?.structure_type === 'HOTEL' ? 'Room number' : 'Unit ID'}
            </Label>
            <Input
              placeholder={config?.structure_type === 'HOTEL' ? 'e.g., 405' : 'e.g., 101, A, 123 Main St'}
              value={value.unit_id || ''}
              onChange={(e) => updateLocation({ unit_id: e.target.value })}
              className="mt-1"
            />
          </div>
        </div>
      )}

      {/* Room/Area Selection */}
      {value.location_primary === 'INSIDE' && 
       value.level && 
       value.level !== 'Other' &&
       (
         config?.structure_type === 'SINGLE_FAMILY' ||
         config?.structure_type === 'TOWNHOME' ||
         (config?.structure_type === 'APARTMENT' && apartmentAreaType) ||
         (config?.structure_type === 'HOTEL' && hotelAreaType)
       ) && (
        <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
          <Label className="text-sm font-medium flex items-center gap-2">
            <DoorOpen className="h-4 w-4 text-accent" />
            {config?.structure_type === 'HOTEL' && hotelAreaType === 'GUEST' ? 'Area within room' : 'Room / Area'}
          </Label>
          <Select 
            value={value.room_or_area || ''} 
            onValueChange={(v) => updateLocation({ room_or_area: v, custom_text: null })}
          >
            <SelectTrigger className="bg-background">
              <SelectValue placeholder="Select room or area..." />
            </SelectTrigger>
            <SelectContent className="bg-background border shadow-lg z-50 max-h-60">
              {getRoomOptions().map((room) => (
                <SelectItem key={room} value={room}>{room}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {value.room_or_area === 'Other' && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-200">
              <Label className="text-sm">Specify area</Label>
              <Input
                placeholder="Describe the room or area..."
                value={value.custom_text || ''}
                onChange={(e) => updateLocation({ custom_text: e.target.value })}
                className="mt-1"
              />
            </div>
          )}
        </div>
      )}

      {/* Current Selection Preview */}
      {(value.location_primary || value.level || value.room_or_area) && (
        <div className="px-3 py-2 bg-muted/50 rounded-lg border border-border animate-in fade-in duration-200">
          <Label className="text-xs text-muted-foreground">Current selection</Label>
          <p className="text-sm font-medium mt-1">{getLocationDisplayString(value) || 'Building location...'}</p>
        </div>
      )}
    </div>
  );
}
