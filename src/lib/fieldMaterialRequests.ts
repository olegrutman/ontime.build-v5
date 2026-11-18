import type { POWizardV2LineItem } from '@/types/poWizardV2';

export interface FieldMaterialContext {
  source?: string;
  catalog_item_id?: string;
  supplier_id?: string;
  sku?: string;
  unit_mode?: 'EACH' | 'BUNDLE';
  bundle_count?: number;
  bundle_name?: string;
  length_ft?: number;
  computed_lf?: number;
  is_engineered?: boolean;
  item_notes?: string;
}

export function isStructuredMaterialItem(item: any): boolean {
  return item?.kind === 'material' && !!item?.catalog_item_id && !!item?.supplier_id;
}

export function fieldMaterialDescription(line: POWizardV2LineItem): string {
  return [line.name.trim(), line.specs.trim()].filter(Boolean).join(' — ');
}

/** Only product identity, quantity and fulfillment details cross into a crew's report. */
export function fieldMaterialSelection(line: POWizardV2LineItem) {
  return {
    description: fieldMaterialDescription(line),
    quantity: line.quantity,
    unit: line.uom,
    catalog_item_id: line.catalog_item_id,
    material_context: {
      source: 'daily_report_picker',
      catalog_item_id: line.catalog_item_id,
      sku: line.supplier_sku,
      unit_mode: line.unit_mode,
      bundle_count: line.unit_mode === 'BUNDLE' ? line.bundle_count : undefined,
      bundle_name: line.unit_mode === 'BUNDLE' ? line.bundle_name : undefined,
      length_ft: line.is_engineered ? line.length_ft : undefined,
      computed_lf: line.is_engineered ? line.computed_lf : undefined,
      is_engineered: !!line.is_engineered,
      item_notes: line.item_notes?.trim() || undefined,
    } satisfies FieldMaterialContext,
  };
}

export function pickerLineForFieldItem(item: any): POWizardV2LineItem {
  const context = (item.material_context || {}) as FieldMaterialContext;
  return {
    id: item.id,
    catalog_item_id: item.catalog_item_id,
    supplier_sku: context.sku || '',
    name: item.description,
    specs: '',
    quantity: Number(item.quantity),
    unit_mode: context.unit_mode === 'BUNDLE' ? 'BUNDLE' : 'EACH',
    bundle_count: context.bundle_count,
    bundle_name: context.bundle_name,
    uom: item.unit,
    length_ft: context.length_ft,
    computed_lf: context.computed_lf,
    is_engineered: !!context.is_engineered,
    item_notes: context.item_notes,
  };
}

/** Ordered is reserved for the supplier's actual order confirmation, never draft creation. */
export function fieldMaterialOrderStatusLabel(status?: string | null): string {
  switch (status) {
    case 'DRAFT':
    case 'ACTIVE': return 'Draft order · not sent';
    case 'PENDING_APPROVAL': return 'Awaiting approval to send';
    case 'SENT':
    case 'SUBMITTED': return 'Sent to supplier';
    case 'PRICED': return 'Supplier pricing received';
    case 'ORDERED': return 'Ordered';
    case 'READY_FOR_DELIVERY': return 'Ready for delivery';
    case 'DELIVERED': return 'Delivered';
    case 'FINALIZED': return 'Completed';
    default: return 'Order status unavailable';
  }
}
