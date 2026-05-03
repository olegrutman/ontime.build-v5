import { createContext, useContext } from 'react';
import type { RoleLabels, RoleCode } from '@/hooks/useRoleLabels';

const DEFAULT_LABELS: RoleLabels = {
  GC: 'General Contractor',
  TC: 'Trade Contractor',
  FC: 'Field Crew',
  GCShort: 'GC',
  TCShort: 'TC',
  FCShort: 'FC',
  label: (code: RoleCode) => ({ GC: 'General Contractor', TC: 'Trade Contractor', FC: 'Field Crew' }[code] ?? code),
  short: (code: RoleCode) => code,
};

export const RoleLabelsContext = createContext<RoleLabels>(DEFAULT_LABELS);

export function useRoleLabelsContext(): RoleLabels {
  return useContext(RoleLabelsContext);
}
