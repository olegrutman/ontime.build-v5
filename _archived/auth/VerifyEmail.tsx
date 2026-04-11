import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { OntimeLogo } from '@/components/ui/OntimeLogo';
import { Mail, Loader2, CheckCircle2 } from 'lucide-react';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email') || '';
  const [cooldown, setCooldown] = useState(0);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const handleResend = async () => {
    if (!email || cooldown > 0) return;
    setResending(true);
    setResent(false);

    await supabase.auth.resend({
      type: 'signup',
      email,
      options: {
        emailRedirectTo: window.location.origin + '/auth/callback',
      },
    });

    setResending(false);
    setResent(true);
    setCooldown(60);
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
          <div className="flex justify-center">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Mail className="h-8 w-8 text-primary" />
            </div>
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-semibold">Check your email</h2>
            <p className="text-sm text-muted-foreground">
              We sent a verification link to
            </p>
            {email && (
              <p className="text-sm font-medium">{email}</p>
            )}
            <p className="text-sm text-muted-foreground">
              Click the link in your email to verify your account and continue setup.
            </p>
          </div>

          <div className="space-y-3">
            {resent && (
              <div className="flex items-center justify-center gap-2 text-sm text-primary">
                <CheckCircle2 className="h-4 w-4" />
                Verification email sent!
              </div>
            )}

            <Button
              variant="outline"
              className="w-full"
              onClick={handleResend}
              disabled={resending || cooldown > 0}
            >
              {resending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              {cooldown > 0
                ? `Resend in ${cooldown}s`
                : "Didn't receive it? Resend email"}
            </Button>
          </div>

          <div className="flex flex-col gap-2 text-sm text-muted-foreground">
            <Link to="/signup" className="text-primary hover:underline">
              ← Wrong email? Go back
            </Link>
            <Link to="/auth" className="text-primary hover:underline">
              Already verified? Sign in
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
