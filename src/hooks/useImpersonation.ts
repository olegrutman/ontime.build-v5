import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

const STORAGE_KEYS = {
  originalSession: 'impersonation_original_session',
  targetEmail: 'impersonation_target_email',
  startedAt: 'impersonation_started_at',
  targetUserId: 'impersonation_target_user_id',
};

const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

export function useImpersonation() {
  const [isImpersonating, setIsImpersonating] = useState(
    () => !!sessionStorage.getItem(STORAGE_KEYS.originalSession)
  );
  const [targetEmail, setTargetEmail] = useState(
    () => sessionStorage.getItem(STORAGE_KEYS.targetEmail) || ''
  );
  const [remainingMs, setRemainingMs] = useState(0);
  const endImpersonationRef = useRef<() => Promise<void>>();

  // Update countdown using ref to avoid stale closure
  useEffect(() => {
    if (!isImpersonating) return;

    const update = () => {
      const startedAt = Number(sessionStorage.getItem(STORAGE_KEYS.startedAt) || 0);
      const elapsed = Date.now() - startedAt;
      const remaining = Math.max(0, SESSION_TIMEOUT_MS - elapsed);
      setRemainingMs(remaining);
      if (remaining <= 0) {
        endImpersonationRef.current?.();
      }
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [isImpersonating]);

  const startImpersonation = useCallback(
    async (userId: string, reason: string, navigate: (path: string) => void) => {
      try {
        // Save current session
        const { data: currentSession } = await supabase.auth.getSession();
        if (!currentSession.session) {
          toast({ title: 'Error', description: 'No active session', variant: 'destructive' });
          return false;
        }

        const { data, error } = await supabase.functions.invoke('platform-impersonate', {
          body: { operation: 'start', target_user_id: userId, reason },
        });

        if (error || data?.error) {
          toast({
            title: 'Impersonation failed',
            description: data?.error || error?.message,
            variant: 'destructive',
          });
          return false;
        }

        // Store original session
        sessionStorage.setItem(
          STORAGE_KEYS.originalSession,
          JSON.stringify({
            access_token: currentSession.session.access_token,
            refresh_token: currentSession.session.refresh_token,
          })
        );
        sessionStorage.setItem(STORAGE_KEYS.targetEmail, data.target_email);
        sessionStorage.setItem(STORAGE_KEYS.startedAt, String(Date.now()));
        sessionStorage.setItem(STORAGE_KEYS.targetUserId, userId);

        // Set new session
        const { error: sessionErr } = await supabase.auth.setSession({
          access_token: data.access_token,
          refresh_token: data.refresh_token,
        });

        if (sessionErr) {
          // Clean up
          Object.values(STORAGE_KEYS).forEach((k) => sessionStorage.removeItem(k));
          toast({ title: 'Session error', description: sessionErr.message, variant: 'destructive' });
          return false;
        }

        setIsImpersonating(true);
        setTargetEmail(data.target_email);
        navigate('/dashboard');
        return true;
      } catch (err: any) {
        toast({ title: 'Error', description: err.message, variant: 'destructive' });
        return false;
      }
    },
    []
  );

  const endImpersonation = useCallback(async () => {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEYS.originalSession);
      const targetUserId = sessionStorage.getItem(STORAGE_KEYS.targetUserId);

      // Log end (best-effort)
      try {
        await supabase.functions.invoke('platform-impersonate', {
          body: { operation: 'end', target_user_id: targetUserId },
        });
      } catch {}

      // Clear storage
      Object.values(STORAGE_KEYS).forEach((k) => sessionStorage.removeItem(k));
      setIsImpersonating(false);
      setTargetEmail('');

      if (stored) {
        const { access_token, refresh_token } = JSON.parse(stored);

        // Try setSession first
        const { error: setErr } = await supabase.auth.setSession({ access_token, refresh_token });

        if (setErr) {
          // Fallback: use refresh token only
          const { error: refreshErr } = await supabase.auth.refreshSession({ refresh_token });

          if (refreshErr) {
            // Both failed — sign out and redirect to auth
            await supabase.auth.signOut();
            toast({
              title: 'Session expired',
              description: 'Your platform session expired. Please sign in again.',
              variant: 'destructive',
            });
            window.location.href = '/auth';
            return;
          }
        }

        window.location.href = '/platform';
      } else {
        // No stored session — sign out
        await supabase.auth.signOut();
        window.location.href = '/auth';
      }
    } catch (err) {
      // Force sign out as fallback
      Object.values(STORAGE_KEYS).forEach((k) => sessionStorage.removeItem(k));
      await supabase.auth.signOut();
      window.location.href = '/auth';
    }
  }, []);

  // Keep ref in sync
  endImpersonationRef.current = endImpersonation;

  return {
    isImpersonating,
    targetEmail,
    remainingMs,
    startImpersonation,
    endImpersonation,
  };
}
