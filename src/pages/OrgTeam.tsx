import { useState } from 'react';
import { AppLayout } from '@/components/layout';
import { useAuth } from '@/hooks/useAuth';
import { useOrgTeam } from '@/hooks/useOrgTeam';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
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
        <div className="p-4 sm:p-6 space-y-6 max-w-3xl">
          <Skeleton className="h-48" />
          <Skeleton className="h-32" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="My Team">
      <div className="space-y-6 max-w-3xl">
        {/* Org Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">{currentOrg?.name}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your organization's team members and invitations
          </p>
        </div>

        {/* Current Members */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />
              Members ({members.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
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
                      <SelectTrigger className="w-[200px] shrink-0 ml-2 h-8 text-xs">
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
          </CardContent>
        </Card>

        {/* Invite New Member */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Invite New Member
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-3">
              <Input
                type="email"
                placeholder="colleague@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1"
              />
              <Select value={role} onValueChange={(v) => setRole(v as AppRole)}>
                <SelectTrigger className="w-full sm:w-[200px]">
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
              >
                {sending ? 'Sending…' : 'Send Invite'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Pending Invitations */}
        {pendingInvites.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Pending Invitations ({pendingInvites.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
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
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
