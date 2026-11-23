import { describe, expect, it } from 'vitest';
import {
  alertIdempotencyKey,
  isRetryableDeliveryError,
} from '../../supabase/functions/_shared/alertDelivery';

describe('alert delivery safeguards', () => {
  it('uses one stable key for every retry of the same recipient alert', () => {
    const first = alertIdempotencyKey('notification-1', 'user-1', 'INVOICE_PAID');
    const retry = alertIdempotencyKey('notification-1', 'user-1', 'INVOICE_PAID');

    expect(retry).toBe(first);
    expect(first).not.toBe(alertIdempotencyKey('notification-1', 'user-2', 'INVOICE_PAID'));
    expect(first).not.toBe(alertIdempotencyKey('notification-2', 'user-1', 'INVOICE_PAID'));
  });

  it('retries network errors and transient server responses', () => {
    expect(isRetryableDeliveryError(new TypeError('network failed'))).toBe(true);
    expect(isRetryableDeliveryError({ status: 408 })).toBe(true);
    expect(isRetryableDeliveryError({ status: 500 })).toBe(true);
    expect(isRetryableDeliveryError({ statusCode: 503 })).toBe(true);
  });

  it('does not immediately retry suppression, rate limits, or permanent client errors', () => {
    expect(isRetryableDeliveryError({ code: 'recipient_suppressed' })).toBe(false);
    expect(isRetryableDeliveryError({ status: 429 })).toBe(false);
    expect(isRetryableDeliveryError({ status: 400 })).toBe(false);
    expect(isRetryableDeliveryError({ status: 404 })).toBe(false);
    expect(isRetryableDeliveryError({ status: 410 })).toBe(false);
  });
});
