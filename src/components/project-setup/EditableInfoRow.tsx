import { useState, useEffect, useRef } from 'react';
import { Check, X, Pencil, Lock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export type RowFieldType = 'text' | 'number' | 'currency' | 'percent' | 'date' | 'select' | 'boolean';

export interface EditableInfoRowProps {
  label: string;
  value: unknown;
  display?: React.ReactNode;
  type?: RowFieldType;
  options?: { value: string; label: string }[];
  /** Async save handler. Throw to surface error. */
  onSave?: (newValue: any) => Promise<void> | void;
  /** When true, row is read-only and shows a lock tooltip. */
  locked?: boolean;
  lockReason?: string;
  placeholder?: string;
  valueClassName?: string;
  mono?: boolean;
}

function formatDisplay(value: unknown, type: RowFieldType, options?: { value: string; label: string }[]): string {
  if (value === null || value === undefined || value === '') return '—';
  if (type === 'boolean') return value ? 'Yes' : 'No';
  if (type === 'currency') return `$${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (type === 'percent') return `${value}%`;
  if (type === 'date') {
    try { return new Date(value as string).toLocaleDateString(); } catch { return String(value); }
  }
  if (type === 'select' && options) {
    return options.find(o => o.value === String(value))?.label ?? String(value);
  }
  if (type === 'number') return Number(value).toLocaleString();
  return String(value);
}

export function EditableInfoRow({
  label, value, display, type = 'text', options,
  onSave, locked, lockReason, placeholder, valueClassName, mono,
}: EditableInfoRowProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<any>(value ?? '');
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (!editing) setDraft(value ?? ''); }, [value, editing]);
  useEffect(() => { if (editing && inputRef.current) inputRef.current.focus(); }, [editing]);

  const startEdit = () => {
    if (locked || !onSave) return;
    setDraft(value ?? '');
    setEditing(true);
  };

  const cancel = () => { setDraft(value ?? ''); setEditing(false); };

  const commit = async () => {
    if (!onSave) return setEditing(false);
    let next: any = draft;
    if (type === 'number' || type === 'currency' || type === 'percent') {
      next = draft === '' || draft === null ? null : Number(draft);
      if (next !== null && Number.isNaN(next)) {
        toast.error('Please enter a valid number');
        return;
      }
    }
    if (next === value) { setEditing(false); return; }
    try {
      setSaving(true);
      await onSave(next);
      toast.success(`${label} updated`);
      setEditing(false);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const renderEditor = () => {
    if (type === 'boolean') {
      return (
        <div className="flex items-center gap-2">
          <Switch checked={!!draft} onCheckedChange={(v) => setDraft(v)} />
          <span className="text-xs text-muted-foreground">{draft ? 'Yes' : 'No'}</span>
        </div>
      );
    }
    if (type === 'select' && options) {
      return (
        <Select value={String(draft ?? '')} onValueChange={(v) => setDraft(v)}>
          <SelectTrigger className="h-8 text-xs w-[180px]"><SelectValue placeholder={placeholder} /></SelectTrigger>
          <SelectContent>
            {options.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
      );
    }
    return (
      <Input
        ref={inputRef}
        type={type === 'number' || type === 'currency' || type === 'percent' ? 'number' : type === 'date' ? 'date' : 'text'}
        step={type === 'currency' ? '0.01' : type === 'percent' ? '0.1' : 'any'}
        value={draft ?? ''}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit();
          if (e.key === 'Escape') cancel();
        }}
        placeholder={placeholder}
        className="h-8 text-xs w-[180px]"
      />
    );
  };

  const isEditable = !!onSave && !locked;

  return (
    <div className={cn(
      'group flex items-center justify-between px-3 py-2 gap-3 transition-colors',
      isEditable && !editing && 'hover:bg-muted/40 cursor-pointer'
    )}
      onClick={() => !editing && startEdit()}
    >
      <span className="text-muted-foreground text-sm flex items-center gap-1.5 min-w-0 shrink-0">
        {label}
        {locked && <span title={lockReason}><Lock className="w-3 h-3 opacity-60" /></span>}
      </span>
      {editing ? (
        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          {renderEditor()}
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={commit} disabled={saving}>
            <Check className="w-3.5 h-3.5" />
          </Button>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={cancel} disabled={saving}>
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-2 min-w-0">
          <span className={cn(
            'font-medium text-foreground text-sm text-right truncate',
            mono && 'font-mono',
            valueClassName,
          )}>
            {display ?? formatDisplay(value, type, options)}
          </span>
          {isEditable && (
            <Pencil className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
          )}
        </div>
      )}
    </div>
  );
}
