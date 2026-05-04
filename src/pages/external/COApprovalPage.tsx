import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Check, X, Loader2, ShieldCheck, AlertTriangle } from 'lucide-react';
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
  owner_approval_token: string | null;
  architect_approval_status: string;
  architect_approval_token: string | null;
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
      // Try owner token first
      const { data } = await (supabase as any)
        .from('change_orders')
        .select('id, title, co_number, tc_submitted_price, total_tax, owner_approval_status, owner_approval_token, architect_approval_status, architect_approval_token')
        .eq('owner_approval_token', token)
        .maybeSingle();

      if (data) {
        const d = data as unknown as COData;
        setCO({ ...d, description: null });
        setApprovalType('owner');
        if (d.owner_approval_status !== 'pending') {
          setDone(d.owner_approval_status === 'approved' ? 'approved' : 'rejected');
        }
      } else {
        // Try architect token
        const { data: archData } = await (supabase as any)
          .from('change_orders')
          .select('id, title, co_number, tc_submitted_price, total_tax, owner_approval_status, owner_approval_token, architect_approval_status, architect_approval_token')
          .eq('architect_approval_token', token)
          .maybeSingle();

        if (archData) {
          const ad = archData as unknown as COData;
          setCO({ ...ad, description: null });
          setApprovalType('architect');
          if (ad.architect_approval_status !== 'pending') {
            setDone(ad.architect_approval_status === 'approved' ? 'approved' : 'rejected');
          }
        } else {
          setError('This approval link is invalid or has expired.');
        }
      }
      setLoading(false);
    }
    load();
  }, [token]);

  async function handleApprove() {
    if (!co || !approvalType || !approverName.trim()) return;
    setActing(true);
    try {
      const prefix = approvalType === 'owner' ? 'owner' : 'architect';
      const { error: err } = await supabase
        .from('change_orders')
        .update({
          [`${prefix}_approval_status`]: 'approved',
          [`${prefix}_approved_at`]: new Date().toISOString(),
          [`${prefix}_approver_name`]: approverName.trim(),
        })
        .eq('id', co.id)
        .eq(`${prefix}_approval_token`, token);
      if (err) throw err;

      // Check if all approvals are done — transition to contracted
      const { data: updated } = await supabase
        .from('change_orders')
        .select('owner_approval_status, architect_approval_status')
        .eq('id', co.id)
        .single();

      if (updated) {
        const ownerDone = updated.owner_approval_status === 'not_required' || updated.owner_approval_status === 'approved';
        const archDone = updated.architect_approval_status === 'not_required' || updated.architect_approval_status === 'approved';
        if (ownerDone && archDone) {
          await supabase
            .from('change_orders')
            .update({ status: 'contracted', contracted_at: new Date().toISOString() })
            .eq('id', co.id);
        }
      }

      setDone('approved');
    } catch (err: any) {
      setError(err?.message ?? 'Failed to approve');
    }
    setActing(false);
  }

  async function handleReject() {
    if (!co || !approvalType || !rejectNote.trim() || !approverName.trim()) return;
    setActing(true);
    try {
      const prefix = approvalType === 'owner' ? 'owner' : 'architect';
      const { error: err } = await supabase
        .from('change_orders')
        .update({
          [`${prefix}_approval_status`]: 'rejected',
          [`${prefix}_approver_name`]: approverName.trim(),
          [`${prefix}_rejection_note`]: rejectNote.trim(),
        })
        .eq('id', co.id)
        .eq(`${prefix}_approval_token`, token);
      if (err) throw err;
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
      {/* Header */}
      <div className="bg-card border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <ShieldCheck className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-lg font-bold text-foreground">{roleLabel} Approval</h1>
            <p className="text-xs text-muted-foreground">Change Order Review</p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        {/* CO Summary */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <div className="flex items-center gap-2">
              {co.co_number && (
                <span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded">{co.co_number}</span>
              )}
            </div>
            <h2 className="text-base font-semibold text-foreground mt-2">{co.title}</h2>
            {co.description && (
              <p className="text-sm text-muted-foreground mt-1">{co.description}</p>
            )}
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

        {/* Approval Form */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <div>
            <Label className="text-sm font-medium">Your Name (legal signature) *</Label>
            <Input
              value={approverName}
              onChange={e => setApproverName(e.target.value)}
              placeholder="Enter your full name"
              className="mt-1.5"
            />
            <p className="text-[10px] text-muted-foreground mt-1">
              By typing your name, you are electronically signing this approval.
            </p>
          </div>

          {rejectMode ? (
            <div className="space-y-3">
              <div>
                <Label className="text-sm font-medium">Rejection Reason *</Label>
                <Textarea
                  value={rejectNote}
                  onChange={e => setRejectNote(e.target.value)}
                  placeholder="Explain why this change order is being rejected..."
                  rows={3}
                  className="mt-1.5 resize-none"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  className="flex-1 h-10"
                  onClick={handleReject}
                  disabled={acting || !approverName.trim() || !rejectNote.trim()}
                >
                  {acting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <X className="h-4 w-4 mr-1" />}
                  Confirm Rejection
                </Button>
                <Button variant="outline" className="h-10" onClick={() => setRejectMode(false)} disabled={acting}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <Button
                className="flex-1 h-10 gap-1.5"
                onClick={handleApprove}
                disabled={acting || !approverName.trim()}
              >
                {acting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Approve Change Order
              </Button>
              <Button
                variant="outline"
                className="h-10 gap-1.5 text-destructive border-destructive/30"
                onClick={() => setRejectMode(true)}
                disabled={acting}
              >
                <X className="h-4 w-4" />
                Reject
              </Button>
            </div>
          )}
        </div>

        <p className="text-[10px] text-center text-muted-foreground">
          Your IP address and browser information will be recorded for audit purposes.
        </p>
      </div>
    </div>
  );
}
