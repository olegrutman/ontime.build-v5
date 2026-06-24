import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ArrowLeft, Loader2, Send, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { StatusPill } from '@/components/ui/status-pill';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useRFIs, type RFIRow } from '@/hooks/useRFIs';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const STATUS_MAP: Record<string, { variant: 'healthy' | 'watch' | 'at_risk' | 'info' | 'neutral'; label: string }> = {
  open: { variant: 'watch', label: 'Open' },
  answered: { variant: 'healthy', label: 'Answered' },
  closed: { variant: 'neutral', label: 'Closed' },
  void: { variant: 'at_risk', label: 'Void' },
};

const URGENCY_BADGE: Record<string, string> = {
  critical: 'bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400',
  high: 'bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400',
  normal: 'bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400',
  low: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
};

export default function RFIDetailPage() {
  const { id: projectId, rfiId } = useParams<{ id: string; rfiId: string }>();
  const navigate = useNavigate();
  const { user, userOrgRoles } = useAuth();
  const currentOrgId = userOrgRoles?.[0]?.organization?.id;

  const { rfis, answerRFI, closeRFI, voidRFI } = useRFIs(projectId);
  const rfi = rfis.find(r => r.id === rfiId) ?? null;

  // Blocked COs
  const { data: blockedCOs = [] } = useQuery({
    queryKey: ['blocked-cos-by-rfi', rfiId],
    queryFn: async () => {
      const { data } = await supabase
        .from('change_orders')
        .select('id, co_number, title, status')
        .eq('blocked_by_rfi_id', rfiId!)
        .order('co_number');
      return data ?? [];
    },
    enabled: !!rfiId,
  });

  const [answer, setAnswer] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!rfi) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const canAnswer = rfi.status === 'open' && currentOrgId === rfi.submitted_to_org_id;
  const canClose = rfi.status === 'answered';
  const canVoid = rfi.status === 'open';

  const pill = STATUS_MAP[rfi.status] ?? STATUS_MAP.open;

  const handleAnswer = async () => {
    if (!answer.trim() || !user) return;
    setSubmitting(true);
    try {
      await answerRFI.mutateAsync({ id: rfi.id, answer: answer.trim(), userId: user.id });
      toast.success('Answer submitted');
      setAnswer('');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = async () => {
    setSubmitting(true);
    try {
      await closeRFI.mutateAsync(rfi.id);
      toast.success('RFI closed');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleVoid = async () => {
    if (!confirm('Void this RFI? This cannot be undone.')) return;
    setSubmitting(true);
    try {
      await voidRFI.mutateAsync(rfi.id);
      toast.success('RFI voided');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(`/project/${projectId}/rfis`)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <span className="text-xs text-muted-foreground">RFIs ›</span>
        <span className="text-xs font-mono font-medium">{rfi.rfi_number}</span>
      </div>

      {/* Header card */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="font-mono text-sm text-muted-foreground">{rfi.rfi_number}</span>
              <StatusPill variant={pill.variant}>{pill.label}</StatusPill>
              <span className={cn('rounded-full px-2.5 py-0.5 text-[0.65rem] font-bold uppercase', URGENCY_BADGE[rfi.urgency])}>
                {rfi.urgency}
              </span>
            </div>
            <h1 className="font-heading text-lg font-bold">{rfi.title}</h1>
          </div>
          <div className="flex gap-1.5">
            {canVoid && (
              <Button variant="outline" size="sm" className="text-xs" onClick={handleVoid} disabled={submitting}>
                <XCircle className="h-3.5 w-3.5 mr-1" /> Void
              </Button>
            )}
            {canClose && (
              <Button variant="outline" size="sm" className="text-xs" onClick={handleClose} disabled={submitting}>
                <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Close RFI
              </Button>
            )}
          </div>
        </div>

        {/* Metadata grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          <div><span className="text-muted-foreground text-xs">From</span><p className="font-medium">{rfi.submitted_by_org?.name ?? '—'}</p></div>
          <div><span className="text-muted-foreground text-xs">To</span><p className="font-medium">{rfi.submitted_to_org?.name ?? '—'}</p></div>
          <div><span className="text-muted-foreground text-xs">Asked</span><p className="font-medium">{format(new Date(rfi.asked_at), 'MMM d, yyyy')}</p></div>
          {rfi.due_date && <div><span className="text-muted-foreground text-xs">Due</span><p className="font-medium">{format(new Date(rfi.due_date), 'MMM d, yyyy')}</p></div>}
        </div>
      </div>

      {/* Blocked COs banner */}
      {blockedCOs.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <span className="text-sm font-semibold text-amber-800 dark:text-amber-300">
              Blocking {blockedCOs.length} Change Order{blockedCOs.length > 1 ? 's' : ''}
            </span>
          </div>
          <div className="space-y-1">
            {blockedCOs.map(co => (
              <button
                key={co.id}
                onClick={() => navigate(`/project/${projectId}/change-orders/${co.id}`)}
                className="text-xs text-amber-700 dark:text-amber-400 hover:underline block"
              >
                {co.co_number} — {co.title}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Question */}
      <div className="bg-card border border-border rounded-xl p-5">
        <Label className="text-muted-foreground text-[0.7rem] uppercase tracking-wider font-semibold">Question</Label>
        <p className="mt-2 text-sm whitespace-pre-wrap leading-relaxed">{rfi.question}</p>
      </div>

      {/* Answer */}
      <div className="bg-card border border-border rounded-xl p-5">
        <Label className="text-muted-foreground text-[0.7rem] uppercase tracking-wider font-semibold">Answer</Label>
        {rfi.answer ? (
          <div className="mt-2">
            <p className="text-sm whitespace-pre-wrap leading-relaxed">{rfi.answer}</p>
            {rfi.answered_at && (
              <p className="text-xs text-muted-foreground mt-3">
                Answered on {format(new Date(rfi.answered_at), 'MMM d, yyyy h:mm a')}
              </p>
            )}
          </div>
        ) : canAnswer ? (
          <div className="mt-3 space-y-3">
            <Textarea
              value={answer}
              onChange={e => setAnswer(e.target.value)}
              placeholder="Type your answer…"
              rows={5}
            />
            <Button onClick={handleAnswer} disabled={submitting || !answer.trim()}>
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <Send className="h-3.5 w-3.5 mr-1.5" /> Submit Answer
            </Button>
          </div>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground italic">Awaiting response…</p>
        )}
      </div>
    </div>
  );
}
