import { cn } from '@/lib/utils';
import { OrgType, AppRole, ORG_TYPE_LABELS, ROLE_LABELS } from '@/types/organization';

interface RoleBadgeProps {
  role?: AppRole;
  orgType?: OrgType;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

const orgTypeColors: Record<OrgType, string> = {
  GC: 'bg-[hsl(var(--org-gc))] text-white',
  TC: 'bg-[hsl(var(--org-tc))] text-white',
  FC: 'bg-[hsl(var(--org-fc))] text-white',
  SUPPLIER: 'bg-[hsl(var(--org-supplier))] text-white',
};

const orgTypeDotColors: Record<OrgType, string> = {
  GC: 'bg-[hsl(var(--org-gc))]',
  TC: 'bg-[hsl(var(--org-tc))]',
  FC: 'bg-[hsl(var(--org-fc))]',
  SUPPLIER: 'bg-[hsl(var(--org-supplier))]',
};

const sizeClasses = {
  sm: 'h-5 px-1.5 text-[10px]',
  md: 'h-6 px-2 text-xs',
  lg: 'h-7 px-2.5 text-sm',
};

const dotSizeClasses = {
  sm: 'w-2 h-2',
  md: 'w-2.5 h-2.5',
  lg: 'w-3 h-3',
};

export function RoleBadge({
  role,
  orgType,
  size = 'md',
  showLabel = true,
  className,
}: RoleBadgeProps) {
  // Derive org type from role if not provided
  const effectiveOrgType = orgType || getOrgTypeFromRole(role);
  
  if (!effectiveOrgType) {
    return null;
  }

  const label = role ? ROLE_LABELS[role] : ORG_TYPE_LABELS[effectiveOrgType];
  const shortLabel = effectiveOrgType;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md font-medium uppercase tracking-wide',
        orgTypeColors[effectiveOrgType],
        sizeClasses[size],
        className
      )}
    >
      {showLabel ? (
        <span className="truncate">{shortLabel}</span>
      ) : (
        <span
          className={cn('rounded-full', dotSizeClasses[size], 'bg-white/90')}
        />
      )}
    </span>
  );
}

// Dot-only variant for compact displays
export function RoleDot({
  role,
  orgType,
  size = 'md',
  className,
}: Omit<RoleBadgeProps, 'showLabel'>) {
  const effectiveOrgType = orgType || getOrgTypeFromRole(role);
  
  if (!effectiveOrgType) {
    return null;
  }

  return (
    <span
      className={cn(
        'inline-flex rounded-full',
        dotSizeClasses[size],
        orgTypeDotColors[effectiveOrgType],
        className
      )}
      title={ORG_TYPE_LABELS[effectiveOrgType]}
    />
  );
}

// Helper to derive org type from role
function getOrgTypeFromRole(role?: AppRole): OrgType | null {
  if (!role) return null;
  
  switch (role) {
    case 'GC_PM':
      return 'GC';
    case 'TC_PM':
      return 'TC';
    case 'FC_PM':
      return 'FC';
    case 'FS':
      return 'TC'; // Field supervisors typically belong to TC
    case 'SUPPLIER':
      return 'SUPPLIER';
    default:
      return null;
  }
}

// Badge with tooltip showing full role name
export function RoleBadgeWithTooltip({
  role,
  orgType,
  size = 'md',
  className,
}: RoleBadgeProps) {
  const effectiveOrgType = orgType || getOrgTypeFromRole(role);
  const fullLabel = role ? ROLE_LABELS[role] : effectiveOrgType ? ORG_TYPE_LABELS[effectiveOrgType] : '';
  
  return (
    <span title={fullLabel}>
      <RoleBadge role={role} orgType={orgType} size={size} className={className} />
    </span>
  );
}
