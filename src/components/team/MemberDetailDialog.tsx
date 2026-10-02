import { useState, type ReactNode } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Shield, ArrowRightLeft, Loader2, UserMinus, Briefcase, FolderKanban, ChevronLeft } from 'lucide-react';
import { ROLE_LABELS, ROLE_PERMISSIONS, PERMISSION_TO_DB_COLUMN, getJobTitlesForOrgType } from '@/types/organization';
import { useAuth } from '@/hooks/useAuth';
import type { OrgMember } from '@/hooks/useOrgTeam';

interface MemberDetailDialogProps {
  member: OrgMember | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdatePermissions: (targetRoleId: string, perms: Record<string, boolean>) => Promise<boolean>;
  onTransferAdmin: (targetRoleId: string) => Promise<boolean>;
  onRemoveMember?: (targetRoleId: string) => Promise<boolean>;
  onUpdateJobTitle?: (userId: string, jobTitle: string) => Promise<boolean>;
  onUpdateProjectScope?: (targetRoleId: string, scope: 'org' | 'assigned') => Promise<boolean>;
  /** Per-person project checklist, rendered under Project Access */
  projectAssignmentsSlot?: ReactNode;
  onAfterTransfer?: () => void;
  isCurrentUserAdmin: boolean;
  isSelf: boolean;
}

const PERMISSION_LABELS: Record<string, { label: string; description: string }> = {
  can_approve_invoices: { label: 'Approve Invoices', description: 'Can approve or reject submitted invoices' },
  can_create_work_orders: { label: 'Create Change Orders', description: 'Can create and manage change orders' },
  can_create_pos: { label: 'Create Purchase Orders', description: 'Can create and send purchase orders' },
  can_manage_team: { label: 'Manage Team', description: 'Can invite members and manage join requests' },
  can_view_financials: { label: 'View Financials', description: 'Can see financial summaries and reports' },
  can_submit_time: { label: 'Submit Time', description: 'Can log hours and submit time entries' },
};

/** Build default DB-level permission values from role defaults */
function getDefaultDbPerms(role: string): Record<string, boolean> {
  const roleDefaults = ROLE_PERMISSIONS[role as keyof typeof ROLE_PERMISSIONS];
  if (!roleDefaults) {
    return Object.fromEntries(Object.keys(PERMISSION_LABELS).map(k => [k, false]));
  }
  const result: Record<string, boolean> = {};
  for (const dbCol of Object.keys(PERMISSION_LABELS)) {
    const entry = Object.entries(PERMISSION_TO_DB_COLUMN).find(([, col]) => col === dbCol);
    result[dbCol] = entry ? (roleDefaults as any)[entry[0]] ?? false : false;
  }
  return result;
}

export function MemberDetailDialog({
  member,
  open,
  onOpenChange,
  onUpdatePermissions,
  onTransferAdmin,
  onRemoveMember,
  onUpdateJobTitle,
  onUpdateProjectScope,
  projectAssignmentsSlot,
  onAfterTransfer,
  isCurrentUserAdmin,
  isSelf,
}: MemberDetailDialogProps) {
  const { userOrgRoles } = useAuth();
  const orgType = userOrgRoles[0]?.organization?.type ?? null;
  const [localPerms, setLocalPerms] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [transferring, setTransferring] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [savingJobTitle, setSavingJobTitle] = useState(false);
  const [savingScope, setSavingScope] = useState(false);

  const handleScopeChange = async (value: string) => {
    if (!member || !onUpdateProjectScope) return;
    setSavingScope(true);
    await onUpdateProjectScope(member.id, value as 'org' | 'assigned');
    setSavingScope(false);
  };

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
    } else if (member) {
      setLocalPerms(getDefaultDbPerms(member.role));
    }
    setDirty(false);
  };

  if (open && !dirty && member && Object.keys(localPerms).length === 0) {
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
    const ok = await onTransferAdmin(member.id);
    setTransferring(false);
    if (ok) {
      onOpenChange(false);
      onAfterTransfer?.();
    }
  };

  const handleRemove = async () => {
    if (!member || !onRemoveMember) return;
    setRemoving(true);
    const ok = await onRemoveMember(member.id);
    setRemoving(false);
    if (ok) onOpenChange(false);
  };

  const handleJobTitleChange = async (value: string) => {
    if (!member || !onUpdateJobTitle) return;
    setSavingJobTitle(true);
    await onUpdateJobTitle(member.user_id, value);
    setSavingJobTitle(false);
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
      <DialogContent className="inset-0 left-0 top-0 h-[100dvh] w-full max-w-none translate-x-0 translate-y-0 content-start gap-0 overflow-y-auto border-0 p-0 data-[state=closed]:slide-out-to-left-0 data-[state=closed]:slide-out-to-top-0 data-[state=open]:slide-in-from-left-0 data-[state=open]:slide-in-from-top-0 sm:left-[50%] sm:top-[50%] sm:h-auto sm:max-h-[calc(100vh-2rem)] sm:max-w-md sm:translate-x-[-50%] sm:translate-y-[-50%] sm:gap-4 sm:overflow-y-auto sm:border sm:p-6 sm:rounded-lg [&>button]:hidden sm:[&>button]:block">
        <DialogHeader className="sticky top-0 z-20 flex-row items-center gap-2 space-y-0 border-b border-border bg-background px-3 py-3 text-left sm:static sm:block sm:border-0 sm:bg-transparent sm:p-0">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-11 w-11 shrink-0 sm:hidden"
            onClick={() => handleOpenChange(false)}
            aria-label="Back to team"
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <div className="min-w-0 flex-1">
          <DialogTitle className="flex items-center gap-2">
            <span className="truncate">{member.profile?.full_name || 'Team Member'}</span>
            {member.is_owner ? (
              <Badge variant="default" className="text-xs">Owner</Badge>
            ) : member.is_admin ? (
              <Badge variant="secondary" className="text-xs">Admin</Badge>
            ) : null}
          </DialogTitle>
          <DialogDescription className="truncate text-left">
            {member.profile?.email}
            {member.profile?.job_title && ` · ${member.profile.job_title}`}
            {' · '}{ROLE_LABELS[member.role]}
          </DialogDescription>
          </div>
        </DialogHeader>

        <div className="space-y-4 px-4 py-4 pb-[calc(6rem+env(safe-area-inset-bottom))] sm:contents">
        {isCurrentUserAdmin && !isSelf && (
          <>
            {/* Job Title Section */}
            {onUpdateJobTitle && (
              <>
                <Separator />
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <Briefcase className="h-4 w-4" />
                    Job Title
                  </h3>
                  <Select
                    value={member.profile?.job_title || ''}
                    onValueChange={handleJobTitleChange}
                    disabled={savingJobTitle}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select job title" />
                    </SelectTrigger>
                    <SelectContent>
                      {getJobTitlesForOrgType(orgType).map((title) => (
                        <SelectItem key={title} value={title}>
                          {title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {/* Project Access Section */}
            {onUpdateProjectScope && (
              <>
                <Separator />
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <FolderKanban className="h-4 w-4" />
                    Project Access
                  </h3>
                  {member.is_owner || member.is_admin ? (
                    <p className="text-xs text-muted-foreground">
                      Company admins always have access to every project.
                    </p>
                  ) : (
                    <>
                      <Select
                        value={member.project_scope ?? 'org'}
                        onValueChange={handleScopeChange}
                        disabled={savingScope}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="org">All company projects</SelectItem>
                          <SelectItem value="assigned">Assigned projects only</SelectItem>
                        </SelectContent>
                      </Select>
                      {(member.project_scope ?? 'org') === 'assigned' ? (
                        projectAssignmentsSlot ?? null
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          Switch to "Assigned projects only" to pick their projects here.
                        </p>
                      )}
                    </>
                  )}
                </div>
              </>
            )}

            <Separator />

            {/* Permissions Section */}
              <div className="space-y-4">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Permissions
              </h3>
              <div className="space-y-3">
                {Object.entries(PERMISSION_LABELS).map(([key, { label, description }]) => (
                    <div key={key} className="flex min-h-12 items-center justify-between gap-4">
                      <div className="min-w-0">
                      <Label className="text-sm font-medium">{label}</Label>
                      <p className="text-xs text-muted-foreground">{description}</p>
                    </div>
                      <Switch
                        className="shrink-0"
                      checked={localPerms[key] ?? false}
                      onCheckedChange={(v) => handleToggle(key, v)}
                    />
                  </div>
                ))}
              </div>

              <Button
                onClick={handleSave}
                disabled={!dirty || saving}
                className="sticky bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-10 min-h-11 w-full shadow-lg sm:static sm:shadow-none"
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

            {/* Remove Member */}
            {onRemoveMember && (
              <>
                <Separator />
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold flex items-center gap-2 text-destructive">
                    <UserMinus className="h-4 w-4" />
                    Remove Member
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Remove this person from your organization. They will lose access to all org data.
                  </p>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm" className="w-full">
                        Remove {member.profile?.full_name?.split(' ')[0] || 'this member'}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remove Team Member?</AlertDialogTitle>
                        <AlertDialogDescription>
                          <strong>{member.profile?.full_name}</strong> will be removed from your organization
                          and will lose access to all organization data. This cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleRemove} disabled={removing} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                          {removing ? 'Removing…' : 'Yes, Remove'}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </>
            )}
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
        </div>
      </DialogContent>
    </Dialog>
  );
}
