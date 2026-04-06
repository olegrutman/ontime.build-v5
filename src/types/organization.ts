export type OrgType = 'GC' | 'TC' | 'FC' | 'SUPPLIER';

export type AppRole = 'GC_PM' | 'TC_PM' | 'FC_PM' | 'FS' | 'SUPPLIER';

export interface OrgAddress {
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
}

export interface Organization {
  id: string;
  org_code: string;
  name: string;
  type: OrgType;
  address?: OrgAddress | null;
  phone?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  user_id: string;
  email: string;
  full_name: string | null;
  first_name?: string | null;
  last_name?: string | null;
  phone?: string | null;
  job_title?: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserOrgRole {
  id: string;
  user_id: string;
  organization_id: string;
  role: AppRole;
  is_admin: boolean;
  created_at: string;
  organization?: Organization;
}

export interface MemberPermissions {
  id: string;
  user_org_role_id: string;
  can_approve_invoices: boolean;
  can_create_work_orders: boolean;
  can_create_pos: boolean;
  can_manage_team: boolean;
  can_view_financials: boolean;
  can_submit_time: boolean;
  updated_at: string;
}

export interface OrgInvitation {
  id: string;
  organization_id: string;
  invited_by: string;
  email: string;
  role: AppRole;
  status: 'pending' | 'accepted' | 'expired';
  created_at: string;
  expires_at: string;
}

export const ROLE_LABELS: Record<AppRole, string> = {
  GC_PM: 'General Contractor Manager',
  TC_PM: 'Trade Contractor Manager',
  FC_PM: 'Field Crew Manager',
  FS: 'Field Supervisor',
  SUPPLIER: 'Supplier',
};

export const ORG_TYPE_LABELS: Record<OrgType, string> = {
  GC: 'General Contractor',
  TC: 'Trade Contractor',
  FC: 'Field Crew',
  SUPPLIER: 'Supplier',
};

// Roles that can be assigned based on org type
export const ALLOWED_ROLES_BY_ORG_TYPE: Record<OrgType, AppRole[]> = {
  GC: ['GC_PM'],
  TC: ['TC_PM', 'FS'],
  FC: ['FC_PM', 'FS'], // FC now has its own FC_PM role
  SUPPLIER: ['SUPPLIER'],
};

// Permission flags for each role
export interface RolePermissions {
  canViewRates: boolean;
  canViewMargins: boolean;
  canApprove: boolean;
  canViewInvoices: boolean;
  canAddHoursEstimates: boolean;
  canAddMaterialLists: boolean;
  canManageOrg: boolean;
  canInviteMembers: boolean;
  canCreateChangeOrders: boolean;
  canCreatePOs: boolean;
  canSubmitTime: boolean;
  canCreateRFIs: boolean;
}

/** Mapping from RolePermissions keys to member_permissions DB columns */
export const PERMISSION_TO_DB_COLUMN: Record<keyof RolePermissions, keyof MemberPermissions | null> = {
  canViewRates: 'can_view_financials',
  canViewMargins: 'can_view_financials',
  canApprove: 'can_approve_invoices',
  canViewInvoices: 'can_view_financials',
  canAddHoursEstimates: 'can_submit_time',
  canAddMaterialLists: null, // No direct DB column, always allowed
  canManageOrg: 'can_manage_team',
  canInviteMembers: 'can_manage_team',
  canCreateWorkOrders: 'can_create_work_orders',
  canCreatePOs: 'can_create_pos',
  canSubmitTime: 'can_submit_time',
  canCreateRFIs: null, // DB column exists but types not yet regenerated
};

/** Zero permissions (used for null/unknown roles) */
export const NO_PERMISSIONS: RolePermissions = {
  canViewRates: false,
  canViewMargins: false,
  canApprove: false,
  canViewInvoices: false,
  canAddHoursEstimates: false,
  canAddMaterialLists: false,
  canManageOrg: false,
  canInviteMembers: false,
  canCreateWorkOrders: false,
  canCreatePOs: false,
  canSubmitTime: false,
  canCreateRFIs: false,
};

/** All permissions enabled (used for admins) */
export const ALL_PERMISSIONS: RolePermissions = {
  canViewRates: true,
  canViewMargins: true,
  canApprove: true,
  canViewInvoices: true,
  canAddHoursEstimates: true,
  canAddMaterialLists: true,
  canManageOrg: true,
  canInviteMembers: true,
  canCreateWorkOrders: true,
  canCreatePOs: true,
  canSubmitTime: true,
  canCreateRFIs: true,
};

/** Role-based defaults — used as baseline before member_permissions override */
export const ROLE_PERMISSIONS: Record<AppRole, RolePermissions> = {
  GC_PM: {
    canViewRates: true,
    canViewMargins: true,
    canApprove: true,
    canViewInvoices: true,
    canAddHoursEstimates: true,
    canAddMaterialLists: true,
    canManageOrg: true,
    canInviteMembers: true,
    canCreateWorkOrders: true,
    canCreatePOs: true,
    canSubmitTime: true,
    canCreateRFIs: true,
  },
  TC_PM: {
    canViewRates: true,
    canViewMargins: true,
    canApprove: false,
    canViewInvoices: true,
    canAddHoursEstimates: true,
    canAddMaterialLists: true,
    canManageOrg: true,
    canInviteMembers: true,
    canCreateWorkOrders: true,
    canCreatePOs: true,
    canSubmitTime: true,
    canCreateRFIs: true,
  },
  FC_PM: {
    canViewRates: false,
    canViewMargins: false,
    canApprove: false,
    canViewInvoices: true,
    canAddHoursEstimates: true,
    canAddMaterialLists: true,
    canManageOrg: true,
    canInviteMembers: false,
    canCreateWorkOrders: true,
    canCreatePOs: false,
    canSubmitTime: true,
    canCreateRFIs: true,
  },
  FS: {
    canViewRates: false,
    canViewMargins: false,
    canApprove: false,
    canViewInvoices: false,
    canAddHoursEstimates: true,
    canAddMaterialLists: true,
    canManageOrg: false,
    canInviteMembers: false,
    canCreateWorkOrders: false,
    canCreatePOs: false,
    canSubmitTime: true,
    canCreateRFIs: false,
  },
  SUPPLIER: {
    canViewRates: false,
    canViewMargins: false,
    canApprove: false,
    canViewInvoices: false,
    canAddHoursEstimates: false,
    canAddMaterialLists: false,
    canManageOrg: true,
    canInviteMembers: false,
    canCreateWorkOrders: false,
    canCreatePOs: false,
    canSubmitTime: false,
    canCreateRFIs: true,
  },
};

/**
 * Compute effective permissions by merging role defaults with DB member_permissions.
 * Admins get ALL permissions regardless.
 */
// ── Org-type-specific job titles ──────────────────────────────────────

export const JOB_TITLES_BY_ORG_TYPE: Record<OrgType, string[]> = {
  GC: ['Owner/Manager', 'Project Manager', 'Field Supervisor', 'Office Manager', 'Superintendent'],
  TC: ['Owner/Manager', 'Project Manager', 'Field Supervisor', 'Office Manager', 'Superintendent'],
  FC: ['Owner/Manager', 'Project Manager', 'Field Supervisor', 'Office Manager', 'Superintendent'],
  SUPPLIER: ['Owner', 'Sales Manager', 'Sales Support', 'Office Manager', 'Accounting'],
};

export const ALL_JOB_TITLES = [...new Set(Object.values(JOB_TITLES_BY_ORG_TYPE).flat())];

export function getJobTitlesForOrgType(orgType: OrgType | string | null | undefined): string[] {
  if (orgType && orgType in JOB_TITLES_BY_ORG_TYPE) {
    return JOB_TITLES_BY_ORG_TYPE[orgType as OrgType];
  }
  return ALL_JOB_TITLES;
}

export function getEffectivePermissions(
  role: AppRole | null,
  memberPerms: MemberPermissions | null,
  isAdmin: boolean
): RolePermissions {
  if (isAdmin) return ALL_PERMISSIONS;
  if (!role) return NO_PERMISSIONS;

  const roleDefaults = ROLE_PERMISSIONS[role];

  // If no member_permissions row exists, use role defaults
  if (!memberPerms) return roleDefaults;

  // Override role defaults with DB member_permissions
  const result: RolePermissions = { ...roleDefaults };
  for (const [key, dbCol] of Object.entries(PERMISSION_TO_DB_COLUMN)) {
    if (dbCol && dbCol in memberPerms) {
      (result as any)[key] = (memberPerms as any)[dbCol];
    }
  }
  return result;
}
