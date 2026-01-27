import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, ClipboardList, Receipt, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { ProjectRoleData } from '@/hooks/useProjectRole';

interface AttentionItem {
  id: string;
  type: 'work_order' | 'invoice';
  title: string;
  subtitle: string;
  action: string;
  route: string;
}

interface NeedsAttentionListProps {
  projectId: string;
  roleData: ProjectRoleData;
}

export function NeedsAttentionList({ projectId, roleData }: NeedsAttentionListProps) {
  const navigate = useNavigate();
  const { userOrgRoles } = useAuth();
  const [items, setItems] = useState<AttentionItem[]>([]);
  const [loading, setLoading] = useState(true);

  const currentOrgId = userOrgRoles[0]?.organization?.id;
  const { role } = roleData;

  useEffect(() => {
    const fetchAttentionItems = async () => {
      if (!projectId || !currentOrgId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      const attentionItems: AttentionItem[] = [];

      try {
        // Fetch work orders needing attention
        const { data: workOrders } = await supabase
          .from('change_order_projects')
          .select('id, title, status')
          .eq('project_id', projectId)
          .in('status', ['PENDING', 'PRICED']);

        if (workOrders) {
          workOrders.forEach(wo => {
            // Determine what action is needed based on role and status
            let action = '';
            if (wo.status === 'PENDING') {
              if (role === 'Trade Contractor') {
                action = 'Review and price';
              } else if (role === 'General Contractor') {
                action = 'Awaiting pricing';
              }
            } else if (wo.status === 'PRICED') {
              if (role === 'General Contractor') {
                action = 'Review and approve';
              } else {
                action = 'Awaiting approval';
              }
            }

            if (action) {
              attentionItems.push({
                id: wo.id,
                type: 'work_order',
                title: wo.title,
                subtitle: action,
                action,
                route: `/change-orders?project=${projectId}&id=${wo.id}`,
              });
            }
          });
        }

        // Fetch invoices needing attention
        const { data: invoices } = await supabase
          .from('invoices')
          .select(`
            id, 
            invoice_number, 
            status,
            total_amount,
            contract_id,
            project_contracts!invoices_contract_id_fkey (
              from_org_id,
              to_org_id
            )
          `)
          .eq('project_id', projectId)
          .in('status', ['DRAFT', 'SUBMITTED']);

        if (invoices) {
          invoices.forEach((inv: any) => {
            const isCreator = inv.project_contracts?.from_org_id === currentOrgId;
            const isReceiver = inv.project_contracts?.to_org_id === currentOrgId;

            let action = '';
            if (inv.status === 'DRAFT' && isCreator) {
              action = 'Submit for approval';
            } else if (inv.status === 'SUBMITTED' && isReceiver) {
              action = 'Review and approve';
            }

            if (action) {
              const amount = new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
                minimumFractionDigits: 0,
              }).format(inv.total_amount || 0);

              attentionItems.push({
                id: inv.id,
                type: 'invoice',
                title: `Invoice ${inv.invoice_number}`,
                subtitle: `${amount} • ${action}`,
                action,
                route: `/project/${projectId}?tab=invoices&invoice=${inv.id}`,
              });
            }
          });
        }

        setItems(attentionItems);
      } catch (error) {
        console.error('Error fetching attention items:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAttentionItems();
  }, [projectId, currentOrgId, role]);

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (items.length === 0) {
    return null;
  }

  return (
    <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/10">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <AlertCircle className="h-5 w-5 text-amber-600" />
          Needs Attention
          <span className="text-sm font-normal text-muted-foreground">
            ({items.length})
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        {items.slice(0, 5).map((item) => (
          <Button
            key={item.id}
            variant="ghost"
            className="w-full justify-between h-auto py-3 px-3 hover:bg-amber-100/50 dark:hover:bg-amber-900/20"
            onClick={() => navigate(item.route)}
          >
            <div className="flex items-center gap-3">
              {item.type === 'work_order' ? (
                <ClipboardList className="h-4 w-4 text-muted-foreground shrink-0" />
              ) : (
                <Receipt className="h-4 w-4 text-muted-foreground shrink-0" />
              )}
              <div className="text-left min-w-0">
                <p className="text-sm font-medium truncate">{item.title}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {item.subtitle}
                </p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
          </Button>
        ))}
        {items.length > 5 && (
          <p className="text-xs text-muted-foreground text-center pt-2">
            +{items.length - 5} more items
          </p>
        )}
      </CardContent>
    </Card>
  );
}
