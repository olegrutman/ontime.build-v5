import { useState } from 'react';
import { Loader2, Send, ExternalLink } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface COExternalInviteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  coId: string;
  coNumber: string | null;
  coTitle: string;
  projectId: string;
  projectName?: string;
  onInviteSent: () => void;
}

const PURPOSE_OPTIONS = [
  { value: 'pricing', label: 'Provide pricing', description: 'Ask them to price scope items and submit' },
  { value: 'scope_ack', label: 'Confirm scope', description: 'Ask them to review and acknowledge the scope' },
  { value: 'acknowledge', label: 'Acknowledge receipt', description: 'Just acknowledge they received the CO' },
] as const;

export function COExternalInviteDialog({
  open, onOpenChange, coId, coNumber, coTitle, projectId, projectName, onInviteSent,
}: COExternalInviteDialogProps) {
  const { user } = useAuth();
  const [email, setEmail] = useState('');
  const [purpose, setPurpose] = useState<string>('pricing');
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!email.trim() || !user) return;
    setSending(true);
    try {
      // Create the invite record
      const { data: invite, error } = await supabase
        .from('co_external_invites')
        .insert({
          co_id: coId,
          email: email.trim().toLowerCase(),
          invite_purpose: purpose,
          invited_by_user_id: user.id,
        } as any)
        .select('token')
        .single();

      if (error) throw error;

      const viewUrl = `${window.location.origin}/external/co/${invite.token}`;

      // Send the email
      await supabase.functions.invoke('send-co-external-invite', {
        body: {
          recipient_email: email.trim().toLowerCase(),
          co_number: coNumber,
          co_title: coTitle,
          project_name: projectName,
          invite_purpose: purpose,
          view_url: viewUrl,
        },
      });

      // Log activity
      await supabase.from('co_activity').insert({
        co_id: coId,
        project_id: projectId,
        actor_user_id: user.id,
        actor_role: 'GC',
        action: 'external_invite_sent',
        detail: `Invited ${email.trim()} to ${PURPOSE_OPTIONS.find(p => p.value === purpose)?.label.toLowerCase() ?? 'respond'}`,
      });

      toast.success(`Invite sent to ${email.trim()}`);
      setEmail('');
      setPurpose('pricing');
      onInviteSent();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to send invite');
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ExternalLink className="h-5 w-5" />
            Invite External Party
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          <p className="text-sm text-muted-foreground">
            Send a secure link to a subcontractor or vendor who doesn't have an account. They can review the CO and respond without signing up.
          </p>

          <div className="space-y-2">
            <Label>Email address</Label>
            <Input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="sub@company.com"
            />
          </div>

          <div className="space-y-3">
            <Label>Asking them to:</Label>
            <RadioGroup value={purpose} onValueChange={setPurpose} className="space-y-2">
              {PURPOSE_OPTIONS.map(opt => (
                <label
                  key={opt.value}
                  className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-accent/30 transition-colors cursor-pointer"
                >
                  <RadioGroupItem value={opt.value} className="mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">{opt.label}</p>
                    <p className="text-xs text-muted-foreground">{opt.description}</p>
                  </div>
                </label>
              ))}
            </RadioGroup>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleSend} disabled={sending || !email.trim()}>
              {sending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <Send className="h-3.5 w-3.5 mr-1.5" /> Send Invite
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
