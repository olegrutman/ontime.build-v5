import { Capacitor } from '@capacitor/core';

export const NATIVE_URL_SCHEME = 'build.ontime';

export function authCallbackUrl(): string {
  if (Capacitor.isNativePlatform()) {
    return `${NATIVE_URL_SCHEME}://auth/callback`;
  }
  return `${window.location.origin}/auth/callback`;
}

export function passwordResetUrl(): string {
  if (Capacitor.isNativePlatform()) {
    return `${NATIVE_URL_SCHEME}://reset-password`;
  }
  return `${window.location.origin}/reset-password`;
}

export function isNativeAuthUrl(url: string): boolean {
  return url.startsWith(`${NATIVE_URL_SCHEME}://`);
}
