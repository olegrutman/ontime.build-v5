import { createContext, useContext } from 'react';
import { ROLE_LONG_NAMES, makeInitials, type RoleLabels, type RoleCode } from '@/hooks/useRoleLabels';

/**
 * Fallback labels used when no project context is available. These are always
 * spelled out — the bare two-letter codes (GC/TC/FC) must never reach the UI.
 */
const DEFAULT_LABELS: RoleLabels = {
  GC: ROLE_LONG_NAMES.GC,
  TC: ROLE_LONG_NAMES.TC,
  FC: ROLE_LONG_NAMES.FC,
  GCShort: ROLE_LONG_NAMES.GC,
  TCShort: ROLE_LONG_NAMES.TC,
  FCShort: ROLE_LONG_NAMES.FC,
  label: (code: RoleCode) => ROLE_LONG_NAMES[code] ?? code,
  short: (code: RoleCode) => ROLE_LONG_NAMES[code] ?? code,
  forOrg: () => '',
  initials: (code: RoleCode) => makeInitials(ROLE_LONG_NAMES[code] ?? code),
};

export const RoleLabelsContext = createContext<RoleLabels>(DEFAULT_LABELS);

export function useRoleLabelsContext(): RoleLabels {
  return useContext(RoleLabelsContext);
}
