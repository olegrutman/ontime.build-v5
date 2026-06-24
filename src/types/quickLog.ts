export type LogItemStatus = 'open' | 'submitted_to_tc' | 'submitted_to_gc' | 'approved' | 'invoiced';

export interface CatalogItem {
  id: string;
  division: string;
  category_id: string;
  category_name: string;
  group_id: string;
  group_label: string;
  item_name: string;
  unit: string;
  category_color: string | null;
  category_bg: string | null;
  category_icon: string | null;
  sort_order: number;
  org_id: string | null;
}

export interface CatalogGroup {
  group_id: string;
  group_label: string;
  items: CatalogItem[];
}

export interface CatalogCategory {
  category_id: string;
  category_name: string;
  category_color: string;
  category_bg: string;
  category_icon: string;
  groups: CatalogGroup[];
  itemCount: number;
}

export interface CatalogDivision {
  division: string;
  label: string;
  categories: CatalogCategory[];
  itemCount: number;
}

export interface LogItem {
  id: string;
  project_id: string;
  org_id: string;
  created_by_user_id: string;
  catalog_item_id: string | null;
  item_name: string;
  division: string;
  category_name: string;
  unit: string;
  qty: number | null;
  hours: number | null;
  unit_rate: number;
  line_total: number;
  material_spec: string | null;
  location: string | null;
  note: string | null;
  status: LogItemStatus;
  linked_change_order_id: string | null;
  created_at: string;
  period_week: string | null;
}

export const DIVISION_LABELS: Record<string, string> = {
  framing: 'Framing',
  exterior: 'Exterior Skin',
  roofing: 'Roofing',
  waterproofing: 'Waterproofing',
  windows_doors: 'Windows & Doors',
  decorative: 'Decorative',
};

export const MATERIAL_SPEC_OPTIONS: Record<string, string[]> = {
  siding: ['Hardie (fiber cement)', 'Cedar — painted', 'Cedar — stained', 'LP SmartSide', 'Pine — painted', 'Redwood', 'Metal panel'],
  fascia_soffit: ['Cedar — painted', 'Cedar — stained', 'FC/Hardie', 'Aluminum wrap', 'PVC trim board'],
  corbels_brackets: ['Cedar — stained', 'Cedar — painted', 'Pine — painted', 'Fiberglass', 'PVC/cellular', 'Redwood'],
  columns_posts: ['Cedar — stained', 'Cedar — painted', 'Pine — painted', 'Fiberglass', 'PVC/cellular', 'Redwood'],
  tg_panel_accents: ['Cedar — stained', 'Cedar — painted', 'Pine — painted', 'Fiberglass', 'PVC/cellular', 'Redwood'],
  ext_trim_details: ['Cedar — stained', 'Cedar — painted', 'Pine — painted', 'Fiberglass', 'PVC/cellular', 'Redwood'],
  windows_doors: ['Vinyl', 'Aluminum clad', 'Fiberglass', 'Wood — painted', 'Wood — stained'],
};

export const DEFAULT_LOCATION_CHIPS = [
  'Bldg A', 'Bldg B', 'Level 1', 'Level 2', 'Level 3', 'Level 4',
  'East elev.', 'West elev.', 'North elev.', 'South elev.', 'Roof deck', 'Garage',
];
