import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useChangeWork } from '@/hooks/useChangeWork';
import { AppLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { CreateChangeWorkDialog } from '@/components/change-work/CreateChangeWorkDialog';
import { 
  FileText, 
  Clock, 
  CheckCircle, 
  DollarSign,
  TrendingUp,
  ArrowRight,
  Plus
} from 'lucide-react';
import { format } from 'date-fns';

interface SOVSummary {
  total_contract: number;
  approved_changes: number;
  billed_tm: number;
  total_value: number;
}

interface SOVLineItem {
  id: string;
  code: string | null;
  title: string;
  item_type: string;
  amount: number | null;
  state: string;
  source_type: 'ORIGINAL' | 'CHANGE_WORK' | 'TM_SLICE';
}

interface TMSlice {
  id: string;
  slice_number: number;
  total_amount: number;
  invoiced_at: string | null;
  created_at: string;
  work_item_title: string;
  work_item_code: string | null;
}

export default function SOVDashboard() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const projectId = searchParams.get('project');
  const { user, currentRole, permissions } = useAuth();
  const { createChangeWork, isCreating } = useChangeWork();
  
  const [sovItems, setSOVItems] = useState<SOVLineItem[]>([]);
  const [tmSlices, setTMSlices] = useState<TMSlice[]>([]);
  const [loading, setLoading] = useState(true);
  const [projectName, setProjectName] = useState<string | null>(null);
  const [showCreateCODialog, setShowCreateCODialog] = useState(false);

  const canViewFinancials = permissions?.canViewRates ?? false;
  const canCreateCO = currentRole === 'GC_PM' || currentRole === 'TC_PM';

  useEffect(() => {
    if (user) {
      fetchSOVData();
    }
  }, [user]);

  const fetchSOVData = async () => {
    setLoading(true);
    
    // If we have a project filter, fetch project name
    if (projectId) {
      const { data: proj } = await supabase
        .from('projects')
        .select('name')
        .eq('id', projectId)
        .maybeSingle();
      setProjectName(proj?.name || null);
    }
    
    // Build query for SOV items
    let itemsQuery = supabase
      .from('work_items')
      .select('id, code, title, item_type, amount, state')
      .in('item_type', ['SOV_ITEM', 'CHANGE_WORK'])
      .in('state', ['APPROVED', 'EXECUTED'])
      .order('created_at', { ascending: true });

    if (projectId) {
      itemsQuery = itemsQuery.eq('project_id', projectId);
    }

    const { data: items, error: itemsError } = await itemsQuery;

    if (itemsError) {
      console.error('Error fetching SOV items:', itemsError);
    } else {
      setSOVItems((items || []).map(item => ({
        ...item,
        source_type: item.item_type === 'CHANGE_WORK' ? 'CHANGE_WORK' : 'ORIGINAL'
      })) as SOVLineItem[]);
    }

    // Fetch approved TM billable slices with work item info
    const { data: slices, error: slicesError } = await supabase
      .from('tm_billable_slices')
      .select(`
        id,
        slice_number,
        total_amount,
        invoiced_at,
        created_at,
        work_items!tm_billable_slices_work_item_id_fkey (
          title,
          code
        )
      `)
      .order('created_at', { ascending: true });

    if (slicesError) {
      console.error('Error fetching TM slices:', slicesError);
    } else {
      setTMSlices((slices || []).map((s: any) => ({
        id: s.id,
        slice_number: s.slice_number,
        total_amount: s.total_amount,
        invoiced_at: s.invoiced_at,
        created_at: s.created_at,
        work_item_title: s.work_items?.title || 'Unknown',
        work_item_code: s.work_items?.code,
      })));
    }

    setLoading(false);
  };

  const formatCurrency = (amount: number | null) => {
    if (amount === null) return '—';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Calculate summary
  const originalSOV = sovItems.filter(i => i.source_type === 'ORIGINAL');
  const changeOrders = sovItems.filter(i => i.source_type === 'CHANGE_WORK' && i.state === 'EXECUTED');
  
  const summary: SOVSummary = {
    total_contract: originalSOV.reduce((sum, i) => sum + (i.amount || 0), 0),
    approved_changes: changeOrders.reduce((sum, i) => sum + (i.amount || 0), 0),
    billed_tm: tmSlices.reduce((sum, s) => sum + s.total_amount, 0),
    total_value: 0,
  };
  summary.total_value = summary.total_contract + summary.approved_changes + summary.billed_tm;

  const invoicedTM = tmSlices.filter(s => s.invoiced_at).reduce((sum, s) => sum + s.total_amount, 0);
  const pendingTM = summary.billed_tm - invoicedTM;

  if (!user) {
    return (
      <AppLayout title="Schedule of Values">
        <div className="p-6">
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">Please sign in to view SOV dashboard.</p>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  const pageTitle = projectName ? `SOV — ${projectName}` : 'Schedule of Values';

  return (
    <AppLayout
      title={pageTitle}
      subtitle="Aggregated contract value, changes, and T&M billing"
      showNewButton={canCreateCO}
      onNewClick={() => setShowCreateCODialog(true)}
      newButtonLabel="New Change Order"
    >
      <div className="p-6 space-y-6">
        {loading ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
            </div>
            <Skeleton className="h-64" />
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            {canViewFinancials && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <FileText className="w-4 h-4" />
                      <span className="text-xs">Original Contract</span>
                    </div>
                    <p className="text-2xl font-bold">{formatCurrency(summary.total_contract)}</p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <TrendingUp className="w-4 h-4" />
                      <span className="text-xs">Approved Changes</span>
                    </div>
                    <p className="text-2xl font-bold text-amber-600">
                      +{formatCurrency(summary.approved_changes)}
                    </p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <Clock className="w-4 h-4" />
                      <span className="text-xs">T&M Billed</span>
                    </div>
                    <p className="text-2xl font-bold text-green-600">
                      +{formatCurrency(summary.billed_tm)}
                    </p>
                    {pendingTM > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {formatCurrency(pendingTM)} pending invoice
                      </p>
                    )}
                  </CardContent>
                </Card>
                
                <Card className="bg-primary text-primary-foreground">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 text-primary-foreground/70 mb-1">
                      <DollarSign className="w-4 h-4" />
                      <span className="text-xs">Total Contract Value</span>
                    </div>
                    <p className="text-2xl font-bold">{formatCurrency(summary.total_value)}</p>
                  </CardContent>
                </Card>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* SOV Line Items */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    SOV Line Items
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {sovItems.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No SOV items yet
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {sovItems.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between p-3 bg-muted/30 rounded-lg cursor-pointer hover:bg-muted/50"
                          onClick={() => navigate(`/work-item/${item.id}`)}
                        >
                          <div className="flex items-center gap-3">
                            <Badge 
                              variant={item.source_type === 'CHANGE_WORK' ? 'secondary' : 'outline'}
                              className="text-xs"
                            >
                              {item.code || item.item_type}
                            </Badge>
                            <div>
                              <p className="text-sm font-medium">{item.title}</p>
                              <p className="text-xs text-muted-foreground capitalize">
                                {item.source_type === 'CHANGE_WORK' ? 'Change Order' : 'Original'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {canViewFinancials && (
                              <span className="font-medium">{formatCurrency(item.amount)}</span>
                            )}
                            <ArrowRight className="w-4 h-4 text-muted-foreground" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* T&M Billable Slices */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    T&M Billing
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {tmSlices.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No approved T&M periods yet
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {tmSlices.map((slice) => (
                        <div
                          key={slice.id}
                          className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-500/10 text-green-600 font-medium text-sm">
                              #{slice.slice_number}
                            </div>
                            <div>
                              <p className="text-sm font-medium">
                                {slice.work_item_code || 'TM'} - Slice #{slice.slice_number}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {slice.work_item_title} • {format(new Date(slice.created_at), 'MMM d')}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {canViewFinancials && (
                              <span className="font-medium">{formatCurrency(slice.total_amount)}</span>
                            )}
                            {slice.invoiced_at ? (
                              <Badge variant="default" className="gap-1">
                                <CheckCircle className="w-3 h-3" />
                                Invoiced
                              </Badge>
                            ) : (
                              <Badge variant="outline">Pending</Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        )}

        <CreateChangeWorkDialog
          open={showCreateCODialog}
          onOpenChange={setShowCreateCODialog}
          onCreate={createChangeWork}
          isCreating={isCreating}
          projectId={projectId || undefined}
          projectName={projectName || undefined}
        />
      </div>
    </AppLayout>
  );
}
