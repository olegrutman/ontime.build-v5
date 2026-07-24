import { useState } from 'react';

interface ForgotScreenProps {
  onSubmit: (email: string) => Promise<void>;
  onBack: () => void;
}

export function ForgotScreen({ onSubmit, onBack }: ForgotScreenProps) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async () => {
    if (!email || !/\S+@\S+\.\S+/.test(email)) return;
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
          <div className="auth-sub">We'll email you a secure link to set a new password.</div>
        </div>

        {!sent ? (
          <div>
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
                  autoComplete="email"
                />
              </div>
            </div>

            <button className="auth-cta-btn" onClick={handleSubmit} disabled={loading}>
              {loading ? <div className="auth-spinner" /> : <span>Send Reset Link</span>}
            </button>
          </div>
        ) : (
          <div>
            <div className="auth-alert info">
              <span style={{ fontSize: '1rem', flexShrink: 0 }}>✉</span>
              <span>If an account exists for <strong>{email}</strong>, we've sent a reset link. Check your inbox — it may take a minute.</span>
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
