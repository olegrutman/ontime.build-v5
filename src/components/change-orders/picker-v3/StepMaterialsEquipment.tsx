import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Plus, X, Search, Package, FileText, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import type { PickerState, PickerAction, MaterialDraft, EquipmentDraft } from './types';
import type { CatalogSearchResult } from '@/types/supplier';

interface StepMaterialsEquipmentProps {
  state: PickerState;
  dispatch: React.Dispatch<PickerAction>;
  projectId: string;
}

function fmt(n: number) { return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

function blankMaterial(): Omit<MaterialDraft, 'tempId'> {
  return { description: '', sku: '', supplier: '', quantity: 1, unit: 'EA', unitCost: 0, icon: '📦' };
}

function blankEquipment(): Omit<EquipmentDraft, 'tempId'> {
  return { description: '', supplier: '', durationNote: '', cost: 0, icon: '🔧' };
}

type AddMode = 'none' | 'custom' | 'catalog' | 'estimate';

// ── Catalog Search Panel ──────────────────────────────────────────
function CatalogPanel({ onSelect }: { onSelect: (item: CatalogSearchResult) => void }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CatalogSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const search = useCallback(async (q: string) => {
    if (q.length < 2) return;
    setLoading(true);
    setSearched(true);
    const { data } = await supabase.rpc('search_catalog_v2', {
      search_query: q,
      category_filter: null,
      secondary_category_filter: null,
      manufacturer_filter: null,
      max_results: 30,
    });
    setResults((data as CatalogSearchResult[]) ?? []);
    setLoading(false);
  }, []);

  return (
    <div className="space-y-2.5">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
        <input
          autoFocus
          placeholder="Search by SKU, name, dimensions, species..."
          value={query}
          onChange={e => { setQuery(e.target.value); }}
          onKeyDown={e => e.key === 'Enter' && search(query)}
          className="w-full pl-8 pr-3 py-2 rounded-lg border bg-background text-[0.78rem] focus:border-amber-400 focus:outline-none"
        />
        {query && (
          <button type="button" onClick={() => { setQuery(''); setResults([]); setSearched(false); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 rounded-md flex items-center justify-center text-muted-foreground hover:bg-muted">
            <X className="h-3 w-3" />
          </button>
        )}
      </div>
      {loading && <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>}
      {!loading && searched && results.length === 0 && (
        <div className="text-center py-6 text-muted-foreground text-[0.78rem]">No items found. Try different terms.</div>
      )}
      {!loading && results.length > 0 && (
        <div className="max-h-[320px] overflow-y-auto space-y-1 pr-0.5">
          {results.map(item => (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item)}
              className="w-full text-left flex items-start gap-2.5 p-2.5 rounded-lg border bg-background hover:border-amber-400 hover:bg-amber-50/40 transition-all"
            >
              <span className="w-7 h-7 rounded-md bg-amber-50 text-amber-700 flex items-center justify-center text-[0.7rem] font-bold shrink-0 mt-0.5">
                <Package className="h-3.5 w-3.5" />
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-[0.78rem] font-semibold text-foreground truncate">{item.name || item.description}</p>
                <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                  <code className="text-[0.6rem] font-mono bg-muted px-1 py-px rounded">{item.supplier_sku}</code>
                  <span className="text-[0.6rem] text-muted-foreground">{item.category}</span>
                  {item.dimension && <span className="text-[0.6rem] text-muted-foreground">• {item.dimension}</span>}
                  {item.length && <span className="text-[0.6rem] text-muted-foreground">• {item.length}</span>}
                </div>
              </div>
              <span className="text-[0.7rem] font-mono text-muted-foreground shrink-0">{item.uom_default}</span>
            </button>
          ))}
        </div>
      )}
      {!loading && !searched && (
        <div className="text-center py-6 text-muted-foreground text-[0.72rem]">
          <Search className="h-8 w-8 mx-auto mb-2 opacity-30" />
          Type at least 2 characters and press Enter to search
        </div>
      )}
    </div>
  );
}

// ── Estimate Items Panel ──────────────────────────────────────────
function EstimatePanel({ projectId, onSelect }: { projectId: string; onSelect: (item: any) => void }) {
  const { data: items, isLoading } = useQuery({
    queryKey: ['project-estimate-items-for-picker', projectId],
    queryFn: async () => {
      // Get estimates for this project
      const { data: estimates } = await supabase
        .from('supplier_estimates')
        .select('id, name, supplier_org_id')
        .eq('project_id', projectId)
        .in('status', ['APPROVED', 'SUBMITTED']);

      if (!estimates?.length) return [];

      const estIds = estimates.map(e => e.id);
      const { data: estItems } = await supabase
        .from('supplier_estimate_items')
        .select('id, estimate_id, description, supplier_sku, quantity, uom, unit_price, pack_name')
        .in('estimate_id', estIds)
        .order('pack_name');

      // Map estimate names
      const estMap = new Map(estimates.map(e => [e.id, e.name]));
      return (estItems ?? []).map(i => ({
        ...i,
        estimateName: estMap.get(i.estimate_id) ?? 'Estimate',
      }));
    },
    staleTime: 60_000,
  });

  if (isLoading) return <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  if (!items?.length) return (
    <div className="text-center py-6 text-muted-foreground text-[0.72rem]">
      <FileText className="h-8 w-8 mx-auto mb-2 opacity-30" />
      No approved or submitted estimates found for this project.
    </div>
  );

  return (
    <div className="max-h-[360px] overflow-y-auto space-y-1 pr-0.5">
      {items.map(item => (
        <button
          key={item.id}
          type="button"
          onClick={() => onSelect(item)}
          className="w-full text-left flex items-start gap-2.5 p-2.5 rounded-lg border bg-background hover:border-green-400 hover:bg-green-50/40 transition-all"
        >
          <span className="w-7 h-7 rounded-md bg-green-50 text-green-700 flex items-center justify-center text-[0.7rem] font-bold shrink-0 mt-0.5">
            <FileText className="h-3.5 w-3.5" />
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-[0.78rem] font-semibold text-foreground truncate">{item.description}</p>
            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
              {item.supplier_sku && <code className="text-[0.6rem] font-mono bg-muted px-1 py-px rounded">{item.supplier_sku}</code>}
              <span className="text-[0.6rem] text-muted-foreground">{item.estimateName}</span>
              {item.pack_name && <span className="text-[0.6rem] text-green-600">• {item.pack_name}</span>}
            </div>
          </div>
          <div className="text-right shrink-0">
            <span className="text-[0.72rem] font-mono font-semibold text-foreground">{item.quantity} {item.uom}</span>
            {item.unit_price != null && (
              <p className="text-[0.6rem] font-mono text-muted-foreground">{fmt(item.unit_price)}/{item.uom}</p>
            )}
          </div>
        </button>
      ))}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────
export function StepMaterialsEquipment({ state, dispatch, projectId }: StepMaterialsEquipmentProps) {
  const cur = state.items[state.currentItemIndex];
  const [tab, setTab] = useState<'mat' | 'eq'>('mat');
  const [addMode, setAddMode] = useState<AddMode>('none');
  const [showEqForm, setShowEqForm] = useState(false);
  const [matDraft, setMatDraft] = useState(blankMaterial());
  const [eqDraft, setEqDraft] = useState(blankEquipment());

  const handleAddMaterial = () => {
    if (!matDraft.description.trim()) return;
    dispatch({
      type: 'ADD_MATERIAL',
      material: { ...matDraft, tempId: crypto.randomUUID() },
    });
    setMatDraft(blankMaterial());
    setAddMode('none');
  };

  const handleCatalogSelect = (item: CatalogSearchResult) => {
    dispatch({
      type: 'ADD_MATERIAL',
      material: {
        tempId: crypto.randomUUID(),
        description: item.name || item.description,
        sku: item.supplier_sku,
        supplier: '',
        quantity: 1,
        unit: item.uom_default || 'EA',
        unitCost: 0,
        icon: '📦',
      },
    });
    setAddMode('none');
  };

  const handleEstimateSelect = (item: any) => {
    dispatch({
      type: 'ADD_MATERIAL',
      material: {
        tempId: crypto.randomUUID(),
        description: item.description,
        sku: item.supplier_sku ?? '',
        supplier: '',
        quantity: item.quantity ?? 1,
        unit: item.uom ?? 'EA',
        unitCost: item.unit_price ?? 0,
        icon: '📦',
      },
    });
    // Keep estimate panel open so user can pick multiple items
  };

  const handleAddEquipment = () => {
    if (!eqDraft.description.trim()) return;
    dispatch({
      type: 'ADD_EQUIPMENT',
      equipment: { ...eqDraft, tempId: crypto.randomUUID() },
    });
    setEqDraft(blankEquipment());
    setShowEqForm(false);
  };

  return (
    <div>
      <div className="flex items-start justify-between gap-3.5 mb-3.5">
        <div>
          <p className="text-[0.6rem] font-bold text-amber-700 uppercase tracking-[1.5px] mb-1">Step 7 of 9 · Materials & Equipment</p>
          <h2 className="font-heading text-[1.6rem] font-black text-foreground leading-tight tracking-tight">
            What do we need to buy or rent?
          </h2>
          <p className="text-[0.78rem] text-muted-foreground mt-1 max-w-xl leading-relaxed">
            Pick from the catalog, pull from an estimate, or add custom items. After the CO is created, you can send materials to a supplier for pricing.
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

        {/* Material/Equipment List */}
        <div className="p-3.5">
          {tab === 'mat' && cur.materials.length === 0 && addMode === 'none' && (
            <div className="text-center py-6 text-muted-foreground text-[0.78rem] border-2 border-dashed rounded-lg">
              No materials added yet. Use the buttons below to add from catalog, estimate, or manually.
            </div>
          )}
          {tab === 'mat' && cur.materials.map(m => (
            <div key={m.tempId} className="flex items-center gap-2.5 p-2.5 bg-background border rounded-lg mb-1.5">
              <span className="w-[30px] h-[30px] rounded-md bg-amber-50 text-amber-700 flex items-center justify-center text-[0.85rem] shrink-0">{m.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-[0.78rem] font-semibold text-foreground truncate">{m.description}</p>
                <p className="text-[0.62rem] text-muted-foreground font-mono">{m.sku ? `${m.sku} · ` : ''}{m.supplier || 'No supplier'}</p>
              </div>
              <span className="font-mono text-[0.72rem] font-semibold text-foreground/80 shrink-0">{m.quantity} {m.unit}</span>
              <span className="font-mono text-[0.78rem] font-bold text-foreground shrink-0 min-w-[70px] text-right">{fmt(m.unitCost * m.quantity)}</span>
              <button
                type="button"
                onClick={() => dispatch({ type: 'REMOVE_MATERIAL', tempId: m.tempId })}
                className="w-6 h-6 rounded-md flex items-center justify-center text-muted-foreground hover:bg-red-50 hover:text-red-600 transition-all shrink-0"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}

          {tab === 'eq' && cur.equipment.length === 0 && !showEqForm && (
            <div className="text-center py-6 text-muted-foreground text-[0.78rem] border-2 border-dashed rounded-lg">
              No equipment added yet.
            </div>
          )}
          {tab === 'eq' && cur.equipment.map(e => (
            <div key={e.tempId} className="flex items-center gap-2.5 p-2.5 bg-background border rounded-lg mb-1.5">
              <span className="w-[30px] h-[30px] rounded-md bg-purple-50 text-purple-700 flex items-center justify-center text-[0.85rem] shrink-0">{e.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-[0.78rem] font-semibold text-foreground">{e.description}</p>
                <p className="text-[0.62rem] text-muted-foreground">{e.supplier}{e.durationNote ? ` · ${e.durationNote}` : ''}</p>
              </div>
              <span className="font-mono text-[0.78rem] font-bold text-foreground shrink-0">{fmt(e.cost)}</span>
              <button
                type="button"
                onClick={() => dispatch({ type: 'REMOVE_EQUIPMENT', tempId: e.tempId })}
                className="w-6 h-6 rounded-md flex items-center justify-center text-muted-foreground hover:bg-red-50 hover:text-red-600 transition-all shrink-0"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}

          {/* ── Catalog Panel ──────────────────────────────────── */}
          {tab === 'mat' && addMode === 'catalog' && (
            <div className="border-2 border-amber-300 rounded-xl p-3.5 bg-amber-50/30 mt-2 animate-fade-in">
              <div className="flex items-center justify-between mb-2.5">
                <p className="text-[0.65rem] font-bold text-amber-700 uppercase tracking-[1px]">From Catalog</p>
                <button type="button" onClick={() => setAddMode('none')}
                  className="text-[0.7rem] font-semibold text-muted-foreground hover:text-foreground">Close</button>
              </div>
              <CatalogPanel onSelect={handleCatalogSelect} />
            </div>
          )}

          {/* ── Estimate Panel ─────────────────────────────────── */}
          {tab === 'mat' && addMode === 'estimate' && (
            <div className="border-2 border-green-300 rounded-xl p-3.5 bg-green-50/30 mt-2 animate-fade-in">
              <div className="flex items-center justify-between mb-2.5">
                <p className="text-[0.65rem] font-bold text-green-700 uppercase tracking-[1px]">From Estimate</p>
                <button type="button" onClick={() => setAddMode('none')}
                  className="text-[0.7rem] font-semibold text-muted-foreground hover:text-foreground">Close</button>
              </div>
              <EstimatePanel projectId={projectId} onSelect={handleEstimateSelect} />
            </div>
          )}

          {/* ── Custom Material Form ───────────────────────────── */}
          {tab === 'mat' && addMode === 'custom' && (
            <div className="border-2 border-amber-300 rounded-xl p-3.5 bg-amber-50/30 mt-2 animate-fade-in">
              <p className="text-[0.65rem] font-bold text-amber-700 uppercase tracking-[1px] mb-2.5">Custom Material</p>
              <div className="grid grid-cols-[1fr_80px_60px_90px] gap-2 mb-2">
                <input
                  autoFocus
                  placeholder="Description *"
                  value={matDraft.description}
                  onChange={e => setMatDraft(d => ({ ...d, description: e.target.value }))}
                  className="px-2.5 py-2 rounded-lg border bg-background text-[0.78rem] font-medium focus:border-amber-400 focus:outline-none"
                />
                <input
                  placeholder="Qty"
                  type="number"
                  min={1}
                  value={matDraft.quantity}
                  onChange={e => setMatDraft(d => ({ ...d, quantity: parseFloat(e.target.value) || 1 }))}
                  className="px-2.5 py-2 rounded-lg border bg-background text-[0.78rem] font-mono text-center focus:border-amber-400 focus:outline-none"
                />
                <input
                  placeholder="Unit"
                  value={matDraft.unit}
                  onChange={e => setMatDraft(d => ({ ...d, unit: e.target.value }))}
                  className="px-2.5 py-2 rounded-lg border bg-background text-[0.78rem] text-center focus:border-amber-400 focus:outline-none"
                />
                <input
                  placeholder="Unit $"
                  type="number"
                  min={0}
                  step={0.01}
                  value={matDraft.unitCost || ''}
                  onChange={e => setMatDraft(d => ({ ...d, unitCost: parseFloat(e.target.value) || 0 }))}
                  className="px-2.5 py-2 rounded-lg border bg-background text-[0.78rem] font-mono text-right focus:border-amber-400 focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-2 mb-3">
                <input
                  placeholder="SKU (optional)"
                  value={matDraft.sku}
                  onChange={e => setMatDraft(d => ({ ...d, sku: e.target.value }))}
                  className="px-2.5 py-2 rounded-lg border bg-background text-[0.78rem] focus:border-amber-400 focus:outline-none"
                />
                <input
                  placeholder="Supplier (optional)"
                  value={matDraft.supplier}
                  onChange={e => setMatDraft(d => ({ ...d, supplier: e.target.value }))}
                  className="px-2.5 py-2 rounded-lg border bg-background text-[0.78rem] focus:border-amber-400 focus:outline-none"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => { setAddMode('none'); setMatDraft(blankMaterial()); }}
                  className="px-3 py-1.5 rounded-lg text-[0.72rem] font-semibold text-muted-foreground hover:bg-muted transition-all">
                  Cancel
                </button>
                <button type="button" onClick={handleAddMaterial} disabled={!matDraft.description.trim()}
                  className="px-4 py-1.5 rounded-lg text-[0.72rem] font-bold bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-40 transition-all">
                  Add Material
                </button>
              </div>
            </div>
          )}

          {/* Inline Equipment Form */}
          {tab === 'eq' && showEqForm && (
            <div className="border-2 border-purple-300 rounded-xl p-3.5 bg-purple-50/30 mt-2 animate-fade-in">
              <p className="text-[0.65rem] font-bold text-purple-700 uppercase tracking-[1px] mb-2.5">Add Equipment</p>
              <div className="grid grid-cols-[1fr_100px] gap-2 mb-2">
                <input
                  autoFocus
                  placeholder="Description *"
                  value={eqDraft.description}
                  onChange={e => setEqDraft(d => ({ ...d, description: e.target.value }))}
                  className="px-2.5 py-2 rounded-lg border bg-background text-[0.78rem] font-medium focus:border-purple-400 focus:outline-none"
                />
                <input
                  placeholder="Cost $"
                  type="number"
                  min={0}
                  step={0.01}
                  value={eqDraft.cost || ''}
                  onChange={e => setEqDraft(d => ({ ...d, cost: parseFloat(e.target.value) || 0 }))}
                  className="px-2.5 py-2 rounded-lg border bg-background text-[0.78rem] font-mono text-right focus:border-purple-400 focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-2 mb-3">
                <input
                  placeholder="Supplier (optional)"
                  value={eqDraft.supplier}
                  onChange={e => setEqDraft(d => ({ ...d, supplier: e.target.value }))}
                  className="px-2.5 py-2 rounded-lg border bg-background text-[0.78rem] focus:border-purple-400 focus:outline-none"
                />
                <input
                  placeholder="Duration (e.g. 3 days)"
                  value={eqDraft.durationNote}
                  onChange={e => setEqDraft(d => ({ ...d, durationNote: e.target.value }))}
                  className="px-2.5 py-2 rounded-lg border bg-background text-[0.78rem] focus:border-purple-400 focus:outline-none"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => { setShowEqForm(false); setEqDraft(blankEquipment()); }}
                  className="px-3 py-1.5 rounded-lg text-[0.72rem] font-semibold text-muted-foreground hover:bg-muted transition-all">
                  Cancel
                </button>
                <button type="button" onClick={handleAddEquipment} disabled={!eqDraft.description.trim()}
                  className="px-4 py-1.5 rounded-lg text-[0.72rem] font-bold bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-40 transition-all">
                  Add Equipment
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Staged for PO badge */}
        {((tab === 'mat' && cur.materials.length > 0) || (tab === 'eq' && cur.equipment.length > 0)) && (
          <div className="flex items-center gap-2 mx-3.5 mb-3 p-2.5 bg-blue-50 border border-blue-200 border-l-[3px] border-l-blue-600 rounded-lg text-[0.72rem] text-foreground/80">
            <span className="text-base">{tab === 'mat' ? '📦' : '🔧'}</span>
            <div className="flex-1">
              <span className="font-bold text-blue-700">Staged for PO</span> — After the CO is created, go to the CO detail page to send these items to a supplier for pricing.
            </div>
          </div>
        )}

        {/* Add buttons */}
        <div className="flex gap-1.5 px-3.5 py-2.5 border-t border-dashed">
          {tab === 'mat' ? (
            <>
              <button
                type="button"
                onClick={() => setAddMode('catalog')}
                disabled={addMode !== 'none'}
                className="flex-1 flex items-center justify-center gap-1.5 px-2.5 py-2 bg-muted border rounded-lg text-[0.74rem] font-semibold text-foreground/80 hover:bg-amber-50 hover:border-amber-300 hover:text-amber-700 disabled:opacity-40 transition-all"
              >
                <Search className="h-3.5 w-3.5" /> From Catalog
              </button>
              <button
                type="button"
                onClick={() => setAddMode('estimate')}
                disabled={addMode !== 'none'}
                className="flex-1 flex items-center justify-center gap-1.5 px-2.5 py-2 bg-muted border rounded-lg text-[0.74rem] font-semibold text-foreground/80 hover:bg-green-50 hover:border-green-300 hover:text-green-700 disabled:opacity-40 transition-all"
              >
                <FileText className="h-3.5 w-3.5" /> From Estimate
              </button>
              <button
                type="button"
                onClick={() => setAddMode('custom')}
                disabled={addMode !== 'none'}
                className="flex-1 flex items-center justify-center gap-1.5 px-2.5 py-2 bg-muted border rounded-lg text-[0.74rem] font-semibold text-foreground/80 hover:bg-amber-50 hover:border-amber-300 hover:text-amber-700 disabled:opacity-40 transition-all"
              >
                <Plus className="h-3.5 w-3.5" /> Custom Item
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setShowEqForm(true)}
              disabled={showEqForm}
              className="flex-1 flex items-center justify-center gap-1.5 px-2.5 py-2 bg-muted border rounded-lg text-[0.74rem] font-semibold text-foreground/80 hover:bg-purple-50 hover:border-purple-300 hover:text-purple-700 disabled:opacity-40 transition-all"
            >
              <Plus className="h-3.5 w-3.5" /> Add Equipment
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
