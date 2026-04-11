import { useState } from 'react';
import { MethodToggle } from './MethodToggle';
import { GoogleIcon } from './GoogleIcon';

interface SignInScreenProps {
  onSignIn: (email: string, password: string) => Promise<void>;
  onGoogleSignIn: () => Promise<void>;
  onForgot: () => void;
  onGoToSignUp: () => void;
  loading: boolean;
  googleLoading: boolean;
  error?: string | null;
  unconfirmedEmail?: string | null;
  onResendVerification?: (email: string) => Promise<void>;
}

export function SignInScreen({
  onSignIn, onGoogleSignIn, onForgot, onGoToSignUp,
  loading, googleLoading, error, unconfirmedEmail, onResendVerification,
}: SignInScreenProps) {
  const [method, setMethod] = useState<'email' | 'phone'>('email');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, boolean>>({});
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  const formatPhoneInput = (val: string) => {
    let v = val.replace(/\D/g, '');
    if (v.length > 10) v = v.slice(0, 10);
    let fmt = '';
    if (v.length > 6) fmt = `(${v.slice(0, 3)}) ${v.slice(3, 6)}-${v.slice(6)}`;
    else if (v.length > 3) fmt = `(${v.slice(0, 3)}) ${v.slice(3)}`;
    else if (v.length) fmt = `(${v}`;
    return fmt;
  };

  const handleSubmit = async () => {
    setFieldErrors({});
    if (method === 'email') {
      if (!email || !/\S+@\S+\.\S+/.test(email)) {
        setFieldErrors({ email: true });
        return;
      }
    } else {
      if (phone.replace(/\D/g, '').length < 10) {
        setFieldErrors({ phone: true });
        return;
      }
    }
    if (!password) {
      setFieldErrors(prev => ({ ...prev, password: true }));
      return;
    }
    const contact = method === 'email' ? email : phone;
    await onSignIn(contact, password);
  };

  const handleResend = async () => {
    if (!unconfirmedEmail || !onResendVerification) return;
    setResending(true);
    await onResendVerification(unconfirmedEmail);
    setResending(false);
    setResent(true);
  };

  return (
    <div className="auth-screen-enter">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-screen-icon">👋</div>
          <div className="auth-title">Welcome back</div>
          <div className="auth-sub">Sign in to your Ontime account</div>
        </div>

        {/* Social buttons */}
        <div className="auth-social-btns" style={{ marginBottom: 16 }}>
          <button className="auth-social-btn" onClick={onGoogleSignIn} disabled={googleLoading}>
            {googleLoading ? (
              <div className="auth-spinner" />
            ) : (
              <>
                <GoogleIcon className="auth-social-icon" />
                Google
              </>
            )}
          </button>
        </div>

        <div className="auth-divider-line">or continue with</div>

        {/* Method toggle */}
        <MethodToggle method={method} onChange={setMethod} />

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
            <span>{error}</span>
          </div>
        )}

        {/* Email fields */}
        {method === 'email' && (
          <div className="auth-field">
            <div className="auth-field-label">Email address</div>
            <div className="auth-field-wrap">
              <input
                type="email"
                className={`auth-input-field${fieldErrors.email ? ' error' : ''}`}
                placeholder="you@company.com"
                value={email}
                onChange={e => { setEmail(e.target.value); setFieldErrors({}); }}
                autoComplete="email"
              />
            </div>
          </div>
        )}

        {/* Phone fields */}
        {method === 'phone' && (
          <div className="auth-field">
            <div className="auth-field-label">
              Mobile number
              <span className="auth-field-hint">UI preview only</span>
            </div>
            <div className="auth-field-wrap" style={{ position: 'relative' }}>
              <div className="auth-phone-prefix">🇺🇸 +1</div>
              <input
                type="tel"
                className={`auth-input-field phone-pad${fieldErrors.phone ? ' error' : ''}`}
                placeholder="(555) 000-0000"
                value={phone}
                onChange={e => { setPhone(formatPhoneInput(e.target.value)); setFieldErrors({}); }}
                autoComplete="tel"
              />
            </div>
          </div>
        )}

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
          className="auth-cta-btn"
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading ? <div className="auth-spinner" /> : <span>Sign In</span>}
        </button>
      </div>

      <div className="auth-switch-link">
        New to Ontime? <button onClick={onGoToSignUp}>Create an account →</button>
      </div>
    </div>
  );
}
