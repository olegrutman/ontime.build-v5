interface MethodToggleProps {
  method: 'email' | 'phone';
  onChange: (method: 'email' | 'phone') => void;
}

export function MethodToggle({ method, onChange }: MethodToggleProps) {
  return (
    <div className="auth-method-toggle">
      <button
        type="button"
        className={`auth-mt-btn ${method === 'email' ? 'active' : ''}`}
        onClick={() => onChange('email')}
      >
        📧 Email
      </button>
      <button
        type="button"
        className={`auth-mt-btn ${method === 'phone' ? 'active' : ''}`}
        onClick={() => onChange('phone')}
      >
        📱 Phone
      </button>
    </div>
  );
}
