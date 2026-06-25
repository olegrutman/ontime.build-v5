import { useState } from 'react';
import { MethodToggle } from './MethodToggle';

interface ForgotScreenProps {
  onSubmit: (email: string) => Promise<void>;
  onBack: () => void;
}

export function ForgotScreen({ onSubmit, onBack }: ForgotScreenProps) {
  const [method, setMethod] = useState<'email' | 'phone'>('email');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const formatPhoneInput = (val: string) => {
    let v = val.replace(/\D/g, '');
    if (v.length > 10) v = v.slice(0, 10);
    if (v.length > 6) return `(${v.slice(0, 3)}) ${v.slice(3, 6)}-${v.slice(6)}`;
    if (v.length > 3) return `(${v.slice(0, 3)}) ${v.slice(3)}`;
    if (v.length) return `(${v}`;
    return '';
  };

  const handleSubmit = async () => {
    if (method === 'email' && !email) return;
    setLoading(true);
    await onSubmit(email);
    setLoading(false);
    setSent(true);
  };

  return (
    <div className="auth-screen-enter">
      <div className="auth-card">
        <div className="auth-header">
          <button className="auth-back-link" onClick={onBack}>← Back to sign in</button>
          <div className="auth-screen-icon">🔑</div>
          <div className="auth-title">Reset password</div>
          <div className="auth-sub">We'll send a reset link to your email or a code to your phone.</div>
        </div>

        {!sent ? (
          <div>
            <MethodToggle method={method} onChange={setMethod} />

            {method === 'email' && (
              <div className="auth-field">
                <div className="auth-field-label">Email address</div>
                <div className="auth-field-wrap">
                  <input
                    type="email"
                    className="auth-input-field"
                    placeholder="you@company.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                  />
                </div>
              </div>
            )}

            {method === 'phone' && (
              <div className="auth-field">
                <div className="auth-field-label">Mobile number</div>
                <div className="auth-field-wrap" style={{ position: 'relative' }}>
                  <div className="auth-phone-prefix">🇺🇸 +1</div>
                  <input
                    type="tel"
                    className="auth-input-field phone-pad"
                    placeholder="(555) 000-0000"
                    value={phone}
                    onChange={e => setPhone(formatPhoneInput(e.target.value))}
                  />
                </div>
              </div>
            )}

            <button className="auth-cta-btn" onClick={handleSubmit} disabled={loading}>
              {loading ? <div className="auth-spinner" /> : <span>Send Reset Link</span>}
            </button>
          </div>
        ) : (
          <div>
            <div className="auth-alert info">
              <span style={{ fontSize: '1rem', flexShrink: 0 }}>✉</span>
              <span>We've sent a reset link. Check your inbox — it may take a minute.</span>
            </div>
            <button className="auth-cta-btn" onClick={onBack}>
              Back to Sign In
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
