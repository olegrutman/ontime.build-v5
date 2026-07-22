import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Check, X, Loader2, ShieldCheck, AlertTriangle, FileDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';

function fmtCurrency(value: number) {
  return `$${(value ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

interface InvoiceData {
  id: string;
  invoice_number: string | null;
  status: string;
  subtotal: number | null;
  retainage_amount: number | null;
  total_amount: number | null;
  notes: string | null;
  billing_period_start: string | null;
  billing_period_end: string | null;
}

interface LineItem { id: string; description: string | null; amount_this_period: number | null; }

export default function InvoiceApprovalPage() {
  const { token } = useParams<{ token: string }>();
  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const [lines, setLines] = useState<LineItem[]>([]);
  const [projectName, setProjectName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<'approved' | 'rejected' | null>(null);

  const [approverName, setApproverName] = useState('');
  const [rejectMode, setRejectMode] = useState(false);
  const [rejectNote, setRejectNote] = useState('');
  const [acting, setActing] = useState(false);

  useEffect(() => {
    if (!token) { setError('Invalid link'); setLoading(false); return; }
    (async () => {
      const { data, error: fnErr } = await supabase.functions.invoke('invoice-public-access', {
        body: { action: 'load_approval', token },
      });
      if (fnErr || !data || (data as any).error) {
        setError((data as any)?.error ?? 'This link is invalid or has expired.');
        setLoading(false); return;
      }
      const d = data as any;
      setInvoice(d.invoice);
      setLines(d.line_items ?? []);
      setProjectName(d.project_name ?? null);
      if (d.invite?.responded_at) setDone(d.invite.decision === 'approved' ? 'approved' : 'rejected');
      setLoading(false);
    })();
  }, [token]);

  async function submit(decision: 'approved' | 'rejected') {
    if (!token || !approverName.trim()) return;
    if (decision === 'rejected' && !rejectNote.trim()) return;
    setActing(true);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke('invoice-public-access', {
        body: {
          action: 'submit_approval', token, decision,
          approver_name: approverName.trim(),
          rejection_note: decision === 'rejected' ? rejectNote.trim() : undefined,
        },
      });
      if (fnErr || (data as any)?.error) throw new Error((data as any)?.error ?? 'Failed');
      setDone(decision);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to submit');
    }
    setActing(false);
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-md text-center space-y-3">
        <AlertTriangle className="h-12 w-12 mx-auto text-destructive" />
        <h1 className="text-xl font-bold text-foreground">Link Issue</h1>
        <p className="text-sm text-muted-foreground">{error}</p>
      </div>
    </div>
  );

  if (done) return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-md text-center space-y-3">
        {done === 'approved' ? (
          <>
            <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 dark:bg-emerald-950/30 flex items-center justify-center">
              <Check className="h-8 w-8 text-emerald-600" />
            </div>
            <h1 className="text-xl font-bold text-foreground">Invoice Approved</h1>
            <p className="text-sm text-muted-foreground">Your approval has been recorded.</p>
          </>
        ) : (
          <>
            <div className="w-16 h-16 mx-auto rounded-full bg-red-100 dark:bg-red-950/30 flex items-center justify-center">
              <X className="h-8 w-8 text-red-600" />
            </div>
            <h1 className="text-xl font-bold text-foreground">Invoice Rejected</h1>
            <p className="text-sm text-muted-foreground">Your rejection has been recorded.</p>
          </>
        )}
      </div>
    </div>
  );

  if (!invoice) return null;
  const subtotal = Number(invoice.subtotal ?? 0);
  const retainage = Number(invoice.retainage_amount ?? 0);
  const total = Number(invoice.total_amount ?? subtotal - retainage);

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-card border-b border-border no-print">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-lg font-bold text-foreground">Invoice Approval</h1>
              <p className="text-xs text-muted-foreground">{projectName ?? 'Project'}</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <FileDown className="h-4 w-4 mr-1" /> PDF
          </Button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5 print-page">
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            {invoice.invoice_number && (
              <span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded">
                {invoice.invoice_number}
              </span>
            )}
            <h2 className="text-base font-semibold text-foreground mt-2">
              {projectName ?? 'Invoice'}
            </h2>
            {invoice.billing_period_start && invoice.billing_period_end && (
              <p className="text-xs text-muted-foreground mt-1">
                Billing period: {invoice.billing_period_start} — {invoice.billing_period_end}
              </p>
            )}
          </div>

          {lines.length > 0 && (
            <div className="px-5 py-4 border-b border-border">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Line Items</p>
              <div className="space-y-1.5">
                {lines.map((l) => (
                  <div key={l.id} className="flex justify-between text-sm gap-4">
                    <span className="flex-1 min-w-0 truncate text-foreground">{l.description ?? '—'}</span>
                    <span className="font-mono text-foreground">{fmtCurrency(Number(l.amount_this_period ?? 0))}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="px-5 py-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-mono font-medium">{fmtCurrency(subtotal)}</span>
            </div>
            {retainage > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Retainage</span>
                <span className="font-mono font-medium">−{fmtCurrency(retainage)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-semibold border-t border-border pt-2">
              <span>Total Due</span>
              <span className="font-mono">{fmtCurrency(total)}</span>
            </div>
          </div>

          {invoice.notes && (
            <div className="px-5 py-4 border-t border-border">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Notes</p>
              <p className="text-sm text-foreground whitespace-pre-wrap">{invoice.notes}</p>
            </div>
          )}
        </div>

        <div className="bg-card border border-border rounded-xl p-5 space-y-4 no-print">
          <div>
            <Label className="text-sm font-medium">Your Name (legal signature) *</Label>
            <Input
              value={approverName}
              onChange={(e) => setApproverName(e.target.value)}
              placeholder="Enter your full name"
              className="mt-1.5"
            />
          </div>

          {!rejectMode ? (
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                onClick={() => submit('approved')}
                disabled={!approverName.trim() || acting}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
              >
                {acting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4 mr-1" />}
                Approve
              </Button>
              <Button
                variant="outline"
                onClick={() => setRejectMode(true)}
                disabled={acting}
                className="flex-1 border-destructive text-destructive hover:bg-destructive/10"
              >
                <X className="h-4 w-4 mr-1" />
                Reject
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <Label className="text-sm font-medium">Reason for rejection *</Label>
                <Textarea
                  value={rejectNote}
                  onChange={(e) => setRejectNote(e.target.value)}
                  placeholder="Tell the team why you're rejecting this invoice"
                  rows={4}
                  className="mt-1.5"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => submit('rejected')}
                  disabled={!approverName.trim() || !rejectNote.trim() || acting}
                  variant="destructive"
                  className="flex-1"
                >
                  {acting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Submit Rejection'}
                </Button>
                <Button variant="ghost" onClick={() => setRejectMode(false)} disabled={acting}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            By submitting, you confirm your identity and consent to this decision being used as a legal record.
          </p>
        </div>
      </div>
    </div>
  );
}
