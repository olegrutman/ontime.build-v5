import { useNavigate } from 'react-router-dom';

interface SuccessScreenProps {
  name: string;
  email: string;
  role: string;
  company: string;
}

const ROLE_LABELS: Record<string, string> = {
  gc: 'General Contractor',
  tc: 'Trade Contractor',
  crew: 'Field Crew',
  supplier: 'Supplier',
};

export function SuccessScreen({ name, email, role, company }: SuccessScreenProps) {
  const navigate = useNavigate();

  return (
    <div className="auth-screen-enter">
      <div className="auth-card">
        <div className="auth-success-anim">
          <div className="auth-success-ring">✓</div>
          <div className="auth-success-title">You're all set!</div>
          <div className="auth-success-sub">
            Your account has been created. Welcome to Ontime.Build, {name.split(' ')[0]}!
          </div>

          <div className="auth-success-meta">
            <div className="auth-sm-row">
              <span className="auth-sm-key">Account</span>
              <span className="auth-sm-val">{email}</span>
            </div>
            <div className="auth-sm-row">
              <span className="auth-sm-key">Role</span>
              <span className="auth-sm-val">{ROLE_LABELS[role] || role}</span>
            </div>
            {company && (
              <div className="auth-sm-row">
                <span className="auth-sm-key">Company</span>
                <span className="auth-sm-val">{company}</span>
              </div>
            )}
            <div className="auth-sm-row">
              <span className="auth-sm-key">Status</span>
              <span className="auth-sm-badge">Active</span>
            </div>
          </div>

          <button className="auth-cta-btn amber" onClick={() => navigate('/dashboard')}>
            Go to Dashboard →
          </button>
        </div>
      </div>
    </div>
  );
}
