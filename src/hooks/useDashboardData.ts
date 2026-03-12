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

interface Reminder {
  id: string;
  title: string;
  due_date: string;
  project_id: string | null;
  project_name: string | null;
  completed: boolean;
}

interface FinancialSummary {
  totalContracts: number;
  totalRevenue: number;
  totalCosts: number;
  profitMargin: number;
  totalWorkOrders: number;
  totalWorkOrderValue: number;
  totalBilled: number;
  outstandingBilling: number;
  potentialProfit: number;
}

interface DashboardData {
  projects: ProjectWithDetails[];
  statusCounts: {
    setup: number;
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
  financials: FinancialSummary;
  reminders: Reminder[];
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
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [financials, setFinancials] = useState<FinancialSummary>({
    totalContracts: 0,
    totalRevenue: 0,
    totalCosts: 0,
    profitMargin: 0,
    totalWorkOrders: 0,
    totalWorkOrderValue: 0,
    totalBilled: 0,
    outstandingBilling: 0,
    potentialProfit: 0,
  });
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
      // GROUP 1: Parallel project discovery
      const [
        { data: ownedProjects },
        { data: participantsData },
        { data: teamMembershipsData },
      ] = await Promise.all([
        supabase
          .from('projects')
          .select('id, name, description, status, project_type, build_type, updated_at, organization_id')
          .eq('organization_id', currentOrg.id),
        supabase
          .from('project_participants')
          .select('project_id, role')
          .eq('organization_id', currentOrg.id)
          .eq('invite_status', 'ACCEPTED'),
        supabase
          .from('project_team')
          .select('project_id, role, org_id')
          .eq('org_id', currentOrg.id)
          .eq('status', 'Accepted'),
      ]);

      const participantProjectIds = (participantsData || [])
        .map(p => p.project_id)
        .filter((id): id is string => id !== null);

      const teamMemberships: TeamMembership[] = teamMembershipsData || [];
      const teamProjectIds = teamMemberships.map(t => t.project_id).filter((id): id is string => id !== null);
      
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
      const projectIds = allProjects.map(p => p.id);

      // GROUP 2: Parallel project detail queries (all depend on projectIds)
      const [
        contractsResult,
        pendingCOsResult,
        pendingInvoicesResult,
        sentInvitesResult,
        incomingInvitesResult,
      ] = await Promise.all([
        projectIds.length > 0
          ? supabase
              .from('project_contracts')
              .select('project_id, to_role, from_role, contract_sum, from_org_id, to_org_id, trade, owner_contract_value')
              .in('project_id', projectIds)
          : Promise.resolve({ data: [] }),
        projectIds.length > 0
          ? supabase
              .from('work_items')
              .select('id, project_id, title')
              .in('project_id', projectIds)
              .eq('item_type', 'CHANGE_WORK')
              .eq('state', 'PRICED')
          : Promise.resolve({ data: [] }),
        projectIds.length > 0
          ? supabase
              .from('invoices')
              .select(`
                id, project_id, invoice_number, contract_id,
                project_contracts!inner(to_org_id)
              `)
              .in('project_id', projectIds)
              .eq('status', 'SUBMITTED')
              .eq('project_contracts.to_org_id', currentOrg.id)
          : Promise.resolve({ data: [] }),
        projectIds.length > 0
          ? supabase
              .from('project_team')
              .select('id, project_id, invited_org_name')
              .in('project_id', projectIds)
              .eq('status', 'Invited')
          : Promise.resolve({ data: [] }),
        supabase
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
          .eq('invite_status', 'INVITED'),
      ]);

      const contracts = contractsResult.data || [];
      const pendingCOs = (pendingCOsResult.data || []) as { id: string; project_id: string | null; title: string | null }[];
      const pendingInvoices = ((pendingInvoicesResult.data || []) as any[]).map((inv: any) => ({
        id: inv.id,
        project_id: inv.project_id,
        invoice_number: inv.invoice_number,
        contract_id: inv.contract_id,
      }));
      const sentInvites = (sentInvitesResult.data || []) as { id: string; project_id: string | null; invited_org_name: string | null }[];
      const incomingInvitesData = incomingInvitesResult.data || [];

      // Fetch inviter organizations for all pending invites
      const inviterUserIds = (incomingInvitesData as any[])
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

      const incomingInvitesList: PendingInvite[] = (incomingInvitesData as any[]).map((inv: any) => {
        const roleMap: Record<string, string> = {
          'GC': 'General Contractor',
          'TC': 'Trade Contractor',
          'FC': 'Field Crew',
          'SUPPLIER': 'Supplier',
        };
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
        const teamEntry = teamMemberships.find(t => t.project_id === project.id);
        let userRole = teamEntry?.role || null;
        
        if (!userRole && project.organization_id === currentOrg.id) {
          userRole = orgType === 'GC' ? 'General Contractor' : 
                     orgType === 'TC' ? 'Trade Contractor' : 
                     orgType === 'FC' ? 'Field Crew' : null;
        }

        let contractValue: number | null = null;
        const projectContracts = contracts.filter(c => c.project_id === project.id);
        
        if (orgType === 'GC') {
          // GC revenue = sum of all contracts where GC is the to_org (what TCs bill GC)
          const gcContracts = projectContracts.filter(c => c.to_org_id === currentOrg.id);
          contractValue = gcContracts.length > 0
            ? gcContracts.reduce((sum, c) => sum + (c.contract_sum || 0), 0)
            : null;
        } else if (orgType === 'TC') {
          // TC revenue = sum of all contracts where TC is from_org (what TC earns from GC)
          const tcRevenueContracts = projectContracts.filter(c => c.from_org_id === currentOrg.id);
          contractValue = tcRevenueContracts.length > 0
            ? tcRevenueContracts.reduce((sum, c) => sum + (c.contract_sum || 0), 0)
            : null;
        } else if (orgType === 'FC') {
          // FC revenue = sum of contracts where FC is from_org
          const fcContracts = projectContracts.filter(c => 
            c.from_org_id === currentOrg.id
          );
          contractValue = fcContracts.length > 0
            ? fcContracts.reduce((sum, c) => sum + (c.contract_sum || 0), 0)
            : null;
        }

        const projectPendingCOs = pendingCOs.filter(co => co.project_id === project.id).length;
        const projectPendingInvoices = pendingInvoices.filter(inv => inv.project_id === project.id).length;
        const pendingActions = (orgType === 'GC' || orgType === 'TC') ? projectPendingCOs + projectPendingInvoices : 0;

        return {
          ...project,
          userRole,
          contractValue,
          pendingActions,
        };
      });

      projectsWithDetails.sort((a, b) => 
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      );

      setProjects(projectsWithDetails);

      // GROUP 3: Parallel financial queries
      const monthStart = startOfMonth(new Date()).toISOString();
      const monthEnd = endOfMonth(new Date()).toISOString();

      const [
        allInvoicesResult,
        thisMonthCOsResult,
        remindersResult,
      ] = await Promise.all([
        projectIds.length > 0
          ? supabase
              .from('invoices')
              .select('status, total_amount, created_at, contract_id')
              .in('project_id', projectIds)
          : Promise.resolve({ data: [] }),
        projectIds.length > 0
          ? supabase
              .from('work_items')
              .select('id', { count: 'exact', head: true })
              .in('project_id', projectIds)
              .eq('item_type', 'CHANGE_WORK')
              .gte('created_at', monthStart)
              .lte('created_at', monthEnd)
          : Promise.resolve({ count: 0 }),
        user?.id
          ? supabase
              .from('reminders')
              .select(`
                id,
                title,
                due_date,
                project_id,
                completed,
                projects:project_id (name)
              `)
              .eq('user_id', user.id)
              .eq('completed', false)
              .order('due_date', { ascending: true })
              .limit(10)
          : Promise.resolve({ data: [] }),
      ]);

      const allInvoices = (allInvoicesResult.data || []) as { status: string; total_amount: number; created_at: string; contract_id: string | null }[];
      const thisMonthCOs = (thisMonthCOsResult as any).count || 0;

      // Process reminders
      const remindersList: Reminder[] = ((remindersResult.data || []) as any[]).map((r: any) => ({
        id: r.id,
        title: r.title,
        due_date: r.due_date,
        project_id: r.project_id,
        project_name: r.projects?.name || null,
        completed: r.completed,
      }));
      setReminders(remindersList);

      // Contract detail map for invoice filtering
      const contractIds = [...new Set(allInvoices.map(i => i.contract_id).filter((id): id is string => id !== null))];
      let contractDetailMap = new Map<string, { from_org_id: string | null; to_org_id: string | null }>();
      if (contractIds.length > 0) {
        const { data: contractDetails } = await supabase
          .from('project_contracts')
          .select('id, from_org_id, to_org_id')
          .in('id', contractIds);
        (contractDetails || []).forEach((c: any) => {
          contractDetailMap.set(c.id, { from_org_id: c.from_org_id, to_org_id: c.to_org_id });
        });
      }

      // Outstanding to Pay
      const invoicesToPay = allInvoices.filter(i => {
        if (i.status !== 'SUBMITTED' || !i.contract_id) return false;
        const contract = contractDetailMap.get(i.contract_id);
        return contract?.to_org_id === currentOrg.id;
      });

      // Outstanding to Collect
      const invoicesToCollect = allInvoices.filter(i => {
        if (!['SUBMITTED', 'APPROVED'].includes(i.status) || !i.contract_id) return false;
        const contract = contractDetailMap.get(i.contract_id);
        return contract?.from_org_id === currentOrg.id;
      });

      const outstandingToPay = invoicesToPay.reduce((sum, i) => sum + (i.total_amount || 0), 0);
      const outstandingToCollect = invoicesToCollect.reduce((sum, i) => sum + (i.total_amount || 0), 0);

      setBilling({
        invoicesReceived: invoicesToPay.length,
        invoicesSent: allInvoices.filter(i => {
          if (i.status === 'DRAFT' || !i.contract_id) return false;
          const contract = contractDetailMap.get(i.contract_id);
          return contract?.from_org_id === currentOrg.id;
        }).length,
        outstandingToPay,
        outstandingToCollect,
        profit: 0,
      });

      // This month stats
      const thisMonthInvoices = allInvoices.filter(i => 
        i.created_at >= monthStart && i.created_at <= monthEnd
      ).length;

      setThisMonth({
        invoices: thisMonthInvoices,
        changeOrders: thisMonthCOs,
      });

      // 7. Calculate financial summary
      const totalContractValue = contracts.reduce((sum, c) => {
        if (orgType === 'TC' && c.to_org_id === currentOrg.id) {
          return sum + (c.contract_sum || 0);
        }
        if (orgType === 'GC' && c.to_org_id === currentOrg.id) {
          return sum + (c.contract_sum || 0);
        }
        if (orgType === 'FC' && c.to_org_id === currentOrg.id) {
          return sum + (c.contract_sum || 0);
        }
        return sum;
      }, 0);

      let totalRevenue = 0;
      let totalCosts = 0;
      let totalWorkOrders = 0;
      let totalWorkOrderValue = 0;
      let totalBilled = 0;

      if (orgType === 'TC') {
        // Exclude WO/CO trade contracts from base sums to avoid double-counting
        // (WO revenue is added separately from change_order_projects.final_price)
        const isBaseContract = (c: any) => {
          const trade = (c as any).trade as string | null;
          return !trade || !['Work Order', 'Work Order Labor'].includes(trade);
        };
        contracts.forEach(c => {
          if (c.from_org_id === currentOrg.id && isBaseContract(c)) {
            totalRevenue += c.contract_sum || 0;
          }
          if (c.to_org_id === currentOrg.id && isBaseContract(c)) {
            totalCosts += c.contract_sum || 0;
          }
        });

        if (projectIds.length > 0) {
          const { data: workOrders } = await supabase
            .from('change_order_projects')
            .select('id, project_id, final_price, status, tc_internal_cost')
            .in('project_id', projectIds)
            .in('status', ['approved', 'contracted']);

          const woList = workOrders || [];
          totalWorkOrders = woList.length;
          totalWorkOrderValue = woList
            .reduce((sum, wo) => sum + (wo.final_price || 0), 0);
          totalRevenue += totalWorkOrderValue;

          if (woList.length > 0) {
            const woIds = woList.map(wo => wo.id);
            const { data: fcHours } = await supabase
              .from('change_order_fc_hours')
              .select('labor_total')
              .in('change_order_id', woIds);
            const fcLaborCost = (fcHours || []).reduce((sum, fc) => sum + (fc.labor_total || 0), 0);
            totalCosts += fcLaborCost;

            const tcInternalCost = woList.reduce((sum, wo) => sum + ((wo as any).tc_internal_cost || 0), 0);
            totalCosts += tcInternalCost;
          }
        }

        const billedInvoices = allInvoices.filter(i => {
          if (i.status === 'DRAFT' || !i.contract_id) return false;
          const contract = contractDetailMap.get(i.contract_id);
          return contract?.from_org_id === currentOrg.id;
        });
        totalBilled = billedInvoices.reduce((sum, i) => sum + (i.total_amount || 0), 0);
      } else if (orgType === 'GC') {
        // GC Revenue = owner_contract_value or sum of contracts where GC is to_org (what TCs bill GC)
        // GC Costs = sum of contracts where GC is to_org (amounts owed to TCs) + WO totals
        contracts.forEach(c => {
          if (c.to_org_id === currentOrg.id) {
            totalCosts += c.contract_sum || 0;
          }
        });

        // Use owner_contract_value as revenue if available
        const ownerValues = contracts
          .filter(c => c.to_org_id === currentOrg.id)
          .map(c => (c as any).owner_contract_value)
          .filter((v: any) => v != null && v > 0);
        if (ownerValues.length > 0) {
          totalRevenue = ownerValues.reduce((sum: number, v: number) => sum + v, 0);
        } else {
          totalRevenue = totalCosts; // fallback: show contract obligations
        }

        if (projectIds.length > 0) {
          const { data: workOrders } = await supabase
            .from('change_order_projects')
            .select('id, final_price, status')
            .in('project_id', projectIds)
            .in('status', ['approved', 'contracted']);

          const woList = workOrders || [];
          totalWorkOrders = woList.length;
          totalWorkOrderValue = woList.reduce((sum, wo) => sum + (wo.final_price || 0), 0);
          totalCosts += totalWorkOrderValue;
        }

        // GC billed = invoices received (where GC is to_org)
        const receivedInvoices = allInvoices.filter(i => {
          if (i.status === 'DRAFT' || !i.contract_id) return false;
          const contract = contractDetailMap.get(i.contract_id);
          return contract?.to_org_id === currentOrg.id;
        });
        totalBilled = receivedInvoices.reduce((sum, i) => sum + (i.total_amount || 0), 0);
      } else if (orgType === 'FC') {
        // FC Revenue = contracts where FC is from_org + FC hours from WOs
        contracts.forEach(c => {
          if (c.from_org_id === currentOrg.id) {
            totalRevenue += c.contract_sum || 0;
          }
        });

        // FC labor budget as costs
        const fcContracts = contracts.filter(c => c.from_org_id === currentOrg.id);
        fcContracts.forEach(c => {
          totalCosts += (c as any).labor_budget || 0;
        });

        if (projectIds.length > 0) {
          const { data: workOrders } = await supabase
            .from('change_order_projects')
            .select('id, status')
            .in('project_id', projectIds)
            .in('status', ['approved', 'contracted']);

          const woList = workOrders || [];
          totalWorkOrders = woList.length;

          if (woList.length > 0) {
            const woIds = woList.map(wo => wo.id);
            const { data: fcHours } = await supabase
              .from('change_order_fc_hours')
              .select('labor_total')
              .in('change_order_id', woIds);
            const fcEarnings = (fcHours || []).reduce((sum, fc) => sum + (fc.labor_total || 0), 0);
            totalWorkOrderValue = fcEarnings;
            totalRevenue += fcEarnings;
          }
        }

        // FC billed = invoices sent (where FC is from_org)
        const sentInvoices = allInvoices.filter(i => {
          if (i.status === 'DRAFT' || !i.contract_id) return false;
          const contract = contractDetailMap.get(i.contract_id);
          return contract?.from_org_id === currentOrg.id;
        });
        totalBilled = sentInvoices.reduce((sum, i) => sum + (i.total_amount || 0), 0);
      }

      const potentialProfit = totalRevenue - totalCosts;
      const profitMargin = totalRevenue > 0 
        ? (potentialProfit / totalRevenue) * 100 
        : 0;
      const outstandingBilling = totalRevenue - totalBilled;

      setFinancials({
        totalContracts: totalContractValue,
        totalRevenue,
        totalCosts,
        profitMargin,
        totalWorkOrders,
        totalWorkOrderValue,
        totalBilled,
        outstandingBilling,
        potentialProfit,
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
      setup: projects.filter(p => p.status === 'setup' || p.status === 'draft').length,
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
    financials,
    reminders,
    thisMonth,
    loading,
    refetch: fetchData,
  };
}
