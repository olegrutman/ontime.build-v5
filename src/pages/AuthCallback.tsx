import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { OntimeLogo } from '@/components/ui/OntimeLogo';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

type CallbackState = 'loading' | 'success' | 'error';

export default function AuthCallback() {
  const navigate = useNavigate();
  const [state, setState] = useState<CallbackState>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [resendEmail, setResendEmail] = useState('');
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  useEffect(() => {
    const processCallback = async () => {
      // Check URL hash for error params (Supabase puts them in the hash)
      const hash = window.location.hash;
      if (hash) {
        const params = new URLSearchParams(hash.substring(1));
        const error = params.get('error');
        const errorDescription = params.get('error_description');

        if (error) {
          setState('error');
          setErrorMessage(
            errorDescription?.replace(/\+/g, ' ') ||
            'The verification link is invalid or has expired.'
          );
          return;
        }
      }

      // Check URL query params for error (some flows use query params)
      const searchParams = new URLSearchParams(window.location.search);
      const errorParam = searchParams.get('error');
      const errorDesc = searchParams.get('error_description');

      if (errorParam) {
        setState('error');
        setErrorMessage(
          errorDesc?.replace(/\+/g, ' ') ||
          'The verification link is invalid or has expired.'
        );
        return;
      }

      // Try to get the session (Supabase auto-processes the hash)
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        setState('error');
        setErrorMessage(sessionError.message);
        return;
      }

      if (session) {
        setState('success');

        // Auto-redirect after short delay
        const hasPendingSignup = !!localStorage.getItem('ontime_pending_signup');
        setTimeout(() => {
          navigate(hasPendingSignup ? '/signup' : '/auth', { replace: true });
        }, 2000);
      } else {
        // No session, no error — might be a stale or already-used link
        setState('error');
        setErrorMessage('This verification link may have already been used or expired.');
      }
    };

    processCallback();
  }, [navigate]);

  const handleResend = async () => {
    if (!resendEmail) return;
    setResending(true);
    setResent(false);

    await supabase.auth.resend({
      type: 'signup',
      email: resendEmail,
      options: {
        emailRedirectTo: window.location.origin + '/auth/callback',
      },
    });

    setResending(false);
    setResent(true);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-3 mb-8">
          <OntimeLogo className="w-12 h-12" />
          <div>
            <h1 className="font-bold text-2xl tracking-tight">OnTime.Build</h1>
            <p className="text-xs text-muted-foreground uppercase tracking-widest">V1</p>
          </div>
        </div>

        <Card className="p-8 text-center space-y-6">
          {state === 'loading' && (
            <>
              <div className="flex justify-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-semibold">Verifying your email…</h2>
                <p className="text-sm text-muted-foreground">Please wait a moment.</p>
              </div>
            </>
          )}

          {state === 'success' && (
            <>
              <div className="flex justify-center">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <CheckCircle2 className="h-8 w-8 text-primary" />
                </div>
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-semibold">Email verified!</h2>
                <p className="text-sm text-muted-foreground">
                  Redirecting you now…
                </p>
              </div>
            </>
          )}

          {state === 'error' && (
            <>
              <div className="flex justify-center">
                <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
                  <AlertCircle className="h-8 w-8 text-destructive" />
                </div>
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-semibold">Verification failed</h2>
                <p className="text-sm text-muted-foreground">{errorMessage}</p>
              </div>

              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Enter your email to get a new verification link:
                </p>
                <Input
                  type="email"
                  placeholder="your@email.com"
                  value={resendEmail}
                  onChange={e => setResendEmail(e.target.value)}
                />
                <Button
                  className="w-full"
                  onClick={handleResend}
                  disabled={resending || !resendEmail}
                >
                  {resending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Resend verification email
                </Button>
                {resent && (
                  <p className="text-sm text-primary flex items-center justify-center gap-1">
                    <CheckCircle2 className="h-4 w-4" /> Email sent! Check your inbox.
                  </p>
                )}
              </div>

              <Button variant="ghost" onClick={() => navigate('/auth')}>
                Go to sign in
              </Button>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
