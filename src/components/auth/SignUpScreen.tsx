import { useState, useCallback, useRef, useEffect } from 'react';
import { MethodToggle } from './MethodToggle';
import { PasswordStrength } from './PasswordStrength';
import { StepIndicator } from './StepIndicator';
import { OTPInput } from './OTPInput';
import { RoleSelector } from './RoleSelector';
import { GoogleIcon } from './GoogleIcon';

/* ── Mock data (kept for future API) ── */
// const MOCK_ORGS = [
//   { id: 'kc', name: 'Kowalski Construction', abbr: 'KC', members: 8, plan: 'GC account', admins: [{ av: 'DK', name: 'Derek K.' }], domain: 'kowalski.com' },
//   { id: 'apex', name: 'Apex Build Group', abbr: 'AB', members: 14, plan: 'GC account', admins: [{ av: 'SP', name: 'Sarah P.' }], domain: 'apexbuild.com' },
//   { id: 'mesa', name: 'Mesa Logistics Hub', abbr: 'ML', members: 5, plan: 'Trade Co.', admins: [{ av: 'JT', name: 'J. Torres' }], domain: 'mesalogistics.com' },
// ];
// const INVITE_CODES = { APEX01: 'apex', KC2024: 'kc', MESA55: 'mesa' };

interface SignUpScreenProps {
  onSignUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  onGoogleSignIn: () => Promise<void>;
  onGoToSignIn: () => void;
  onSuccess: (data: { name: string; email: string; role: string; company: string }) => void;
}

export function SignUpScreen({ onSignUp, onGoogleSignIn, onGoToSignIn, onSuccess }: SignUpScreenProps) {
  const [step, setStep] = useState(1);
  const [method, setMethod] = useState<'email' | 'phone'>('email');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [terms, setTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Step 2 - OTP
  const [otpValue, setOtpValue] = useState('');
  const [otpError, setOtpError] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(30);
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  // Step 3 - Role
  const [selectedRole, setSelectedRole] = useState('gc');
  const [company, setCompany] = useState('');

  const formatPhoneInput = (val: string) => {
    let v = val.replace(/\D/g, '');
    if (v.length > 10) v = v.slice(0, 10);
    if (v.length > 6) return `(${v.slice(0, 3)}) ${v.slice(3, 6)}-${v.slice(6)}`;
    if (v.length > 3) return `(${v.slice(0, 3)}) ${v.slice(3)}`;
    if (v.length) return `(${v}`;
    return '';
  };

  const startResendTimer = useCallback(() => {
    setResendSeconds(30);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setResendSeconds(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const goToStep = (n: number) => {
    setStep(n);
    if (n === 2) {
      setOtpValue('');
      setOtpError(false);
      startResendTimer();
    }
  };

  /* ── Step 1: Validate + create account ── */
  const handleStep1 = async () => {
    setFieldErrors({});
    if (!name.trim()) { setFieldErrors({ name: 'Name is required' }); return; }
    if (method === 'email') {
      if (!/\S+@\S+\.\S+/.test(email)) { setFieldErrors({ email: 'Valid email required' }); return; }
    } else {
      if (phone.replace(/\D/g, '').length < 10) { setFieldErrors({ phone: 'Valid number required' }); return; }
    }
    if (password.length < 8) { setFieldErrors({ password: 'Min 8 characters' }); return; }
    if (!terms) { setFieldErrors({ terms: 'Required' }); return; }

    setLoading(true);
    const { error } = await onSignUp(
      method === 'email' ? email : `phone-placeholder@ontime.build`,
      password,
      name,
    );
    setLoading(false);

    if (error) {
      if (error.message?.toLowerCase().includes('already registered') || error.message?.toLowerCase().includes('already been registered')) {
        setFieldErrors({ email: 'An account with this email already exists. Try signing in.' });
      } else {
        setFieldErrors({ form: error.message });
      }
      return;
    }

    // Move to step 2 (OTP / verify email screen)
    goToStep(2);
  };

  /* ── Step 2: OTP verify (UI-only demo) ── */
  const handleVerifyOTP = () => {
    if (otpValue.length < 6) {
      setOtpError(true);
      setTimeout(() => setOtpError(false), 600);
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      if (otpValue === '000000') {
        setOtpError(true);
        setTimeout(() => setOtpError(false), 600);
      } else {
        goToStep(3);
      }
    }, 800);
  };

  const handleResend = () => {
    setOtpValue('');
    setOtpError(false);
    startResendTimer();
  };

  /* ── Step 3: Finish ── */
  const handleFinish = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      const contact = method === 'email' ? email : phone;
      onSuccess({ name, email: contact, role: selectedRole, company });
    }, 800);
  };

  const contact = method === 'email' ? email : phone;

  return (
    <div className="auth-screen-enter">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-screen-icon">🚀</div>
          <div className="auth-title">Create your account</div>
          <div className="auth-sub">Get started with Ontime.Build in 60 seconds</div>
        </div>

        {/* Step indicator */}
        <StepIndicator currentStep={step} labels={['Account', 'Verify', 'Role']} />

        {/* ── STEP 1 ── */}
        {step === 1 && (
          <div>
            {/* Google social */}
            <div className="auth-social-btns" style={{ marginBottom: 16 }}>
              <button className="auth-social-btn" onClick={onGoogleSignIn}>
                <GoogleIcon className="auth-social-icon" />
                Continue with Google
              </button>
            </div>
            <div className="auth-divider-line">or sign up with</div>

            {/* Method toggle */}
            <MethodToggle method={method} onChange={setMethod} />

            {/* Form error */}
            {fieldErrors.form && (
              <div className="auth-alert err" style={{ marginBottom: 16 }}>
                <span style={{ fontSize: '1rem', flexShrink: 0 }}>⚠</span>
                <span>{fieldErrors.form}</span>
              </div>
            )}

            {/* Full name */}
            <div className="auth-field">
              <div className="auth-field-label">Full name</div>
              <div className="auth-field-wrap">
                <input
                  type="text"
                  className={`auth-input-field${fieldErrors.name ? ' error' : ''}`}
                  placeholder="Derek Kowalski"
                  value={name}
                  onChange={e => { setName(e.target.value); setFieldErrors({}); }}
                  autoComplete="name"
                />
              </div>
              {fieldErrors.name && <div className="auth-field-error">{fieldErrors.name}</div>}
            </div>

            {/* Email fields */}
            {method === 'email' && (
              <div className="auth-field">
                <div className="auth-field-label">Work email</div>
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
                {fieldErrors.email && <div className="auth-field-error">{fieldErrors.email}</div>}
              </div>
            )}

            {/* Phone fields */}
            {method === 'phone' && (
              <div className="auth-field">
                <div className="auth-field-label">
                  Mobile number <span className="auth-field-hint">We'll send a verification code</span>
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
                {fieldErrors.phone && <div className="auth-field-error">{fieldErrors.phone}</div>}
              </div>
            )}

            {/* Password */}
            <div className="auth-field">
              <div className="auth-field-label">
                Password <span className="auth-field-hint">Min. 8 characters</span>
              </div>
              <div className="auth-field-wrap">
                <input
                  type={showPw ? 'text' : 'password'}
                  className={`auth-input-field${fieldErrors.password ? ' error' : ''}`}
                  placeholder="Create a strong password"
                  value={password}
                  onChange={e => { setPassword(e.target.value); setFieldErrors({}); }}
                  autoComplete="new-password"
                />
                <button className="auth-field-suffix-btn" type="button" onClick={() => setShowPw(!showPw)}>
                  {showPw ? 'Hide' : 'Show'}
                </button>
              </div>
              <PasswordStrength password={password} />
              {fieldErrors.password && <div className="auth-field-error">{fieldErrors.password}</div>}
            </div>

            {/* Terms */}
            <label className="auth-cb-wrap">
              <input
                type="checkbox"
                checked={terms}
                onChange={e => { setTerms(e.target.checked); setFieldErrors({}); }}
                style={fieldErrors.terms ? { outline: '2px solid var(--auth-red)' } : {}}
              />
              <span className="auth-cb-label">
                I agree to the <a>Terms of Service</a> and <a>Privacy Policy</a>
              </span>
            </label>

            <button className="auth-cta-btn" onClick={handleStep1} disabled={loading}>
              {loading ? <div className="auth-spinner" /> : <span>Continue →</span>}
            </button>
          </div>
        )}

        {/* ── STEP 2: OTP ── */}
        {step === 2 && (
          <div>
            <div className="auth-otp-badge">
              {method === 'email' ? '📧' : '📱'} Sent to {contact}
            </div>
            <div className="auth-sub" style={{ marginBottom: 4 }}>
              {method === 'email'
                ? 'We sent a verification email. Check your inbox and enter the code, or click the link in the email.'
                : 'Enter the 6-digit code we just sent. It expires in 10 minutes.'
              }
            </div>

            <OTPInput
              value={otpValue}
              onChange={setOtpValue}
              error={otpError}
            />

            <div className="auth-resend-row" style={{ marginBottom: 20 }}>
              Didn't get it?{' '}
              <button
                className="auth-resend-btn"
                onClick={handleResend}
                disabled={resendSeconds > 0}
              >
                {resendSeconds > 0 ? (
                  <>Resend in <span className="auth-resend-timer">0:{resendSeconds < 10 ? `0${resendSeconds}` : resendSeconds}</span></>
                ) : (
                  'Resend code'
                )}
              </button>
            </div>

            <button className="auth-cta-btn" onClick={handleVerifyOTP} disabled={loading}>
              {loading ? <div className="auth-spinner" /> : <span>Verify & Continue</span>}
            </button>

            {otpError && (
              <div className="auth-alert err" style={{ marginTop: 12, marginBottom: 0 }}>
                <span style={{ fontSize: '1rem', flexShrink: 0 }}>⚠</span>
                <span>Incorrect code. Please try again or request a new one.</span>
              </div>
            )}
          </div>
        )}

        {/* ── STEP 3: Role & Company ── */}
        {step === 3 && (
          <div>
            <div className="auth-sub" style={{ marginBottom: 18 }}>
              This helps us set up the right features for you.
            </div>

            <RoleSelector selectedRole={selectedRole} onSelect={setSelectedRole} />

            <div className="auth-field">
              <div className="auth-field-label">Company name</div>
              <div className="auth-field-wrap">
                <input
                  type="text"
                  className="auth-input-field"
                  placeholder="e.g. Kowalski Construction"
                  value={company}
                  onChange={e => setCompany(e.target.value)}
                />
              </div>
            </div>

            <button className="auth-cta-btn amber" onClick={handleFinish} disabled={loading}>
              {loading ? <div className="auth-spinner" /> : <span>🚀 Launch My Dashboard</span>}
            </button>
          </div>
        )}
      </div>

      <div className="auth-switch-link">
        Already have an account? <button onClick={onGoToSignIn}>Sign in</button>
      </div>
    </div>
  );
}
