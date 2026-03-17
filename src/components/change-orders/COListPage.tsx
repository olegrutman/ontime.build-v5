import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { COWizard } from './wizard/COWizard';

interface COListPageProps {
  projectId: string;
}

export function COListPage({ projectId }: COListPageProps) {
  const [wizardOpen, setWizardOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Change Orders</h2>
          <p className="text-sm text-muted-foreground">
            Create and manage change orders for this project
          </p>
        </div>
        <Button onClick={() => setWizardOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          New Change Order
        </Button>
      </div>

      <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
        No change orders yet. Click New Change Order to get started.
      </div>

      <COWizard open={wizardOpen} onOpenChange={setWizardOpen} projectId={projectId} />
    </div>
  );
}
