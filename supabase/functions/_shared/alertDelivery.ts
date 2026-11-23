// Small, dependency-free delivery helpers shared by notification senders.
// Managed email remains responsible for delivery retries and rate limits; this
// only retries a transient request failure once, using the same idempotency key.

export const TRANSIENT_RETRY_DELAY_MS = 250;

export function alertIdempotencyKey(
  notificationId: string,
  userId: string,
  type: string,
): string {
  return `notification:${notificationId}:${userId}:${type}`;
}

export function isRetryableDeliveryError(error: unknown): boolean {
  const candidate = error as { status?: unknown; statusCode?: unknown; code?: unknown } | null;
  const status = Number(candidate?.status ?? candidate?.statusCode ?? 0);
  const code = String(candidate?.code ?? '');

  // Suppression is an expected final outcome. Rate limits carry provider retry
  // timing and must never be retried immediately.
  if (code === 'recipient_suppressed' || status === 429) return false;
  if (status === 408 || status === 425 || status >= 500) return true;

  // A network failure has no HTTP status. Permanent client/validation errors do.
  return status === 0;
}

export function deliveryDelay(attempt: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, TRANSIENT_RETRY_DELAY_MS * attempt));
}
