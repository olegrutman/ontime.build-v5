import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SupportActionDialog } from './SupportActionDialog';
import { supabase } from '@/integrations/supabase/client';
import { useSupportAction } from '@/hooks/useSupportAction';
import { ROLE_LABELS, ALLOWED_ROLES_BY_ORG_TYPE, type AppRole, type OrgType } from '@/types/organization';

interface OrgOption {
  id: string;
  name: string;
  type: OrgType;
}

interface AssignToOrgDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userEmail: string;
  onAssigned: () => void;
}

export function AssignToOrgDialog({ open, onOpenChange, userId, userEmail, onAssigned }: AssignToOrgDialogProps) {
  const { execute, loading } = useSupportAction();
  const [search, setSearch] = useState('');
  const [orgs, setOrgs] = useState<OrgOption[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<OrgOption | null>(null);
  const [role, setRole] = useState<AppRole | ''>('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [reasonOpen, setReasonOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSearch('');
    setSelectedOrg(null);
    setRole('');
    setIsAdmin(false);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(async () => {
      let q = supabase.from('organizations').select('id, name, type').order('name').limit(20);
      if (search.trim()) {
        q = q.ilike('name', `%${search.trim()}%`);
      }
      const { data } = await q;
      setOrgs((data || []) as OrgOption[]);
    }, 200);
    return () => clearTimeout(timer);
  }, [open, search]);

  const allowedRoles = selectedOrg ? ALLOWED_ROLES_BY_ORG_TYPE[selectedOrg.type] || [] : [];

  const handleConfirm = async (reason: string) => {
    if (!selectedOrg || !role) return;
    const ok = await execute({
      action_type: 'ADD_MEMBER_NO_VERIFICATION',
      reason,
      organization_id: selectedOrg.id,
      user_id: userId,
      role,
      is_admin: isAdmin,
    });
    if (ok) {
      setReasonOpen(false);
      onOpenChange(false);
      onAssigned();
    }
  };

  return (
    <>
      <Dialog open={open && !reasonOpen} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign to Organization</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Search Organization</Label>
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Type to search..." />
            </div>
            {orgs.length > 0 && (
              <div className="max-h-40 overflow-y-auto border rounded-md divide-y divide-border">
                {orgs.map((org) => (
                  <button
                    key={org.id}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors ${selectedOrg?.id === org.id ? 'bg-accent' : ''}`}
                    onClick={() => { setSelectedOrg(org); setRole(''); }}
                  >
                    <span className="font-medium">{org.name}</span>
                    <span className="text-muted-foreground ml-2 text-xs">{org.type}</span>
                  </button>
                ))}
              </div>
            )}
            {selectedOrg && (
              <>
                <div>
                  <Label>Role</Label>
                  <Select value={role} onValueChange={(v) => setRole(v as AppRole)}>
                    <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
                    <SelectContent>
                      {allowedRoles.map((r) => (
                        <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-3">
                  <Switch checked={isAdmin} onCheckedChange={setIsAdmin} id="assign-admin" />
                  <Label htmlFor="assign-admin">Organization Admin</Label>
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={() => setReasonOpen(true)} disabled={!selectedOrg || !role}>Continue</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SupportActionDialog
        open={reasonOpen}
        onOpenChange={setReasonOpen}
        title="Assign to Organization"
        description={`Assign ${userEmail} to ${selectedOrg?.name || ''} as ${ROLE_LABELS[role as AppRole] || role}${isAdmin ? ' (Admin)' : ''}.`}
        onConfirm={handleConfirm}
        loading={loading}
      />
    </>
  );
}
