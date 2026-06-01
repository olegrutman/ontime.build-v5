import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';

/**
 * Mounts once near the app root. Reads the user's active org type and writes
 * `data-role` onto <html>, which flips the --role-accent CSS variables.
 * GC=navy, TC=amber, FC=green, Supplier=violet.
 */
export function RoleThemeBridge() {
  const { userOrgRoles } = useAuth();
  const orgType = userOrgRoles[0]?.organization?.type;

  useEffect(() => {
    const map: Record<string, string> = {
      GC: 'gc',
      TC: 'tc',
      FC: 'fc',
      SUPPLIER: 'supplier',
    };
    const role = orgType ? map[orgType] : null;
    if (role) {
      document.documentElement.setAttribute('data-role', role);
    } else {
      document.documentElement.removeAttribute('data-role');
    }
  }, [orgType]);

  return null;
}

export const ROLE_LABEL: Record<string, string> = {
  GC: 'General Contractor',
  TC: 'Trade Contractor',
  FC: 'Field Crew',
  SUPPLIER: 'Supplier',
};
