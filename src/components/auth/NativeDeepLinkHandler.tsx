import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { supabase } from '@/integrations/supabase/client';
import { NATIVE_URL_SCHEME } from '@/lib/authRedirects';

export function NativeDeepLinkHandler() {
  const navigate = useNavigate();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let handle: { remove: () => void } | null = null;
    let cancelled = false;

    CapacitorApp.addListener('appUrlOpen', async ({ url }) => {
      if (!url.startsWith(`${NATIVE_URL_SCHEME}://`)) return;

      const rest = url.slice(`${NATIVE_URL_SCHEME}://`.length);
      const hashIdx = rest.indexOf('#');
      const queryIdx = rest.indexOf('?');
      const splitIdx = [hashIdx, queryIdx].filter(i => i >= 0).reduce((a, b) => Math.min(a, b), rest.length);
      const path = '/' + rest.slice(0, splitIdx);
      const search = queryIdx >= 0 ? '?' + rest.slice(queryIdx + 1, hashIdx >= 0 && hashIdx > queryIdx ? hashIdx : undefined) : '';
      const hash = hashIdx >= 0 ? '#' + rest.slice(hashIdx + 1) : '';

      if (search.includes('code=')) {
        const { error } = await supabase.auth.exchangeCodeForSession(url);
        if (error) {
          console.error('[NativeDeepLinkHandler] exchangeCodeForSession failed', error);
        }
      }

      navigate(`${path}${search}${hash}`, { replace: true });
    }).then(h => {
      if (cancelled) h.remove();
      else handle = h;
    });

    return () => {
      cancelled = true;
      handle?.remove();
    };
  }, [navigate]);

  return null;
}
