import { useState } from 'react';
import { GoogleIcon } from './GoogleIcon';
import { AppleIcon } from './AppleIcon';

interface SignInScreenProps {
  onSignIn: (email: string, password: string) => Promise<void>;
  onGoogleSignIn: () => Promise<void>;
  onAppleSignIn: () => Promise<void>;
  onMagicLink: (email: string) => Promise<{ ok: boolean; message?: string }>;
  onForgot: () => void;
  onGoToSignUp: () => void;
  loading: boolean;
  googleLoading: boolean;
  appleLoading: boolean;
  error?: string | null;
  unconfirmedEmail?: string | null;
  onResendVerification?: (email: string) => Promise<void>;
}

export function SignInScreen({
  onSignIn, onGoogleSignIn, onAppleSignIn, onMagicLink, onForgot, onGoToSignUp,
  loading, googleLoading, appleLoading, error, unconfirmedEmail, onResendVerification,
}: SignInScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, boolean>>({});
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const [magicLoading, setMagicLoading] = useState(false);
  const [magicSent, setMagicSent] = useState<string | null>(null);
  const [magicErr, setMagicErr] = useState<string | null>(null);

  const validEmail = /\S+@\S+\.\S+/.test(email);

  const handleSubmit = async () => {
    setFieldErrors({});
    if (!validEmail) { setFieldErrors({ email: true }); return; }
    if (!password) { setFieldErrors(prev => ({ ...prev, password: true })); return; }
    await onSignIn(email, password);
  };

  const handleResend = async () => {
    if (!unconfirmedEmail || !onResendVerification) return;
    setResending(true);
    await onResendVerification(unconfirmedEmail);
    setResending(false);
    setResent(true);
  };

  const handleMagicLink = async () => {
    setMagicErr(null);
    setMagicSent(null);
    if (!validEmail) { setFieldErrors({ email: true }); return; }
    setMagicLoading(true);
    const res = await onMagicLink(email);
    setMagicLoading(false);
    if (res.ok) setMagicSent(email);
    else setMagicErr(res.message || 'Could not send link. Try again.');
  };

  return (
    <div className="auth-screen-enter">
      <form
        className="auth-card"
        onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}
      >
        <div className="auth-header">
          <div className="auth-screen-icon">👋</div>
          <div className="auth-title">Welcome back</div>
          <div className="auth-sub">Sign in to your Ontime account</div>
        </div>

        {/* Social buttons */}
        <div className="auth-social-btns" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
          <button type="button" className="auth-social-btn" onClick={onGoogleSignIn} disabled={googleLoading || appleLoading}>
            {googleLoading ? <div className="auth-spinner" /> : (<><GoogleIcon className="auth-social-icon" />Google</>)}
          </button>
          <button type="button" className="auth-social-btn" onClick={onAppleSignIn} disabled={googleLoading || appleLoading}>
            {appleLoading ? <div className="auth-spinner" /> : (<><AppleIcon className="auth-social-icon" />Apple</>)}
          </button>
        </div>

        <div className="auth-divider-line">or continue with email</div>

        {/* Magic link success */}
        {magicSent && (
          <div className="auth-alert info" style={{ marginBottom: 16 }}>
            <span style={{ fontSize: '1rem', flexShrink: 0 }}>✉</span>
            <span>Sign-in link sent to <strong>{magicSent}</strong>. Check your inbox.</span>
          </div>
        )}
        {magicErr && !magicSent && (
          <div className="auth-alert err" style={{ marginBottom: 16 }}>
            <span style={{ fontSize: '1rem', flexShrink: 0 }}>⚠</span>
            <span>{magicErr}</span>
          </div>
        )}

        {/* Unconfirmed email alert */}
        {unconfirmedEmail && (
          <div className="auth-alert err" style={{ marginBottom: 16 }}>
            <span style={{ fontSize: '1rem', flexShrink: 0 }}>⚠</span>
            <div>
              <div style={{ fontWeight: 600 }}>Email not verified</div>
              <div style={{ fontSize: '.72rem', marginTop: 4 }}>
                Please verify your email before signing in.
              </div>
              {resent ? (
                <div style={{ color: 'var(--auth-green)', marginTop: 8, fontSize: '.75rem' }}>
                  ✓ Verification email sent to {unconfirmedEmail}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resending}
                  style={{
                    marginTop: 8, fontSize: '.72rem', fontWeight: 600,
                    color: 'var(--auth-amber-d)', background: 'none', border: 'none',
                    cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  {resending ? 'Sending…' : 'Resend verification email'}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Error alert */}
        {error && !unconfirmedEmail && (
          <div className="auth-alert err" style={{ marginBottom: 16 }}>
            <span style={{ fontSize: '1rem', flexShrink: 0 }}>⚠</span>
            <div>
              <div>{error}</div>
              {/\bpassword\b|invalid|credentials/i.test(error) && (
                <button
                  type="button"
                  onClick={onForgot}
                  style={{
                    marginTop: 6, fontSize: '.72rem', fontWeight: 600,
                    color: 'var(--auth-amber-d)', background: 'none', border: 'none',
                    cursor: 'pointer', fontFamily: 'inherit', padding: 0,
                  }}
                >
                  Reset password →
                </button>
              )}
            </div>
          </div>
        )}

        {/* Email */}
        <div className="auth-field">
          <div className="auth-field-label">Email address</div>
          <div className="auth-field-wrap">
            <input
              type="email"
              className={`auth-input-field${fieldErrors.email ? ' error' : ''}`}
              placeholder="you@company.com"
              value={email}
              onChange={e => { setEmail(e.target.value); setFieldErrors({}); setMagicErr(null); setMagicSent(null); }}
              autoComplete="email"
            />
          </div>
        </div>

        {/* Password */}
        <div className="auth-field">
          <div className="auth-field-label">
            Password
            <button
              type="button"
              className="auth-field-hint"
              style={{ cursor: 'pointer', color: 'var(--auth-amber-d)', fontWeight: 600, background: 'none', border: 'none', fontFamily: 'inherit' }}
              onClick={onForgot}
            >
              Forgot password?
            </button>
          </div>
          <div className="auth-field-wrap">
            <input
              type={showPw ? 'text' : 'password'}
              className={`auth-input-field${fieldErrors.password ? ' error' : ''}`}
              placeholder="Your password"
              value={password}
              onChange={e => { setPassword(e.target.value); setFieldErrors({}); }}
              autoComplete="current-password"
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            />
            <button className="auth-field-suffix-btn" type="button" onClick={() => setShowPw(!showPw)}>
              {showPw ? 'Hide' : 'Show'}
            </button>
          </div>
        </div>

        <button
          type="submit"
          className="auth-cta-btn"
          disabled={loading}
        >
          {loading ? <div className="auth-spinner" /> : <span>Sign In</span>}
        </button>

        {/* Magic link */}
        <button
          type="button"
          onClick={handleMagicLink}
          disabled={magicLoading || !validEmail}
          style={{
            marginTop: 10, width: '100%', background: 'transparent',
            border: '1px solid rgba(255,255,255,.15)', color: 'var(--auth-amber-d)',
            padding: '10px', borderRadius: 8, fontWeight: 600, fontSize: '.82rem',
            cursor: validEmail ? 'pointer' : 'not-allowed', fontFamily: 'inherit',
            opacity: validEmail ? 1 : 0.55,
          }}
        >
          {magicLoading ? 'Sending link…' : '✉ Email me a sign-in link instead'}
        </button>
      </form>

      <div className="auth-switch-link">
        New to Ontime? <button type="button" onClick={onGoToSignUp}>Create an account →</button>
      </div>
    </div>
  );
}
