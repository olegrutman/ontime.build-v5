import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Header } from '@/components/Header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, AlertTriangle } from 'lucide-react';
import { WorkItemHeader } from './WorkItemHeader';
import { WorkItemProgress } from './WorkItemProgress';
import { WorkItemDetails } from './WorkItemDetails';
import { WorkItemPricing } from './WorkItemPricing';
import { WorkItemLabor } from './WorkItemLabor';
import { WorkItemMaterials } from './WorkItemMaterials';
import { WorkItemActions } from './WorkItemActions';
import { WorkItemParticipants } from './WorkItemParticipants';
import { TMPeriodsPanel } from './tm';

export type WorkItemState = 'OPEN' | 'PRICED' | 'APPROVED' | 'EXECUTED';
export type WorkItemType = 'PROJECT' | 'SOV_ITEM' | 'CHANGE_WORK' | 'TM_WORK';

export interface WorkItemData {
  id: string;
  title: string;
  description: string | null;
  code: string | null;
  item_type: string;
  state: string;
  amount: number | null;
  location_ref: string | null;
  rejection_notes: string | null;
  organization_id: string;
  parent_work_item_id: string | null;
  project_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export function WorkItemPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentRole, permissions, user, loading: authLoading } = useAuth();
  
  const [workItem, setWorkItem] = useState<WorkItemData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id || authLoading) return;
    
    const fetchWorkItem = async () => {
      setLoading(true);
      setError(null);
      
      const { data, error: fetchError } = await supabase
        .from('work_items')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      
      if (fetchError) {
        setError(fetchError.message);
      } else if (!data) {
        setError('Work item not found');
      } else {
        setWorkItem(data);
      }
      
      setLoading(false);
    };

    fetchWorkItem();
  }, [id, authLoading]);

  const refreshWorkItem = async () => {
    if (!id) return;
    const { data } = await supabase
      .from('work_items')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (data) setWorkItem(data);
  };

  // Derived state helpers
  const state = workItem?.state as WorkItemState;
  const itemType = workItem?.item_type as WorkItemType;
  
  const isEditable = state === 'OPEN';
  const isSubmitted = state === 'PRICED';
  const isApproved = state === 'APPROVED' || state === 'EXECUTED';
  
  // Role-based visibility
  const isGC = currentRole === 'GC_PM';
  const isTC = currentRole === 'TC_PM';
  const isFS = currentRole === 'FS';
  const isSupplier = currentRole === 'SUPPLIER';

  // Panel visibility rules
  const showPricingPanel = (itemType === 'CHANGE_WORK' || itemType === 'SOV_ITEM') && (isTC || (isGC && !isEditable));
  const showLaborPanel = itemType === 'CHANGE_WORK' && (isTC || isFS); // Only for CHANGE_WORK, not TM_WORK (uses TMPeriodsPanel)
  const showMaterialsPanel = itemType === 'CHANGE_WORK' && (isTC || isFS || (isGC && isApproved)); // Only for CHANGE_WORK
  const showTMPeriodsPanel = itemType === 'TM_WORK' && (isTC || isFS || isGC);
  const showParticipantsPanel = isTC || isGC;
  const showRejectionNotes = workItem?.rejection_notes && (isTC || isGC);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-6">
          <Skeleton className="h-8 w-48 mb-6" />
          <Card className="p-6 space-y-4">
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-20 w-full" />
          </Card>
        </main>
      </div>
    );
  }

  if (error || !workItem) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-6">
          <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error || 'Work item not found'}</AlertDescription>
          </Alert>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="max-w-7xl mx-auto w-full p-4 sm:p-6 pb-20">
        {/* Back button */}
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="md:col-span-2 space-y-6">
            {/* Header Card */}
            <Card data-sasha-card="Work Item" className="p-6">
              <WorkItemHeader workItem={workItem} />
              <Separator className="my-4" />
              <WorkItemProgress state={state} />
            </Card>

            {/* Rejection Notes Alert */}
            {showRejectionNotes && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Rejection Notes:</strong> {workItem.rejection_notes}
                </AlertDescription>
              </Alert>
            )}

            {/* Details */}
            <Card data-sasha-card="Work Item Details" className="p-6">
              <WorkItemDetails
                workItem={workItem} 
                canViewFinancials={permissions?.canViewRates ?? false}
              />
            </Card>

            {/* Pricing Panel - TC can edit when OPEN, GC sees after submit */}
            {showPricingPanel && (
              <Card data-sasha-card="Work Item Pricing" className="p-6">
                <WorkItemPricing
                  workItemId={workItem.id}
                  isEditable={isEditable && isTC}
                  canViewRates={permissions?.canViewRates ?? false}
                />
              </Card>
            )}

            {/* Labor Panel - TC/FS only, never GC */}
            {showLaborPanel && (
              <Card data-sasha-card="Work Item Labor" className="p-6">
                <WorkItemLabor
                  workItemId={workItem.id}
                  isEditable={isEditable}
                  canViewRates={permissions?.canViewRates ?? false}
                  currentRole={currentRole}
                />
              </Card>
            )}

            {/* Materials Panel */}
            {showMaterialsPanel && (
              <Card className="p-6">
                <WorkItemMaterials
                  workItemId={workItem.id}
                  isEditable={isEditable && !isGC}
                  canViewCosts={permissions?.canViewRates ?? false}
                />
              </Card>
            )}

            {/* T&M Periods Panel - for TM_WORK items */}
            {showTMPeriodsPanel && (
              <Card className="p-6">
              <TMPeriodsPanel
                  workItemId={workItem.id}
                  currentRole={currentRole}
                  canViewRates={permissions?.canViewRates ?? false}
                  canSubmitTime={permissions?.canSubmitTime ?? false}
                  isWorkItemOpen={isEditable}
                />
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Actions */}
            <Card className="p-6">
              <WorkItemActions
                workItem={workItem}
                currentRole={currentRole}
                onStateChange={refreshWorkItem}
              />
            </Card>

            {/* Participants */}
            {showParticipantsPanel && (
              <Card className="p-6">
                <WorkItemParticipants
                  workItemId={workItem.id}
                  isEditable={isEditable && (isTC || isGC)}
                />
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
