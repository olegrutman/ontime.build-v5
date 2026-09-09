import { useState } from 'react';
import { Loader2, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface EmailPODialogProps {
  poId: string;
  poNumber: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultRecipient?: string | null;
}

export function EmailPODialog({
  poId,
  poNumber,
  open,
  onOpenChange,
  defaultRecipient,
}: EmailPODialogProps) {
  const [recipients, setRecipients] = useState(defaultRecipient || '');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    const list = recipients
      .split(/[,\s;]+/)
      .map((r) => r.trim())
      .filter(Boolean);

    if (list.length === 0) {
      toast.error('Add at least one email address');
      return;
    }

    setSending(true);
    const { data, error } = await supabase.functions.invoke('send-po-documents', {
      body: { po_id: poId, recipients: list, message: message.trim() || undefined },
    });
    setSending(false);

    if (error || (data as any)?.error) {
      toast.error((data as any)?.error || error?.message || 'Failed to send purchase order');
      return;
    }

    const sent = (data as any)?.sent?.length ?? list.length;
    toast.success(`Purchase order sent to ${sent} recipient${sent === 1 ? '' : 's'}`);
    setMessage('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Email {poNumber}</DialogTitle>
          <DialogDescription>
            Sends a PDF and a spreadsheet (CSV) of this purchase order as secure download
            links that stay valid for 14 days.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Recipients</Label>
            <Input
              value={recipients}
              onChange={(e) => setRecipients(e.target.value)}
              placeholder="name@company.com, second@company.com"
            />
            <p className="text-xs text-muted-foreground">Separate up to 5 addresses with commas.</p>
          </div>
          <div className="space-y-1.5">
            <Label>Message (optional)</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Add a short note for the recipient"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={sending}>
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Mail className="h-4 w-4 mr-2" />
            )}
            Send
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
