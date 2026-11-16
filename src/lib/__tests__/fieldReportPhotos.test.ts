import { describe, expect, it } from 'vitest';
import { FIELD_PHOTO_MAX_BYTES, fieldPhotoValidationError, releasedReportIds } from '../fieldReportPhotos';

describe('field report photos', () => {
  it('shares photos only for reports with released or converted items', () => {
    expect(releasedReportIds([
      { report_id: 'draft-report', status: 'draft' },
      { report_id: 'held-report', status: 'held' },
      { report_id: 'released-report', status: 'released' },
      { report_id: 'ordered-report', status: 'converted' },
      { report_id: 'released-report', status: 'converted' },
    ])).toEqual(['released-report', 'ordered-report']);
  });

  it('accepts images up to 10 MB and rejects other files', () => {
    expect(fieldPhotoValidationError({ type: 'image/jpeg', size: FIELD_PHOTO_MAX_BYTES })).toBeNull();
    expect(fieldPhotoValidationError({ type: 'image/jpeg', size: FIELD_PHOTO_MAX_BYTES + 1 })).toBe('Each photo must be 10 MB or smaller.');
    expect(fieldPhotoValidationError({ type: 'video/mp4', size: 1000 })).toBe('Choose an image file.');
  });
});
