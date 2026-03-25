export interface ContractScopeCategory {
  id: string;
  slug: string;
  label: string;
  display_order: number;
}

export interface ContractScopeSelection {
  id: string;
  project_id: string;
  contract_id: string;
  category_slug: string;
  is_included: boolean;
}

export interface ContractScopeDetail {
  id: string;
  selection_id: string;
  detail_key: string;
  detail_value: string;
}

export interface ContractScopeExclusion {
  id: string;
  project_id: string;
  contract_id: string;
  exclusion_label: string;
  is_custom: boolean;
}

// Detail field definitions per category
export interface DetailField {
  key: string;
  label: string;
  type: 'select' | 'toggle';
  options?: string[];
  showWhen?: (details: Record<string, string>) => boolean;
}

export const CATEGORY_DETAILS: Record<string, DetailField[]> = {
  framing: [
    { key: 'wall_system', label: 'Wall System', type: 'select', options: ['Stick Frame', 'Pre-Fabricated Walls'] },
    { key: 'floor_system', label: 'Floor System', type: 'select', options: ['TJI', 'Floor Trusses'] },
    { key: 'roof_system', label: 'Roof System', type: 'select', options: ['Stick Frame', 'Trusses'] },
  ],
  wrb: [
    { key: 'wrb_included', label: 'Included', type: 'toggle' },
    { key: 'wrb_type', label: 'Type', type: 'select', options: ['Tyvek', 'ZIP System', 'Other'] },
  ],
  windows: [
    { key: 'install_included', label: 'Install Included', type: 'toggle' },
    { key: 'window_type', label: 'Window Type', type: 'select', options: ['Vinyl', 'Wood', 'Aluminum', 'Mixed'] },
    { key: 'trim_around_windows', label: 'Trim Around Windows', type: 'toggle' },
    { key: 'trim_type', label: 'Trim Type', type: 'select', options: ['Wood', 'PVC', 'Metal'], showWhen: (d) => d.trim_around_windows === 'true' },
  ],
  exterior_doors: [
    { key: 'install_included', label: 'Install Included', type: 'toggle' },
    { key: 'door_type', label: 'Door Type', type: 'select', options: ['Sliding', 'French', 'Standard Exterior'] },
  ],
  siding: [
    { key: 'siding_included', label: 'Included', type: 'toggle' },
    { key: 'siding_type', label: 'Type', type: 'select', options: ['Vinyl', 'Hardie (Fiber Cement)', 'Wood', 'Metal', 'Mixed'] },
    { key: 'scope_level', label: 'Scope Level', type: 'select', options: ['Full Siding', 'Partial Siding'] },
  ],
  exterior_trim: [
    { key: 'trim_included', label: 'Included', type: 'toggle' },
    { key: 'trim_type', label: 'Type', type: 'select', options: ['Wood', 'PVC', 'Composite'] },
  ],
  soffit_fascia: [
    { key: 'included', label: 'Included', type: 'toggle' },
    { key: 'fascia_type', label: 'Fascia Type', type: 'select', options: ['Wood', 'Aluminum Wrapped', 'PVC'] },
    { key: 'soffit_type', label: 'Soffit Type', type: 'select', options: ['Vented Vinyl', 'Hardie', 'Wood'] },
  ],
  decks_railings: [
    { key: 'included', label: 'Included', type: 'toggle' },
    { key: 'deck_type', label: 'Type', type: 'select', options: ['Wood Decking', 'Composite Decking'] },
    { key: 'railings', label: 'Railings Included', type: 'toggle' },
  ],
  garage_framing: [
    { key: 'framing_included', label: 'Framing Included', type: 'toggle' },
    { key: 'trim_around_openings', label: 'Trim Around Openings', type: 'toggle' },
  ],
};

export const COMMON_EXCLUSIONS = [
  'Cabinets',
  'Fixtures',
  'Electrical',
  'Plumbing',
  'Drywall',
  'Paint',
  'Flooring',
];
