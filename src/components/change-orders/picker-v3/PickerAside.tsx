import { cn } from '@/lib/utils';
import { Plus, MapPin, Wrench, FileText, CheckCircle2, Circle, Users, ArrowRight } from 'lucide-react';
import type { PickerState } from './types';
import { locationShort } from './types';

interface PickerAsideProps {
  state: PickerState;
  onSwitchItem: (index: number) => void;
  onAddItem: () => void;
  onBack: () => void;
  onNext: () => void;
  onSubmit: () => void;
  canGoBack: boolean;
}

export function PickerAside({
  state, onSwitchItem, onAddItem, onBack, onNext, onSubmit, canGoBack,
}: PickerAsideProps) {
  const isReview = state.step === 4;
  const isRoutingStep = state.step >= 3;
  const cur = state.items[state.currentItemIndex];

  return (
    <aside className="bg-background border-l flex flex-col sticky top-0 h-screen overflow-hidden">
      {/* Header */}
      <div className="px-[18px] py-3.5 border-b bg-muted/30">
        <p className="text-[0.58rem] font-bold text-muted-foreground uppercase tracking-[1.5px] mb-0.5">
          {cur.docType === 'CO' ? 'CO' : 'WO'}-DRAFT
        </p>
        <p className="font-heading text-[1.15rem] font-extrabold text-foreground leading-tight">
          Items in this {cur.docType === 'CO' ? 'CO' : 'WO'}
        </p>
      </div>

      {/* Scrollable items list */}
      <div className="flex-1 overflow-y-auto p-3.5">
        <div className="flex flex-col gap-1.5 mb-3">
          {state.items.map((item, i) => {
            const isActive = i === state.currentItemIndex && !isReview;
            const loc = locationShort(item);
            const configured = item.causeId && item.workTypes.size > 0;

            // Build descriptive work type names
            const workNames = [...item.workTypes]
              .map(k => item.workNames[k])
              .filter(Boolean);
            const workSummary = workNames.length > 0
              ? workNames.length <= 3
                ? workNames.join(', ')
                : workNames.slice(0, 2).join(', ') + ` +${workNames.length - 2} more`
              : 'No work types selected';

            return (
              <button
                key={i}
                type="button"
                onClick={() => onSwitchItem(i)}
                className={cn(
                  'p-2.5 rounded-lg text-left border transition-all relative',
                  isActive
                    ? 'bg-amber-50 border-amber-400 shadow-[0_0_0_2px_rgba(245,166,35,0.15)]'
                    : 'bg-background border-border hover:border-amber-300',
                )}
              >
                <span className="absolute top-2 right-2 text-[0.55rem] font-extrabold text-muted-foreground font-mono">
                  #{i + 1}
                </span>
                <p className="text-[0.65rem] text-muted-foreground font-medium">
                  📍 {loc}{item.systemName ? ` · ${item.systemName}` : ''}
                </p>
                <p className="text-[0.7rem] text-foreground font-semibold mt-0.5">
                  {item.causeName ?? 'Not configured'}
                </p>
                <p className="text-[0.6rem] text-muted-foreground mt-0.5 leading-snug line-clamp-2">
                  {workSummary}
                </p>
                {/* Show doc type + billable badge */}
                {configured && (
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <span className={cn(
                      'text-[0.5rem] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-[0.5px]',
                      item.docType === 'CO' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700',
                    )}>
                      {item.docType}
                    </span>
                    <span className={cn(
                      'text-[0.5rem] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-[0.5px]',
                      item.billable === 'yes' ? 'bg-green-100 text-green-700'
                        : item.billable === 'maybe' ? 'bg-amber-100 text-amber-700'
                        : 'bg-muted text-muted-foreground',
                    )}>
                      {item.billable === 'yes' ? 'Billable' : item.billable === 'maybe' ? 'Maybe' : 'Non-billable'}
                    </span>
                    {item.pricingName && isRoutingStep && (
                      <span className="text-[0.5rem] font-bold px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground uppercase tracking-[0.5px]">
                        {item.pricingName}
                      </span>
                    )}
                  </div>
                )}
                {/* Narrative snippet */}
                {item.narrative && (
                  <p className="text-[0.55rem] text-muted-foreground/70 mt-1 leading-snug line-clamp-2 italic">
                    "{item.narrative.substring(0, 100)}{item.narrative.length > 100 ? '…' : ''}"
                  </p>
                )}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={onAddItem}
          className="flex items-center justify-center gap-1.5 w-full py-2.5 px-3 border-[1.5px] border-dashed border-muted-foreground/30 rounded-lg text-[0.74rem] font-semibold text-muted-foreground hover:bg-amber-50 hover:border-amber-400 hover:text-amber-700 transition-all"
        >
          <Plus className="h-3.5 w-3.5" /> Add another item
        </button>

        {/* Bottom panel: Completeness (steps 1-2) or Routing (steps 3-4) */}
        {!isRoutingStep ? (
          /* ── Scope Completeness Panel ── */
          <div className="bg-[hsl(var(--navy))] rounded-xl p-3.5 text-white mt-3">
            <p className="text-[0.6rem] text-white/50 uppercase tracking-[1.2px] mb-2.5">
              Item Completeness
            </p>
            <div className="space-y-2">
              <CompletenessRow icon={<MapPin className="h-3 w-3" />} label="Location" done={cur.locations.length > 0} detail={cur.locations.length > 0 ? locationShort(cur) : undefined} />
              <CompletenessRow icon={<FileText className="h-3 w-3" />} label="Cause" done={!!cur.causeId} detail={cur.causeName ?? undefined} />
              <CompletenessRow icon={<Wrench className="h-3 w-3" />} label="System" done={!!cur.system} detail={cur.systemName ?? undefined} />
              <CompletenessRow icon={<Wrench className="h-3 w-3" />} label="Work Types" done={cur.workTypes.size > 0} detail={cur.workTypes.size > 0 ? `${cur.workTypes.size} selected` : undefined} />
              <CompletenessRow icon={<FileText className="h-3 w-3" />} label="Narrative" done={!!cur.narrative} />
            </div>
            <p className="text-[0.6rem] text-white/40 mt-2.5 pt-2.5 border-t border-white/10">
              {state.items.length} item{state.items.length !== 1 ? 's' : ''} in draft
            </p>
          </div>
        ) : (
          /* ── Routing Summary Panel ── */
          <div className="bg-[hsl(var(--navy))] rounded-xl p-3.5 text-white mt-3">
            <p className="text-[0.6rem] text-white/50 uppercase tracking-[1.2px] mb-2.5">
              Routing Summary
            </p>
            <div className="space-y-2">
              <div className="flex justify-between text-[0.7rem]">
                <span className="text-white/70">Pricing Model</span>
                <span className="font-semibold text-white">{cur.pricingName}</span>
              </div>
              {state.collaboration.assignedTcOrgId && (
                <div className="flex justify-between text-[0.7rem]">
                  <span className="text-white/70">Assigned TC</span>
                  <span className="font-semibold text-amber-400">✓ Assigned</span>
                </div>
              )}
              <div className="flex justify-between text-[0.7rem]">
                <span className="text-white/70">FC Input</span>
                <span className="font-semibold text-white">
                  {state.collaboration.requestFcInput ? '✓ Requested' : 'Not requested'}
                </span>
              </div>
              <div className="border-t border-white/10 pt-2 mt-1 space-y-1.5">
                <div className="flex justify-between text-[0.7rem]">
                  <span className="text-white/70">Materials</span>
                  <span className="font-semibold text-white">
                    {cur.materialsNeeded ? `Needed · ${cur.materialResponsible}` : 'None'}
                  </span>
                </div>
                <div className="flex justify-between text-[0.7rem]">
                  <span className="text-white/70">Equipment</span>
                  <span className="font-semibold text-white">
                    {cur.equipmentNeeded ? `Needed · ${cur.equipmentResponsible}` : 'None'}
                  </span>
                </div>
              </div>
            </div>
            <p className="text-[0.6rem] text-white/40 mt-2.5 pt-2.5 border-t border-white/10">
              {state.items.length} item{state.items.length !== 1 ? 's' : ''} · {cur.pricingName}
            </p>
          </div>
        )}
      </div>

      {/* Footer nav */}
      <div className="p-3.5 border-t bg-background flex gap-2">
        <button
          type="button"
          onClick={onBack}
          disabled={!canGoBack}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-[0.72rem] font-semibold bg-muted border border-border text-muted-foreground hover:bg-amber-50 hover:border-amber-300 hover:text-amber-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          ← Back
        </button>
        {isReview ? (
          <button
            type="button"
            onClick={onSubmit}
            className="flex-[2] flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-[0.84rem] font-bold bg-green-600 text-white hover:bg-green-700 shadow-sm transition-all"
          >
            ✓ Submit {cur.docType}
          </button>
        ) : (
          <button
            type="button"
            onClick={onNext}
            className="flex-[2] flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-[0.84rem] font-bold bg-amber-500 text-white hover:bg-amber-600 shadow-sm transition-all"
          >
            Next →
          </button>
        )}
      </div>
    </aside>
  );
}

function CompletenessRow({ icon, label, done, detail }: { icon: React.ReactNode; label: string; done: boolean; detail?: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className={cn('shrink-0', done ? 'text-green-400' : 'text-white/30')}>
        {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Circle className="h-3.5 w-3.5" />}
      </span>
      <span className={cn('text-[0.7rem] flex-1', done ? 'text-white' : 'text-white/50')}>{label}</span>
      {detail && <span className="text-[0.6rem] text-white/50 truncate max-w-[120px]">{detail}</span>}
    </div>
  );
}
