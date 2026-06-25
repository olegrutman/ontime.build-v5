import { useState } from 'react';
import { Clock, Send, Loader2, ShieldCheck, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { ChangeOrder } from '@/types/changeOrder';

interface Props {
  co: ChangeOrder;
  projectId: string;
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function COExternalApprovalBanner({ co, projectId }: Props) {
  const [resending, setResending] = useState<string | null>(null);
  const ownerStatus = (co as any).owner_approval_status as string;
  const architectStatus = (co as any).architect_approval_status as string;

  const pendingOwner = ownerStatus === 'pending';
  const pendingArchitect = architectStatus === 'pending';
  const rejectedOwner = ownerStatus === 'rejected';
  const rejectedArchitect = architectStatus === 'rejected';

  if (!pendingOwner && !pendingArchitect && !rejectedOwner && !rejectedArchitect) return null;

  async function resendEmail(type: 'owner' | 'architect') {
    setResending(type);
    try {
      const { data: proj } = await supabase
        .from('projects')
        .select('name, owner_approval_email, architect_approval_email')
        .eq('id', projectId)
        .single();

      const email = type === 'owner' ? (proj as any)?.owner_approval_email : (proj as any)?.architect_approval_email;
      const token = type === 'owner' ? (co as any).owner_approval_token : (co as any).architect_approval_token;

      if (!email || !token) {
        toast.error('No email configured for this approval type');
        setResending(null);
        return;
      }

      const approveUrl = `${window.location.origin}/external/co-approve/${token}`;
      await supabase.functions.invoke('send-co-approval-email', {
        body: {
          co_id: co.id,
          approval_type: type,
          recipient_email: email,
          token,
          co_title: co.title,
          co_number: co.co_number,
          co_total: co.tc_submitted_price ?? 0,
          project_name: (proj as any)?.name,
          approve_url: approveUrl,
        },
      });
      toast.success(`Approval email resent to ${type}`);
    } catch {
      toast.error('Failed to resend');
    }
    setResending(null);
  }

  return (
    <div className="space-y-2">
      {pendingOwner && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20">
          <Clock className="h-4 w-4 text-amber-600 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
              Waiting on owner approval
            </p>
            {(co as any).approved_at && (
              <p className="text-xs text-amber-600 dark:text-amber-400">Sent {timeAgo((co as any).approved_at)}</p>
            )}
          </div>
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1 shrink-0" onClick={() => resendEmail('owner')} disabled={resending === 'owner'}>
            {resending === 'owner' ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
            Resend
          </Button>
        </div>
      )}
      {pendingArchitect && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20">
          <Clock className="h-4 w-4 text-amber-600 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
              Waiting on architect approval
            </p>
          </div>
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1 shrink-0" onClick={() => resendEmail('architect')} disabled={resending === 'architect'}>
            {resending === 'architect' ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
            Resend
          </Button>
        </div>
      )}
      {rejectedOwner && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20">
          <X className="h-4 w-4 text-red-600 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-red-800 dark:text-red-300">Owner rejected this CO</p>
            {(co as any).owner_rejection_note && (
              <p className="text-xs text-red-600 dark:text-red-400 italic">{(co as any).owner_rejection_note}</p>
            )}
          </div>
        </div>
      )}
      {rejectedArchitect && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20">
          <X className="h-4 w-4 text-red-600 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-red-800 dark:text-red-300">Architect rejected this CO</p>
            {(co as any).architect_rejection_note && (
              <p className="text-xs text-red-600 dark:text-red-400 italic">{(co as any).architect_rejection_note}</p>
            )}
          </div>
        </div>
      )}
      {((ownerStatus === 'approved') || (architectStatus === 'approved')) && (
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/20">
          <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
          <p className="text-xs text-emerald-700 dark:text-emerald-400">
            {ownerStatus === 'approved' && 'Owner approved'}
            {ownerStatus === 'approved' && architectStatus === 'approved' && ' · '}
            {architectStatus === 'approved' && 'Architect approved'}
            {(co as any).owner_approver_name && ` by ${(co as any).owner_approver_name}`}
          </p>
        </div>
      )}
    </div>
  );
}
