export type PackType = 'LOOSE_MODIFIABLE' | 'ENGINEERED_LOCKED';
export type EstimateStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';

export interface Project {
  id: string;
  organization_id: string;
  name: string;
  description?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectEstimate {
  id: string;
  project_id: string;
  supplier_id: string;
  name: string;
  status: EstimateStatus;
  submitted_at?: string;
  approved_at?: string;
  approved_by?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  project?: { id: string; name: string } | null;
  supplier?: { id: string; name: string; supplier_code: string } | null;
  packs?: EstimatePack[];
}

export interface EstimatePack {
  id: string;
  estimate_id: string;
  pack_name: string;
  pack_type: PackType;
  sort_order: number;
  created_at: string;
  updated_at: string;
  items?: PackItem[];
}

export interface PackItem {
  id: string;
  pack_id: string;
  catalog_item_id?: string;
  supplier_sku?: string;
  description: string;
  quantity: number;
  uom: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface EstimateCSVRow {
  pack_name: string;
  pack_type: PackType;
  supplier_sku?: string;
  description: string;
  quantity: number;
  uom: string;
  notes?: string;
}

export const PACK_TYPE_LABELS: Record<PackType, string> = {
  LOOSE_MODIFIABLE: 'Loose (Modifiable)',
  ENGINEERED_LOCKED: 'Engineered (Locked)',
};

export const ESTIMATE_STATUS_LABELS: Record<EstimateStatus, string> = {
  DRAFT: 'Draft',
  SUBMITTED: 'Submitted',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
};

export function parseEstimateCSV(csvText: string): EstimateCSVRow[] {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) return [];

  const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase().trim());
  const rows: EstimateCSVRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length === 0) continue;

    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = values[index]?.trim() || '';
    });

    const packName = row['pack_name'] || row['pack'] || '';
    const packTypeRaw = row['pack_type'] || row['type'] || 'LOOSE_MODIFIABLE';
    const packType = normalizePackType(packTypeRaw);
    const description = row['description'] || row['desc'] || '';
    const quantity = parseFloat(row['quantity'] || row['qty'] || '1') || 1;

    if (!packName || !description) continue;

    rows.push({
      pack_name: packName,
      pack_type: packType,
      supplier_sku: row['supplier_sku'] || row['sku'] || undefined,
      description,
      quantity,
      uom: row['uom'] || row['unit'] || 'EA',
      notes: row['notes'] || undefined,
    });
  }

  return rows;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

function normalizePackType(type: string): PackType {
  const upper = type.toUpperCase().trim();
  if (upper === 'ENGINEERED_LOCKED' || upper === 'ENGINEERED' || upper === 'LOCKED') {
    return 'ENGINEERED_LOCKED';
  }
  return 'LOOSE_MODIFIABLE';
}
