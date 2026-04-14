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
import { RefreshCw } from 'lucide-react';

interface OrgOption {
  id: string;
  name: string;
  type: OrgType;
}

interface CreateUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

function generatePassword(length = 16): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%&*';
  return Array.from(crypto.getRandomValues(new Uint8Array(length)))
    .map((b) => chars[b % chars.length])
    .join('');
}

export function CreateUserDialog({ open, onOpenChange, onCreated }: CreateUserDialogProps) {
  const { execute, loading } = useSupportAction();
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');

  // Org assignment (optional)
  const [orgSearch, setOrgSearch] = useState('');
  const [orgs, setOrgs] = useState<OrgOption[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<OrgOption | null>(null);
  const [role, setRole] = useState<AppRole | ''>('');
  const [isAdmin, setIsAdmin] = useState(false);

  const [reasonOpen, setReasonOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    setEmail('');
    setFirstName('');
    setLastName('');
    setPassword(generatePassword());
    setOrgSearch('');
    setOrgs([]);
    setSelectedOrg(null);
    setRole('');
    setIsAdmin(false);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(async () => {
      let q = supabase.from('organizations').select('id, name, type').order('name').limit(20);
      if (orgSearch.trim()) {
        q = q.ilike('name', `%${orgSearch.trim()}%`);
      }
      const { data } = await q;
      setOrgs((data || []) as OrgOption[]);
    }, 200);
    return () => clearTimeout(timer);
  }, [open, orgSearch]);

  const allowedRoles = selectedOrg ? ALLOWED_ROLES_BY_ORG_TYPE[selectedOrg.type] || [] : [];
  const canContinue = email.trim().length > 0 && password.length >= 8;

  const handleConfirm = async (reason: string) => {
    const fullName = [firstName.trim(), lastName.trim()].filter(Boolean).join(' ') || undefined;
    const params: Record<string, any> = {
      action_type: 'CREATE_USER_AND_ADD',
      reason,
      email: email.trim(),
      password,
      first_name: firstName.trim() || undefined,
      last_name: lastName.trim() || undefined,
      full_name: fullName,
    };
    if (selectedOrg && role) {
      params.organization_id = selectedOrg.id;
      params.role = role;
      params.is_admin = isAdmin;
    }
    const ok = await execute(params);
    if (ok) {
      setReasonOpen(false);
      onOpenChange(false);
      onCreated();
    }
  };

  return (
    <>
      <Dialog open={open && !reasonOpen} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Email <span className="text-destructive">*</span></Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="user@example.com" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>First Name</Label>
                <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="John" />
              </div>
              <div>
                <Label>Last Name</Label>
                <Input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Doe" />
              </div>
            </div>
            <div>
              <Label>Password <span className="text-destructive">*</span></Label>
              <div className="flex gap-2">
                <Input value={password} onChange={(e) => setPassword(e.target.value)} className="font-mono text-sm" />
                <Button type="button" variant="outline" size="icon" onClick={() => setPassword(generatePassword())} title="Generate new password">
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
              {password.length > 0 && password.length < 8 && (
                <p className="text-xs text-destructive mt-1">Password must be at least 8 characters</p>
              )}
            </div>

            {/* Optional org assignment */}
            <div className="border-t pt-4">
              <p className="text-sm font-medium mb-2">Assign to Organization (optional)</p>
              <div>
                <Label>Search Organization</Label>
                <Input value={orgSearch} onChange={(e) => setOrgSearch(e.target.value)} placeholder="Type to search..." />
              </div>
              {orgs.length > 0 && (
                <div className="max-h-40 overflow-y-auto border rounded-md divide-y divide-border mt-2">
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
                  <div className="mt-3">
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
                  <div className="flex items-center gap-3 mt-3">
                    <Switch checked={isAdmin} onCheckedChange={setIsAdmin} id="create-admin" />
                    <Label htmlFor="create-admin">Organization Admin</Label>
                  </div>
                  <Button variant="ghost" size="sm" className="mt-2 text-muted-foreground" onClick={() => { setSelectedOrg(null); setRole(''); setIsAdmin(false); }}>
                    Clear organization
                  </Button>
                </>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={() => setReasonOpen(true)} disabled={!canContinue}>Continue</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SupportActionDialog
        open={reasonOpen}
        onOpenChange={setReasonOpen}
        title="Create User"
        description={`Create user ${email}${selectedOrg ? ` and assign to ${selectedOrg.name} as ${ROLE_LABELS[role as AppRole] || role}${isAdmin ? ' (Admin)' : ''}` : ''}.`}
        onConfirm={handleConfirm}
        loading={loading}
      />
    </>
  );
}
