import { useState, useEffect, useCallback } from 'react';
import { Package, Pencil, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

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
}

export function MaterialResponsibilityCard({ projectId }: MaterialResponsibilityCardProps) {
  const { userOrgRoles } = useAuth();
  const { toast } = useToast();
  const [contract, setContract] = useState<ContractData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState<string>('TC');

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
      setEditValue(c.material_responsibility || 'TC');
    }
    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    fetchContract();
  }, [fetchContract]);

  const canEdit = contract && currentOrgId &&
    (contract.from_org_id === currentOrgId || contract.to_org_id === currentOrgId);

  const handleSave = async (value: string) => {
    if (!contract) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('project_contracts')
        .update({ material_responsibility: value })
        .eq('id', contract.id);
      if (error) throw error;
      setContract({ ...contract, material_responsibility: value });
      setEditing(false);
      toast({ title: `Material responsibility set to ${value}` });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <Skeleton className="h-16 w-full" />;
  }

  // No TC contract exists — nothing to show
  if (!contract) return null;

  const responsibility = contract.material_responsibility;
  const responsibleName = responsibility === 'GC'
    ? contract.to_org?.name
    : responsibility === 'TC'
      ? contract.from_org?.name
      : null;

  return (
    <Card className="border-l-4 border-l-blue-500">
      <CardContent className="p-4 flex items-center gap-3 flex-wrap">
        <Package className="h-5 w-5 text-blue-500 shrink-0" />
        <span className="font-medium text-sm">Material Responsibility</span>

        {responsibility && !editing ? (
          <div className="flex items-center gap-2 ml-auto">
            <Badge variant="secondary" className="text-xs">
              {responsibility}
            </Badge>
            {responsibleName && (
              <span className="text-sm text-muted-foreground">{responsibleName}</span>
            )}
            {canEdit && (
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditing(true); setEditValue(responsibility); }}>
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2 ml-auto">
            <ToggleGroup
              type="single"
              value={editValue}
              onValueChange={(v) => v && setEditValue(v)}
              className="gap-1"
            >
              <ToggleGroupItem value="GC" className="text-xs h-7 px-3">GC</ToggleGroupItem>
              <ToggleGroupItem value="TC" className="text-xs h-7 px-3">TC</ToggleGroupItem>
            </ToggleGroup>
            <Button
              size="sm"
              className="h-7 text-xs"
              disabled={saving}
              onClick={() => handleSave(editValue)}
            >
              {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Save'}
            </Button>
            {editing && (
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setEditing(false)}>
                Cancel
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
