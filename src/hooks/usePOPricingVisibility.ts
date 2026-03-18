import { PurchaseOrder } from '@/types/purchaseOrder';

interface POPricingVisibility {
  canViewPricing: boolean;
  canEditPricing: boolean;
  canFinalize: boolean;
  isSupplier: boolean;
  isPricingOwner: boolean;
}

/**
 * Hook to determine pricing visibility and editability for a Purchase Order.
 * 
 * Visibility rules:
 * - Pricing owner org (GC or TC based on material_responsibility) can view pricing
 * - Supplier can view their own pricing
 * - FC can NEVER see pricing
 * 
 * Edit rules:
 * - Supplier can only edit pricing when PO status is SUBMITTED
 * - Pricing owner can finalize when status is PRICED
 */
export function usePOPricingVisibility(
  po: PurchaseOrder | null,
  userOrgId: string | null,
  supplierOrgId?: string | null
): POPricingVisibility {
  if (!po || !userOrgId) {
    return { 
      canViewPricing: false, 
      canEditPricing: false, 
      canFinalize: false,
      isSupplier: false,
      isPricingOwner: false,
    };
  }

  // Check if user is the pricing owner org (GC or TC based on material_responsibility)
  const isPricingOwner = po.pricing_owner_org_id === userOrgId;
  
  // Check if user is the supplier for this PO
  // supplierOrgId can be passed explicitly, or derived from po.supplier
  const isSupplier = supplierOrgId 
    ? supplierOrgId === userOrgId 
    : (po.supplier as { organization_id?: string })?.organization_id === userOrgId;
  
  // Supplier can add/edit pricing while pricing is still in progress
  const canEditPricing = isSupplier && (po.status === 'SUBMITTED' || po.status === 'PRICED');
  
  // Only pricing owner can finalize after supplier pricing is locked
  const canFinalize = isPricingOwner && po.status === 'PRICED';
  
  // Can view pricing if you're the pricing owner OR the supplier
  const canViewPricing = isPricingOwner || isSupplier;
  
  return {
    canViewPricing,
    canEditPricing,
    canFinalize,
    isSupplier,
    isPricingOwner,
  };
}
