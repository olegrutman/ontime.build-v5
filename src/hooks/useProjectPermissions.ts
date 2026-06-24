import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface ProjectPermissions {
  view_project: boolean;
  create_change_orders: boolean;
  approve_change_orders: boolean;
  create_invoices: boolean;
  approve_invoices: boolean;
  manage_sov: boolean;
  manage_team: boolean;
}

export const DEFAULT_PERMISSIONS: ProjectPermissions = {
  view_project: true,
  create_change_orders: false,
  approve_change_orders: false,
  create_invoices: false,
  approve_invoices: false,
  manage_sov: false,
  manage_team: false,
};

export const FULL_PERMISSIONS: ProjectPermissions = {
  view_project: true,
  create_change_orders: true,
  approve_change_orders: true,
  create_invoices: true,
  approve_invoices: true,
  manage_sov: true,
  manage_team: true,
};

export const PERMISSION_LABELS: Record<keyof ProjectPermissions, string> = {
  view_project: 'View Project',
  create_change_orders: 'Create Change Orders',
  approve_change_orders: 'Approve Change Orders',
  create_invoices: 'Create Invoices',
  approve_invoices: 'Approve Invoices',
  manage_sov: 'Manage SOV',
  manage_team: 'Manage Team',
};

export const PERMISSION_DESCRIPTIONS: Record<keyof ProjectPermissions, string> = {
  view_project: 'Can view project details, SOV, change orders, and invoices',
  create_change_orders: 'Can create and submit new change orders',
  approve_change_orders: 'Can approve or reject submitted change orders',
  create_invoices: 'Can create and submit invoices',
  approve_invoices: 'Can approve or reject submitted invoices',
  manage_sov: 'Can edit and manage Schedule of Values',
  manage_team: 'Can add and remove team members (owner only)',
};

export function useProjectPermissions(projectId: string | undefined) {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState<ProjectPermissions>(DEFAULT_PERMISSIONS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!projectId || !user) {
      setLoading(false);
      return;
    }

    fetchPermissions();
  }, [projectId, user?.id]);

  const fetchPermissions = async () => {
    if (!projectId || !user) return;

    try {
      const { data, error } = await supabase
        .rpc('get_project_permissions', { 
          _project_id: projectId, 
          _user_id: user.id 
        });

      if (error) throw error;

      if (data && typeof data === 'object' && !Array.isArray(data)) {
        const permData = data as Record<string, unknown>;
        setPermissions({
          view_project: Boolean(permData.view_project ?? true),
          create_change_orders: Boolean(permData.create_change_orders ?? false),
          approve_change_orders: Boolean(permData.approve_change_orders ?? false),
          create_invoices: Boolean(permData.create_invoices ?? false),
          approve_invoices: Boolean(permData.approve_invoices ?? false),
          manage_sov: Boolean(permData.manage_sov ?? false),
          manage_team: Boolean(permData.manage_team ?? false),
        });
      }
    } catch (error) {
      console.error('Error fetching permissions:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkPermission = (permission: keyof ProjectPermissions): boolean => {
    return permissions[permission] ?? false;
  };

  const can = {
    viewProject: permissions.view_project,
    createChangeOrders: permissions.create_change_orders,
    approveChangeOrders: permissions.approve_change_orders,
    createInvoices: permissions.create_invoices,
    approveInvoices: permissions.approve_invoices,
    manageSov: permissions.manage_sov,
    manageTeam: permissions.manage_team,
  };

  return {
    permissions,
    loading,
    checkPermission,
    can,
    refetch: fetchPermissions,
  };
}
