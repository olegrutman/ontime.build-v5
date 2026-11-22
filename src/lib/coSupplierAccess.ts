export interface SupplierParticipantLike {
  organization_id: string;
  role: string;
  invite_status: string;
}

export function hasAcceptedSupplierParticipant(
  participants: SupplierParticipantLike[],
  supplierOrgId: string | null | undefined,
): boolean {
  if (!supplierOrgId) return false;
  return participants.some(participant =>
    participant.organization_id === supplierOrgId
    && participant.role === 'SUPPLIER'
    && participant.invite_status === 'ACCEPTED'
  );
}

export const SUPPLIER_PROJECT_ACCESS_MESSAGE =
  'Add the supplier to this project and have them accept the invitation before creating or sending a pricing request.';
