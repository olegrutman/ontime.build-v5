import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { startOfMonth, endOfMonth } from 'date-fns';

interface Project {
  id: string;
  name: string;
  description: string | null;
  status: string;
  project_type: string;
  build_type: string;
  updated_at: string;
  organization_id: string;
}

interface ProjectWithDetails extends Project {
  userRole: string | null;
  contractValue: number | null;
  pendingActions: number;
}

interface AttentionItem {
  id: string;
  type: 'change_order' | 'invoice' | 'invite';
  title: string;
  projectName: string;
  projectId: string;
}

interface TeamMembership {
  project_id: string | null;
  role: string | null;
  org_id: string | null;
}

interface PendingInvite {
  id: string;
  projectId: string;
  projectName: string;
  invitedByOrgName: string;
  role: string;
}

interface DashboardData {
  projects: ProjectWithDetails[];
  statusCounts: {
    active: number;
    on_hold: number;
    completed: number;
    archived: number;
  };
  needsAttention: {
    changeOrders: number;
    invoices: number;
    pendingInvites: number;
  };
  attentionItems: AttentionItem[];
  pendingInvites: PendingInvite[];
  billing: {
    role: 'GC' | 'TC' | 'FC';
    invoicesReceived: number;
    invoicesSent: number;
    outstandingToPay: number;
    outstandingToCollect: number;
    profit: number;
  };
  thisMonth: {
    invoices: number;
    changeOrders: number;
  };
  loading: boolean;
  refetch: () => Promise<void>;
}

export function useDashboardData(): DashboardData {
  const { user, userOrgRoles } = useAuth();
  const [projects, setProjects] = useState<ProjectWithDetails[]>([]);
  const [attentionItems, setAttentionItems] = useState<AttentionItem[]>([]);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [billing, setBilling] = useState({
    invoicesReceived: 0,
    invoicesSent: 0,
    outstandingToPay: 0,
    outstandingToCollect: 0,
    profit: 0,
  });
  const [thisMonth, setThisMonth] = useState({ invoices: 0, changeOrders: 0 });
  const [loading, setLoading] = useState(true);

  const currentOrg = userOrgRoles[0]?.organization;
  const orgType = currentOrg?.type as 'GC' | 'TC' | 'FC' | 'SUPPLIER' | undefined;
  const billingRole: 'GC' | 'TC' | 'FC' = orgType === 'GC' ? 'GC' : orgType === 'FC' ? 'FC' : 'TC';

  const fetchData = async () => {
    if (!currentOrg?.id || !user) {
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      // 1. Fetch projects the user's org is part of
      // First get projects created by this org
      const { data: ownedProjects } = await supabase
        .from('projects')
        .select('id, name, description, status, project_type, build_type, updated_at, organization_id')
        .eq('organization_id', currentOrg.id);

      // Get projects from project_participants (source of truth for project access)
      const { data: participantsData } = await supabase
        .from('project_participants')
        .select('project_id, role')
        .eq('organization_id', currentOrg.id)
        .eq('invite_status', 'ACCEPTED');

      const participantProjectIds = (participantsData || [])
        .map(p => p.project_id)
        .filter((id): id is string => id !== null);

      // Also get projects from project_team (legacy support)
      const { data: teamMembershipsData } = await supabase
        .from('project_team')
        .select('project_id, role, org_id')
        .eq('org_id', currentOrg.id)
        .eq('status', 'Accepted');

      const teamMemberships: TeamMembership[] = teamMembershipsData || [];
      const teamProjectIds = teamMemberships.map(t => t.project_id).filter((id): id is string => id !== null);
      
      // Combine project IDs from both sources
      const allProjectIds = [...new Set([...participantProjectIds, ...teamProjectIds])];
      
      let assignedProjects: Project[] = [];
      if (allProjectIds.length > 0) {
        const { data } = await supabase
          .from('projects')
          .select('id, name, description, status, project_type, build_type, updated_at, organization_id')
          .in('id', allProjectIds);
        assignedProjects = (data || []) as Project[];
      }

      // Merge and dedupe projects
      const allProjectsMap = new Map<string, Project>();
      (ownedProjects || []).forEach((p) => allProjectsMap.set(p.id, p as Project));
      assignedProjects.forEach((p) => allProjectsMap.set(p.id, p));
      const allProjects = Array.from(allProjectsMap.values());

      // 2. Get contracts for user's role on each project
      const projectIds = allProjects.map(p => p.id);
      
      let contracts: { 
        project_id: string; 
        to_role: string; 
        from_role: string; 
        contract_sum: number;
        from_org_id: string | null;
        to_org_id: string | null;
      }[] = [];
      if (projectIds.length > 0) {
        const { data } = await supabase
          .from('project_contracts')
          .select('project_id, to_role, from_role, contract_sum, from_org_id, to_org_id')
          .in('project_id', projectIds);
        contracts = data || [];
      }

      // 3. Get pending change orders (PRICED state, awaiting approval)
      let pendingCOs: { id: string; project_id: string | null; title: string | null }[] = [];
      if (projectIds.length > 0) {
        const { data } = await supabase
          .from('work_items')
          .select('id, project_id, title')
          .in('project_id', projectIds)
          .eq('item_type', 'CHANGE_WORK')
          .eq('state', 'PRICED');
        pendingCOs = data || [];
      }

      // 4. Get pending invoices (SUBMITTED, awaiting approval)
      let pendingInvoices: { id: string; project_id: string; invoice_number: string }[] = [];
      if (projectIds.length > 0) {
        const { data } = await supabase
          .from('invoices')
          .select('id, project_id, invoice_number')
          .in('project_id', projectIds)
          .eq('status', 'SUBMITTED');
        pendingInvoices = data || [];
      }

      // 5. Get pending team invites SENT by current org (for projects they own)
      let sentInvites: { id: string; project_id: string | null; invited_org_name: string | null }[] = [];
      if (projectIds.length > 0) {
        const { data } = await supabase
          .from('project_team')
          .select('id, project_id, invited_org_name')
          .in('project_id', projectIds)
          .eq('status', 'Invited');
        sentInvites = data || [];
      }

      // 6. Get pending invites TO the current org (invitations they need to accept/decline)
      const { data: incomingInvitesData } = await supabase
        .from('project_participants')
        .select(`
          id,
          project_id,
          role,
          invited_by,
          projects:project_id (
            id,
            name,
            organization_id,
            organizations:organization_id (
              name
            )
          )
        `)
        .eq('organization_id', currentOrg.id)
        .eq('invite_status', 'INVITED');

      // Fetch inviter organizations for all pending invites
      const inviterUserIds = (incomingInvitesData || [])
        .map((inv: any) => inv.invited_by)
        .filter((id: string | null): id is string => id !== null);
      
      let inviterOrgMap: Record<string, string> = {};
      if (inviterUserIds.length > 0) {
        const { data: inviterOrgs } = await supabase
          .from('user_org_roles')
          .select('user_id, organizations:organization_id (name)')
          .in('user_id', inviterUserIds);
        
        (inviterOrgs || []).forEach((uor: any) => {
          if (uor.user_id && uor.organizations?.name) {
            inviterOrgMap[uor.user_id] = uor.organizations.name;
          }
        });
      }

      const incomingInvitesList: PendingInvite[] = (incomingInvitesData || []).map((inv: any) => {
        const roleMap: Record<string, string> = {
          'GC': 'General Contractor',
          'TC': 'Trade Contractor',
          'FC': 'Field Crew',
          'SUPPLIER': 'Supplier',
        };
        // Use the actual inviter's org name, fallback to project owner's org
        const inviterOrgName = inv.invited_by ? inviterOrgMap[inv.invited_by] : null;
        return {
          id: inv.id,
          projectId: inv.project_id,
          projectName: inv.projects?.name || 'Unknown Project',
          invitedByOrgName: inviterOrgName || inv.projects?.organizations?.name || 'Unknown',
          role: roleMap[inv.role] || inv.role,
        };
      });

      setPendingInvites(incomingInvitesList);

      // Build attention items
      const attentionList: AttentionItem[] = [];
      
      // Only show CO approvals if user is GC (can approve)
      if (orgType === 'GC') {
        pendingCOs.forEach(co => {
          if (!co.project_id) return;
          const proj = allProjects.find(p => p.id === co.project_id);
          attentionList.push({
            id: co.id,
            type: 'change_order',
            title: co.title || 'Change Order',
            projectName: proj?.name || 'Unknown Project',
            projectId: co.project_id,
          });
        });
      }

      // Show invoice approvals for GC, or submitted invoices for TC/FC
      if (orgType === 'GC') {
        pendingInvoices.forEach(inv => {
          const proj = allProjects.find(p => p.id === inv.project_id);
          attentionList.push({
            id: inv.id,
            type: 'invoice',
            title: inv.invoice_number,
            projectName: proj?.name || 'Unknown Project',
            projectId: inv.project_id,
          });
        });
      }

      // Sent invites (for projects they own)
      sentInvites.forEach(inv => {
        if (!inv.project_id) return;
        const proj = allProjects.find(p => p.id === inv.project_id);
        attentionList.push({
          id: inv.id,
          type: 'invite',
          title: inv.invited_org_name || 'Pending Invite',
          projectName: proj?.name || 'Unknown Project',
          projectId: inv.project_id,
        });
      });

      setAttentionItems(attentionList);

      // Build project list with details
      const projectsWithDetails: ProjectWithDetails[] = allProjects.map(project => {
        // Find user's role on this project
        const teamEntry = teamMemberships.find(t => t.project_id === project.id);
        let userRole = teamEntry?.role || null;
        
        // If this org created the project, determine role from org type
        if (!userRole && project.organization_id === currentOrg.id) {
          userRole = orgType === 'GC' ? 'General Contractor' : 
                     orgType === 'TC' ? 'Trade Contractor' : 
                     orgType === 'FC' ? 'Field Crew' : null;
        }

        // Find the relevant contract value for this user
        let contractValue: number | null = null;
        const projectContracts = contracts.filter(c => c.project_id === project.id);
        
        if (orgType === 'GC') {
          // GC sees contracts where they are the "from" role
          const gcContract = projectContracts.find(c => c.from_role === 'General Contractor');
          contractValue = gcContract?.contract_sum || null;
        } else if (orgType === 'TC') {
          // TC sees their upstream contract (from GC to TC)
          const tcContract = projectContracts.find(c => c.to_role === 'Trade Contractor');
          contractValue = tcContract?.contract_sum || null;
        } else if (orgType === 'FC') {
          // FC only sees contracts where their org is the recipient (to_org_id)
          const fcContract = projectContracts.find(c => 
            c.to_role === 'Field Crew' && c.to_org_id === currentOrg.id
          );
          contractValue = fcContract?.contract_sum || null;
        }

        // Count pending actions for this project
        const projectPendingCOs = pendingCOs.filter(co => co.project_id === project.id).length;
        const projectPendingInvoices = pendingInvoices.filter(inv => inv.project_id === project.id).length;
        const pendingActions = orgType === 'GC' ? projectPendingCOs + projectPendingInvoices : 0;

        return {
          ...project,
          userRole,
          contractValue,
          pendingActions,
        };
      });

      // Sort by updated_at descending
      projectsWithDetails.sort((a, b) => 
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      );

      setProjects(projectsWithDetails);

      // 6. Calculate billing totals
      const monthStart = startOfMonth(new Date()).toISOString();
      const monthEnd = endOfMonth(new Date()).toISOString();

      let allInvoices: { status: string; total_amount: number; created_at: string }[] = [];
      if (projectIds.length > 0) {
        const { data } = await supabase
          .from('invoices')
          .select('status, total_amount, created_at')
          .in('project_id', projectIds);
        allInvoices = data || [];
      }

      const submittedInvoices = allInvoices.filter(i => i.status === 'SUBMITTED');
      const approvedUnpaid = allInvoices.filter(i => i.status === 'APPROVED');
      
      const outstandingToPay = submittedInvoices.reduce((sum, i) => sum + (i.total_amount || 0), 0);
      const outstandingToCollect = approvedUnpaid.reduce((sum, i) => sum + (i.total_amount || 0), 0);

      setBilling({
        invoicesReceived: submittedInvoices.length,
        invoicesSent: allInvoices.filter(i => i.status !== 'DRAFT').length,
        outstandingToPay,
        outstandingToCollect,
        profit: 0, // Would need to calculate from contracts
      });

      // This month stats
      const thisMonthInvoices = allInvoices.filter(i => 
        i.created_at >= monthStart && i.created_at <= monthEnd
      ).length;

      let thisMonthCOs = 0;
      if (projectIds.length > 0) {
        const { count } = await supabase
          .from('work_items')
          .select('id', { count: 'exact', head: true })
          .in('project_id', projectIds)
          .eq('item_type', 'CHANGE_WORK')
          .gte('created_at', monthStart)
          .lte('created_at', monthEnd);
        thisMonthCOs = count || 0;
      }

      setThisMonth({
        invoices: thisMonthInvoices,
        changeOrders: thisMonthCOs,
      });

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user?.id, currentOrg?.id]);

  const statusCounts = useMemo(() => {
    return {
      active: projects.filter(p => p.status === 'active').length,
      on_hold: projects.filter(p => p.status === 'on_hold').length,
      completed: projects.filter(p => p.status === 'completed').length,
      archived: projects.filter(p => p.status === 'archived').length,
    };
  }, [projects]);

  const needsAttention = useMemo(() => {
    return {
      changeOrders: attentionItems.filter(i => i.type === 'change_order').length,
      invoices: attentionItems.filter(i => i.type === 'invoice').length,
      pendingInvites: attentionItems.filter(i => i.type === 'invite').length + pendingInvites.length,
    };
  }, [attentionItems, pendingInvites]);

  return {
    projects,
    statusCounts,
    needsAttention,
    attentionItems,
    pendingInvites,
    billing: { ...billing, role: billingRole },
    thisMonth,
    loading,
    refetch: fetchData,
  };
}
