interface PasswordStrengthProps {
  password: string;
}

function getStrength(pw: string): { score: number; label: string } {
  if (!pw) return { score: 0, label: 'Enter a password' };
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  const labels = ['Too short', 'Fair', 'Good', 'Strong'];
  return { score, label: labels[score - 1] || 'Too short' };
}

export function PasswordStrength({ password }: PasswordStrengthProps) {
  const { score, label } = getStrength(password);
  const cls = ['w', 'f', 'm', 's'];
  const barClass = cls[score - 1] || '';

  return (
    <div className="auth-pw-strength">
      <div className="auth-pw-bars">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className={`auth-pw-bar ${i <= score ? barClass : ''}`} />
        ))}
      </div>
      <div className={`auth-pw-label ${score === 4 ? 's' : ''}`}>{label}</div>
    </div>
  );
}
