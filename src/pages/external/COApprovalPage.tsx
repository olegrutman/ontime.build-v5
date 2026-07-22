import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Check, X, Loader2, ShieldCheck, AlertTriangle, FileDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';

function fmtCurrency(value: number) {
  return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

type ApprovalType = 'owner' | 'architect';

interface COData {
  id: string;
  title: string;
  co_number: string | null;
  description: string | null;
  tc_submitted_price: number | null;
  total_tax: number | null;
  owner_approval_status: string;
  architect_approval_status: string;
}

export default function COApprovalPage() {
  const { token } = useParams<{ token: string }>();
  const [co, setCO] = useState<COData | null>(null);
  const [approvalType, setApprovalType] = useState<ApprovalType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<'approved' | 'rejected' | null>(null);

  const [approverName, setApproverName] = useState('');
  const [rejectMode, setRejectMode] = useState(false);
  const [rejectNote, setRejectNote] = useState('');
  const [acting, setActing] = useState(false);

  useEffect(() => {
    if (!token) { setError('Invalid link'); setLoading(false); return; }

    async function load() {
      const { data, error: fnErr } = await supabase.functions.invoke('co-public-access', {
        body: { action: 'load_approval', token },
      });
      if (fnErr || !data || (data as any).error) {
        setError((data as any)?.error ?? 'This approval link is invalid or has expired.');
        setLoading(false);
        return;
      }
      const { co: coData, approval_type } = data as any;
      setCO({ ...coData, description: null });
      setApprovalType(approval_type as ApprovalType);
      const status = approval_type === 'owner'
        ? coData.owner_approval_status
        : coData.architect_approval_status;
      if (status !== 'pending') {
        setDone(status === 'approved' ? 'approved' : 'rejected');
      }
      setLoading(false);
    }
    load();
  }, [token]);

  async function handleApprove() {
    if (!co || !approvalType || !approverName.trim() || !token) return;
    setActing(true);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke('co-public-access', {
        body: {
          action: 'submit_approval',
          token,
          decision: 'approved',
          approver_name: approverName.trim(),
        },
      });
      if (fnErr || (data as any)?.error) throw new Error((data as any)?.error ?? 'Failed to approve');
      setDone('approved');
    } catch (err: any) {
      setError(err?.message ?? 'Failed to approve');
    }
    setActing(false);
  }

  async function handleReject() {
    if (!co || !approvalType || !rejectNote.trim() || !approverName.trim() || !token) return;
    setActing(true);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke('co-public-access', {
        body: {
          action: 'submit_approval',
          token,
          decision: 'rejected',
          approver_name: approverName.trim(),
          rejection_note: rejectNote.trim(),
        },
      });
      if (fnErr || (data as any)?.error) throw new Error((data as any)?.error ?? 'Failed to reject');
      setDone('rejected');
    } catch (err: any) {
      setError(err?.message ?? 'Failed to reject');
    }
    setActing(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="max-w-md text-center space-y-3">
          <AlertTriangle className="h-12 w-12 mx-auto text-destructive" />
          <h1 className="text-xl font-bold text-foreground">Invalid Link</h1>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="max-w-md text-center space-y-3">
          {done === 'approved' ? (
            <>
              <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 dark:bg-emerald-950/30 flex items-center justify-center">
                <Check className="h-8 w-8 text-emerald-600" />
              </div>
              <h1 className="text-xl font-bold text-foreground">Approved</h1>
              <p className="text-sm text-muted-foreground">
                Your approval has been recorded. The project team has been notified.
              </p>
            </>
          ) : (
            <>
              <div className="w-16 h-16 mx-auto rounded-full bg-red-100 dark:bg-red-950/30 flex items-center justify-center">
                <X className="h-8 w-8 text-red-600" />
              </div>
              <h1 className="text-xl font-bold text-foreground">Rejected</h1>
              <p className="text-sm text-muted-foreground">
                Your rejection has been recorded. The project team has been notified.
              </p>
            </>
          )}
        </div>
      </div>
    );
  }

  if (!co) return null;

  const total = co.tc_submitted_price ?? 0;
  const tax = co.total_tax ?? 0;
  const grandTotal = total + tax;
  const roleLabel = approvalType === 'owner' ? 'Owner' : 'Architect';

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-card border-b border-border no-print">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-lg font-bold text-foreground">{roleLabel} Approval</h1>
              <p className="text-xs text-muted-foreground">Change Order Review</p>
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
            <div className="flex items-center gap-2">
              {co.co_number && (
                <span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded">{co.co_number}</span>
              )}
            </div>
            <h2 className="text-base font-semibold text-foreground mt-2">{co.title}</h2>
          </div>
          <div className="px-5 py-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-mono font-medium">{fmtCurrency(total)}</span>
            </div>
            {tax > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tax</span>
                <span className="font-mono font-medium">{fmtCurrency(tax)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-semibold border-t border-border pt-2">
              <span>Total</span>
              <span className="font-mono">{fmtCurrency(grandTotal)}</span>
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-5 space-y-4 no-print">
          <div>
            <Label className="text-sm font-medium">Your Name (legal signature) *</Label>
            <Input
              value={approverName}
              onChange={e => setApproverName(e.target.value)}
              placeholder="Enter your full name"
              className="mt-1.5"
            />
          </div>

          {!rejectMode ? (
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                onClick={handleApprove}
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
                  onChange={e => setRejectNote(e.target.value)}
                  placeholder="Tell the team why you're rejecting this change order"
                  rows={4}
                  className="mt-1.5"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleReject}
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
        </div>
      </div>
    </div>
  );
}
