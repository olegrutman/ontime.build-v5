import { useEffect, useState } from 'react';
import { Receipt, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface InvoiceSummaryCardProps {
  projectId: string;
}

interface InvoiceTotals {
  draftCount: number;
  pendingCount: number;
  approvedCount: number;
  paidCount: number;
  totalCount: number;
  sentTotal: number;
  receivedTotal: number;
  myEarnings: number;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
  }).format(amount);
}

export function InvoiceSummaryCard({ projectId }: InvoiceSummaryCardProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [viewerRole, setViewerRole] = useState<string>('Trade Contractor');
  const [currentOrgId, setCurrentOrgId] = useState<string | null>(null);
  const [totals, setTotals] = useState<InvoiceTotals>({
    draftCount: 0,
    pendingCount: 0,
    approvedCount: 0,
    paidCount: 0,
    totalCount: 0,
    sentTotal: 0,
    receivedTotal: 0,
    myEarnings: 0,
  });

  useEffect(() => {
    const fetchInvoices = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      // Determine viewer role and org based on current user's organization
      const { data: memberships } = await supabase
        .from('user_org_roles')
        .select('organization_id')
        .eq('user_id', user.id);
      
      const userOrgIds = (memberships || []).map(m => m.organization_id);
      let currentRole = 'Trade Contractor';
      let orgId: string | null = null;
      
      if (userOrgIds.length > 0) {
        const { data: teamMembers } = await supabase
          .from('project_team')
          .select('role, org_id')
          .eq('project_id', projectId)
          .in('org_id', userOrgIds);
        
        if (teamMembers && teamMembers.length > 0) {
          currentRole = teamMembers[0].role;
          orgId = teamMembers[0].org_id;
        }
      }

      setViewerRole(currentRole);
      setCurrentOrgId(orgId);

      // Fetch all invoices for this project
      const { data: invoices, error } = await supabase
        .from('invoices')
        .select(`
          id, 
          status, 
          total_amount,
          contract_id,
          contract:project_contracts!invoices_contract_id_fkey(from_org_id, to_org_id)
        `)
        .eq('project_id', projectId);

      if (error) {
        console.error('Error fetching invoices:', error);
        setLoading(false);
        return;
      }

      // Calculate counts and totals
      let draftCount = 0;
      let pendingCount = 0;
      let approvedCount = 0;
      let paidCount = 0;
      let sentTotal = 0;
      let receivedTotal = 0;
      let myEarnings = 0;

      for (const invoice of invoices || []) {
        const contract = invoice.contract as any;
        const isSender = orgId && contract?.from_org_id === orgId;
        const isReceiver = orgId && contract?.to_org_id === orgId;
        const amount = invoice.total_amount || 0;

        // Count by status
        switch (invoice.status) {
          case 'DRAFT':
            draftCount++;
            break;
          case 'SUBMITTED':
            pendingCount++;
            break;
          case 'APPROVED':
            approvedCount++;
            break;
          case 'PAID':
            paidCount++;
            break;
        }

        // Calculate totals based on direction
        if (isSender) {
          sentTotal += amount;
          if (invoice.status === 'APPROVED' || invoice.status === 'PAID') {
            myEarnings += amount;
          }
        }
        if (isReceiver) {
          receivedTotal += amount;
        }
      }

      setTotals({
        draftCount,
        pendingCount,
        approvedCount,
        paidCount,
        totalCount: (invoices || []).length,
        sentTotal,
        receivedTotal,
        myEarnings,
      });
      setLoading(false);
    };

    if (projectId) {
      fetchInvoices();
    }
  }, [projectId, user]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Receipt className="h-4 w-4" />
            Invoices
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  const isTCView = viewerRole === 'Trade Contractor';
  const isFCView = viewerRole === 'Field Crew';
  const isGCView = viewerRole === 'General Contractor';
  
  const netPosition = totals.sentTotal - totals.receivedTotal;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Receipt className="h-4 w-4" />
          {isFCView ? 'My Invoices' : 'Invoices'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Counts Row */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-green-600">{totals.approvedCount + totals.paidCount}</p>
            <p className="text-xs text-muted-foreground">Approved</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-amber-600">{totals.pendingCount}</p>
            <p className="text-xs text-muted-foreground">Pending</p>
          </div>
          <div>
            <p className="text-2xl font-bold">{totals.totalCount}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </div>
        </div>

        {/* Financial Summary - Role specific */}
        {isTCView ? (
          <div className="pt-3 border-t space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Sent to GC</span>
              <span className="font-medium">{formatCurrency(totals.sentTotal)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Received from FC</span>
              <span className="font-medium text-orange-600">-{formatCurrency(totals.receivedTotal)}</span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t">
              <span className="text-sm font-medium flex items-center gap-1">
                <TrendingUp className="h-4 w-4 text-green-600" />
                Net Position
              </span>
              <span className={`font-bold ${netPosition >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(netPosition)}
              </span>
            </div>
          </div>
        ) : isFCView ? (
          /* FC sees only their submitted invoices */
          <div className="pt-3 border-t">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">My Submitted</span>
              <span className="text-lg font-bold text-green-600">{formatCurrency(totals.myEarnings)}</span>
            </div>
          </div>
        ) : isGCView ? (
          /* GC sees invoices received from TC */
          <div className="pt-3 border-t">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Invoices Received</span>
              <span className="text-lg font-bold">{formatCurrency(totals.receivedTotal)}</span>
            </div>
          </div>
        ) : (
          /* Default view */
          <div className="pt-3 border-t">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Total Billed</span>
              <span className="text-lg font-bold">{formatCurrency(totals.sentTotal)}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
