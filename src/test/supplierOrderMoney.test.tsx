import { renderHook } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { usePOMoney } from '@/components/purchase-orders/POMoneyBar';
import type { PurchaseOrder } from '@/types/purchaseOrder';

describe('supplier order money bar', () => {
  const orders = [
    {id:'delivery', status:'DELIVERED', po_total:1000},
    {id:'quote', status:'PRICED', po_total:500},
    {id:'ready', status:'READY_FOR_DELIVERY', po_total:null, po_subtotal_total:100, sales_tax_percent:10},
  ] as PurchaseOrder[];
  it('agrees with committed supplier totals, excluding a priced quote and including tax fallback', () => {
    const {result} = renderHook(() => usePOMoney(orders, true));
    expect(result.current.committedTotal).toBeCloseTo(1110,2);
    expect(result.current.committedCount).toBe(2);
  });
  it('shows the unpaid invoice coverage remainder on partially invoiced deliveries', () => {
    const {result} = renderHook(() => usePOMoney(orders, true, new Set(['delivery']),14,{delivery:100}));
    expect(result.current.uninvoicedTotal).toBe(900);
    expect(result.current.uninvoicedCount).toBe(1);
  });
});