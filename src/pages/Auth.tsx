import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Mail, Lock, Loader2 } from 'lucide-react';
import { OntimeLogo } from '@/components/ui/OntimeLogo';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';
import { lovable } from '@/integrations/lovable/index';
import { Separator } from '@/components/ui/separator';
import { PendingApprovalStep } from '@/components/signup-wizard/PendingApprovalStep';

const signInSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

export default function Auth() {
  const navigate = useNavigate();
  const { signIn, signOut, user, userOrgRoles, loading: authLoading, needsOrgSetup } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pendingOrg, setPendingOrg] = useState<string | null>(null);
  const [pendingRequestId, setPendingRequestId] = useState<string | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [checkedPending, setCheckedPending] = useState(false);

  const [signInForm, setSignInForm] = useState({
    email: '',
    password: '',
  });

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = signInSchema.safeParse(signInForm);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as string] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    setLoading(true);
    const { error } = await signIn(signInForm.email, signInForm.password);
    setLoading(false);

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Sign in failed',
        description: error.message,
      });
    }
  };

  // Check for pending join requests and redirect
  useEffect(() => {
    if (authLoading) return;

    if (user) {
      if (userOrgRoles.length > 0) {
        navigate('/dashboard');
        return;
      }

      if (needsOrgSetup && !checkedPending) {
        // Check for pending join request before redirecting to signup
        (async () => {
          const { data: pending } = await supabase
            .from('org_join_requests')
            .select('id, organization:organizations(name)')
            .eq('user_id', user.id)
            .eq('status', 'pending')
            .limit(1);

          setCheckedPending(true);

          if (pending && pending.length > 0) {
            const orgName = (pending[0].organization as any)?.name || 'the organization';
            setPendingOrg(orgName);
            setPendingRequestId(pending[0].id);
          } else {
            navigate('/signup');
          }
        })();
      }
    }
  }, [authLoading, user, userOrgRoles, needsOrgSetup, navigate, checkedPending]);

  const handleCancelRequest = async () => {
    if (!pendingRequestId || !user) return;
    setCancelLoading(true);
    await supabase.from('org_join_requests').delete().eq('id', pendingRequestId);
    setCancelLoading(false);
    setPendingOrg(null);
    setPendingRequestId(null);
    navigate('/signup');
  };

  // Show pending approval state
  if (pendingOrg) {
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
          <PendingApprovalStep
            orgName={pendingOrg}
            onSignOut={signOut}
            onCancel={handleCancelRequest}
            cancelLoading={cancelLoading}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <OntimeLogo className="w-12 h-12" />
          <div>
            <h1 className="font-bold text-2xl tracking-tight">OnTime.Build</h1>
            <p className="text-xs text-muted-foreground uppercase tracking-widest">V1</p>
          </div>
        </div>

        <Card className="p-6">
          <div className="text-center mb-6">
            <h2 className="text-xl font-semibold">Welcome back</h2>
            <p className="text-sm text-muted-foreground">Sign in to your account</p>
          </div>

          <form onSubmit={handleSignIn} className="space-y-4">
            <div>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="Email"
                  value={signInForm.email}
                  onChange={(e) => setSignInForm({ ...signInForm, email: e.target.value })}
                  className="pl-10"
                />
              </div>
              {errors.email && <p className="text-xs text-destructive mt-1">{errors.email}</p>}
            </div>

            <div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="password"
                  placeholder="Password"
                  value={signInForm.password}
                  onChange={(e) => setSignInForm({ ...signInForm, password: e.target.value })}
                  className="pl-10"
                />
              </div>
              {errors.password && <p className="text-xs text-destructive mt-1">{errors.password}</p>}
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Sign In
            </Button>
          </form>

          <div className="relative my-6">
            <Separator />
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-3 text-xs text-muted-foreground">
              or
            </span>
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={googleLoading}
            onClick={async () => {
              setGoogleLoading(true);
              const { error } = await lovable.auth.signInWithOAuth('google', {
                redirect_uri: window.location.origin,
              });
              if (error) {
                toast({ variant: 'destructive', title: 'Google sign-in failed', description: String(error) });
              }
              setGoogleLoading(false);
            }}
          >
            {googleLoading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
            )}
            Continue with Google
          </Button>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Don't have an account?{' '}
              <Link to="/signup" className="text-primary hover:underline font-medium">
                Sign up
              </Link>
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
