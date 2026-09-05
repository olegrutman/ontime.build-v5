import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { authCallbackUrl } from '@/lib/authRedirects';
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
    let cancelled = false;

    const finish = async (userId: string) => {
      if (cancelled) return;
      setState('success');
      const { data: roles } = await supabase
        .from('user_org_roles')
        .select('id')
        .eq('user_id', userId)
        .limit(1);
      const hasOrg = (roles?.length ?? 0) > 0;
      setTimeout(() => {
        navigate(hasOrg ? '/dashboard' : '/signup', { replace: true });
      }, 1200);
    };

    const fail = (message: string) => {
      if (cancelled) return;
      setState('error');
      setErrorMessage(message);
    };

    const processCallback = async () => {
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
      const searchParams = new URLSearchParams(window.location.search);

      const error = hashParams.get('error') || searchParams.get('error');
      const errorDescription =
        hashParams.get('error_description') || searchParams.get('error_description');
      if (error) {
        fail(
          errorDescription?.replace(/\+/g, ' ') ||
            'The verification link is invalid or has expired.'
        );
        return;
      }

      // 1) PKCE / magic-link style: ?code=...
      const code = searchParams.get('code');
      if (code) {
        const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (data?.session) return finish(data.session.user.id);
        if (exchangeError) return fail(exchangeError.message);
      }

      // 2) OTP style: ?token_hash=...&type=signup
      const tokenHash = searchParams.get('token_hash') || searchParams.get('token');
      const otpType = (searchParams.get('type') || 'signup') as
        | 'signup'
        | 'recovery'
        | 'invite'
        | 'magiclink'
        | 'email_change';
      if (tokenHash) {
        const { data, error: otpError } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: otpType,
        });
        if (data?.session) return finish(data.session.user.id);
        if (otpError) return fail(otpError.message);
      }

      // 3) Implicit style: tokens land in the hash and the client picks them up
      //    asynchronously — poll briefly instead of checking once.
      for (let attempt = 0; attempt < 20; attempt++) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) return finish(session.user.id);
        if (cancelled) return;
        await new Promise(r => setTimeout(r, 300));
      }

      fail('This verification link may have already been used or expired.');
    };

    processCallback();
    return () => {
      cancelled = true;
    };
  }, [navigate]);


  const handleResend = async () => {
    if (!resendEmail) return;
    setResending(true);
    setResent(false);

    await supabase.auth.resend({
      type: 'signup',
      email: resendEmail,
      options: {
        emailRedirectTo: authCallbackUrl(),
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
            <h1 className="font-bold text-2xl tracking-tight">Ontime.Build</h1>
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
