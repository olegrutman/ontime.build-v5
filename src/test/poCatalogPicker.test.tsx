import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { QuantityPanel } from '@/components/po-wizard-v2/QuantityPanel';
import { StepByStepFilter } from '@/components/po-wizard-v2/StepByStepFilter';
import type { CatalogProduct } from '@/types/poWizardV2';

const query = vi.hoisted(() => ({ eq: vi.fn(), match: vi.fn(), select: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: () => query } }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });
const product = {
  id: 'box', supplier_sku: 'OTB-00689', name: 'Connector', description: 'Connector',
  category: 'Hardware', bundle_type: 'Box', bundle_qty: 25, uom_default: 'EA',
} as CatalogProduct;

describe('catalog package quantities', () => {
  it('starts at 294 pieces and steps one entire bundle to 588 and back', () => {
    const add = vi.fn();
    render(<QuantityPanel product={{ ...product, bundle_type: 'Bundle', bundle_qty: 294 }} onAdd={add} onClose={() => {}} />);
    expect((screen.getByRole('spinbutton') as HTMLInputElement).value).toBe('294');
    fireEvent.click(screen.getByRole('button', { name: 'Add one package' }));
    expect((screen.getByRole('spinbutton') as HTMLInputElement).value).toBe('588');
    fireEvent.click(screen.getByRole('button', { name: 'Remove one package' }));
    expect((screen.getByRole('spinbutton') as HTMLInputElement).value).toBe('294');
    expect(screen.getByRole('button', { name: 'Remove one package' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Add to PO' }));
    expect(add.mock.calls[0][0]).toMatchObject({ quantity: 294, bundle_count: 294, unit_mode: 'BUNDLE' });
  });
  it('adds two boxes of 25 as 50 base units, without losing package mode', () => {
    const add = vi.fn();
    render(<QuantityPanel product={product} onAdd={add} onClose={() => {}} />);
    fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '50' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add to PO' }));
    expect(add.mock.calls[0][0]).toMatchObject({ quantity: 50, uom: 'EA', unit_mode: 'BUNDLE', bundle_count: 25 });
  });
  it('preserves two boxes when reopening an existing 50-unit line', () => {
    const update = vi.fn();
    render(<QuantityPanel product={product} onAdd={() => {}} onUpdate={update} onClose={() => {}}
      editingItem={{ id: 'line', catalog_item_id: 'box', supplier_sku: 'OTB-00689', name: 'Connector', specs: '', quantity: 50, unit_mode: 'BUNDLE', uom: 'EA', unit_price: 2 }} />);
    fireEvent.click(screen.getByRole('button', { name: 'Update Item' }));
    expect(update.mock.calls[0][0]).toMatchObject({ quantity: 50, line_total: 100, unit_mode: 'BUNDLE' });
  });
  it('orders individual units without package multiplication', () => {
    const add = vi.fn();
    render(<QuantityPanel product={product} onAdd={add} onClose={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'Individual' }));
    fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add to PO' }));
    expect(add.mock.calls[0][0]).toMatchObject({ quantity: 2, unit_mode: 'EACH' });
  });
});

describe('catalog funnel candidate scope', () => {
  it('only discovers active items for the selected supplier, excluding retired-only dimensions', async () => {
    const matches: Record<string, string>[] = [];
    query.select.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    query.match.mockImplementation((scope) => {
      matches.push(scope);
      return Promise.resolve({ data: [{ dimension: '2×4' }], count: 1 });
    });
    render(<StepByStepFilter supplierId="master" category="FramingLumber" secondaryCategory={null}
      onComplete={() => {}} onBack={() => {}} onClose={() => {}} fixedSequence={['dimension']} />);
    await waitFor(() => expect(query.match).toHaveBeenCalledTimes(2));
    expect(query.eq.mock.calls).toEqual([['is_active', true], ['is_active', true]]);
    expect(matches).toEqual([{ supplier_id: 'master', category: 'FramingLumber' }, { supplier_id: 'master', category: 'FramingLumber' }]);
  });
});
describe('single-option funnel steps', () => {
  it('auto-applies a step with exactly one option and completes without asking', async () => {
    const complete = vi.fn();
    query.select.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    query.match.mockResolvedValue({ data: [{ length: '12' }], count: 1 });
    render(<StepByStepFilter supplierId="master" category="Exterior" secondaryCategory="Siding & Exterior Panels"
      onComplete={complete} onBack={() => {}} onClose={() => {}} fixedSequence={['length']} />);
    await waitFor(() => expect(complete).toHaveBeenCalledWith({ length: '12' }));
  });

  it('Back skips auto-applied steps and lands on the last real choice', async () => {
    const { computeBackStep } = await import('@/components/po-wizard-v2/StepByStepFilter');
    const seq = ['manufacturer', 'dimension', 'length'];
    // length was auto-applied (single option): Back from the end lands on dimension
    expect(computeBackStep(seq, new Set(['length']), 2)).toBe(1);
    // both trailing steps auto-applied: Back lands on manufacturer
    expect(computeBackStep(seq, new Set(['dimension', 'length']), 2)).toBe(0);
    // nothing auto-applied: normal one-step back
    expect(computeBackStep(seq, new Set(), 2)).toBe(1);
  });
});
