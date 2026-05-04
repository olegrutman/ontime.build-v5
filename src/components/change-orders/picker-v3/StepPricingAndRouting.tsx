import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import { Plus, X, Search, Package, FileText, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { useRoleLabelsContext } from '@/contexts/RoleLabelsContext';
import { useProjectFCOrgs } from '@/hooks/useProjectFCOrgs';
import { RoutingChain } from './RoutingChain';
import type { PickerState, PickerAction, MaterialDraft, EquipmentDraft } from './types';
import { itemLaborTotal, itemMaterialTotal, itemEquipmentTotal } from './types';
import type { COPricingType } from '@/types/changeOrder';
import type { CatalogSearchResult } from '@/types/supplier';

interface StepPricingAndRoutingProps {
  state: PickerState;
  dispatch: React.Dispatch<PickerAction>;
  projectId: string;
  onAddItem: () => void;
  onGoReview: () => void;
}

function fmt(n: number) { return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

const PRICING_OPTIONS: { type: COPricingType; tag: string; name: string; desc: string; isDefault?: boolean }[] = [
  { type: 'fixed', tag: 'Recommended', name: 'Fixed Price', desc: 'One number, signed off upfront.', isDefault: true },
  { type: 'tm', tag: 'Track Actuals', name: 'Time & Materials', desc: 'Bill hourly rates + materials.' },
  { type: 'nte', tag: 'With Ceiling', name: 'Not To Exceed', desc: 'T&M up to a ceiling number.' },
];

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[0.6rem] font-bold text-muted-foreground uppercase tracking-[1.4px] mb-2.5 mt-6 flex items-center gap-2 after:content-[''] after:flex-1 after:h-px after:bg-border">
      {children}
    </p>
  );
}

function blankMaterial(): Omit<MaterialDraft, 'tempId'> {
  return { description: '', sku: '', supplier: '', quantity: 1, unit: 'EA', unitCost: 0, icon: '📦' };
}

function blankEquipment(): Omit<EquipmentDraft, 'tempId'> {
  return { description: '', supplier: '', durationNote: '', cost: 0, icon: '🔧' };
}

export function StepPricingAndRouting({ state, dispatch, projectId, onAddItem, onGoReview }: StepPricingAndRoutingProps) {
  const cur = state.items[state.currentItemIndex];
  const rl = useRoleLabelsContext();
  const { data: fcOrgs = [] } = useProjectFCOrgs(projectId);
  const collab = state.collaboration;

  // TC orgs
  const { data: tcOrgs = [] } = useQuery({
    queryKey: ['project-tc-orgs', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data } = await supabase
        .from('project_participants')
        .select('organization_id, organization:organizations!project_participants_organization_id_fkey(id, name, type)')
        .eq('project_id', projectId)
        .eq('invite_status', 'ACCEPTED');
      const unique = new Map<string, { id: string; name: string; initials: string }>();
      for (const row of data ?? []) {
        const org = row.organization as { id: string; name: string; type: string } | null;
        if (!org || org.type !== 'TC') continue;
        unique.set(row.organization_id, {
          id: row.organization_id,
          name: org.name,
          initials: org.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase(),
        });
      }
      return Array.from(unique.values());
    },
    staleTime: 60_000,
  });

  const selectedTc = tcOrgs.find(o => o.id === collab.assignedTcOrgId);
  const selectedFc = fcOrgs.find(o => o.id === collab.assignedFcOrgId);

  // Materials state
  const [matTab, setMatTab] = useState<'mat' | 'eq'>('mat');
  const [showMatForm, setShowMatForm] = useState(false);
  const [showEqForm, setShowEqForm] = useState(false);
  const [matDraft, setMatDraft] = useState(blankMaterial());
  const [eqDraft, setEqDraft] = useState(blankEquipment());

  const handleAddMaterial = () => {
    if (!matDraft.description.trim()) return;
    dispatch({ type: 'ADD_MATERIAL', material: { ...matDraft, tempId: crypto.randomUUID() } });
    setMatDraft(blankMaterial());
    setShowMatForm(false);
  };

  const handleAddEquipment = () => {
    if (!eqDraft.description.trim()) return;
    dispatch({ type: 'ADD_EQUIPMENT', equipment: { ...eqDraft, tempId: crypto.randomUUID() } });
    setEqDraft(blankEquipment());
    setShowEqForm(false);
  };

  // Totals
  const labor = itemLaborTotal(cur);
  const mat = itemMaterialTotal(cur);
  const equip = itemEquipmentTotal(cur);
  const base = labor + mat + equip;
  const mult = cur.multiLocation && cur.locations.length > 1 ? cur.locations.length : 1;
  const sub = base * mult;
  const markup = sub * (cur.markup / 100);
  const total = sub + markup;

  return (
    <div>
      <div className="mb-3.5">
        <p className="text-[0.6rem] font-bold text-amber-700 uppercase tracking-[1.5px] mb-1">Step 3 of 4 · Pricing & Routing</p>
        <h2 className="font-heading text-[1.6rem] font-black text-foreground leading-tight tracking-tight">
          How to price, who's involved, and what's needed?
        </h2>
        <p className="text-[0.78rem] text-muted-foreground mt-1 max-w-xl leading-relaxed">
          Set pricing model, assign teams, add materials/equipment, and confirm the total.
        </p>
      </div>

      {/* ── PRICING MODEL ──────────────────────────────────────── */}
      <SectionLabel>Pricing Model</SectionLabel>

      <div className="grid grid-cols-3 gap-2.5 max-sm:grid-cols-1">
        {PRICING_OPTIONS.map(opt => {
          const selected = cur.pricingType === opt.type;
          return (
            <button
              key={opt.type}
              type="button"
              onClick={() => dispatch({ type: 'SET_PRICING', pricingType: opt.type, pricingName: opt.name })}
              className={cn(
                'p-3.5 rounded-xl border-[1.5px] text-left transition-all relative',
                selected
                  ? 'bg-amber-50 border-amber-400 shadow-[0_0_0_3px_rgba(245,166,35,0.18)]'
                  : 'bg-background border-border hover:border-amber-300 hover:bg-amber-50',
              )}
            >
              {selected && (
                <span className="absolute top-2.5 right-2.5 w-[20px] h-[20px] rounded-full bg-amber-500 text-white flex items-center justify-center font-bold text-[0.75rem]">✓</span>
              )}
              <p className="text-[0.6rem] font-bold uppercase tracking-[0.5px] text-amber-700 mb-0.5">{opt.tag}</p>
              <p className="font-heading text-[1rem] font-extrabold text-foreground tracking-tight mb-0.5">{opt.name}</p>
              <p className="text-[0.68rem] text-muted-foreground leading-snug">{opt.desc}</p>
            </button>
          );
        })}
      </div>

      {/* ── COLLABORATION / ROUTING ────────────────────────────── */}
      <SectionLabel>Collaboration & Routing</SectionLabel>

      {/* GC: assign TC */}
      {state.role === 'GC' && (
        <div className="bg-background border rounded-xl overflow-hidden mb-3 shadow-xs">
          <div className="px-3.5 py-2.5 border-b flex items-center justify-between">
            <p className="text-[0.82rem] font-bold text-foreground/80">⊡ Assign To {rl.TC}</p>
            <span className="text-[0.6rem] font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">Required</span>
          </div>
          <div className="p-3 space-y-1.5">
            {tcOrgs.map(tc => (
              <button
                key={tc.id}
                type="button"
                onClick={() => dispatch({ type: 'SET_ASSIGNED_TC', orgId: tc.id })}
                className={cn(
                  'flex items-center gap-2.5 w-full p-2.5 rounded-lg border-[1.5px] text-left transition-all',
                  collab.assignedTcOrgId === tc.id
                    ? 'bg-amber-50 border-amber-400'
                    : 'bg-background border-border hover:border-amber-300',
                )}
              >
                <span className="w-[30px] h-[30px] rounded-full bg-green-600 text-white flex items-center justify-center text-[0.7rem] font-bold shrink-0">{tc.initials}</span>
                <p className="text-[0.82rem] font-bold text-foreground flex-1">{tc.name}</p>
                <div className={cn('w-4 h-4 rounded-full border-2 shrink-0', collab.assignedTcOrgId === tc.id ? 'border-amber-500 bg-amber-500' : 'border-muted-foreground/40')} />
              </button>
            ))}
            {tcOrgs.length === 0 && <p className="text-[0.78rem] text-muted-foreground text-center py-4">No trade contractors on this project.</p>}
          </div>
        </div>
      )}

      {/* TC/GC: FC input toggle */}
      {(state.role === 'GC' || state.role === 'TC') && (
        <div className="bg-background border rounded-xl overflow-hidden mb-3 shadow-xs">
          <div className="p-3">
            <div className="flex items-center gap-3 p-2.5 bg-muted/50 border rounded-lg">
              <Switch
                checked={collab.requestFcInput}
                onCheckedChange={v => {
                  dispatch({ type: 'SET_REQUEST_FC', value: v });
                  if (v && fcOrgs.length > 0 && !collab.assignedFcOrgId) {
                    dispatch({ type: 'SET_ASSIGNED_FC', orgId: fcOrgs[0].id });
                  }
                }}
              />
              <div>
                <p className="text-[0.82rem] font-bold text-foreground">Request {rl.FC} hours</p>
                <p className="text-[0.68rem] text-muted-foreground">FC will log hours before pricing.</p>
              </div>
            </div>
            {collab.requestFcInput && fcOrgs.length > 0 && (
              <div className="space-y-1.5 mt-2 animate-fade-in">
                {fcOrgs.map(fc => (
                  <button
                    key={fc.id}
                    type="button"
                    onClick={() => dispatch({ type: 'SET_ASSIGNED_FC', orgId: fc.id })}
                    className={cn(
                      'flex items-center gap-2.5 w-full p-2.5 rounded-lg border-[1.5px] text-left transition-all',
                      collab.assignedFcOrgId === fc.id ? 'bg-amber-50 border-amber-400' : 'bg-background border-border hover:border-amber-300',
                    )}
                  >
                    <span className="w-[30px] h-[30px] rounded-full bg-amber-500 text-white flex items-center justify-center text-[0.7rem] font-bold shrink-0">
                      {fc.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                    </span>
                    <p className="text-[0.82rem] font-bold text-foreground flex-1">{fc.name}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* FC: auto-routing info */}
      {state.role === 'FC' && (
        <div className="bg-background border rounded-xl p-3.5 mb-3 shadow-xs">
          <div className="flex items-center gap-2.5 p-2.5 rounded-lg border bg-amber-50 border-amber-400">
            <span className="w-[30px] h-[30px] rounded-full bg-green-600 text-white flex items-center justify-center text-[0.7rem] font-bold">TC</span>
            <div className="flex-1">
              <p className="text-[0.82rem] font-bold text-foreground">{rl.TC}</p>
              <p className="text-[0.62rem] text-muted-foreground">Will price your hours</p>
            </div>
          </div>
        </div>
      )}

      <RoutingChain
        role={state.role}
        tcName={selectedTc?.name}
        tcInitials={selectedTc?.initials}
        fcName={selectedFc?.name}
        fcInitials={selectedFc?.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
        requestFc={collab.requestFcInput}
      />

      {/* ── MATERIALS & EQUIPMENT ──────────────────────────────── */}
      <SectionLabel>Materials & Equipment (Optional)</SectionLabel>

      <div className="bg-background border rounded-xl overflow-hidden shadow-xs mb-4">
        {/* Tabs */}
        <div className="flex border-b px-3">
          <button type="button" onClick={() => setMatTab('mat')} className={cn('px-3.5 py-2 text-[0.75rem] font-bold border-b-[2px] -mb-px flex items-center gap-1.5', matTab === 'mat' ? 'text-foreground border-amber-500' : 'text-muted-foreground border-transparent')}>
            📦 Materials <span className={cn('text-[0.6rem] font-extrabold px-1.5 py-px rounded-lg', matTab === 'mat' ? 'bg-amber-500 text-white' : 'bg-muted text-muted-foreground')}>{cur.materials.length}</span>
          </button>
          <button type="button" onClick={() => setMatTab('eq')} className={cn('px-3.5 py-2 text-[0.75rem] font-bold border-b-[2px] -mb-px flex items-center gap-1.5', matTab === 'eq' ? 'text-foreground border-amber-500' : 'text-muted-foreground border-transparent')}>
            🔧 Equipment <span className={cn('text-[0.6rem] font-extrabold px-1.5 py-px rounded-lg', matTab === 'eq' ? 'bg-amber-500 text-white' : 'bg-muted text-muted-foreground')}>{cur.equipment.length}</span>
          </button>
        </div>

        {/* Responsibility toggle */}
        <div className="flex items-center gap-2.5 px-3 py-2 bg-amber-50 border-b">
          <span className="text-[0.68rem] font-bold text-amber-700 uppercase tracking-[0.8px]">{matTab === 'mat' ? 'Materials' : 'Equipment'} by:</span>
          <div className="flex gap-0.5 bg-background border rounded-lg p-0.5 ml-auto">
            {(['TC', 'GC'] as const).map(r => {
              const field = matTab === 'mat' ? 'materialResponsible' : 'equipmentResponsible';
              const active = cur[field] === r;
              return (
                <button key={r} type="button"
                  onClick={() => dispatch({ type: matTab === 'mat' ? 'SET_MATERIAL_RESPONSIBLE' : 'SET_EQUIPMENT_RESPONSIBLE', value: r })}
                  className={cn('px-3 py-1 rounded-md text-[0.68rem] font-bold transition-all', active && r === 'TC' && 'bg-green-600 text-white', active && r === 'GC' && 'bg-blue-600 text-white', !active && 'text-muted-foreground')}
                >{r}</button>
              );
            })}
          </div>
        </div>

        {/* Items list */}
        <div className="p-3">
          {matTab === 'mat' && cur.materials.length === 0 && !showMatForm && (
            <div className="text-center py-4 text-muted-foreground text-[0.75rem] border-2 border-dashed rounded-lg">No materials added yet.</div>
          )}
          {matTab === 'mat' && cur.materials.map(m => (
            <div key={m.tempId} className="flex items-center gap-2 p-2 bg-background border rounded-lg mb-1.5">
              <span className="text-sm">{m.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-[0.75rem] font-semibold text-foreground truncate">{m.description}</p>
                <p className="text-[0.6rem] text-muted-foreground font-mono">{m.quantity} {m.unit} × {fmt(m.unitCost)}</p>
              </div>
              <span className="font-mono text-[0.75rem] font-bold shrink-0">{fmt(m.unitCost * m.quantity)}</span>
              <button type="button" onClick={() => dispatch({ type: 'REMOVE_MATERIAL', tempId: m.tempId })} className="w-5 h-5 rounded flex items-center justify-center text-muted-foreground hover:text-red-600"><X className="h-3 w-3" /></button>
            </div>
          ))}

          {matTab === 'eq' && cur.equipment.length === 0 && !showEqForm && (
            <div className="text-center py-4 text-muted-foreground text-[0.75rem] border-2 border-dashed rounded-lg">No equipment added yet.</div>
          )}
          {matTab === 'eq' && cur.equipment.map(e => (
            <div key={e.tempId} className="flex items-center gap-2 p-2 bg-background border rounded-lg mb-1.5">
              <span className="text-sm">{e.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-[0.75rem] font-semibold text-foreground">{e.description}</p>
                <p className="text-[0.6rem] text-muted-foreground">{e.durationNote}</p>
              </div>
              <span className="font-mono text-[0.75rem] font-bold shrink-0">{fmt(e.cost)}</span>
              <button type="button" onClick={() => dispatch({ type: 'REMOVE_EQUIPMENT', tempId: e.tempId })} className="w-5 h-5 rounded flex items-center justify-center text-muted-foreground hover:text-red-600"><X className="h-3 w-3" /></button>
            </div>
          ))}

          {/* Quick add forms */}
          {matTab === 'mat' && showMatForm && (
            <div className="border-2 border-amber-300 rounded-xl p-3 bg-amber-50/30 mt-2 space-y-2 animate-fade-in">
              <input placeholder="Description" value={matDraft.description} onChange={e => setMatDraft(d => ({ ...d, description: e.target.value }))} className="w-full px-2.5 py-1.5 rounded-lg border bg-background text-[0.78rem]" />
              <div className="grid grid-cols-3 gap-2">
                <input type="number" placeholder="Qty" value={matDraft.quantity || ''} onChange={e => setMatDraft(d => ({ ...d, quantity: Number(e.target.value) || 0 }))} className="px-2.5 py-1.5 rounded-lg border bg-background text-[0.78rem]" />
                <input placeholder="Unit" value={matDraft.unit} onChange={e => setMatDraft(d => ({ ...d, unit: e.target.value }))} className="px-2.5 py-1.5 rounded-lg border bg-background text-[0.78rem]" />
                <input type="number" placeholder="Unit cost" value={matDraft.unitCost || ''} onChange={e => setMatDraft(d => ({ ...d, unitCost: Number(e.target.value) || 0 }))} className="px-2.5 py-1.5 rounded-lg border bg-background text-[0.78rem]" />
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={handleAddMaterial} className="px-3.5 py-1.5 rounded-lg bg-amber-500 text-white text-[0.72rem] font-bold">Add</button>
                <button type="button" onClick={() => { setShowMatForm(false); setMatDraft(blankMaterial()); }} className="px-3.5 py-1.5 rounded-lg bg-muted text-[0.72rem] font-bold text-muted-foreground">Cancel</button>
              </div>
            </div>
          )}

          {matTab === 'eq' && showEqForm && (
            <div className="border-2 border-amber-300 rounded-xl p-3 bg-amber-50/30 mt-2 space-y-2 animate-fade-in">
              <input placeholder="Description" value={eqDraft.description} onChange={e => setEqDraft(d => ({ ...d, description: e.target.value }))} className="w-full px-2.5 py-1.5 rounded-lg border bg-background text-[0.78rem]" />
              <div className="grid grid-cols-2 gap-2">
                <input placeholder="Duration note" value={eqDraft.durationNote} onChange={e => setEqDraft(d => ({ ...d, durationNote: e.target.value }))} className="px-2.5 py-1.5 rounded-lg border bg-background text-[0.78rem]" />
                <input type="number" placeholder="Cost" value={eqDraft.cost || ''} onChange={e => setEqDraft(d => ({ ...d, cost: Number(e.target.value) || 0 }))} className="px-2.5 py-1.5 rounded-lg border bg-background text-[0.78rem]" />
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={handleAddEquipment} className="px-3.5 py-1.5 rounded-lg bg-amber-500 text-white text-[0.72rem] font-bold">Add</button>
                <button type="button" onClick={() => { setShowEqForm(false); setEqDraft(blankEquipment()); }} className="px-3.5 py-1.5 rounded-lg bg-muted text-[0.72rem] font-bold text-muted-foreground">Cancel</button>
              </div>
            </div>
          )}

          {/* Add buttons */}
          {matTab === 'mat' && !showMatForm && (
            <button type="button" onClick={() => setShowMatForm(true)} className="flex items-center gap-1.5 mt-2 px-3 py-1.5 rounded-lg border border-dashed text-[0.72rem] font-semibold text-muted-foreground hover:border-amber-400 hover:text-foreground transition-all">
              <Plus className="h-3.5 w-3.5" /> Add Material
            </button>
          )}
          {matTab === 'eq' && !showEqForm && (
            <button type="button" onClick={() => setShowEqForm(true)} className="flex items-center gap-1.5 mt-2 px-3 py-1.5 rounded-lg border border-dashed text-[0.72rem] font-semibold text-muted-foreground hover:border-amber-400 hover:text-foreground transition-all">
              <Plus className="h-3.5 w-3.5" /> Add Equipment
            </button>
          )}
        </div>
      </div>

      {/* ── TOTAL ──────────────────────────────────────────────── */}
      <SectionLabel>Item Total</SectionLabel>

      <div className="bg-background border rounded-xl overflow-hidden mb-4 shadow-xs">
        <div className="flex justify-between items-center px-4 py-2.5 border-b">
          <span className="text-[0.78rem] text-foreground/80">Labor</span>
          <span className="font-mono text-[0.82rem] font-semibold">{fmt(labor)}</span>
        </div>
        <div className="flex justify-between items-center px-4 py-2.5 border-b">
          <span className="text-[0.78rem] text-foreground/80">Materials</span>
          <span className="font-mono text-[0.82rem] font-semibold">{fmt(mat)}</span>
        </div>
        <div className="flex justify-between items-center px-4 py-2.5 border-b">
          <span className="text-[0.78rem] text-foreground/80">Equipment</span>
          <span className="font-mono text-[0.82rem] font-semibold">{fmt(equip)}</span>
        </div>
        {mult > 1 && (
          <div className="flex justify-between items-center px-4 py-2.5 border-b">
            <span className="text-[0.78rem] text-foreground/80">× {mult} locations</span>
            <span className="font-mono text-[0.82rem] font-semibold">{fmt(sub)}</span>
          </div>
        )}
        <div className="flex justify-between items-center px-4 py-2.5 border-b bg-muted/30">
          <span className="text-[0.78rem] text-foreground/80">Overhead & Profit</span>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={cur.markup}
              onChange={e => dispatch({ type: 'SET_MARKUP', markup: parseFloat(e.target.value) || 0 })}
              className="font-mono text-[0.82rem] font-semibold bg-background border rounded-md px-2 py-0.5 w-14 text-center"
            />
            <span className="text-[0.75rem] text-muted-foreground">%</span>
            <span className="font-mono text-[0.82rem] font-semibold">{fmt(markup)}</span>
          </div>
        </div>
        <div className="flex justify-between items-center px-4 py-3 bg-[hsl(var(--navy))]">
          <span className="text-[0.68rem] font-bold text-white/60 uppercase tracking-[1px]">Item Total</span>
          <span className="font-heading text-[1.4rem] font-black text-amber-400 tracking-tight">{fmt(total)}</span>
        </div>
      </div>

      {/* Next actions */}
      <div className="grid grid-cols-2 gap-2.5 max-sm:grid-cols-1">
        <button type="button" onClick={onAddItem} className="p-3.5 rounded-xl border-[1.5px] text-left bg-background border-border hover:border-amber-300 hover:bg-amber-50 transition-all">
          <p className="text-[0.6rem] font-bold uppercase tracking-[1px] text-amber-700 mb-1">+ Add Another</p>
          <p className="font-heading text-[1rem] font-extrabold text-foreground tracking-tight">Add Another Item</p>
          <p className="text-[0.68rem] text-muted-foreground mt-0.5">Same CO, new location/scope.</p>
        </button>
        <button type="button" onClick={onGoReview} className="p-3.5 rounded-xl border-[1.5px] text-left bg-amber-500 border-amber-500 hover:bg-amber-400 transition-all">
          <p className="text-[0.6rem] font-bold uppercase tracking-[1px] text-[hsl(var(--navy))] mb-1">→ Continue</p>
          <p className="font-heading text-[1rem] font-extrabold text-[hsl(var(--navy))] tracking-tight">Go to Full Review</p>
          <p className="text-[0.68rem] text-[hsl(var(--navy))]/65 mt-0.5">Roll up all items and submit.</p>
        </button>
      </div>
    </div>
  );
}
