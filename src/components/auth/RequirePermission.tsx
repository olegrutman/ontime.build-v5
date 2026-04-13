import * as React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { RolePermissions } from '@/types/organization';

type PermissionKey = keyof RolePermissions;

interface RequirePermissionProps {
  /** Single permission or array of permissions to check */
  permission: PermissionKey | PermissionKey[];
  /** If true, requires ALL permissions. If false (default), requires ANY permission */
  requireAll?: boolean;
  /** Content to render when permission is granted */
  children: React.ReactNode;
  /** Fallback content when permission is denied (default: null) */
  fallback?: React.ReactNode;
}

/**
 * Permission-aware component that conditionally renders children based on
 * the unified effective permissions (role defaults + member_permissions + admin override).
 */
export function RequirePermission({
  permission,
  requireAll = false,
  children,
  fallback = null,
}: RequirePermissionProps) {
  const { permissions } = useAuth();

  const hasPermission = React.useMemo(() => {
    if (!permissions) return false;

    const permissionList = Array.isArray(permission) ? permission : [permission];

    if (requireAll) {
      return permissionList.every((p) => permissions[p]);
    }
    return permissionList.some((p) => permissions[p]);
  }, [permissions, permission, requireAll]);

  if (!hasPermission) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

/**
 * Hook to check permissions programmatically.
 * Uses the unified effective permissions from auth context.
 */
export function usePermission(permission: PermissionKey | PermissionKey[], requireAll = false): boolean {
  const { permissions } = useAuth();

  return React.useMemo(() => {
    if (!permissions) return false;

    const permissionList = Array.isArray(permission) ? permission : [permission];

    if (requireAll) {
      return permissionList.every((p) => permissions[p]);
    }
    return permissionList.some((p) => permissions[p]);
  }, [permissions, permission, requireAll]);
}

/**
 * Higher-order component for permission-based rendering
 */
export function withPermission<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  permission: PermissionKey | PermissionKey[],
  options?: { requireAll?: boolean; fallback?: React.ReactNode }
): React.FC<P> {
  const { requireAll = false, fallback = null } = options || {};

  return function PermissionWrappedComponent(props: P) {
    return (
      <RequirePermission permission={permission} requireAll={requireAll} fallback={fallback}>
        <WrappedComponent {...props} />
      </RequirePermission>
    );
  };
}

/**
 * Component that shows different content based on organization type
 */
interface RequireOrgTypeProps {
  orgTypes: ('GC' | 'TC' | 'FC' | 'SUPPLIER')[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function RequireOrgType({ orgTypes, children, fallback = null }: RequireOrgTypeProps) {
  const { userOrgRoles } = useAuth();

  const orgType = React.useMemo(() => {
    return (userOrgRoles[0]?.organization?.type as 'GC' | 'TC' | 'FC' | 'SUPPLIER') ?? null;
  }, [userOrgRoles]);

  if (!orgType || !orgTypes.includes(orgType)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
