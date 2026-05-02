import { useState } from 'react';
import { cn } from '@/lib/utils';
import type { PickerState, PickerAction, MaterialDraft, EquipmentDraft } from './types';

interface StepMaterialsEquipmentProps {
  state: PickerState;
  dispatch: React.Dispatch<PickerAction>;
}

function fmt(n: number) { return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

export function StepMaterialsEquipment({ state, dispatch }: StepMaterialsEquipmentProps) {
  const cur = state.items[state.currentItemIndex];
  const [tab, setTab] = useState<'mat' | 'eq'>('mat');

  return (
    <div>
      <div className="flex items-start justify-between gap-3.5 mb-3.5">
        <div>
          <p className="text-[0.6rem] font-bold text-amber-700 uppercase tracking-[1.5px] mb-1">Step 7 of 9 · Materials & Equipment</p>
          <h2 className="font-heading text-[1.6rem] font-black text-foreground leading-tight tracking-tight">
            What do we need to buy or rent?
          </h2>
          <p className="text-[0.78rem] text-muted-foreground mt-1 max-w-xl leading-relaxed">
            Stage materials and equipment now. POs to suppliers can be sent later from the CO overview.
          </p>
        </div>
        <span className="text-[0.65rem] font-bold px-2.5 py-1 rounded-full bg-background border text-muted-foreground whitespace-nowrap shrink-0">
          Optional · stages for PO
        </span>
      </div>

      <div className="bg-background border rounded-xl overflow-hidden shadow-xs">
        {/* Tabs */}
        <div className="flex border-b px-3.5">
          <button
            type="button"
            onClick={() => setTab('mat')}
            className={cn(
              'px-4 py-2.5 text-[0.78rem] font-bold border-b-[2.5px] -mb-px flex items-center gap-1.5 transition-all',
              tab === 'mat' ? 'text-[hsl(var(--navy))] border-amber-500' : 'text-muted-foreground border-transparent',
            )}
          >
            📦 Materials
            <span className={cn(
              'text-[0.62rem] font-extrabold px-1.5 py-px rounded-lg',
              tab === 'mat' ? 'bg-amber-500 text-white' : 'bg-amber-50 text-amber-700',
            )}>
              {cur.materials.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setTab('eq')}
            className={cn(
              'px-4 py-2.5 text-[0.78rem] font-bold border-b-[2.5px] -mb-px flex items-center gap-1.5 transition-all',
              tab === 'eq' ? 'text-[hsl(var(--navy))] border-amber-500' : 'text-muted-foreground border-transparent',
            )}
          >
            🔧 Equipment
            <span className={cn(
              'text-[0.62rem] font-extrabold px-1.5 py-px rounded-lg',
              tab === 'eq' ? 'bg-amber-500 text-white' : 'bg-amber-50 text-amber-700',
            )}>
              {cur.equipment.length}
            </span>
          </button>
        </div>

        {/* Responsibility toggle */}
        <div className="flex items-center gap-2.5 px-3.5 py-2.5 bg-amber-50 border-b">
          <span className="text-[0.7rem] font-bold text-amber-700 uppercase tracking-[0.8px]">
            {tab === 'mat' ? 'Materials' : 'Equipment'} by:
          </span>
          <div className="flex gap-0.5 bg-background border rounded-lg p-0.5 ml-auto">
            {(['TC', 'GC'] as const).map(r => {
              const field = tab === 'mat' ? 'materialResponsible' : 'equipmentResponsible';
              const active = cur[field] === r;
              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => dispatch({ type: tab === 'mat' ? 'SET_MATERIAL_RESPONSIBLE' : 'SET_EQUIPMENT_RESPONSIBLE', value: r })}
                  className={cn(
                    'px-3.5 py-1.5 rounded-md text-[0.7rem] font-bold transition-all',
                    active && r === 'TC' && 'bg-green-600 text-white',
                    active && r === 'GC' && 'bg-blue-600 text-white',
                    !active && 'text-muted-foreground',
                  )}
                >
                  {r}
                </button>
              );
            })}
          </div>
        </div>

        {/* List */}
        <div className="p-3.5">
          {tab === 'mat' && cur.materials.length === 0 && (
            <div className="text-center py-6 text-muted-foreground text-[0.78rem] border-2 border-dashed rounded-lg">
              No materials added yet. Use the buttons below to add from catalog or enter custom items.
            </div>
          )}
          {tab === 'mat' && cur.materials.map(m => (
            <div key={m.tempId} className="flex items-center gap-2.5 p-2.5 bg-background border rounded-lg mb-1.5">
              <span className="w-[30px] h-[30px] rounded-md bg-amber-50 text-amber-700 flex items-center justify-center text-[0.85rem] shrink-0">{m.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-[0.78rem] font-semibold text-foreground">{m.description}</p>
                <p className="text-[0.62rem] text-muted-foreground font-mono">{m.sku} · {m.supplier}</p>
              </div>
              <span className="font-mono text-[0.72rem] font-semibold text-foreground/80 shrink-0">{m.quantity} {m.unit}</span>
              <span className="font-mono text-[0.78rem] font-bold text-foreground shrink-0 min-w-[70px] text-right">{fmt(m.unitCost * m.quantity)}</span>
              <button
                type="button"
                onClick={() => dispatch({ type: 'REMOVE_MATERIAL', tempId: m.tempId })}
                className="w-6 h-6 rounded-md flex items-center justify-center text-muted-foreground hover:bg-red-50 hover:text-red-600 transition-all shrink-0"
              >
                ×
              </button>
            </div>
          ))}
          {tab === 'eq' && cur.equipment.length === 0 && (
            <div className="text-center py-6 text-muted-foreground text-[0.78rem] border-2 border-dashed rounded-lg">
              No equipment added yet.
            </div>
          )}
          {tab === 'eq' && cur.equipment.map(e => (
            <div key={e.tempId} className="flex items-center gap-2.5 p-2.5 bg-background border rounded-lg mb-1.5">
              <span className="w-[30px] h-[30px] rounded-md bg-purple-50 text-purple-700 flex items-center justify-center text-[0.85rem] shrink-0">{e.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-[0.78rem] font-semibold text-foreground">{e.description}</p>
                <p className="text-[0.62rem] text-muted-foreground">{e.supplier} · {e.durationNote}</p>
              </div>
              <span className="font-mono text-[0.78rem] font-bold text-foreground shrink-0">{fmt(e.cost)}</span>
              <button
                type="button"
                onClick={() => dispatch({ type: 'REMOVE_EQUIPMENT', tempId: e.tempId })}
                className="w-6 h-6 rounded-md flex items-center justify-center text-muted-foreground hover:bg-red-50 hover:text-red-600 transition-all shrink-0"
              >
                ×
              </button>
            </div>
          ))}
        </div>

        {/* Staged for PO badge */}
        {((tab === 'mat' && cur.materials.length > 0) || (tab === 'eq' && cur.equipment.length > 0)) && (
          <div className="flex items-center gap-2 mx-3.5 mb-3 p-2.5 bg-blue-50 border border-blue-200 border-l-[3px] border-l-blue-600 rounded-lg text-[0.72rem] text-foreground/80">
            <span className="text-base">{tab === 'mat' ? '📦' : '🔧'}</span>
            <div className="flex-1">
              <span className="font-bold text-blue-700">Staged for PO</span> — These will appear on the CO overview where you can send to suppliers.
            </div>
          </div>
        )}

        {/* Add buttons */}
        <div className="flex gap-1.5 px-3.5 py-2.5 border-t border-dashed">
          <button type="button" className="flex-1 flex items-center justify-center gap-1.5 px-2.5 py-2 bg-muted border rounded-lg text-[0.74rem] font-semibold text-foreground/80 hover:bg-amber-50 hover:border-amber-300 hover:text-amber-700 transition-all">
            ＋ From Catalog
          </button>
          <button type="button" className="flex-1 flex items-center justify-center gap-1.5 px-2.5 py-2 bg-muted border rounded-lg text-[0.74rem] font-semibold text-foreground/80 hover:bg-amber-50 hover:border-amber-300 hover:text-amber-700 transition-all">
            ✎ Custom Item
          </button>
        </div>
      </div>
    </div>
  );
}
