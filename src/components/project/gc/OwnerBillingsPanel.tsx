import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Trash2, Plus, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { C, fontLabel, fontMono, fmt, THead, TdN, TdM, TRow } from '@/components/shared/KpiCard';

type Billing = {
  id: string;
  billing_number: string | null;
  billed_amount: number;
  collected_amount: number;
  billed_at: string;
  collected_at: string | null;
  notes: string | null;
};

interface Props {
  projectId: string;
  gcOrgId: string;
  onChanged?: () => void;
}

/**
 * GC-only ledger for what the GC has invoiced / collected from the project owner.
 * Drives the "Margin to Date" KPI by providing real earned-revenue numbers.
 * Visible only to General Contractor org members (enforced by RLS on
 * gc_owner_billings).
 */
export function OwnerBillingsPanel({ projectId, gcOrgId, onChanged }: Props) {
  const { user } = useAuth();
  const [rows, setRows] = useState<Billing[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState({
    billing_number: '',
    billed_amount: '',
    collected_amount: '',
    billed_at: new Date().toISOString().slice(0, 10),
    notes: '',
  });

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('gc_owner_billings')
      .select('id, billing_number, billed_amount, collected_amount, billed_at, collected_at, notes')
      .eq('project_id', projectId)
      .eq('gc_org_id', gcOrgId)
      .order('billed_at', { ascending: false });
    if (error) {
      console.error('Failed to load owner billings:', error);
      toast.error('Could not load owner billings');
    }
    setRows((data || []) as Billing[]);
    setLoading(false);
  };

  useEffect(() => {
    if (projectId && gcOrgId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, gcOrgId]);

  const addBilling = async () => {
    const billed = Number(draft.billed_amount);
    const collected = Number(draft.collected_amount || 0);
    if (!isFinite(billed) || billed <= 0) {
      toast.error('Billed amount must be greater than 0');
      return;
    }
    setBusy(true);
    const { error } = await supabase.from('gc_owner_billings').insert({
      project_id: projectId,
      gc_org_id: gcOrgId,
      billing_number: draft.billing_number || null,
      billed_amount: billed,
      collected_amount: collected,
      billed_at: draft.billed_at,
      collected_at: collected > 0 ? draft.billed_at : null,
      notes: draft.notes || null,
      created_by_user_id: user?.id ?? null,
    });
    setBusy(false);
    if (error) {
      console.error(error);
      toast.error('Could not save billing');
      return;
    }
    toast.success('Owner billing recorded');
    setDraft({
      billing_number: '',
      billed_amount: '',
      collected_amount: '',
      billed_at: new Date().toISOString().slice(0, 10),
      notes: '',
    });
    await load();
    onChanged?.();
  };

  const markCollected = async (row: Billing) => {
    setBusy(true);
    const { error } = await supabase
      .from('gc_owner_billings')
      .update({
        collected_amount: row.billed_amount,
        collected_at: new Date().toISOString().slice(0, 10),
      })
      .eq('id', row.id);
    setBusy(false);
    if (error) {
      toast.error('Could not update billing');
      return;
    }
    toast.success('Marked collected');
    await load();
    onChanged?.();
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this owner billing record?')) return;
    setBusy(true);
    const { error } = await supabase.from('gc_owner_billings').delete().eq('id', id);
    setBusy(false);
    if (error) {
      toast.error('Could not delete');
      return;
    }
    await load();
    onChanged?.();
  };

  const totalBilled = rows.reduce((s, r) => s + Number(r.billed_amount || 0), 0);
  const totalCollected = rows.reduce((s, r) => s + Number(r.collected_amount || 0), 0);

  const inputStyle: React.CSSProperties = {
    padding: '6px 8px',
    borderRadius: 6,
    border: `1px solid ${C.border}`,
    fontSize: '0.78rem',
    outline: 'none',
    ...fontLabel,
  };

  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div>
          <div style={{ ...fontLabel, fontSize: '0.72rem', letterSpacing: '0.06em', color: C.muted, fontWeight: 700, textTransform: 'uppercase' }}>
            Owner Billings
          </div>
          <div style={{ ...fontLabel, fontSize: '0.72rem', color: C.faint, marginTop: 2 }}>
            What you've invoiced and collected from the project owner. Drives Margin&nbsp;to&nbsp;Date.
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ ...fontMono, fontSize: '0.95rem', fontWeight: 700, color: C.ink }}>
            {fmt(totalBilled)}
          </div>
          <div style={{ ...fontLabel, fontSize: '0.7rem', color: C.muted }}>
            Collected {fmt(totalCollected)}
          </div>
        </div>
      </div>

      {/* Add new billing */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 2fr auto', gap: 8, marginBottom: 12 }}>
        <input style={inputStyle} placeholder="Billing #" value={draft.billing_number} onChange={(e) => setDraft({ ...draft, billing_number: e.target.value })} />
        <input style={inputStyle} type="date" value={draft.billed_at} onChange={(e) => setDraft({ ...draft, billed_at: e.target.value })} />
        <input style={inputStyle} type="number" placeholder="Billed $" value={draft.billed_amount} onChange={(e) => setDraft({ ...draft, billed_amount: e.target.value })} />
        <input style={inputStyle} type="number" placeholder="Collected $" value={draft.collected_amount} onChange={(e) => setDraft({ ...draft, collected_amount: e.target.value })} />
        <input style={inputStyle} placeholder="Notes (optional)" value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} />
        <button
          onClick={addBilling}
          disabled={busy}
          style={{ padding: '6px 12px', borderRadius: 6, background: C.amber, color: '#fff', fontSize: '0.74rem', fontWeight: 700, border: 'none', cursor: busy ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
        >
          {busy ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />} Add
        </button>
      </div>

      {/* List */}
      {loading ? (
        <div style={{ padding: 20, textAlign: 'center', color: C.muted, fontSize: '0.78rem' }}>Loading…</div>
      ) : rows.length === 0 ? (
        <div style={{ padding: 20, textAlign: 'center', color: C.muted, fontSize: '0.78rem' }}>
          No owner billings recorded yet. Add the first one above to start tracking realized margin.
        </div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <THead cols={['Billing #', 'Date', 'Billed', 'Collected', 'Notes', '']} />
          <tbody>
            {rows.map((r) => {
              const fullyCollected = Number(r.collected_amount) >= Number(r.billed_amount);
              return (
                <TRow key={r.id} cells={[
                  <TdN>{r.billing_number || '—'}</TdN>,
                  <TdN>{r.billed_at}</TdN>,
                  <TdM>{fmt(Number(r.billed_amount))}</TdM>,
                  <TdM>
                    <span style={{ color: fullyCollected ? C.green : C.amber }}>
                      {fmt(Number(r.collected_amount))}
                    </span>
                  </TdM>,
                  <TdN>{r.notes || '—'}</TdN>,
                  <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                    {!fullyCollected && (
                      <button onClick={() => markCollected(r)} disabled={busy} style={{ padding: '3px 8px', borderRadius: 4, background: 'transparent', color: C.green, fontSize: '0.7rem', fontWeight: 700, border: `1px solid ${C.green}`, cursor: 'pointer' }}>
                        Mark collected
                      </button>
                    )}
                    <button onClick={() => remove(r.id)} disabled={busy} style={{ padding: 3, borderRadius: 4, background: 'transparent', color: C.muted, border: 'none', cursor: 'pointer' }}>
                      <Trash2 size={14} />
                    </button>
                  </div>,
                ]} />
              );
            })}
            <TRow isTotal cells={[
              <TdN>{rows.length} record{rows.length === 1 ? '' : 's'}</TdN>,
              <TdN>—</TdN>,
              <TdM>{fmt(totalBilled)}</TdM>,
              <TdM>{fmt(totalCollected)}</TdM>,
              <TdN>—</TdN>,
              <TdN>—</TdN>,
            ]} />
          </tbody>
        </table>
      )}
    </div>
  );
}
