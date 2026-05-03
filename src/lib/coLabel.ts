import type { CODocumentType } from '@/types/changeOrder';

/**
 * Returns "Work Order" / "Work Orders" or "Change Order" / "Change Orders"
 * based on the document_type field on a change_order row.
 */
export function coLabel(docType: CODocumentType, plural = false): string {
  if (docType === 'WO') return plural ? 'Work Orders' : 'Work Order';
  return plural ? 'Change Orders' : 'Change Order';
}

export function coAbbrev(docType: CODocumentType, plural = false): string {
  if (docType === 'WO') return plural ? 'WOs' : 'WO';
  return plural ? 'COs' : 'CO';
}

/** Legacy helper — converts project-level isTM boolean to a CODocumentType */
export function docTypeFromMode(isTM: boolean): CODocumentType {
  return isTM ? 'WO' : 'CO';
}
