import { useState } from 'react';
import { useChangeWork } from '@/hooks/useChangeWork';
import { useAuth } from '@/hooks/useAuth';
import { AppLayout } from '@/components/layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { CreateChangeWorkDialog } from '@/components/change-work/CreateChangeWorkDialog';
import { ChangeWorkCard } from '@/components/change-work/ChangeWorkCard';
import { ChangeWorkDetail } from '@/components/change-work/ChangeWorkDetail';
import { Plus, FileEdit } from 'lucide-react';
import { WorkItemState } from '@/types/workItem';

const ChangeOrders = () => {
  const { user, userOrgRoles, currentRole } = useAuth();
  const {
    changeWorks,
    isLoading,
    usePricing,
    useParticipants,
    createChangeWork,
    addPricing,
    updatePricing,
    deletePricing,
    inviteParticipant,
    removeParticipant,
    advanceState,
    isCreating,
    isAdvancing,
  } = useChangeWork();

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<WorkItemState | 'ALL'>('ALL');

  const selectedChangeWork = changeWorks.find((cw) => cw.id === selectedId);
  const { data: pricing = [] } = usePricing(selectedId);
  const { data: participants = [] } = useParticipants(selectedId);

  const canCreate = currentRole === 'GC_PM' || currentRole === 'TC_PM';

  const filteredChangeWorks = activeTab === 'ALL'
    ? changeWorks
    : changeWorks.filter((cw) => cw.state === activeTab);

  const stateCounts = {
    ALL: changeWorks.length,
    OPEN: changeWorks.filter((cw) => cw.state === 'OPEN').length,
    PRICED: changeWorks.filter((cw) => cw.state === 'PRICED').length,
    APPROVED: changeWorks.filter((cw) => cw.state === 'APPROVED').length,
    EXECUTED: changeWorks.filter((cw) => cw.state === 'EXECUTED').length,
  };

  if (!user) {
    return (
      <AppLayout title="Change Orders">
        <div className="p-6">
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">Please sign in to view change orders.</p>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  if (userOrgRoles.length === 0) {
    return (
      <AppLayout title="Change Orders">
        <div className="p-6">
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">Please join an organization first.</p>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title="Change Orders"
      subtitle="Manage change work through approval workflow"
      showNewButton={canCreate}
      onNewClick={() => setShowCreateDialog(true)}
      newButtonLabel="New Change Order"
    >
      <div className="p-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {(['ALL', 'OPEN', 'PRICED', 'APPROVED', 'EXECUTED'] as const).map((state) => (
            <Card
              key={state}
              className={`cursor-pointer transition-all ${
                activeTab === state ? 'ring-2 ring-primary' : 'hover:shadow-md'
              }`}
              onClick={() => setActiveTab(state)}
            >
              <CardContent className="p-4">
                <p className="text-2xl font-bold">{stateCounts[state]}</p>
                <p className="text-sm text-muted-foreground capitalize">
                  {state === 'ALL' ? 'Total' : state.toLowerCase()}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* List */}
          <div className={selectedChangeWork ? 'lg:col-span-2' : 'lg:col-span-3'}>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-24 w-full" />
                ))}
              </div>
            ) : filteredChangeWorks.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <FileEdit className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">
                    {activeTab === 'ALL'
                      ? 'No change orders yet'
                      : `No ${activeTab.toLowerCase()} change orders`}
                  </p>
                  {canCreate && activeTab === 'ALL' && (
                    <Button
                      variant="outline"
                      className="mt-4"
                      onClick={() => setShowCreateDialog(true)}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Create your first change order
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {filteredChangeWorks.map((changeWork) => (
                  <ChangeWorkCard
                    key={changeWork.id}
                    changeWork={changeWork}
                    onClick={() => setSelectedId(changeWork.id)}
                    isSelected={selectedId === changeWork.id}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Detail Panel */}
          {selectedChangeWork && (
            <div className="lg:col-span-1">
              <ChangeWorkDetail
                changeWork={selectedChangeWork}
                pricing={pricing}
                participants={participants}
                currentRole={currentRole}
                onClose={() => setSelectedId(null)}
                onAdvanceState={advanceState}
                onAddPricing={addPricing}
                onUpdatePricing={updatePricing}
                onDeletePricing={deletePricing}
                onInviteParticipant={inviteParticipant}
                onRemoveParticipant={removeParticipant}
                isAdvancing={isAdvancing}
              />
            </div>
          )}
        </div>

        <CreateChangeWorkDialog
          open={showCreateDialog}
          onOpenChange={setShowCreateDialog}
          onCreate={createChangeWork}
          isCreating={isCreating}
        />
      </div>
    </AppLayout>
  );
};

export default ChangeOrders;
