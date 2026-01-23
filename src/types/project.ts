// Project creation wizard types

export type ProjectType = 'residential' | 'commercial' | 'mixed_use';
export type BuildType = 'new_construction' | 'renovation' | 'addition';

export interface Address {
  street: string;
  city: string;
  state: string;
  zip: string;
}

export interface Structure {
  id: string;
  name: string;
  type: 'main' | 'detached_garage' | 'adu' | 'amenity' | 'other';
  description?: string;
}

export interface PartyInvite {
  org_code: string;
  org_name?: string;
  org_id?: string;
  role: 'GC' | 'TC' | 'FC' | 'SUPPLIER';
  material_responsibility?: 'GC' | 'TC';
  po_approval_required?: boolean;
}

export interface ProjectScope {
  floors: number;
  foundation: 'slab' | 'crawlspace' | 'basement' | 'piers';
  framing_method: 'stick' | 'panelized' | 'hybrid';
  has_stairs: boolean;
  has_elevator: boolean;
  areas: string[];
  custom_areas: string[];
}

export interface SOVLineItem {
  id: string;
  code: string;
  title: string;
  description?: string;
  amount?: number;
  structure_id?: string;
  floor?: string;
  area?: string;
}

export interface ProjectWizardData {
  // Step 1: Basics
  name: string;
  project_type: ProjectType;
  build_type: BuildType;
  address: Address;
  
  // Step 2: Structures
  structures: Structure[];
  
  // Step 3: Parties
  parties: PartyInvite[];
  
  // Step 4: Scope
  scope: ProjectScope;
  mobilization_enabled: boolean;
  retainage_percent: number;
  
  // Step 5: SOV Builder
  sov_items: SOVLineItem[];
}

export const PROJECT_TYPE_LABELS: Record<ProjectType, string> = {
  residential: 'Residential',
  commercial: 'Commercial',
  mixed_use: 'Mixed Use',
};

export const BUILD_TYPE_LABELS: Record<BuildType, string> = {
  new_construction: 'New Construction',
  renovation: 'Renovation',
  addition: 'Addition',
};

export const STRUCTURE_TYPE_LABELS: Record<Structure['type'], string> = {
  main: 'Main Structure',
  detached_garage: 'Detached Garage',
  adu: 'ADU / Guest House',
  amenity: 'Amenity Building',
  other: 'Other',
};

export const FOUNDATION_LABELS: Record<ProjectScope['foundation'], string> = {
  slab: 'Slab on Grade',
  crawlspace: 'Crawlspace',
  basement: 'Basement',
  piers: 'Piers / Posts',
};

export const FRAMING_METHOD_LABELS: Record<ProjectScope['framing_method'], string> = {
  stick: 'Stick Framing',
  panelized: 'Panelized',
  hybrid: 'Hybrid',
};

export const DEFAULT_AREAS = [
  'Living Room',
  'Kitchen',
  'Dining Room',
  'Master Bedroom',
  'Bedroom 2',
  'Bedroom 3',
  'Master Bath',
  'Bathroom 2',
  'Laundry',
  'Garage',
  'Porch',
  'Deck',
];
