// Shared location types used by RFI and other features

export interface LocationData {
  inside_outside?: 'inside' | 'outside';
  level?: string;
  unit?: string;
  room_area?: string;
  custom_room_area?: string;
  exterior_feature?: string;
  custom_exterior?: string;
}

export const ROOM_AREA_OPTIONS = [
  'Kitchen',
  'Bathroom',
  'Living Room',
  'Bedroom',
  'Corridor',
  'Hallway',
  'Garage',
  'Laundry',
  'Storage',
  'Exterior',
  'Other',
];
