import { useState, useEffect, useCallback } from 'react';
import { Package, Loader2, Building2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface ContractData {
  id: string;
  material_responsibility: string | null;
  from_org_id: string | null;
  to_org_id: string | null;
  from_org: { name: string } | null;
  to_org: { name: string } | null;
}

interface MaterialResponsibilityCardProps {
  projectId: string;
  onResponsibilityChange?: (value: string | null) => void;
}

export function MaterialResponsibilityCard({ projectId, onResponsibilityChange }: MaterialResponsibilityCardProps) {
  const { userOrgRoles } = useAuth();
  const { toast } = useToast();
  const [contract, setContract] = useState<ContractData | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingValue, setSavingValue] = useState<string | null>(null);

  const currentOrgId = userOrgRoles[0]?.organization?.id;

  const fetchContract = useCallback(async () => {
    const { data } = await supabase
      .from('project_contracts')
      .select(`
        id, material_responsibility, from_org_id, to_org_id,
        from_org:organizations!project_contracts_from_org_id_fkey(name),
        to_org:organizations!project_contracts_to_org_id_fkey(name)
      `)
      .eq('project_id', projectId)
      .eq('from_role', 'Trade Contractor')
      .limit(1);

    if (data && data.length > 0) {
      const c = data[0] as unknown as ContractData;
      setContract(c);
      onResponsibilityChange?.(c.material_responsibility);
    }
    setLoading(false);
  }, [projectId, onResponsibilityChange]);

  useEffect(() => {
    fetchContract();
  }, [fetchContract]);

  const canEdit = contract && currentOrgId &&
    (contract.from_org_id === currentOrgId || contract.to_org_id === currentOrgId);

  const handleSelect = async (value: string) => {
    if (!contract || !canEdit || savingValue) return;
    if (contract.material_responsibility === value) return;
    setSavingValue(value);
    try {
      const { error } = await supabase
        .from('project_contracts')
        .update({ material_responsibility: value })
        .eq('id', contract.id);
      if (error) throw error;
      const updated = { ...contract, material_responsibility: value };
      setContract(updated);
      onResponsibilityChange?.(value);
      toast({ title: `Material responsibility set to ${value === 'GC' ? 'General Contractor' : 'Trade Contractor'}` });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSavingValue(null);
    }
  };

  if (loading) {
    return <Skeleton className="h-24 w-full" />;
  }

  if (!contract) return null;

  const responsibility = contract.material_responsibility;

  const options = [
    { value: 'GC', label: 'General Contractor', orgName: contract.to_org?.name || 'GC' },
    { value: 'TC', label: 'Trade Contractor', orgName: contract.from_org?.name || 'TC' },
  ];

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Package className="h-4 w-4 text-primary shrink-0" />
          <span className="text-sm font-medium">Who handles materials on this project?</span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {options.map((opt) => {
            const isSelected = responsibility === opt.value;
            const isSaving = savingValue === opt.value;

            return (
              <button
                key={opt.value}
                disabled={!canEdit || !!savingValue}
                onClick={() => handleSelect(opt.value)}
                className={cn(
                  "relative flex flex-col items-center gap-1.5 p-3 rounded-lg border-2 transition-all text-center",
                  isSelected
                    ? "border-primary bg-primary/5"
                    : "border-muted hover:border-primary/40",
                  canEdit && !savingValue ? "cursor-pointer" : "cursor-default",
                  !canEdit && "opacity-80"
                )}
              >
                {isSaving ? (
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                ) : (
                  <Building2 className={cn("h-5 w-5", isSelected ? "text-primary" : "text-muted-foreground")} />
                )}
                <span className={cn("text-xs font-semibold", isSelected ? "text-primary" : "text-foreground")}>
                  {opt.label}
                </span>
                <span className="text-[11px] text-muted-foreground truncate max-w-full">
                  {opt.orgName}
                </span>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
