export type OrgType = 'GC' | 'TC' | 'FC' | 'SUPPLIER';

export type AppRole = 'GC_PM' | 'TC_PM' | 'FS' | 'SUPPLIER';

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
  created_at: string;
  updated_at: string;
}

export interface UserOrgRole {
  id: string;
  user_id: string;
  organization_id: string;
  role: AppRole;
  created_at: string;
  organization?: Organization;
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
  GC_PM: 'GC Project Manager',
  TC_PM: 'TC Project Manager',
  FS: 'Field Supervisor',
  SUPPLIER: 'Supplier',
};

export const ORG_TYPE_LABELS: Record<OrgType, string> = {
  GC: 'General Contractor',
  TC: 'Trade Contractor',
  FC: 'Finishing Contractor',
  SUPPLIER: 'Supplier',
};

// Roles that can be assigned based on org type
export const ALLOWED_ROLES_BY_ORG_TYPE: Record<OrgType, AppRole[]> = {
  GC: ['GC_PM'],
  TC: ['TC_PM', 'FS'],
  FC: ['TC_PM', 'FS'], // FC uses same roles as TC for now
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
}

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
  },
  TC_PM: {
    canViewRates: true,
    canViewMargins: true,
    canApprove: false, // Can submit for approval, not approve
    canViewInvoices: true,
    canAddHoursEstimates: true,
    canAddMaterialLists: true,
    canManageOrg: true,
    canInviteMembers: true,
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
  },
  SUPPLIER: {
    canViewRates: false,
    canViewMargins: false,
    canApprove: false,
    canViewInvoices: false,
    canAddHoursEstimates: false,
    canAddMaterialLists: false,
    canManageOrg: false,
    canInviteMembers: false,
  },
};
