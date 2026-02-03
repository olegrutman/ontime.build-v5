// New Project Wizard Types - Simplified for jobsite use

export const PROJECT_TYPES = [
  'Single Family Home',
  'Apartments/Condos',
  'Townhomes',
  'Duplex',
  'Hotels',
] as const;

export type ProjectType = typeof PROJECT_TYPES[number];

export const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
] as const;

export const TEAM_ROLES = [
  'General Contractor',
  'Trade Contractor', 
  'Field Crew',
  'Supplier',
] as const;

export type TeamRole = typeof TEAM_ROLES[number];

export const TRADES = [
  'Framer', 'Drywall', 'Electrician', 'Plumber', 'HVAC',
  'Roofer', 'Siding', 'Concrete', 'Painter', 'Flooring',
  'Cabinets', 'Insulation', 'Masonry', 'Windows/Doors', 'Other'
] as const;

export type Trade = typeof TRADES[number];

export interface TeamMember {
  id: string;
  companyName: string;
  contactName: string;
  contactEmail: string;
  role: TeamRole;
  trade?: Trade;
  tradeCustom?: string;
}

export interface ProjectContract {
  toTeamMemberId: string;
  contractSum: number;
  retainagePercent: number;
  allowMobilization: boolean;
  notes?: string;
  // Who is responsible for material costs (GC or TC)
  materialResponsibility?: 'GC' | 'TC';
}

export interface ProjectBasics {
  name: string;
  projectType: ProjectType | '';
  address: string;
  city: string;
  state: string;
  zip: string;
  startDate?: string;
}

export interface ScopeDetails {
  // Single Family fields
  homeType?: 'Custom Home' | 'Track Home';
  floors?: number;
  foundationType?: 'Slab' | 'Crawl Space' | 'Basement';
  basementType?: 'Walkout' | 'Garden Level' | 'Standard';
  basementFinish?: 'Finished' | 'Unfinished' | 'Partially Finished';
  stairsType?: 'Field Built' | 'Manufactured' | 'Both';
  hasElevator?: boolean;
  shaftType?: string;
  shaftTypeNotes?: string;
  roofType?: 'Gable' | 'Hip' | 'Flat' | 'Mixed';
  hasRoofDeck?: boolean;
  roofDeckType?: 'Framed' | 'Concrete' | 'Other';
  hasCoveredPorches?: boolean;
  hasBalconies?: boolean;
  balconyType?: string;
  deckingIncluded?: boolean;
  deckingType?: string;
  deckingTypeOther?: string;
  sidingIncluded?: boolean;
  sidingMaterials?: string[];
  sidingMaterialOther?: string;
  decorativeIncluded?: boolean;
  decorativeItems?: string[];
  decorativeItemOther?: string;
  fasciaIncluded?: boolean;
  soffitIncluded?: boolean;
  fasciaSoffitMaterial?: string;
  fasciaSoffitMaterialOther?: string;
  windowsIncluded?: boolean;
  wrbIncluded?: boolean;
  extDoorsIncluded?: boolean;
  // Multi-building fields
  numBuildings?: number;
  stories?: number;
  constructionType?: string;
  constructionTypeOther?: string;
  // Townhome/Duplex specific
  numUnits?: number;
  storiesPerUnit?: number;
  hasSharedWalls?: boolean;
}

export interface NewProjectWizardData {
  basics: ProjectBasics;
  team: TeamMember[];
  scope: ScopeDetails;
  contracts: ProjectContract[];
  projectId?: string; // Set after basics are saved
}

export const WIZARD_STEPS = [
  { id: 'basics', label: 'Project Basics', description: 'Name, type, and location' },
  { id: 'team', label: 'Project Team', description: 'Invite contractors and crew' },
  { id: 'scope', label: 'Scope & Details', description: 'Framing-relevant details' },
  { id: 'contracts', label: 'Project Contracts', description: 'Contract terms' },
  { id: 'review', label: 'Review', description: 'Review and create' },
] as const;

export const SIDING_MATERIALS = [
  'Fiber Cement', 'Vinyl', 'Wood', 'Metal', 'Stucco (Lath)', 
  'Stone Veneer', 'Brick Veneer', 'Other'
] as const;

export const DECORATIVE_ITEMS = [
  'Corbels', 'Columns', 'Decorative Beams', 'Brackets', 'Faux Trusses', 'Other'
] as const;

export const FASCIA_SOFFIT_MATERIALS = [
  'Wood', 'Fiber Cement', 'Metal', 'Vinyl', 'Other'
] as const;

export const BALCONY_TYPES = [
  'Cantilever Framed', 'Ledger Supported', 'Pre-fab System', 'Other'
] as const;

export const DECKING_TYPES = [
  'Wood Framed', 'Composite', 'Waterproof Deck System', 'Other'
] as const;

export const CONSTRUCTION_TYPES = [
  'Wood Frame', 'Podium (wood over concrete)', 'Mixed Use', 'Other'
] as const;
