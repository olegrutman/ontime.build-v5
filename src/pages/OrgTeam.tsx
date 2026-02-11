import { useState } from 'react';
import { AppLayout } from '@/components/layout';
import { useAuth } from '@/hooks/useAuth';
import { useOrgTeam } from '@/hooks/useOrgTeam';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { CollapsibleCard } from '@/components/ui/collapsible-card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ROLE_LABELS,
  ALLOWED_ROLES_BY_ORG_TYPE,
  AppRole,
} from '@/types/organization';
import { Users, Mail, Clock, X } from 'lucide-react';
import { format } from 'date-fns';

export default function OrgTeam() {
  const { userOrgRoles } = useAuth();
  const { members, pendingInvites, loading, sendInvite, cancelInvite, changeRole } = useOrgTeam();
  const { user } = useAuth();

  const currentOrg = userOrgRoles[0]?.organization;
  const orgType = currentOrg?.type;

  const [email, setEmail] = useState('');
  const [role, setRole] = useState<AppRole | ''>('');
  const [sending, setSending] = useState(false);

  const allowedRoles = orgType ? ALLOWED_ROLES_BY_ORG_TYPE[orgType] : [];

  const handleSendInvite = async () => {
    if (!email || !role) return;
    setSending(true);
    const ok = await sendInvite(email, role as AppRole);
    if (ok) {
      setEmail('');
      setRole('');
    }
    setSending(false);
  };

  if (loading) {
    return (
      <AppLayout title="My Team">
        <div className="p-4 space-y-4">
          <Skeleton className="h-48" />
          <Skeleton className="h-32" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="My Team">
      <div className="p-4 space-y-4 pb-20">
        <div>
          <h1 className="text-xl font-bold text-foreground">{currentOrg?.name}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your organization's team members and invitations
          </p>
        </div>

        <CollapsibleCard
          title={`Members (${members.length})`}
          icon={<Users className="h-4 w-4" />}
        >
          <div className="space-y-3">
            {members.map((m) => {
              const isSelf = m.user_id === user?.id;
              const showDropdown = !isSelf && allowedRoles.length > 1;

              return (
                <div
                  key={m.id}
                  className="flex items-center justify-between py-2 border-b border-border last:border-0"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {m.profile?.full_name || 'Unknown'}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {m.profile?.email}
                    </p>
                  </div>
                  {showDropdown ? (
                    <Select
                      value={m.role}
                      onValueChange={(v) => changeRole(m.id, v as AppRole)}
                    >
                      <SelectTrigger className="w-[160px] shrink-0 ml-2 h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {allowedRoles.map((r) => (
                          <SelectItem key={r} value={r}>
                            {ROLE_LABELS[r]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge variant="secondary" className="shrink-0 ml-2">
                      {ROLE_LABELS[m.role]}
                    </Badge>
                  )}
                </div>
              );
            })}
            {members.length === 0 && (
              <p className="text-sm text-muted-foreground">No members found.</p>
            )}
          </div>
        </CollapsibleCard>

        <CollapsibleCard
          title="Invite New Member"
          icon={<Mail className="h-4 w-4" />}
        >
          <div className="flex flex-col gap-3">
            <Input
              type="email"
              placeholder="colleague@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Select value={role} onValueChange={(v) => setRole(v as AppRole)}>
              <SelectTrigger>
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                {allowedRoles.map((r) => (
                  <SelectItem key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={handleSendInvite}
              disabled={!email || !role || sending}
              className="w-full"
            >
              {sending ? 'Sending…' : 'Send Invite'}
            </Button>
          </div>
        </CollapsibleCard>

        {pendingInvites.length > 0 && (
          <CollapsibleCard
            title={`Pending Invitations (${pendingInvites.length})`}
            icon={<Clock className="h-4 w-4" />}
          >
            <div className="space-y-3">
              {pendingInvites.map((inv) => (
                <div
                  key={inv.id}
                  className="flex items-center justify-between py-2 border-b border-border last:border-0"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {inv.email}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {ROLE_LABELS[inv.role]} · Sent{' '}
                      {format(new Date(inv.created_at), 'MMM d, yyyy')}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => cancelInvite(inv.id)}
                    className="shrink-0 text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CollapsibleCard>
        )}
      </div>
    </AppLayout>
  );
}
