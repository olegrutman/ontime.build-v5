import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Check, X, Loader2, ShieldCheck, AlertTriangle, FileDown, Lock, Clock, FileCheck2, ArrowRight } from 'lucide-react';
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
  const [roleLabelFromServer, setRoleLabelFromServer] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<'approved' | 'rejected' | null>(null);

  const [approverName, setApproverName] = useState('');
  const [approverEmail, setApproverEmail] = useState('');
  const [projectName, setProjectName] = useState<string | null>(null);
  const [submittedBy, setSubmittedBy] = useState<string | null>(null);
  const [lines, setLines] = useState<Array<{ id: string; item_name: string; description: string | null; unit: string | null; qty: number | null; location_tag: string | null }>>([]);
  const [justSignedAt, setJustSignedAt] = useState<string | null>(null);
  const [copySent, setCopySent] = useState<string | null>(null);
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(approverEmail.trim());
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
      const { co: coData, approval_type, role_label, line_items, project_name, submitted_by } = data as any;
      setLines(line_items ?? []);
      setProjectName(project_name ?? null);
      setSubmittedBy(submitted_by ?? null);
      if (role_label) setRoleLabelFromServer(role_label as string);
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
    if (!co || !approvalType || !approverName.trim() || !emailValid || !token) return;
    setActing(true);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke('co-public-access', {
        body: {
          action: 'submit_approval',
          token,
          decision: 'approved',
          approver_name: approverName.trim(),
          approver_email: approverEmail.trim(),
          origin: window.location.origin,
        },
      });
      if (fnErr || (data as any)?.error) throw new Error((data as any)?.error ?? 'Failed to approve');
      if ((data as any)?.copy_sent) setCopySent(approverEmail.trim());
      setJustSignedAt(new Date().toISOString());
      setDone('approved');
    } catch (err: any) {
      setError(err?.message ?? 'Failed to approve');
    }
    setActing(false);
  }

  async function handleReject() {
    if (!co || !approvalType || !rejectNote.trim() || !approverName.trim() || !emailValid || !token) return;
    setActing(true);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke('co-public-access', {
        body: {
          action: 'submit_approval',
          token,
          decision: 'rejected',
          approver_name: approverName.trim(),
          approver_email: approverEmail.trim(),
          origin: window.location.origin,
          rejection_note: rejectNote.trim(),
        },
      });
      if (fnErr || (data as any)?.error) throw new Error((data as any)?.error ?? 'Failed to reject');
      if ((data as any)?.copy_sent) setCopySent(approverEmail.trim());
      setJustSignedAt(new Date().toISOString());
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

  if (!co) return null;

  const total = co.tc_submitted_price ?? 0;
  const tax = co.total_tax ?? 0;
  const grandTotal = total + tax;
  const roleLabel = roleLabelFromServer ?? (approvalType === 'owner' ? 'Owner' : 'Architect');

  const today = new Date().toLocaleDateString('en-US', { dateStyle: 'long' });
  const pre = approvalType === 'architect' ? 'architect' : 'owner';
  const c = co as any;
  const signerName: string | null = c[`${pre}_approver_name`] ?? (approverName.trim() || null);
  const signedAtRaw: string | null = c[`${pre}_approved_at`] ?? justSignedAt;
  const signedAt = signedAtRaw ? new Date(signedAtRaw).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : null;
  const rejectionReason: string | null = c[`${pre}_rejection_note`] ?? (rejectNote.trim() || null);

  return (
    <div className="min-h-screen bg-muted/40">
      <div className="bg-sidebar text-sidebar-foreground no-print">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <img src="/ontime-logo.png" alt="" className="h-7 w-7" />
            <span className="font-bold tracking-wide">Ontime<span className="text-primary">.Build</span></span>
          </div>
          <div className="flex items-center gap-2 text-xs opacity-80"><Lock className="h-3.5 w-3.5" /> Secure signing link</div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-5 print-page">
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="px-6 py-5 border-b border-border flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[0.7rem] uppercase tracking-wider text-muted-foreground font-semibold">{roleLabel} {done ? "approval record" : "approval requested"}</p>
              <h1 className="text-xl font-bold text-foreground mt-1 break-words">{co.title}</h1>
              {co.co_number && <span className="inline-block mt-2 text-xs font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded">{co.co_number}</span>}
            </div>
            <Button variant="outline" size="sm" onClick={() => window.print()} className="no-print shrink-0">
              <FileDown className="h-4 w-4 mr-1" /> Save PDF
            </Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 px-6 py-4 border-b border-border text-sm">
            <div><p className="text-xs text-muted-foreground">Project</p><p className="font-medium break-words">{projectName ?? '—'}</p></div>
            <div><p className="text-xs text-muted-foreground">Submitted by</p><p className="font-medium break-words">{submittedBy ?? '—'}</p></div>
            <div><p className="text-xs text-muted-foreground">Date</p><p className="font-medium">{today}</p></div>
          </div>
          {lines.length > 0 && (
            <div className="px-6 py-4 border-b border-border">
              <p className="text-[0.7rem] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Scope of work</p>
              <ul className="divide-y divide-border">
                {lines.map((l, i) => (
                  <li key={l.id} className="py-2 flex gap-3 text-sm">
                    <span className="text-muted-foreground font-mono w-5 shrink-0">{i + 1}.</span>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium break-words">{l.item_name}</p>
                      {l.description && <p className="text-muted-foreground text-xs break-words">{l.description}</p>}
                      {l.location_tag && <p className="text-muted-foreground text-xs">Location: {l.location_tag}</p>}
                    </div>
                    {l.qty != null && <span className="font-mono text-xs text-muted-foreground shrink-0">{l.qty} {l.unit ?? ''}</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="px-6 py-4 space-y-2">
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
            <div className="flex justify-between text-base font-bold border-t border-border pt-2">
              <span>Contract change</span>
              <span className="font-mono">{fmtCurrency(grandTotal)}</span>
            </div>
          </div>
        </div>

        {done && (
          <div className={`bg-card border-2 rounded-2xl p-5 ${done === 'approved' ? 'border-emerald-500' : 'border-destructive'}`}>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${done === 'approved' ? 'bg-emerald-100 dark:bg-emerald-950/30' : 'bg-red-100 dark:bg-red-950/30'}`}>
                {done === 'approved' ? <Check className="h-5 w-5 text-emerald-600" /> : <X className="h-5 w-5 text-destructive" />}
              </div>
              <div>
                <p className="text-[0.7rem] uppercase tracking-wider text-muted-foreground font-semibold">Signed record</p>
                <h2 className="text-lg font-bold text-foreground">{done === 'approved' ? 'Approved' : 'Rejected'}</h2>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 text-sm">
              <div><p className="text-xs text-muted-foreground">Signed by</p><p className="font-medium break-words">{signerName ?? '—'}</p></div>
              <div><p className="text-xs text-muted-foreground">Signed at</p><p className="font-medium">{signedAt ?? (done === 'rejected' ? 'Recorded' : '—')}</p></div>
              {done === 'rejected' && rejectionReason && (
                <div className="sm:col-span-2"><p className="text-xs text-muted-foreground">Reason</p><p className="font-medium break-words">{rejectionReason}</p></div>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              This decision is timestamped in the project's audit trail and the project team has been notified.
              {copySent && <> A signed copy was emailed to <span className="font-semibold text-foreground">{copySent}</span>.</>}
            </p>
          </div>
        )}

        {!done && (<>
        <div className="bg-card border border-border rounded-2xl p-5 no-print">
          <p className="text-[0.7rem] uppercase tracking-wider text-muted-foreground font-semibold mb-3">How signing works</p>
          <div className="grid sm:grid-cols-3 gap-3 text-sm">
            <div className="flex gap-2"><FileCheck2 className="h-4 w-4 text-primary shrink-0 mt-0.5" /><span>Review the scope and amount above.</span></div>
            <div className="flex gap-2"><ShieldCheck className="h-4 w-4 text-primary shrink-0 mt-0.5" /><span>Type your full name — it is your electronic signature.</span></div>
            <div className="flex gap-2"><Clock className="h-4 w-4 text-primary shrink-0 mt-0.5" /><span>Your decision is timestamped and a signed copy is emailed to you.</span></div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-5 space-y-4 no-print">
          <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <Label className="text-sm font-medium">Full name (electronic signature) *</Label>
            <Input
              value={approverName}
              onChange={e => setApproverName(e.target.value)}
              placeholder="Enter your full name"
              className="mt-1.5"
            />
          </div>
          <div>
            <Label className="text-sm font-medium">Your email (for your signed copy) *</Label>
            <Input
              type="email"
              value={approverEmail}
              onChange={e => setApproverEmail(e.target.value)}
              placeholder="name@company.com"
              className="mt-1.5"
            />
          </div>
          </div>
          <p className="text-xs text-muted-foreground">
            By signing you {rejectMode ? 'decline' : 'authorize'} this change to the contract scope and price{rejectMode ? '' : ` of ${fmtCurrency(grandTotal)}`}. Your name, email, decision and time are recorded and shared with the project team.
          </p>

          {!rejectMode ? (
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                onClick={handleApprove}
                disabled={!approverName.trim() || !emailValid || acting}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
              >
                {acting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4 mr-1" />}
                Approve & sign
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
                  disabled={!approverName.trim() || !emailValid || !rejectNote.trim() || acting}
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
        </>)}
        <div className="no-print"><ValueCard /></div>
      </div>
    </div>
  );
}

function ValueCard() {
  return (
    <div className="bg-card border border-border rounded-2xl p-5 text-left">
      <p className="text-[0.7rem] uppercase tracking-wider text-primary font-semibold">Powered by Ontime.Build</p>
      <h3 className="text-base font-bold text-foreground mt-1">Change orders without the disputes</h3>
      <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
        <li className="flex gap-2"><Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />Signed approvals with a permanent, timestamped audit trail</li>
        <li className="flex gap-2"><Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />Contract totals update the moment work is approved</li>
        <li className="flex gap-2"><Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />Owners, contractors and crews on one live project ledger</li>
      </ul>
      <a href="https://ontime.build" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 mt-3 text-sm font-semibold text-primary hover:underline">
        Run your projects on Ontime.Build <ArrowRight className="h-4 w-4" />
      </a>
    </div>
  );
}
