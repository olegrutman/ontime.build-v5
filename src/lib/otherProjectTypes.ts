// Curated list of "Other" project types users can pick when their build
// doesn't fit the primary building categories (Custom Home, Track Home,
// Townhome, Apartments/MF, Hotel, Senior Living).
//
// Under the hood we still route framing/scope logic through `custom_home`
// (safest fallback for question visibility + SOV weighting), but the
// user-facing label is stored on `projects.project_type` so reports and
// dashboards show what they actually built.

export interface OtherProjectGroup {
  label: string;
  options: string[];
}

export const OTHER_PROJECT_GROUPS: OtherProjectGroup[] = [
  {
    label: 'Commercial / Public',
    options: [
      'Restaurant / Café',
      'Office Building',
      'Retail Store / Storefront',
      'Medical / Dental Clinic',
      'School / Classroom Building',
      'Church / Place of Worship',
      'Community Center',
      'Daycare / Preschool',
      'Fitness / Gym Studio',
      'Auto Shop / Car Wash',
    ],
  },
  {
    label: 'Agricultural / Outbuildings',
    options: [
      'Barn',
      'Pole Barn',
      'Shed / Storage Building',
      'Detached Garage / Workshop',
      'Greenhouse',
      'Stable / Equestrian Building',
    ],
  },
  {
    label: 'Residential Accessory',
    options: [
      'ADU (Accessory Dwelling Unit)',
      'Guest House / Casita',
      'Tiny Home',
      'Cabin',
      'Pool House',
      'Deck / Pergola / Covered Patio',
      'Carport',
    ],
  },
  {
    label: 'Specialty',
    options: [
      'Warehouse',
      'Self-Storage Facility',
      'Event Venue / Barndominium',
      'Modular / Prefab Assembly',
      'Tenant Improvement (Interior Buildout)',
    ],
  },
];

export const ALL_OTHER_PROJECT_OPTIONS: string[] = OTHER_PROJECT_GROUPS.flatMap(
  (g) => g.options,
);
