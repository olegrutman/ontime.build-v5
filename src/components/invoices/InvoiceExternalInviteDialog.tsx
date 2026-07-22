import { useState } from 'react';
import { Copy, Loader2, Mail, Check } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Props {
  invoiceId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InvoiceExternalInviteDialog({ invoiceId, open, onOpenChange }: Props) {
  const [email, setEmail] = useState('');
  const [creating, setCreating] = useState(false);
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function createInvite() {
    if (!email.trim() || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      toast.error('Enter a valid email');
      return;
    }
    setCreating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('invoice_external_invites')
        .insert({
          invoice_id: invoiceId,
          email: email.trim().toLowerCase(),
          invited_by_user_id: user?.id ?? null,
        })
        .select('token')
        .single();
      if (error) throw error;
      const url = `${window.location.origin}/external/invoice/${data.token}`;
      setLink(url);
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to create invite');
    } finally {
      setCreating(false);
    }
  }

  function copy() {
    if (!link) return;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function reset() {
    setEmail('');
    setLink(null);
    setCopied(false);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request External Approval</DialogTitle>
          <DialogDescription>
            Send a secure link to someone without an account. They can review the invoice and approve or reject it — no login required.
          </DialogDescription>
        </DialogHeader>

        {!link ? (
          <div className="space-y-3 py-2">
            <div>
              <Label htmlFor="ext-email">Recipient email</Label>
              <Input
                id="ext-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="owner@example.com"
                className="mt-1.5"
              />
              <p className="text-xs text-muted-foreground mt-1.5">Link expires in 14 days.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3 py-2">
            <div className="p-3 bg-muted rounded-lg break-all text-xs font-mono">{link}</div>
            <p className="text-xs text-muted-foreground">
              Share this link with <strong>{email}</strong>. Anyone with the link can approve or reject.
            </p>
          </div>
        )}

        <DialogFooter>
          {!link ? (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button onClick={createInvite} disabled={creating || !email}>
                {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Mail className="h-4 w-4 mr-2" />}
                Create Link
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>Done</Button>
              <Button onClick={copy}>
                {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                {copied ? 'Copied' : 'Copy Link'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
