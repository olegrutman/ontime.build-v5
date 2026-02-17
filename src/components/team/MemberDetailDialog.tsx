import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Shield, ArrowRightLeft, Loader2 } from 'lucide-react';
import { ROLE_LABELS } from '@/types/organization';
import type { OrgMember } from '@/hooks/useOrgTeam';

interface MemberDetailDialogProps {
  member: OrgMember | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdatePermissions: (targetRoleId: string, perms: Record<string, boolean>) => Promise<boolean>;
  onTransferAdmin: (targetRoleId: string) => Promise<boolean>;
  isCurrentUserAdmin: boolean;
  isSelf: boolean;
}

const PERMISSION_LABELS: Record<string, { label: string; description: string }> = {
  can_approve_invoices: { label: 'Approve Invoices', description: 'Can approve or reject submitted invoices' },
  can_create_work_orders: { label: 'Create Work Orders', description: 'Can create and manage work orders' },
  can_create_pos: { label: 'Create Purchase Orders', description: 'Can create and send purchase orders' },
  can_manage_team: { label: 'Manage Team', description: 'Can invite members and manage join requests' },
  can_view_financials: { label: 'View Financials', description: 'Can see financial summaries and reports' },
  can_submit_time: { label: 'Submit Time', description: 'Can log hours and submit time entries' },
};

export function MemberDetailDialog({
  member,
  open,
  onOpenChange,
  onUpdatePermissions,
  onTransferAdmin,
  isCurrentUserAdmin,
  isSelf,
}: MemberDetailDialogProps) {
  const [localPerms, setLocalPerms] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [transferring, setTransferring] = useState(false);
  const [dirty, setDirty] = useState(false);

  // Reset local state when member changes
  const initPerms = () => {
    if (member?.permissions) {
      setLocalPerms({
        can_approve_invoices: member.permissions.can_approve_invoices,
        can_create_work_orders: member.permissions.can_create_work_orders,
        can_create_pos: member.permissions.can_create_pos,
        can_manage_team: member.permissions.can_manage_team,
        can_view_financials: member.permissions.can_view_financials,
        can_submit_time: member.permissions.can_submit_time,
      });
    }
    setDirty(false);
  };

  // Initialize when dialog opens
  if (open && !dirty && member?.permissions && Object.keys(localPerms).length === 0) {
    initPerms();
  }

  const handleToggle = (key: string, value: boolean) => {
    setLocalPerms(prev => ({ ...prev, [key]: value }));
    setDirty(true);
  };

  const handleSave = async () => {
    if (!member) return;
    setSaving(true);
    const ok = await onUpdatePermissions(member.id, localPerms);
    if (ok) setDirty(false);
    setSaving(false);
  };

  const handleTransfer = async () => {
    if (!member) return;
    setTransferring(true);
    await onTransferAdmin(member.id);
    setTransferring(false);
    onOpenChange(false);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setLocalPerms({});
      setDirty(false);
    }
    onOpenChange(newOpen);
  };

  if (!member) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {member.profile?.full_name || 'Team Member'}
            {member.is_admin && (
              <Badge variant="default" className="text-xs">Admin</Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            {member.profile?.email}
            {member.profile?.job_title && ` · ${member.profile.job_title}`}
            {' · '}{ROLE_LABELS[member.role]}
          </DialogDescription>
        </DialogHeader>

        {isCurrentUserAdmin && !isSelf && (
          <>
            <Separator />

            {/* Permissions Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Permissions
              </h3>
              <div className="space-y-3">
                {Object.entries(PERMISSION_LABELS).map(([key, { label, description }]) => (
                  <div key={key} className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm font-medium">{label}</Label>
                      <p className="text-xs text-muted-foreground">{description}</p>
                    </div>
                    <Switch
                      checked={localPerms[key] ?? false}
                      onCheckedChange={(v) => handleToggle(key, v)}
                    />
                  </div>
                ))}
              </div>

              <Button
                onClick={handleSave}
                disabled={!dirty || saving}
                className="w-full"
              >
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Save Permissions
              </Button>
            </div>

            <Separator />

            {/* Transfer Admin */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <ArrowRightLeft className="h-4 w-4" />
                Transfer Admin
              </h3>
              <p className="text-xs text-muted-foreground">
                Make this person the organization admin. You will lose admin privileges.
              </p>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm" className="w-full">
                    Transfer Admin to {member.profile?.full_name?.split(' ')[0] || 'this member'}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Transfer Admin Role?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will make <strong>{member.profile?.full_name}</strong> the organization admin.
                      You will lose all admin privileges. This action cannot be undone by you.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleTransfer} disabled={transferring}>
                      {transferring ? 'Transferring…' : 'Yes, Transfer Admin'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </>
        )}

        {/* Read-only view for non-admins or self */}
        {(!isCurrentUserAdmin || isSelf) && member.permissions && (
          <>
            <Separator />
            <div className="space-y-3">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Permissions
              </h3>
              {Object.entries(PERMISSION_LABELS).map(([key, { label }]) => (
                <div key={key} className="flex items-center justify-between text-sm">
                  <span>{label}</span>
                  <Badge variant={(member.permissions as any)?.[key] ? 'default' : 'secondary'}>
                    {(member.permissions as any)?.[key] ? 'Yes' : 'No'}
                  </Badge>
                </div>
              ))}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
