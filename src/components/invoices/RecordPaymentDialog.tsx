import { useState } from 'react';
import { format } from 'date-fns';
import { Loader2, DollarSign } from 'lucide-react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

export interface PaymentDetails {
  paid_at: string;
  payment_method: string | null;
  payment_reference: string | null;
  payment_note: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  amountLabel: string;
  loading?: boolean;
  onConfirm: (details: PaymentDetails) => void;
}

const METHODS = ['Check', 'ACH', 'Wire', 'Card', 'Other'];

export function RecordPaymentDialog({ open, onOpenChange, amountLabel, loading, onConfirm }: Props) {
  const [date, setDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [method, setMethod] = useState<string>('');
  const [reference, setReference] = useState('');
  const [note, setNote] = useState('');

  const submit = () => {
    const chosen = new Date(`${date}T12:00:00`);
    const iso = Number.isNaN(chosen.getTime()) ? new Date().toISOString() : chosen.toISOString();
    onConfirm({
      paid_at: iso,
      payment_method: method || null,
      payment_reference: reference.trim() || null,
      payment_note: note.trim() || null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
          <DialogDescription>
            Marking {amountLabel} as paid. The date and reference are stored on the invoice timeline.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="payment-date">Payment date</Label>
            <Input
              id="payment-date"
              type="date"
              value={date}
              max={format(new Date(), 'yyyy-MM-dd')}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Method (optional)</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger>
                <SelectValue placeholder="Select method" />
              </SelectTrigger>
              <SelectContent>
                {METHODS.map((m) => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="payment-ref">Reference # (optional)</Label>
            <Input
              id="payment-ref"
              value={reference}
              maxLength={100}
              placeholder="Check #, ACH trace, confirmation"
              onChange={(e) => setReference(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="payment-note">Note (optional)</Label>
            <Textarea
              id="payment-note"
              value={note}
              maxLength={500}
              rows={2}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={loading || !date}>
            {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <DollarSign className="h-4 w-4 mr-2" />}
            Record Payment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
