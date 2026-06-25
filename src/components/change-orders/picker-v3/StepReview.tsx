import { cn } from '@/lib/utils';
import type { PickerState, PickerAction } from './types';
import { locationDisplay } from './types';
import { useOpenRFIs } from '@/hooks/useRFIs';
import { useParams } from 'react-router-dom';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MessageSquareMore } from 'lucide-react';

interface StepReviewProps {
  state: PickerState;
  dispatch: React.Dispatch<PickerAction>;
  onSwitchItem: (index: number) => void;
  onAddItem: () => void;
}

export function StepReview({ state, dispatch, onSwitchItem, onAddItem }: StepReviewProps) {
  const { id: projectId } = useParams<{ id: string }>();
  const { data: openRFIs = [] } = useOpenRFIs(projectId);

  return (
    <div>
      <div className="mb-3.5">
        <p className="text-[0.6rem] font-bold text-amber-700 uppercase tracking-[1.5px] mb-1">Step 4 of 4 · Final Review</p>
        <h2 className="font-heading text-[1.6rem] font-black text-foreground leading-tight tracking-tight">
          Review and submit.
        </h2>
        <p className="text-[0.78rem] text-muted-foreground mt-1 max-w-xl leading-relaxed">
          Here's the full {state.items[0]?.docType === 'CO' ? 'Change Order' : 'Work Order'} with all items rolled up.
        </p>
      </div>

      {/* Items table */}
      <div className="flex items-center justify-between mb-3.5">
        <p className="font-heading text-[1.1rem] font-extrabold uppercase tracking-[0.5px] text-foreground">
          Items in this {state.items[0]?.docType ?? 'CO'}
        </p>
        <button
          type="button"
          onClick={onAddItem}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border-[1.5px] border-dashed border-amber-400 bg-background text-amber-700 text-[0.74rem] font-bold hover:bg-amber-50 transition-all"
        >
          + Add Item
        </button>
      </div>

      <div className="bg-background border rounded-xl overflow-hidden mb-3.5 shadow-xs">
        {/* Header */}
        <div className="grid grid-cols-[36px_1fr_120px_36px] gap-3 px-3.5 py-2.5 bg-muted/50 text-[0.6rem] font-bold text-muted-foreground uppercase tracking-[1px]">
          <span>#</span>
          <span>Location · Scope</span>
          <span className="text-right">Type</span>
          <span />
        </div>

        {/* Rows */}
        {state.items.map((item, i) => {
          const loc = item.locations.length > 1
            ? `${item.locations.length} locations · ${item.systemName ?? '—'}`
            : `${locationDisplay(item)} · ${item.systemName ?? '—'}`;
          const wts = [...item.workTypes].map(k => item.workNames[k] || k).slice(0, 3).join(' · ');
          const more = item.workTypes.size > 3 ? ` +${item.workTypes.size - 3}` : '';

          return (
            <button
              key={i}
              type="button"
              onClick={() => onSwitchItem(i)}
              className="grid grid-cols-[36px_1fr_120px_36px] gap-3 px-3.5 py-3 items-center border-b hover:bg-muted/30 transition-colors text-left"
            >
              <span className="font-mono text-[0.75rem] font-bold text-foreground bg-amber-50 py-1 rounded-md text-center">
                {String(i + 1).padStart(2, '0')}
              </span>
              <div>
                <p className="text-[0.82rem] font-semibold text-foreground">{loc}</p>
                <p className="text-[0.7rem] text-muted-foreground mt-0.5">{item.causeName ?? 'No cause'} · {wts || 'No work types'}{more}</p>
                {item.narrative && (
                  <p className="text-[0.62rem] text-muted-foreground/70 mt-0.5 line-clamp-1 italic">"{item.narrative.substring(0, 80)}"</p>
                )}
              </div>
              <div className="flex items-center justify-end gap-1.5">
                <span className={cn(
                  'text-[0.5rem] font-bold px-1.5 py-0.5 rounded-full uppercase',
                  item.docType === 'CO' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700',
                )}>
                  {item.docType}
                </span>
                <span className="text-[0.5rem] font-bold px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground uppercase">
                  {item.pricingName}
                </span>
              </div>
              <div className="flex justify-end">
                {state.items.length > 1 && (
                  <span
                    role="button"
                    onClick={e => { e.stopPropagation(); dispatch({ type: 'DELETE_ITEM', index: i }); }}
                    className="w-7 h-7 rounded-md bg-muted border flex items-center justify-center text-muted-foreground hover:bg-red-50 hover:border-red-300 hover:text-red-600 text-[0.85rem] transition-all"
                  >
                    ×
                  </span>
                )}
              </div>
            </button>
          );
        })}

        {/* Summary footer */}
        <div className="grid grid-cols-[36px_1fr_120px_36px] gap-3 px-3.5 py-3.5 bg-[hsl(var(--navy))] items-center">
          <span />
          <span className="font-heading text-sm font-extrabold uppercase tracking-[0.5px] text-white/55">
            {state.items.length} item{state.items.length !== 1 ? 's' : ''} · Pricing deferred
          </span>
          <span className="text-[0.7rem] font-semibold text-amber-400 text-right">
            {state.items[0]?.pricingName}
          </span>
          <span />
        </div>
      </div>

      {/* Needs summary */}
      {state.items.some(it => it.materialsNeeded || it.equipmentNeeded) && (
        <div className="bg-background border rounded-xl p-3.5 mb-3.5 shadow-xs">
          <p className="text-[0.62rem] font-bold text-muted-foreground uppercase tracking-[1.2px] mb-2">Procurement Needs</p>
          <div className="flex gap-3 flex-wrap">
            {state.items.some(it => it.materialsNeeded) && (
              <div className="flex items-center gap-1.5 text-[0.75rem]">
                <span>📦</span>
                <span className="font-semibold text-foreground">Materials</span>
                <span className="text-muted-foreground">· {state.items[0].materialResponsible} procures</span>
              </div>
            )}
            {state.items.some(it => it.equipmentNeeded) && (
              <div className="flex items-center gap-1.5 text-[0.75rem]">
                <span>🔧</span>
                <span className="font-semibold text-foreground">Equipment</span>
                <span className="text-muted-foreground">· {state.items[0].equipmentResponsible} procures</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Approval chain placeholder */}
      <div className="bg-background border rounded-xl p-[18px] mb-3.5 shadow-xs">
        <p className="text-[0.62rem] font-bold text-muted-foreground uppercase tracking-[1.2px] mb-3.5">Approval Chain</p>
        <div className="flex items-center gap-1.5 flex-wrap">
          <div className="flex items-center gap-2.5 px-3.5 py-2.5 bg-amber-50 border border-amber-400 rounded-lg">
            <span className="w-[30px] h-[30px] rounded-full bg-amber-500 text-white flex items-center justify-center text-[0.78rem] font-extrabold">You</span>
            <div>
              <p className="text-[0.78rem] font-bold text-foreground">You</p>
              <p className="text-[0.62rem] text-muted-foreground">Submitted</p>
            </div>
          </div>
          <span className="text-muted-foreground/50 text-[0.85rem]">→</span>
          <div className="flex items-center gap-2.5 px-3.5 py-2.5 bg-muted/30 border rounded-lg">
            <span className="w-[30px] h-[30px] rounded-full bg-blue-600 text-white flex items-center justify-center text-[0.78rem] font-extrabold">GC</span>
            <div>
              <p className="text-[0.78rem] font-bold text-foreground">GC Approval</p>
              <p className="text-[0.62rem] text-muted-foreground">Required</p>
            </div>
          </div>
        </div>
        <p className="text-[0.7rem] text-muted-foreground mt-3.5 pt-3.5 border-t flex items-center gap-2">
          <span className="w-[18px] h-[18px] rounded-full bg-green-100 text-green-600 flex items-center justify-center text-[0.65rem]">✓</span>
          Auto-routed based on project settings.
        </p>
      </div>

      {/* Review meta */}
      <div className="grid grid-cols-2 gap-2.5 max-sm:grid-cols-1">
        <div className="p-3.5 bg-background border rounded-xl">
          <p className="text-[0.62rem] font-bold text-muted-foreground uppercase tracking-[1.2px] mb-1.5">Work Start</p>
          <p className="text-[0.92rem] font-semibold text-foreground">After GC approval</p>
          <p className="text-[0.7rem] text-muted-foreground mt-0.5">Estimated 2 days from submit</p>
        </div>
        <div className="p-3.5 bg-background border rounded-xl">
          <p className="text-[0.62rem] font-bold text-muted-foreground uppercase tracking-[1.2px] mb-1.5">Pricing</p>
          <p className="text-[0.92rem] font-semibold text-foreground">After creation</p>
          <p className="text-[0.7rem] text-muted-foreground mt-0.5">TC/FC will add pricing on the detail page</p>
        </div>
      </div>

      {/* Link to RFI (optional) */}
      {openRFIs.length > 0 && (
        <div className="mt-4 p-3.5 bg-background border rounded-xl">
          <div className="flex items-center gap-2 mb-2">
            <MessageSquareMore className="h-4 w-4 text-muted-foreground" />
            <p className="text-[0.62rem] font-bold text-muted-foreground uppercase tracking-[1.2px]">Link to RFI (optional)</p>
          </div>
          <Select
            value={state.linkedRfiId ?? 'none'}
            onValueChange={v => dispatch({ type: 'SET_LINKED_RFI', rfiId: v === 'none' ? null : v })}
          >
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder="No linked RFI" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No linked RFI</SelectItem>
              {openRFIs.map(rfi => (
                <SelectItem key={rfi.id} value={rfi.id}>
                  {rfi.rfi_number} — {rfi.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-[0.65rem] text-muted-foreground mt-1.5">
            Linking blocks this CO until the RFI is answered.
          </p>
        </div>
      )}
    </div>
  );
}
