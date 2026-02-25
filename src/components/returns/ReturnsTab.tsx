import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus } from 'lucide-react';
import { ReturnCard } from './ReturnCard';
import { ReturnDetail } from './ReturnDetail';
import { CreateReturnWizard } from './CreateReturnWizard';
import { Return, ReturnStatus } from '@/types/return';

interface ReturnsTabProps {
  projectId: string;
}

const STATUS_FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: 'all', label: 'All Returns' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'SUBMITTED', label: 'Submitted' },
  { value: 'SUPPLIER_REVIEW', label: 'Supplier Review' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'SCHEDULED', label: 'Scheduled' },
  { value: 'PICKED_UP', label: 'Picked Up' },
  { value: 'PRICED', label: 'Priced' },
  { value: 'CLOSED', label: 'Closed' },
];

export function ReturnsTab({ projectId }: ReturnsTabProps) {
  const { userOrgRoles } = useAuth();
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedReturnId, setSelectedReturnId] = useState<string | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);

  const userOrgId = userOrgRoles[0]?.organization?.id || null;
  const isSupplier = userOrgRoles[0]?.organization?.type === 'SUPPLIER';

  const { data: returns = [], isLoading } = useQuery({
    queryKey: ['returns', projectId, statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('returns')
        .select('*, return_items(*)')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as Return[];
    },
  });

  if (selectedReturnId) {
    return (
      <ReturnDetail
        returnId={selectedReturnId}
        projectId={projectId}
        onBack={() => setSelectedReturnId(null)}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Returns</h2>
        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px] h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_FILTER_OPTIONS.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {!isSupplier && (
            <Button size="sm" onClick={() => setWizardOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Create Return
            </Button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-32 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      ) : returns.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground text-sm">
          <p>No returns found.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {returns.map(ret => (
            <ReturnCard
              key={ret.id}
              returnData={ret}
              onClick={() => setSelectedReturnId(ret.id)}
              canViewPricing={
                ret.pricing_owner_org_id === userOrgId || ret.supplier_org_id === userOrgId
              }
            />
          ))}
        </div>
      )}

      {wizardOpen && (
        <CreateReturnWizard
          projectId={projectId}
          open={wizardOpen}
          onOpenChange={setWizardOpen}
        />
      )}
    </div>
  );
}
