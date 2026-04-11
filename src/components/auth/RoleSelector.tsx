interface RoleSelectorProps {
  selectedRole: string;
  onSelect: (role: string) => void;
}

const ROLES = [
  { id: 'gc', icon: '🏗', name: 'General Contractor', desc: 'Manage all trades' },
  { id: 'tc', icon: '⚒', name: 'Trade Contractor', desc: 'Receive work orders' },
  { id: 'crew', icon: '👷', name: 'Field Crew', desc: 'Task assignments' },
  { id: 'supplier', icon: '📦', name: 'Supplier', desc: 'Orders & deliveries' },
];

export function RoleSelector({ selectedRole, onSelect }: RoleSelectorProps) {
  return (
    <div className="auth-role-grid">
      {ROLES.map(role => (
        <div
          key={role.id}
          className={`auth-role-card ${selectedRole === role.id ? 'selected' : ''}`}
          onClick={() => onSelect(role.id)}
        >
          <div className="auth-role-icon">{role.icon}</div>
          <div className="auth-role-name">{role.name}</div>
          <div className="auth-role-desc">{role.desc}</div>
        </div>
      ))}
    </div>
  );
}
