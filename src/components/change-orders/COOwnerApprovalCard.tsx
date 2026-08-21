import { useState, useEffect } from 'react';
import { Send, Loader2, ShieldCheck, Clock, X, Copy, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { ChangeOrder } from '@/types/changeOrder';

interface Props {
  co: ChangeOrder;
  /** Viewer's role — drives who the external approver is called. */
  role?: 'GC' | 'TC' | 'FC';
  projectId: string;
  projectName?: string;
  coTotal: number;
  onRefresh?: () => void;
}

type ApprovalType = 'owner' | 'architect';

// A GC sends up to the Owner (and optionally the Architect).
// A TC/FC whose upstream party isn't on the platform sends up to that
// off-platform general contractor — same token machinery, different words.
const TYPE_LABEL: Record<ApprovalType, string> = { owner: 'Owner', architect: 'Architect' };
const UPSTREAM_LABEL: Record<ApprovalType, string> = {
  owner: 'General contractor',
  architect: 'Owner or architect',
};

export function COOwnerApprovalCard({ co, role = 'GC', projectId, projectName, coTotal, onRefresh }: Props) {
  const isUpstreamExternal = role !== 'GC';
  const labelFor = (t: ApprovalType) => (isUpstreamExternal ? UPSTREAM_LABEL[t] : TYPE_LABEL[t]);
  const { user } = useAuth();
  const [dialogType, setDialogType] = useState<ApprovalType | null>(null);
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [projectEmails, setProjectEmails] = useState<{ owner: string | null; architect: string | null }>({
    owner: null,
    architect: null,
  });

  const anyCo = co as any;

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('projects')
        .select('owner_approval_email, architect_approval_email')
        .eq('id', projectId)
        .maybeSingle();
      setProjectEmails({
        owner: (data as any)?.owner_approval_email ?? null,
        architect: (data as any)?.architect_approval_email ?? null,
      });
    })();
  }, [projectId]);

  function openDialog(type: ApprovalType) {
    setDialogType(type);
    setEmail(projectEmails[type] ?? '');
  }

  async function handleSend() {
    if (!dialogType || !email.trim() || !user) return;
    const type = dialogType;
    setSending(true);
    try {
      const existingToken = type === 'owner' ? anyCo.owner_approval_token : anyCo.architect_approval_token;
      const token = existingToken ?? crypto.randomUUID();

      const { error: updErr } = await supabase
        .from('change_orders')
        .update({
          [`${type}_approval_token`]: token,
          [`${type}_approval_status`]: 'pending',
          [`${type}_rejection_note`]: null,
        } as any)
        .eq('id', co.id);
      if (updErr) throw updErr;

      // Persist the address on the project so future COs prefill it.
      await supabase
        .from('projects')
        .update({ [`${type}_approval_email`]: email.trim().toLowerCase() } as any)
        .eq('id', projectId);

      const approveUrl = `${window.location.origin}/external/co-approve/${token}`;

      const { error: fnErr } = await supabase.functions.invoke('send-co-approval-email', {
        body: {
          co_id: co.id,
          approval_type: type,
          recipient_email: email.trim().toLowerCase(),
          token,
          co_title: co.title,
          co_number: co.co_number,
          co_total: coTotal,
          role_label: labelFor(type),
          project_name: projectName,
          approve_url: approveUrl,
        },
      });
      if (fnErr) throw fnErr;

      await supabase.from('co_activity').insert({
        co_id: co.id,
        project_id: projectId,
        actor_user_id: user.id,
        actor_role: 'GC',
        action: 'external_approval_sent',
        detail: `Sent for ${TYPE_LABEL[type].toLowerCase()} approval to ${email.trim()}`,
        amount: coTotal,
      });

      toast.success(`Approval request sent to ${email.trim()}`);
      setDialogType(null);
      onRefresh?.();
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to send approval request');
    } finally {
      setSending(false);
    }
  }

  function copyLink(type: ApprovalType) {
    const token = type === 'owner' ? anyCo.owner_approval_token : anyCo.architect_approval_token;
    if (!token) return;
    navigator.clipboard.writeText(`${window.location.origin}/external/co-approve/${token}`);
    toast.success('Approval link copied');
  }

  function renderRow(type: ApprovalType) {
    const status: string = (type === 'owner' ? anyCo.owner_approval_status : anyCo.architect_approval_status) ?? 'not_required';
    const approver: string | null = type === 'owner' ? anyCo.owner_approver_name : anyCo.architect_approver_name;
    const note: string | null = type === 'owner' ? anyCo.owner_rejection_note : anyCo.architect_rejection_note;
    const token: string | null = type === 'owner' ? anyCo.owner_approval_token : anyCo.architect_approval_token;
    const emailOnFile = projectEmails[type];

    const Icon = status === 'approved' ? ShieldCheck : status === 'rejected' ? X : Clock;

    return (
      <div key={type} className="flex items-start gap-3 px-5 py-3.5 border-t border-border first:border-t-0">
        <Icon
          className={cn(
            'h-4 w-4 mt-0.5 shrink-0',
            status === 'approved' ? 'text-emerald-600'
            : status === 'rejected' ? 'text-red-600'
            : status === 'pending' ? 'text-amber-600'
            : 'text-muted-foreground',
          )}
        />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">
            {labelFor(type)} approval
            <span className="ml-2 text-[0.68rem] uppercase tracking-wider text-muted-foreground">
              {status === 'not_required' ? 'Not sent'
                : status === 'pending' ? 'Waiting'
                : status === 'approved' ? 'Approved'
                : 'Rejected'}
            </span>
          </p>
          <p className="text-xs text-muted-foreground truncate">
            {approver ? `Signed by ${approver}` : emailOnFile ?? 'No email on file'}
          </p>
          {status === 'rejected' && note && (
            <p className="text-xs text-red-600 dark:text-red-400 italic mt-0.5">{note}</p>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {token && status !== 'not_required' && (
            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => copyLink(type)}>
              <Copy className="h-3 w-3" />
            </Button>
          )}
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => openDialog(type)}>
            <Send className="h-3 w-3" />
            {status === 'not_required' ? 'Send' : 'Resend'}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
        <div className="px-5 py-3.5 border-b border-border flex items-center gap-2">
          <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
          <h3 className="font-heading text-[0.75rem] uppercase tracking-wider font-semibold text-muted-foreground">
            External Approvals
          </h3>
        </div>
        {renderRow('owner')}
        {renderRow('architect')}
      </div>

      <Dialog open={dialogType !== null} onOpenChange={o => !o && setDialogType(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Send for {dialogType ? labelFor(dialogType).toLowerCase() : ''} approval</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground">
              They'll get a secure link to review and sign off on this change order. No account needed.
              {isUpstreamExternal && dialogType === 'owner' && (
                <> Their approval acts as the upstream sign-off and books this change against your contract.</>
              )}
            </p>
            <div className="space-y-2">
              <Label>Email address</Label>
              <Input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder={isUpstreamExternal ? 'pm@generalcontractor.com' : 'owner@company.com'}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogType(null)}>Cancel</Button>
              <Button onClick={handleSend} disabled={sending || !email.trim()}>
                {sending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                <Send className="h-3.5 w-3.5 mr-1.5" /> Send request
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
