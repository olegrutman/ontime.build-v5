import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Check, Loader2, Pencil, Plus, X } from 'lucide-react';
import { C, fontLabel, fontMono, fmt } from '@/components/shared/KpiCard';

interface Props {
  /** Current owner price; null or 0 when the GC has never entered one. */
  value: number | null;
  /** Persist the price. Resolves false when the save failed. */
  onSave: (value: number) => Promise<boolean>;
  /** True while another owner-price write is in flight. */
  busy?: boolean;
}

/**
 * GC-only: the price the property owner pays for this project. It is the
 * baseline every GC revenue and margin figure is measured against, so it is
 * editable here at any time — during setup or long after the project is active.
 */
export function OwnerPriceCard({ value, onSave, busy = false }: Props) {  const missing = value === null || !Number.isFinite(value) || value <= 0;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!editing) setDraft(missing ? '' : String(value));
  }, [value, missing, editing]);

  const start = () => {
    setDraft(missing ? '' : String(value));
    setEditing(true);
  };

  const cancel = () => {
    setEditing(false);
    setDraft(missing ? '' : String(value));
  };

  const save = async () => {
    const amount = Number(draft);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error('Owner price must be greater than 0');
      return;
    }
    setSaving(true);
    const ok = await onSave(amount);
    setSaving(false);
    if (!ok) {
      toast.error('Could not save the owner price');
      return;
    }
    toast.success('Owner price saved');
    setEditing(false);
  };

  const inputStyle: React.CSSProperties = {
    padding: '8px 10px',
    borderRadius: 8,
    border: `1px solid ${C.border}`,
    background: C.surface,
    color: C.ink,
    fontSize: '0.95rem',
    width: 160,
    outline: 'none',
    ...fontMono,
  };

  const btn = (bg: string, fg: string, ghost = false): React.CSSProperties => ({
    padding: '8px 14px',
    borderRadius: 8,
    minHeight: 44,
    background: ghost ? 'transparent' : bg,
    color: ghost ? fg : fg,
    fontSize: '0.76rem',
    fontWeight: 700,
    border: ghost ? `1px solid ${fg}` : 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
    ...fontLabel,
  });

  return (
    <div
      style={{
        background: missing ? C.amberPale : C.surface,
        border: `1px solid ${missing ? C.amber : C.border}`,
        borderRadius: 16,
        padding: 16,
      }}
    >
      <div className="flex flex-wrap items-center gap-3" style={{ justifyContent: 'space-between' }}>
        <div style={{ minWidth: 0, flex: '1 1 240px' }}>
          <div
            style={{
              ...fontLabel,
              fontSize: '0.72rem',
              letterSpacing: '0.06em',
              color: missing ? C.amberD : C.muted,
              fontWeight: 700,
              textTransform: 'uppercase',
            }}
          >
            Owner price
          </div>
          <div style={{ ...fontLabel, fontSize: '0.74rem', color: C.faint, marginTop: 3 }}>
            {missing
              ? 'Not set — add what the property owner pays you. Your revenue, margin and cash targets all measure against it.'
              : 'What the property owner pays you. Drives your revenue baseline, margin and what is left to bill.'}
          </div>
        </div>

        <div className="flex flex-wrap items-center" style={{ gap: 10, justifyContent: 'flex-end' }}>
          {editing ? (
            <>
              <span style={{ ...fontLabel, fontSize: '0.78rem', color: C.muted }}>$</span>
              <input
                autoFocus
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                style={inputStyle}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') save();
                  if (e.key === 'Escape') cancel();
                }}
              />
              <button onClick={save} disabled={saving || busy} style={btn(C.amber, '#fff')}>
                {saving || busy ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                Save
              </button>
              <button onClick={cancel} disabled={saving} style={btn('transparent', C.muted, true)}>
                <X size={13} />
                Cancel
              </button>
            </>
          ) : (
            <>
              {missing ? (
                <span style={{ ...fontMono, fontSize: '1.15rem', fontWeight: 700, color: C.amberD }}>—</span>
              ) : (
                <span style={{ ...fontMono, fontSize: '1.15rem', fontWeight: 700, color: C.ink }}>
                  {fmt(Number(value))}
                </span>
              )}
              <button onClick={start} disabled={busy} style={btn(C.amber, '#fff')}>
                {missing ? <Plus size={13} /> : <Pencil size={13} />}
                {missing ? 'Add owner price' : 'Edit owner price'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
