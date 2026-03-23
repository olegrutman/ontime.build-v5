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
  type: 'invoice' | 'invite' | 'sent_invite';
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
  totalBilled: number;
  outstandingBilling: number;
  potentialProfit: number;
}

export interface RecentDoc {
  id: string;
  type: 'invoice';
  title: string;
  status: string;
  amount: number | null;
  created_at: string;
  projectName: string;
  projectId: string;
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
  recentDocs: RecentDoc[];
  thisMonth: {
    invoices: number;
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
  const [recentDocs, setRecentDocs] = useState<RecentDoc[]>([]);
  const [financials, setFinancials] = useState<FinancialSummary>({
    totalContracts: 0,
    totalRevenue: 0,
    totalCosts: 0,
    profitMargin: 0,
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
  const [thisMonth, setThisMonth] = useState({ invoices: 0 });
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
        Promise.resolve({ data: [] }),
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
          type: 'sent_invite',
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
      // GC revenue = sum of contracts where GC is to_org
          const gcContracts = projectContracts.filter(c => 
            c.to_org_id === currentOrg.id
          );
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

        const projectPendingInvoices = pendingInvoices.filter(inv => inv.project_id === project.id).length;
        const pendingActions = (orgType === 'GC' || orgType === 'TC') ? projectPendingInvoices : 0;

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

      // GROUP 3: Parallel financial queries + recent docs
      const monthStart = startOfMonth(new Date()).toISOString();
      const monthEnd = endOfMonth(new Date()).toISOString();

      const [
        allInvoicesResult,
        remindersResult,
        recentInvoicesResult,
      ] = await Promise.all([
        projectIds.length > 0
          ? supabase
              .from('invoices')
              .select('status, total_amount, created_at, contract_id')
              .in('project_id', projectIds)
          : Promise.resolve({ data: [] }),
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
        // Recent invoices for docs card
        projectIds.length > 0
          ? supabase
              .from('invoices')
              .select('id, invoice_number, status, total_amount, created_at, project_id, contract_id, po_id')
              .in('project_id', projectIds)
              .order('created_at', { ascending: false })
              .limit(40)
          : Promise.resolve({ data: [] }),
      ]);

      const allInvoices = (allInvoicesResult.data || []) as { status: string; total_amount: number; created_at: string; contract_id: string | null }[];

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

      // Build contract detail map FIRST (needed for both recent docs and financials)
      const allInvoiceContractIds = [...new Set([
        ...allInvoices.map(i => i.contract_id),
        ...((recentInvoicesResult.data || []) as any[]).map((i: any) => i.contract_id),
      ].filter((id): id is string => id !== null))];
      
      let contractDetailMap = new Map<string, { from_org_id: string | null; to_org_id: string | null }>();
      if (allInvoiceContractIds.length > 0) {
        const { data: contractDetails } = await supabase
          .from('project_contracts')
          .select('id, from_org_id, to_org_id')
          .in('id', allInvoiceContractIds);
        (contractDetails || []).forEach((c: any) => {
          contractDetailMap.set(c.id, { from_org_id: c.from_org_id, to_org_id: c.to_org_id });
        });
      }

      // Build PO ownership map for PO-linked invoices
      const recentInvoicesRaw = (recentInvoicesResult.data || []) as any[];
      const poIds = [...new Set(recentInvoicesRaw.map((i: any) => i.po_id).filter((id: any): id is string => !!id))];
      let poOrgMap = new Map<string, { pricing_owner_org_id: string | null; supplier_org_id: string | null }>();
      if (poIds.length > 0) {
        const { data: poDetails } = await supabase
          .from('purchase_orders')
          .select('id, pricing_owner_org_id, supplier_org_id')
          .in('id', poIds);
        (poDetails || []).forEach((po: any) => {
          poOrgMap.set(po.id, { pricing_owner_org_id: po.pricing_owner_org_id, supplier_org_id: po.supplier_org_id });
        });
      }

      // Build recent docs — filtered by org ownership
      const recentDocsList: RecentDoc[] = [];

      recentInvoicesRaw.forEach((inv: any) => {
        // Filter: contract-linked → org must be from or to
        if (inv.contract_id) {
          const contract = contractDetailMap.get(inv.contract_id);
          if (!contract || (contract.from_org_id !== currentOrg.id && contract.to_org_id !== currentOrg.id)) {
            return; // not our contract
          }
        } else if (inv.po_id) {
          // PO-linked → org must be pricing owner or supplier
          const po = poOrgMap.get(inv.po_id);
          if (!po || (po.pricing_owner_org_id !== currentOrg.id && po.supplier_org_id !== currentOrg.id)) {
            return; // not our PO
          }
        } else {
          return; // no contract, no PO — skip
        }

        const proj = allProjects.find(p => p.id === inv.project_id);
        recentDocsList.push({
          id: inv.id,
          type: 'invoice',
          title: inv.invoice_number || 'Invoice',
          status: inv.status,
          amount: inv.total_amount,
          created_at: inv.created_at,
          projectName: proj?.name || 'Unknown',
          projectId: inv.project_id,
        });
      });

      recentDocsList.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setRecentDocs(recentDocsList.slice(0, 10));

      // contractDetailMap already built above — reuse it

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
      let totalBilled = 0;

      if (orgType === 'TC') {
        contracts.forEach(c => {
          if (c.from_org_id === currentOrg.id) {
            totalRevenue += c.contract_sum || 0;
          }
          if (c.to_org_id === currentOrg.id) {
            totalCosts += c.contract_sum || 0;
          }
        });

        const billedInvoices = allInvoices.filter(i => {
          if (i.status === 'DRAFT' || !i.contract_id) return false;
          const contract = contractDetailMap.get(i.contract_id);
          return contract?.from_org_id === currentOrg.id;
        });
        totalBilled = billedInvoices.reduce((sum, i) => sum + (i.total_amount || 0), 0);
      } else if (orgType === 'GC') {
        // GC Revenue = owner_contract_value or sum of contracts where GC is to_org
        // GC Costs = sum of contracts where GC is to_org (amounts owed to TCs)
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


        // GC billed = invoices received (where GC is to_org)
        const receivedInvoices = allInvoices.filter(i => {
          if (i.status === 'DRAFT' || !i.contract_id) return false;
          const contract = contractDetailMap.get(i.contract_id);
          return contract?.to_org_id === currentOrg.id;
        });
        totalBilled = receivedInvoices.reduce((sum, i) => sum + (i.total_amount || 0), 0);
      } else if (orgType === 'FC') {
        // FC Revenue = contracts where FC is from_org
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
    recentDocs,
    thisMonth,
    loading,
    refetch: fetchData,
  };
}
