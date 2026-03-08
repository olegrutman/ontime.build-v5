import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { SupportActionDialog } from '@/components/platform/SupportActionDialog';
import { ChevronDown, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  type AppRole,
  type MemberPermissions,
  type RolePermissions,
  ROLE_PERMISSIONS,
  ROLE_LABELS,
  ORG_TYPE_LABELS,
  type OrgType,
} from '@/types/organization';

interface OrgMembership {
  id: string;
  role: AppRole;
  is_admin: boolean;
  organization: { id: string; name: string; type: OrgType };
}

/** The 7 DB columns we display as toggles */
const PERM_LABELS: { key: keyof MemberPermissions; label: string }[] = [
  { key: 'can_view_financials', label: 'View Financials' },
  { key: 'can_approve_invoices', label: 'Approve Invoices' },
  { key: 'can_create_work_orders', label: 'Create Work Orders' },
  { key: 'can_create_pos', label: 'Create Purchase Orders' },
  { key: 'can_submit_time', label: 'Submit Time' },
  { key: 'can_manage_team', label: 'Manage Team' },
];

/** Map DB column → role default key(s). We pick the primary mapping. */
const DB_COL_TO_ROLE_KEY: Record<keyof MemberPermissions, keyof RolePermissions | null> = {
  id: null,
  user_org_role_id: null,
  updated_at: null,
  can_view_financials: 'canViewRates',
  can_approve_invoices: 'canApprove',
  can_create_work_orders: 'canCreateWorkOrders',
  can_create_pos: 'canCreatePOs',
  can_submit_time: 'canSubmitTime',
  can_manage_team: 'canManageOrg',
};

function getEffectiveValue(
  dbCol: keyof MemberPermissions,
  role: AppRole,
  isAdmin: boolean,
  perms: MemberPermissions | null,
): boolean {
  if (isAdmin) return true;
  const roleKey = DB_COL_TO_ROLE_KEY[dbCol];
  const roleDefault = roleKey ? (ROLE_PERMISSIONS[role]?.[roleKey] ?? false) : false;
  if (!perms) return roleDefault;
  if (dbCol in perms && typeof (perms as any)[dbCol] === 'boolean') return (perms as any)[dbCol];
  return roleDefault;
}

interface Props {
  memberships: OrgMembership[];
  permissionsMap: Record<string, MemberPermissions | null>; // keyed by user_org_role_id
  isOwner: boolean;
  onSave: (userOrgRoleId: string, permissions: Partial<MemberPermissions>, reason: string) => Promise<boolean>;
  actionLoading: boolean;
}

export function UserPermissionsCard({ memberships, permissionsMap, isOwner, onSave, actionLoading }: Props) {
  const [pendingChange, setPendingChange] = useState<{
    membershipId: string;
    col: keyof MemberPermissions;
    newValue: boolean;
    label: string;
    orgName: string;
  } | null>(null);
  const [reasonOpen, setReasonOpen] = useState(false);

  const handleToggle = (m: OrgMembership, col: keyof MemberPermissions, newValue: boolean, label: string) => {
    setPendingChange({ membershipId: m.id, col, newValue, label, orgName: m.organization?.name || 'org' });
    setReasonOpen(true);
  };

  const handleConfirm = async (reason: string) => {
    if (!pendingChange) return;
    const ok = await onSave(pendingChange.membershipId, { [pendingChange.col]: pendingChange.newValue }, reason);
    if (ok) {
      setReasonOpen(false);
      setPendingChange(null);
    }
  };

  if (memberships.length === 0) return null;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4" /> Permissions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {memberships.map((m) => {
            const perms = permissionsMap[m.id] || null;
            return (
              <Collapsible key={m.id} defaultOpen={memberships.length === 1}>
                <CollapsibleTrigger className="flex items-center justify-between w-full py-2 px-3 rounded-md hover:bg-muted/50 transition-colors text-left">
                  <div>
                    <span className="font-medium text-sm">{m.organization?.name}</span>
                    <span className="text-xs text-muted-foreground ml-2">
                      {ROLE_LABELS[m.role] || m.role}
                    </span>
                    {m.is_admin && (
                      <Badge className="ml-2 text-xs bg-primary/10 text-primary border-0">Admin</Badge>
                    )}
                  </div>
                  <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform [[data-state=open]>&]:rotate-180" />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="pl-3 pr-3 pb-3 pt-1 space-y-3">
                    {m.is_admin && (
                      <p className="text-xs text-muted-foreground italic">Admin — all permissions granted</p>
                    )}
                    {PERM_LABELS.map(({ key, label }) => {
                      const effective = getEffectiveValue(key, m.role, m.is_admin, perms);
                      return (
                        <div key={key} className="flex items-center justify-between">
                          <Label className="text-sm font-normal">{label}</Label>
                          <Switch
                            checked={effective}
                            disabled={m.is_admin || !isOwner}
                            onCheckedChange={(val) => handleToggle(m, key, val, label)}
                          />
                        </div>
                      );
                    })}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </CardContent>
      </Card>

      <SupportActionDialog
        open={reasonOpen}
        onOpenChange={setReasonOpen}
        title="Edit Permission"
        description={
          pendingChange
            ? `Set "${pendingChange.label}" to ${pendingChange.newValue ? 'enabled' : 'disabled'} in ${pendingChange.orgName}.`
            : ''
        }
        onConfirm={handleConfirm}
        loading={actionLoading}
      />
    </>
  );
}
