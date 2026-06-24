/**
 * useOrgType — canonical source of truth for the current user's organization type.
 *
 * Always derive role checks from the database `organizations.type` value (resolved
 * via `userOrgRoles[0].organization?.type`) rather than inferring from `currentRole`
 * strings. This avoids the brittle scatter of hardcoded `'GC' | 'TC' | 'FC'` checks
 * documented in QA report M5.
 *
 * Usage:
 *   const { orgType, isGC, isTC, isFC, isSupplier } = useOrgType();
 *
 * For per-CO membership resolution (where the active membership may not be the
 * primary org), see `useCORoleContext` which performs its own per-CO lookup.
 */
import { useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import type { OrgType } from '@/types/organization';

export interface UseOrgTypeResult {
  orgType: OrgType | null;
  isGC: boolean;
  isTC: boolean;
  isFC: boolean;
  isSupplier: boolean;
  /** Convenience: true if the current org bills upstream (TC, FC, Supplier). */
  isDownstream: boolean;
}

export function useOrgType(): UseOrgTypeResult {
  const { userOrgRoles } = useAuth();

  return useMemo(() => {
    const primary = userOrgRoles[0];
    const orgType = (primary?.organization?.type ?? null) as OrgType | null;
    const isGC = orgType === 'GC';
    const isTC = orgType === 'TC';
    const isFC = orgType === 'FC';
    const isSupplier = orgType === 'SUPPLIER';
    return {
      orgType,
      isGC,
      isTC,
      isFC,
      isSupplier,
      isDownstream: isTC || isFC || isSupplier,
    };
  }, [userOrgRoles]);
}

/** Plain helpers when you already have an OrgType in hand (e.g. from a fetched row). */
export const isGC = (t: OrgType | string | null | undefined): boolean => t === 'GC';
export const isTC = (t: OrgType | string | null | undefined): boolean => t === 'TC';
export const isFC = (t: OrgType | string | null | undefined): boolean => t === 'FC';
export const isSupplier = (t: OrgType | string | null | undefined): boolean => t === 'SUPPLIER';
