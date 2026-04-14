export type PlatformRole = 'NONE' | 'PLATFORM_OWNER' | 'PLATFORM_ADMIN' | 'SUPPORT_AGENT';

export interface PlatformUser {
  id: string;
  user_id: string;
  platform_role: PlatformRole;
  two_factor_verified: boolean;
  last_impersonation_at: string | null;
  created_at: string;
  updated_at: string;
}

export type SupportActionType =
  | 'LOGIN_AS_USER_START'
  | 'LOGIN_AS_USER_END'
  | 'UNLOCK_RECORD'
  | 'FORCE_ACCEPT_PROJECT'
  | 'RESEND_INVITE'
  | 'ADD_MEMBER_NO_VERIFICATION'
  | 'CHANGE_USER_EMAIL'
  | 'RESET_PASSWORD_LINK'
  | 'EDIT_PROJECT_SETUP'
  | 'EDIT_CONTRACT_VALUE'
  | 'EDIT_PO'
  | 'EDIT_INVOICE'
  | 'EDIT_CHANGE_ORDER'
  | 'RESTORE_DELETED_ITEM'
  | 'REBUILD_PERMISSIONS'
  | 'MANUAL_VERIFY_SUPPLIER'
  | 'DELETE_PROJECT'
  | 'DELETE_INVOICE'
  | 'DELETE_PURCHASE_ORDER'
  | 'DELETE_CHANGE_ORDER'
  | 'CREATE_USER_AND_ADD';

export interface SupportActionLog {
  id: string;
  created_at: string;
  created_by_user_id: string;
  created_by_name: string | null;
  created_by_email: string | null;
  target_org_id: string | null;
  target_org_name: string | null;
  target_project_id: string | null;
  target_project_name: string | null;
  target_user_id: string | null;
  target_user_email: string | null;
  action_type: SupportActionType;
  action_summary: string | null;
  reason: string;
  before_snapshot: Record<string, unknown> | null;
  after_snapshot: Record<string, unknown> | null;
}

export const PLATFORM_ROLE_LABELS: Record<PlatformRole, string> = {
  NONE: 'None',
  PLATFORM_OWNER: 'Platform Owner',
  PLATFORM_ADMIN: 'Platform Admin',
  SUPPORT_AGENT: 'Support Agent',
};

export interface PlatformPermissions {
  canDeleteOrgs: boolean;
  canChangeBilling: boolean;
  canBulkExport: boolean;
  canManageFeatureFlags: boolean;
  canRemovePlatformUsers: boolean;
  canImpersonate: boolean;
  canEditRecords: boolean;
  canViewLogs: boolean;
}

export const PLATFORM_ROLE_PERMISSIONS: Record<PlatformRole, PlatformPermissions> = {
  NONE: {
    canDeleteOrgs: false,
    canChangeBilling: false,
    canBulkExport: false,
    canManageFeatureFlags: false,
    canRemovePlatformUsers: false,
    canImpersonate: false,
    canEditRecords: false,
    canViewLogs: false,
  },
  SUPPORT_AGENT: {
    canDeleteOrgs: false,
    canChangeBilling: false,
    canBulkExport: false,
    canManageFeatureFlags: false,
    canRemovePlatformUsers: false,
    canImpersonate: true,
    canEditRecords: true,
    canViewLogs: true,
  },
  PLATFORM_ADMIN: {
    canDeleteOrgs: false,
    canChangeBilling: false,
    canBulkExport: true,
    canManageFeatureFlags: true,
    canRemovePlatformUsers: false,
    canImpersonate: true,
    canEditRecords: true,
    canViewLogs: true,
  },
  PLATFORM_OWNER: {
    canDeleteOrgs: true,
    canChangeBilling: true,
    canBulkExport: true,
    canManageFeatureFlags: true,
    canRemovePlatformUsers: true,
    canImpersonate: true,
    canEditRecords: true,
    canViewLogs: true,
  },
};

export const ACTION_TYPE_LABELS: Record<SupportActionType, string> = {
  LOGIN_AS_USER_START: 'Impersonation Started',
  LOGIN_AS_USER_END: 'Impersonation Ended',
  UNLOCK_RECORD: 'Record Unlocked',
  FORCE_ACCEPT_PROJECT: 'Project Force Accepted',
  RESEND_INVITE: 'Invitation Resent',
  ADD_MEMBER_NO_VERIFICATION: 'Member Added (No Verification)',
  CHANGE_USER_EMAIL: 'User Email Changed',
  RESET_PASSWORD_LINK: 'Password Reset Sent',
  EDIT_PROJECT_SETUP: 'Project Setup Edited',
  EDIT_CONTRACT_VALUE: 'Contract Value Edited',
  EDIT_PO: 'Purchase Order Edited',
  EDIT_INVOICE: 'Invoice Edited',
  EDIT_CHANGE_ORDER: 'Change Order Edited',
  RESTORE_DELETED_ITEM: 'Deleted Item Restored',
  REBUILD_PERMISSIONS: 'Permissions Rebuilt',
  MANUAL_VERIFY_SUPPLIER: 'Supplier Manually Verified',
  DELETE_PROJECT: 'Project Deleted',
  DELETE_INVOICE: 'Invoice Deleted',
  DELETE_PURCHASE_ORDER: 'Purchase Order Deleted',
  DELETE_CHANGE_ORDER: 'Change Order Deleted',
  CREATE_USER_AND_ADD: 'User Created & Assigned',
};
