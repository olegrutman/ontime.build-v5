import { describe, expect, it } from 'vitest';
import type { POWizardV2LineItem } from '@/types/poWizardV2';
import { fieldMaterialOrderStatusLabel, fieldMaterialSelection, pickerLineForFieldItem } from '@/lib/fieldMaterialRequests';

const line: POWizardV2LineItem = {
  id: 'draft-1', catalog_item_id: 'catalog-1', supplier_sku: 'OTB-00165',
  name: 'Cedar appearance board — 1-7/16×10 × 16 ft', specs: '1-7/16×10 · 16 ft · CEDAR', quantity: 588,
  unit_mode: 'BUNDLE', bundle_count: 294, bundle_name: 'Bundle', uom: 'EA',
  item_notes: 'Front windows', unit_price: 125, line_total: 73500,
  source_estimate_item_id: 'estimate-1', price_source: 'FROM_ESTIMATE', original_unit_price: 125,
};

describe('daily report material requests', () => {
  it('preserves exact product, base quantity and package details without any pricing', () => {
    const saved = fieldMaterialSelection(line);
    expect(saved.catalog_item_id).toBe('catalog-1');
    expect(saved.quantity).toBe(588);
    expect(saved.unit).toBe('EA');
    expect(saved.material_context.bundle_count).toBe(294);
    expect(saved.description).toBe('Cedar appearance board — 1-7/16×10 × 16 ft');
    expect(JSON.stringify(saved)).not.toMatch(/unit_price|line_total|original_unit_price|price_source|source_estimate/);
    expect(JSON.stringify(saved)).not.toContain('125');
  });

  it('reopens a saved request without restoring hidden prices', () => {
    const restored = pickerLineForFieldItem({ id: 'item-1', description: 'Cedar board', quantity: 588, unit: 'EA', catalog_item_id: 'catalog-1', material_context: fieldMaterialSelection(line).material_context });
    expect(restored.quantity).toBe(588);
    expect(restored.unit_mode).toBe('BUNDLE');
    expect(restored.bundle_count).toBe(294);
    expect(restored.unit_price).toBeUndefined();
    expect(restored.line_total).toBeUndefined();
  });

  it('calls only a supplier-confirmed order Ordered', () => {
    expect(fieldMaterialOrderStatusLabel('ACTIVE')).toBe('Draft order · not sent');
    expect(fieldMaterialOrderStatusLabel('PENDING_APPROVAL')).toBe('Awaiting approval to send');
    expect(fieldMaterialOrderStatusLabel('SUBMITTED')).toBe('Sent to supplier');
    expect(fieldMaterialOrderStatusLabel('ORDERED')).toBe('Ordered');
  });
});
