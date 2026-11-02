import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable/index';
import { authCallbackUrl, passwordResetUrl } from '@/lib/authRedirects';
import { useToast } from '@/hooks/use-toast';
import '@/styles/auth.css';

import { BrandPanel } from '@/components/auth/BrandPanel';
import { SignInScreen } from '@/components/auth/SignInScreen';
import { SignUpScreen } from '@/components/auth/SignUpScreen';
import { ForgotScreen } from '@/components/auth/ForgotScreen';
import { SuccessScreen } from '@/components/auth/SuccessScreen';
import { OntimeLogo } from '@/components/ui/OntimeLogo';

type Screen = 'signin' | 'signup' | 'forgot' | 'success' | 'callback' | 'reset-password';

export default function AuthPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn, signUp, user, userOrgRoles, loading: authLoading, isPlatformUser } = useAuth();
  const { toast } = useToast();

  // Determine initial screen from route
  const getInitialScreen = (): Screen => {
    if (location.pathname === '/signup') return 'signup';
    if (location.pathname === '/verify-email') return 'signup';
    if (location.pathname === '/reset-password') return 'reset-password';
    if (location.pathname === '/auth/callback') return 'callback';
    return 'signin';
  };

  const [screen, setScreen] = useState<Screen>(getInitialScreen);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const [signInError, setSignInError] = useState<string | null>(null);
  const [unconfirmedEmail, setUnconfirmedEmail] = useState<string | null>(null);
  const [successData, setSuccessData] = useState({ name: '', email: '', role: '', company: '' });

  // React Router can reuse this component when moving between /auth and
  // /signup. Keep the visible screen aligned with the route instead of
  // leaving the previously mounted sign-in form on screen.
  useEffect(() => {
    if (location.pathname === '/signup' || location.pathname === '/verify-email') {
      setScreen('signup');
    } else if (location.pathname === '/reset-password') {
      setScreen('reset-password');
    } else if (location.pathname === '/auth') {
      setScreen('signin');
    }
  }, [location.pathname]);

  // Handle callback route
  useEffect(() => {
    if (location.pathname === '/auth/callback') {
      handleCallback();
    }
  }, [location.pathname]);

  // Handle reset-password route
  useEffect(() => {
    if (location.pathname === '/reset-password') {
      // ResetPassword logic is handled inline below
    }
  }, [location.pathname]);

  // Redirect if already logged in
  useEffect(() => {
    if (authLoading) return;
    if (user) {
      if (screen === 'callback' || screen === 'reset-password') return;
      if (isPlatformUser) { navigate('/platform'); return; }
      if (userOrgRoles.length > 0) { navigate('/dashboard'); return; }
      // Signed in but no organization yet — finish account setup instead of
      // leaving the user stuck on the sign-in form.
      if (screen !== 'signup' && screen !== 'success') { navigate('/signup', { replace: true }); }
    }
  }, [authLoading, user, userOrgRoles, isPlatformUser, navigate, screen]);

  const handleCallback = async () => {
    const hash = window.location.hash;
    if (hash) {
      const params = new URLSearchParams(hash.substring(1));
      const error = params.get('error');
      if (error) {
        toast({ variant: 'destructive', title: 'Verification failed', description: params.get('error_description')?.replace(/\+/g, ' ') || 'Link invalid or expired.' });
        setScreen('signin');
        return;
      }
    }
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      toast({ title: 'Email verified!' });
      const hasPending = !!localStorage.getItem('ontime_pending_signup');
      navigate(hasPending ? '/signup' : '/dashboard', { replace: true });
    } else {
      setScreen('signin');
    }
  };

  const goTo = (s: Screen) => {
    setScreen(s);
    setSignInError(null);
    setUnconfirmedEmail(null);
  };

  /* ── Sign In ── */
  const humanizeAuthError = (msg?: string): string => {
    if (!msg) return 'Something went wrong. Please try again.';
    const m = msg.toLowerCase();
    if (m.includes('invalid login') || m.includes('invalid credentials')) {
      return "That email and password don't match. Check the email, then try again — or reset your password.";
    }
    if (m.includes('email not confirmed')) return 'Please verify your email before signing in.';
    if (m.includes('rate limit') || m.includes('too many')) {
      return 'Too many attempts. Wait a minute, then try again.';
    }
    if (m.includes('user not found')) return "We couldn't find an account with that email.";
    if (m.includes('network') || m.includes('fetch')) return 'Network issue — check your connection and try again.';
    return msg;
  };

  const handleSignIn = async (email: string, password: string) => {
    setSignInError(null);
    setUnconfirmedEmail(null);
    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);
    if (error) {
      if (error.message?.toLowerCase().includes('email not confirmed')) {
        setUnconfirmedEmail(email);
      } else {
        setSignInError(humanizeAuthError(error.message));
      }
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    const result = await lovable.auth.signInWithOAuth('google', {
      redirect_uri: `${window.location.origin}/auth/callback`,
    });
    if (result.error) {
      toast({ variant: 'destructive', title: 'Google sign-in failed', description: String(result.error) });
    }
    setGoogleLoading(false);
  };

  const handleAppleSignIn = async () => {
    setAppleLoading(true);
    const result = await lovable.auth.signInWithOAuth('apple', {
      redirect_uri: `${window.location.origin}/auth/callback`,
    });
    if (result.error) {
      toast({ variant: 'destructive', title: 'Apple sign-in failed', description: String(result.error) });
    }
    setAppleLoading(false);
  };

  const handleMagicLink = async (email: string): Promise<{ ok: boolean; message?: string }> => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: authCallbackUrl(),
        shouldCreateUser: false,
      },
    });
    if (error) return { ok: false, message: humanizeAuthError(error.message) };
    return { ok: true };
  };

  const handleResendVerification = async (email: string) => {
    await supabase.auth.resend({
      type: 'signup',
      email,
      options: { emailRedirectTo: authCallbackUrl() },
    });
  };

  /* ── Sign Up ── */
  const handleSignUp = async (email: string, password: string, fullName: string) => {
    const { data, error } = await signUp(email, password, fullName);

    if (!error && !data?.user?.confirmation_sent_at && !data?.session) {
      return {
        error: null,
        emailSent: false,
        message: 'This email was already used. Please sign in instead, or resend verification from the sign-in screen.',
      };
    }

    return { error, emailSent: !error };
  };

  const handleSignUpSuccess = (data: { name: string; email: string; role: string; company: string }) => {
    setSuccessData(data);
    goTo('success');
  };

  /* ── Forgot Password ── */
  const handleForgotSubmit = async (email: string) => {
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: passwordResetUrl(),
    });
  };

  /* ── Reset Password (inline) ── */
  if (screen === 'reset-password') {
    return <ResetPasswordInline />;
  }

  return (
    <div className="auth-page">
      {/* Desktop brand panel */}
      <BrandPanel />

      {/* Form panel */}
      <div className="auth-form-panel">
        {/* Mobile brand bar */}
        <div style={{ width: '100%' }}>
          <div className="auth-mobile-brand-bar">
            <OntimeLogo className="w-8 h-8" />
            <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: '1.2rem', color: '#fff' }}>
              Ontime<span style={{ color: 'var(--auth-amber)' }}>.Build</span>
            </span>
          </div>
          <div className="auth-box">
            {screen === 'signin' && (
              <SignInScreen
                onSignIn={handleSignIn}
                onGoogleSignIn={handleGoogleSignIn}
                onAppleSignIn={handleAppleSignIn}
                onMagicLink={handleMagicLink}
                onForgot={() => goTo('forgot')}
                onGoToSignUp={() => goTo('signup')}
                loading={loading}
                googleLoading={googleLoading}
                appleLoading={appleLoading}
                error={signInError}
                unconfirmedEmail={unconfirmedEmail}
                onResendVerification={handleResendVerification}
              />
            )}
            {screen === 'signup' && (
              <SignUpScreen
                onSignUp={handleSignUp}
                onGoogleSignIn={handleGoogleSignIn}
                onGoToSignIn={() => goTo('signin')}
                onSuccess={handleSignUpSuccess}
              />
            )}
            {screen === 'forgot' && (
              <ForgotScreen
                onSubmit={handleForgotSubmit}
                onBack={() => goTo('signin')}
              />
            )}
            {screen === 'success' && (
              <SuccessScreen {...successData} />
            )}
            {screen === 'callback' && (
              <div className="auth-card" style={{ textAlign: 'center', padding: 40 }}>
                <div className="auth-spinner" style={{ margin: '0 auto 16px', borderTopColor: 'var(--auth-amber)' }} />
                <div className="auth-sub">Verifying your email…</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Reset Password (self-contained) ── */
import { useState as useStateRP, useEffect as useEffectRP } from 'react';

function ResetPasswordInline() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [password, setPassword] = useStateRP('');
  const [confirmPassword, setConfirmPassword] = useStateRP('');
  const [loading, setLoading] = useStateRP(false);
  const [ready, setReady] = useStateRP(false);
  const [showPw, setShowPw] = useStateRP(false);
  const [error, setError] = useStateRP('');

  const [linkError, setLinkError] = useStateRP('');
  const [resendEmail, setResendEmail] = useStateRP('');
  const [resendState, setResendState] = useStateRP<'idle' | 'sending' | 'sent'>('idle');

  useEffectRP(() => {
    // The auth server redirects here with an error in the hash or query when the
    // link was already used, replaced by a newer link, or expired.
    const params = new URLSearchParams(window.location.hash.substring(1) || window.location.search.substring(1));
    if (params.get('error') || params.get('error_code')) {
      const code = params.get('error_code');
      setLinkError(code === 'otp_expired'
        ? 'This reset link has expired or was already used. Each new reset email replaces the previous link — use the newest email, or request a new link below.'
        : (params.get('error_description')?.replace(/\+/g, ' ') || 'This reset link is not valid.'));
      return;
    }
    let done = false;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || (session && event === 'SIGNED_IN')) { done = true; setReady(true); }
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) { done = true; setReady(true); }
    });
    const t = setTimeout(() => {
      if (!done) setLinkError('We could not verify this reset link. It may have expired — request a new one below.');
    }, 8000);
    return () => { subscription.unsubscribe(); clearTimeout(t); };
  }, []);

  const handleResend = async () => {
    if (!resendEmail.includes('@')) return;
    setResendState('sending');
    await supabase.auth.resetPasswordForEmail(resendEmail.trim(), { redirectTo: passwordResetUrl() });
    setResendState('sent');
  };

  const handleSubmit = async () => {
    setError('');
    if (password.length < 8) { setError('Password must be at least 8 characters'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match'); return; }
    setLoading(true);
    const { error: err } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (err) {
      toast({ variant: 'destructive', title: 'Reset failed', description: err.message });
    } else {
      toast({ title: 'Password updated' });
      navigate('/dashboard', { replace: true });
    }
  };

  return (
    <div className="auth-page">
      <BrandPanel />
      <div className="auth-form-panel">
        <div style={{ width: '100%' }}>
          <div className="auth-mobile-brand-bar">
            <OntimeLogo className="w-8 h-8" />
            <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: '1.2rem', color: '#fff' }}>
              Ontime<span style={{ color: 'var(--auth-amber)' }}>.Build</span>
            </span>
          </div>
          <div className="auth-box">
            <div className="auth-screen-enter">
              <div className="auth-card">
                <div className="auth-header">
                  <div className="auth-screen-icon">🔑</div>
                  <div className="auth-title">Set new password</div>
                  <div className="auth-sub">Enter your new password below</div>
                </div>

                {linkError ? (
                  <div>
                    <div className="auth-alert err" style={{ marginBottom: 16 }}>
                      <span style={{ fontSize: '1rem', flexShrink: 0 }}>⚠</span>
                      <span>{linkError}</span>
                    </div>
                    {resendState === 'sent' ? (
                      <div className="auth-sub" style={{ marginBottom: 16 }}>If that email has an account, a new reset link is on its way. Use only the newest email.</div>
                    ) : (
                      <>
                        <div className="auth-field">
                          <div className="auth-field-label">Your email</div>
                          <div className="auth-field-wrap">
                            <input type="email" className="auth-input-field" placeholder="you@company.com"
                              value={resendEmail} onChange={e => setResendEmail(e.target.value)}
                              onKeyDown={e => e.key === 'Enter' && handleResend()} />
                          </div>
                        </div>
                        <button className="auth-cta-btn" onClick={handleResend} disabled={resendState === 'sending'}>
                          {resendState === 'sending' ? <div className="auth-spinner" /> : <span>Send a new reset link</span>}
                        </button>
                      </>
                    )}
                    <button className="auth-cta-btn" style={{ marginTop: 12, background: 'transparent', color: 'inherit', border: '1px solid currentColor' }} onClick={() => navigate('/auth')}>
                      <span>Back to sign in</span>
                    </button>
                  </div>
                ) : !ready ? (
                  <div style={{ textAlign: 'center', padding: 20 }}>
                    <div className="auth-spinner" style={{ margin: '0 auto 16px', borderTopColor: 'var(--auth-amber)' }} />
                    <div className="auth-sub">Verifying recovery link…</div>
                  </div>
                ) : (
                  <div>
                    {error && (
                      <div className="auth-alert err" style={{ marginBottom: 16 }}>
                        <span style={{ fontSize: '1rem', flexShrink: 0 }}>⚠</span>
                        <span>{error}</span>
                      </div>
                    )}

                    <div className="auth-field">
                      <div className="auth-field-label">New password</div>
                      <div className="auth-field-wrap">
                        <input
                          type={showPw ? 'text' : 'password'}
                          className="auth-input-field"
                          placeholder="Min 8 characters"
                          value={password}
                          onChange={e => setPassword(e.target.value)}
                        />
                        <button className="auth-field-suffix-btn" type="button" onClick={() => setShowPw(!showPw)}>
                          {showPw ? 'Hide' : 'Show'}
                        </button>
                      </div>
                    </div>

                    <div className="auth-field">
                      <div className="auth-field-label">Confirm password</div>
                      <div className="auth-field-wrap">
                        <input
                          type="password"
                          className="auth-input-field"
                          placeholder="Re-enter password"
                          value={confirmPassword}
                          onChange={e => setConfirmPassword(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                        />
                      </div>
                    </div>

                    <button className="auth-cta-btn" onClick={handleSubmit} disabled={loading}>
                      {loading ? <div className="auth-spinner" /> : <span>Update Password</span>}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
