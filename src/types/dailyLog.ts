export interface DailyLog {
  id: string;
  project_id: string;
  log_date: string;
  weather_data: WeatherData;
  manpower_total: number;
  delay_hours: number;
  safety_incidents: SafetyIncident[];
  notes: string;
  status: 'draft' | 'submitted';
  created_by: string;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface WeatherData {
  conditions?: string[];  // e.g. ['sunny', 'wind']
  temp_high?: number;
  temp_low?: number;
  auto_fetched?: boolean;
}

export interface SafetyIncident {
  type: string;        // 'near_miss' | 'first_aid' | 'recordable' | 'property_damage'
  notes?: string;
}

export interface DailyLogManpower {
  id: string;
  log_id: string;
  org_id: string | null;
  trade: string;
  headcount: number;
  created_at: string;
}

export interface DailyLogDelay {
  id: string;
  log_id: string;
  cause: string;
  hours_lost: number;
  notes: string;
  created_at: string;
}

export interface DailyLogPhoto {
  id: string;
  log_id: string;
  storage_path: string;
  tag: string;
  caption: string;
  created_at: string;
}

export interface DailyLogDelivery {
  id: string;
  log_id: string;
  po_id: string | null;
  status: 'pending' | 'received' | 'not_received' | 'partial';
  notes: string;
  created_at: string;
}

export const WEATHER_CONDITIONS = [
  { key: 'sunny', label: 'Sunny', icon: '☀️' },
  { key: 'cloudy', label: 'Cloudy', icon: '☁️' },
  { key: 'rain', label: 'Rain', icon: '🌧️' },
  { key: 'snow', label: 'Snow', icon: '❄️' },
  { key: 'wind', label: 'Wind', icon: '💨' },
  { key: 'hot', label: 'Hot', icon: '🌡️' },
  { key: 'cold', label: 'Cold', icon: '🥶' },
] as const;

export const DELAY_CAUSES = [
  'Weather', 'Material', 'Labor', 'Equipment', 'Inspection', 'RFI', 'Other',
] as const;

export const SAFETY_INCIDENT_TYPES = [
  { key: 'near_miss', label: 'Near Miss' },
  { key: 'first_aid', label: 'First Aid' },
  { key: 'recordable', label: 'Recordable' },
  { key: 'property_damage', label: 'Property Damage' },
] as const;

export const PHOTO_TAGS = [
  'Progress', 'Issue', 'Delivery', 'Safety',
] as const;

export const QUICK_NOTE_CHIPS = [
  'Inspection passed',
  'Concrete pour',
  'Rough-in complete',
  'Punch list items',
  'Change order needed',
  'Material shortage',
  'Weather delay',
  'Crew short-staffed',
] as const;
