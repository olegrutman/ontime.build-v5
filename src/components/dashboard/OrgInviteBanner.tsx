import { useMyOrgInvites } from '@/hooks/useOrgTeam';
import { ROLE_LABELS } from '@/types/organization';
import { SurfaceCard, SurfaceCardBody } from '@/components/ui/surface-card';
import { Button } from '@/components/ui/button';
import { Building2 } from 'lucide-react';

export function OrgInviteBanner() {
  const { invites, loading, accept, decline } = useMyOrgInvites();

  if (loading || invites.length === 0) return null;

  return (
    <div className="space-y-3">
      {invites.map((inv) => (
        <SurfaceCard key={inv.id} className="border-primary/30 bg-primary/5">
          <SurfaceCardBody className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <Building2 className="h-5 w-5 text-primary shrink-0 mt-0.5 sm:mt-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">
                You've been invited to join{' '}
                <span className="font-semibold">{inv.organization?.name || 'an organization'}</span>{' '}
                as <span className="font-semibold">{ROLE_LABELS[inv.role]}</span>
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button size="sm" variant="outline" onClick={() => decline(inv.id)}>
                Decline
              </Button>
              <Button size="sm" onClick={() => accept(inv.id)}>
                Accept
              </Button>
            </div>
          </SurfaceCardBody>
        </SurfaceCard>
      ))}
    </div>
  );
}
