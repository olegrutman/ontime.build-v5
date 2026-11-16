export const FIELD_PHOTO_MAX_BYTES = 10 * 1024 * 1024;

export function fieldPhotoValidationError(file: Pick<File, 'type' | 'size'>): string | null {
  if (!file.type.startsWith('image/')) return 'Choose an image file.';
  if (file.size > FIELD_PHOTO_MAX_BYTES) return 'Each photo must be 10 MB or smaller.';
  return null;
}

/** Only released work makes a report's photos visible to the wider project. */
export function releasedReportIds(items: Array<{ report_id: string; status: string }>): string[] {
  return [...new Set(items
    .filter(item => item.status === 'released' || item.status === 'converted')
    .map(item => item.report_id))];
}
