import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createRef } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { advanceHardware, classifyHardware, filterHardware, HARDWARE_FIELDS, isExactHardwareModel } from '@/lib/hardwareFunnel';
import { HardwarePicker, type HardwarePickerHandle } from '@/components/po-wizard-v2/HardwarePicker';
import type { CatalogProduct } from '@/types/poWizardV2';

const query = vi.hoisted(() => ({ select: vi.fn(), eq: vi.fn(), order: vi.fn(), range: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: () => query } }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });
const p = (name: string, description: string, secondary_category = 'Post Bases & Caps') => ({ id: name, name, description, secondary_category, category: 'Hardware', supplier_sku: name, uom_default: 'EA' } as CatalogProduct);
const base44 = p('Post base/cap connector — ABA44Z', 'Post base/cap connector, model ABA44Z. Supplier details: Adj Post Base 4X4 Z-max.');
const base66 = p('Post base/cap connector — ABA66Z', 'Post base/cap connector, model ABA66Z. Supplier details: Adj Post Base 6X6 Z-max.');
const cap44 = p('Post base/cap connector — AC4', 'Post base/cap connector, model AC4. Supplier details: Post Cap 4X4.');

describe('guided hardware rules', () => {
  it('fits family, application, size, model and quantity into at most five steps', () => {
    expect(HARDWARE_FIELDS.length + 2).toBe(5);
  });
  it('extracts the explicit post size and distinguishes bases from caps', () => {
    expect(classifyHardware(base44)).toMatchObject({ family: 'Post Bases & Caps', application: 'Post base', size: '4 × 4' });
    expect(classifyHardware(cap44).application).toBe('Post cap');
  });
  it('keeps top flange widths without decoding model numbers', () => {
    expect(classifyHardware(p('Top-flange hanger — BA3.56/14', 'Top-flange hanger, model BA3.56/14. Supplier details: Top Flange Hanger 3-1/2" Wide.', ' HANGER '))).toMatchObject({ family: 'Joist & Beam Hangers', application: 'Top flange', size: '3-1/2 in wide' });
    expect(classifyHardware(p('Hanger — LUS210', 'Hanger model LUS210.', 'HANGER')).size).toBe('Size not specified');
  });
  it('preserves unknown hardware as selectable candidates', () => {
    const row = classifyHardware(p('Special connector', 'No documented dimensions', ' OTHER '));
    expect(filterHardware([row], { family: 'Other hardware' })).toEqual([row]);
  });
  it('uses explicit screw and protective-plate evidence over coarse categories', () => {
    expect(classifyHardware(p('Framing bracket/plate', 'Supplier details: SD #9X1-1/2" Structural Connector Screw.', 'PLATES CONNECTORS AND CLIPS')).family).toBe('Screws & Fasteners');
    expect(classifyHardware(p('Nail stopper plate', 'Protective plate', 'FASTENERS')).family).toBe('Angles, Brackets & Clips');
  });
  it('preserves fractional anchor dimensions rather than dropping the denominator', () => {
    expect(classifyHardware(p('Concrete anchor', 'Supplier details: Wedge-all Concrete Anchor 1/2X3-3/4.', 'ANCHORS')).size).toBe('1/2 × 3-3/4');
  });
  it('auto-applies one-option steps and retains the full matching set', () => {
    const rows = [base44, cap44].map(classifyHardware);
    const first = advanceHardware(rows, {}, 0);
    expect(first).toEqual({ index: 1, selection: { family: 'Post Bases & Caps' } });
    const next = advanceHardware(rows, { ...first.selection, application: 'Post base' }, 2);
    expect(next.index).toBe(3);
    expect(filterHardware(rows, next.selection).map(r => r.product.id)).toEqual([base44.id]);
  });
  it('matches known manufacturer codes exactly, not code prefixes', () => {
    expect(isExactHardwareModel(base44, 'aba44z')).toBe(true);
    expect(isExactHardwareModel(base44, 'ABA44')).toBe(false);
  });
});

describe('hardware picker supplier scope and navigation', () => {
  it('loads all active supplier pages and Back returns to the last real choice', async () => {
    query.select.mockReturnValue(query); query.eq.mockReturnValue(query); query.order.mockReturnValue(query);
    query.range.mockResolvedValueOnce({ data: Array.from({ length: 500 }, (_, i) => ({ ...base44, id: `base-${i}` })) })
      .mockResolvedValueOnce({ data: [base66, cap44] });
    const ref = createRef<HardwarePickerHandle>();
    const exit = vi.fn(), select = vi.fn();
    render(<HardwarePicker ref={ref} supplierId="chosen-supplier" onSelect={select} onBack={exit} />);
    await waitFor(() => expect(screen.getByRole('button', { name: /Post base 501/ })).toBeVisible());
    expect(query.eq.mock.calls).toEqual([['supplier_id', 'chosen-supplier'], ['category', 'Hardware'], ['is_active', true], ['supplier_id', 'chosen-supplier'], ['category', 'Hardware'], ['is_active', true]]);
    expect(query.range.mock.calls).toEqual([[0, 499], [500, 999]]);
    fireEvent.click(screen.getByRole('button', { name: /Post cap 1/ }));
    fireEvent.click(screen.getByRole('button', { name: /Post base\/cap connector — AC4/ }));
    expect(select).toHaveBeenCalledWith(cap44);
    const { act } = await import('@testing-library/react');
    act(() => ref.current?.goBack());
    expect(screen.getByRole('button', { name: /Post base 501/ })).toBeVisible();
    act(() => ref.current?.goBack());
    expect(exit).toHaveBeenCalledOnce();
  });
});