import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format, formatDistanceToNow } from 'date-fns';
import { ExternalLink, RefreshCw, Check, Clock, Mail, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface ExternalInvite {
  id: string;
  email: string;
  token: string;
  invite_purpose: string;
  invited_at: string;
  responded_at: string | null;
  response_data: any;
  respondent_name: string | null;
  expires_at: string;
}

interface COExternalInvitesCardProps {
  coId: string;
  coNumber: string | null;
  coTitle: string;
  projectName?: string;
}

const PURPOSE_LABELS: Record<string, string> = {
  pricing: 'Pricing',
  scope_ack: 'Scope Confirmation',
  acknowledge: 'Acknowledgment',
};

export function COExternalInvitesCard({ coId, coNumber, coTitle, projectName }: COExternalInvitesCardProps) {
  const queryClient = useQueryClient();
  const [resendingId, setResendingId] = useState<string | null>(null);

  const { data: invites = [] } = useQuery({
    queryKey: ['co-external-invites', coId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('co_external_invites')
        .select('*')
        .eq('co_id', coId)
        .order('invited_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as ExternalInvite[];
    },
    enabled: !!coId,
  });

  const handleResend = async (invite: ExternalInvite) => {
    setResendingId(invite.id);
    try {
      const viewUrl = `${window.location.origin}/external/co/${invite.token}`;
      await supabase.functions.invoke('send-co-external-invite', {
        body: {
          recipient_email: invite.email,
          co_number: coNumber,
          co_title: coTitle,
          project_name: projectName,
          invite_purpose: invite.invite_purpose,
          view_url: viewUrl,
        },
      });
      toast.success(`Invite resent to ${invite.email}`);
    } catch {
      toast.error('Failed to resend');
    } finally {
      setResendingId(null);
    }
  };

  if (invites.length === 0) return null;

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
      <div className="px-5 py-3.5 border-b border-border">
        <div className="flex items-center gap-2">
          <ExternalLink className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-[0.75rem] uppercase tracking-wider font-semibold text-muted-foreground">
            External Invites
          </h3>
          <span className="text-[10px] bg-muted rounded-full px-2 py-0.5">{invites.length}</span>
        </div>
      </div>
      <div className="divide-y divide-border">
        {invites.map(inv => {
          const expired = new Date(inv.expires_at) < new Date();
          const responded = !!inv.responded_at;

          return (
            <div key={inv.id} className="px-5 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-sm font-medium truncate">{inv.email}</span>
                    <span className={cn(
                      'text-[0.6rem] font-bold uppercase px-1.5 py-0.5 rounded-full',
                      responded ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400'
                        : expired ? 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400'
                        : 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400'
                    )}>
                      {responded ? 'Responded' : expired ? 'Expired' : 'Pending'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{PURPOSE_LABELS[inv.invite_purpose] ?? inv.invite_purpose}</span>
                    <span>Sent {formatDistanceToNow(new Date(inv.invited_at), { addSuffix: true })}</span>
                  </div>

                  {/* Show response data inline */}
                  {responded && inv.response_data && (
                    <div className="mt-2 p-2.5 bg-emerald-50/50 dark:bg-emerald-950/10 border border-emerald-100 dark:border-emerald-900/30 rounded-lg">
                      <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-400">
                        <Check className="h-3 w-3 inline mr-1" />
                        Response from {inv.respondent_name ?? inv.email}
                        {inv.responded_at && ` · ${format(new Date(inv.responded_at), 'MMM d, h:mm a')}`}
                      </p>
                      {inv.response_data.total_price != null && (
                        <p className="text-xs mt-1 font-mono font-semibold">
                          Total: ${Number(inv.response_data.total_price).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </p>
                      )}
                      {inv.response_data.scope_acknowledged && (
                        <p className="text-xs mt-1">✓ Scope acknowledged</p>
                      )}
                      {inv.response_data.notes && (
                        <p className="text-xs mt-1 text-muted-foreground">{inv.response_data.notes}</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Resend button */}
                {!responded && !expired && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs gap-1"
                    onClick={() => handleResend(inv)}
                    disabled={resendingId === inv.id}
                  >
                    {resendingId === inv.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                    Resend
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
