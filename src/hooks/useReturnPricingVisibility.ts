import { Return } from '@/types/return';

interface ReturnPricingVisibility {
  canViewPricing: boolean;
  canEditPricing: boolean;
  canCloseReturn: boolean;
  isSupplier: boolean;
  isPricingOwner: boolean;
}

/**
 * Determines pricing visibility and editability for a Return.
 * 
 * Visibility rules:
 * - Pricing owner org can view pricing
 * - Supplier can view their own pricing
 * - FC can NEVER see pricing
 * 
 * Edit rules:
 * - Supplier can only edit pricing when status is PICKED_UP
 * - Pricing owner can close when status is PRICED
 */
export function useReturnPricingVisibility(
  returnData: Return | null,
  userOrgId: string | null,
  supplierOrgId?: string | null
): ReturnPricingVisibility {
  if (!returnData || !userOrgId) {
    return {
      canViewPricing: false,
      canEditPricing: false,
      canCloseReturn: false,
      isSupplier: false,
      isPricingOwner: false,
    };
  }

  const isPricingOwner = returnData.pricing_owner_org_id === userOrgId;
  const isSupplier = supplierOrgId
    ? supplierOrgId === userOrgId
    : returnData.supplier_org_id === userOrgId;

  const canEditPricing = isSupplier && returnData.status === 'PICKED_UP';
  const canCloseReturn = isPricingOwner && returnData.status === 'PRICED';
  const canViewPricing = isPricingOwner || isSupplier;

  return {
    canViewPricing,
    canEditPricing,
    canCloseReturn,
    isSupplier,
    isPricingOwner,
  };
}
