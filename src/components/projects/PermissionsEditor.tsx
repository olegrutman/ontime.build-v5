import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { 
  ProjectPermissions, 
  PERMISSION_LABELS, 
  PERMISSION_DESCRIPTIONS 
} from '@/hooks/useProjectPermissions';

interface PermissionsEditorProps {
  permissions: ProjectPermissions;
  onChange: (permissions: ProjectPermissions) => void;
  disabled?: boolean;
}

const EDITABLE_PERMISSIONS: (keyof ProjectPermissions)[] = [
  'create_change_orders',
  'approve_change_orders',
  'create_invoices',
  'approve_invoices',
  'manage_sov',
];

export default function PermissionsEditor({
  permissions,
  onChange,
  disabled = false,
}: PermissionsEditorProps) {
  const handleToggle = (key: keyof ProjectPermissions) => {
    onChange({
      ...permissions,
      [key]: !permissions[key],
    });
  };

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-foreground">Permissions</p>
      <div className="space-y-2">
        {EDITABLE_PERMISSIONS.map((key) => (
          <div 
            key={key} 
            className="flex items-start gap-3 p-2 rounded-md hover:bg-muted/50 transition-colors"
          >
            <Checkbox
              id={`perm-${key}`}
              checked={permissions[key]}
              onCheckedChange={() => handleToggle(key)}
              disabled={disabled}
              className="mt-0.5"
            />
            <div className="flex-1 space-y-0.5">
              <Label 
                htmlFor={`perm-${key}`} 
                className="text-sm font-medium cursor-pointer"
              >
                {PERMISSION_LABELS[key]}
              </Label>
              <p className="text-xs text-muted-foreground">
                {PERMISSION_DESCRIPTIONS[key]}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
