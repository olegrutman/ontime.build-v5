import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useSOVPage } from '@/hooks/useSOVPage';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { BottomNav } from '@/components/layout/BottomNav';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useDefaultSidebarOpen } from '@/hooks/use-sidebar-default';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  ArrowLeft, CheckCircle2, AlertTriangle, Lock, Unlock, Trash2, Plus,
  RotateCcw, Loader2, FileSpreadsheet, History, Sparkles, ChevronDown,
} from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

/* ─── Per-Contract SOV Section ─── */

function SOVContractSection({
  projectId,
  contractId,
  contract,
  userOrgId,
}: {
  projectId: string;
  contractId: string;
  contract: { from_role: string; to_role: string; contract_sum: number | null; to_org_id: string | null; from_org?: { name: string } | null; to_org?: { name: string } | null };
  userOrgId: string | null;
}) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  const {
    prereqs, prereqsLoading, currentSOV, sovLoading, items, itemsLoading,
    scopeCoverage, versions, generating, generateSOV, updateLinePct,
    toggleLineLock, deleteLine, addLine, resetLine, lockSOV,
    totalPct, contractMismatch, coveredCount, totalSections,
  } = useSOVPage(projectId, contractId);

  const isContractClient = !!userOrgId && contract.to_org_id === userOrgId;
  const isLocked = currentSOV?.is_locked || false;
  const canEdit = isContractClient && !isLocked;
  const allReady = prereqs.hasProfile && prereqs.hasScope && prereqs.hasContract;

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemGroup, setNewItemGroup] = useState('');
  const [newItemSection, setNewItemSection] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingPct, setEditingPct] = useState('');
  const [showVersions, setShowVersions] = useState(false);

  const handleAddLine = async () => {
    if (!newItemName.trim()) return;
    await addLine(newItemName, newItemGroup, newItemSection || null);
    setNewItemName('');
    setNewItemGroup('');
    setNewItemSection('');
    setAddDialogOpen(false);
  };

  const handlePctSave = async (lineId: string) => {
    const val = parseFloat(editingPct);
    if (isNaN(val) || val < 0) return;
    await updateLinePct(lineId, val);
    setEditingId(null);
  };

  const fromName = contract.from_org?.name || contract.from_role;
  const toName = contract.to_org?.name || contract.to_role;
  const contractLabel = `${fromName} → ${toName}`;
  const contractValue = contract.contract_sum || 0;

  if (prereqsLoading || sovLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-48 w-full mt-3" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Collapsible open={open} onOpenChange={setOpen}>
        <Card>
          {/* Collapsible header */}
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer select-none hover:bg-muted/30 transition-colors pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <ChevronDown className={cn("h-4 w-4 shrink-0 transition-transform", !open && "-rotate-90")} />
                  <div className="min-w-0">
                    <CardTitle className="text-base flex items-center gap-2 flex-wrap">
                      {contractLabel}
                      <span className="text-sm font-normal text-muted-foreground">
                        · ${contractValue.toLocaleString()}
                      </span>
                      {currentSOV && (
                        <Badge variant="outline" className="text-xs">v{currentSOV.version}</Badge>
                      )}
                      {isLocked && (
                        <Badge className="bg-green-100 text-green-800 text-xs">
                          <Lock className="h-3 w-3 mr-1" />Locked
                        </Badge>
                      )}
                    </CardTitle>
                    {currentSOV && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {items.length} lines · {totalPct.toFixed(2)}%
                      </p>
                    )}
                  </div>
                </div>

                {/* Action buttons (stop propagation so clicking them doesn't toggle collapse) */}
                <div className="flex items-center gap-2 shrink-0" onClick={e => e.stopPropagation()}>
                  <Button variant="ghost" size="sm" onClick={() => setShowVersions(true)}>
                    <History className="h-4 w-4" />
                  </Button>
                  {isContractClient && allReady && (
                    <>
                      <Button
                        size="sm"
                        className="bg-amber-500 hover:bg-amber-600 text-white"
                        onClick={generateSOV}
                        disabled={generating}
                      >
                        {generating ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Sparkles className="h-4 w-4 mr-1" />}
                        {isLocked ? 'New Version' : 'Generate'}
                      </Button>
                      {items.length > 0 && !isLocked && (
                        <Button size="sm" onClick={lockSOV}>
                          <Lock className="h-4 w-4 mr-1" />Lock
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </CardHeader>
          </CollapsibleTrigger>

          <CollapsibleContent>
            {/* Contract mismatch banner */}
            {contractMismatch && currentSOV && (
              <div className="mx-4 mb-3">
                <div className="flex items-center justify-between gap-3 p-3 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-900/10">
                  <div className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-300">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    <span>Contract value changed to <strong>${(prereqs.contractValue || 0).toLocaleString()}</strong>.</span>
                  </div>
                  {isContractClient && (
                    <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-white shrink-0" onClick={generateSOV} disabled={generating}>
                      {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : isLocked ? 'Create New Version' : 'Regenerate'}
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Prerequisites */}
            {!allReady && (
              <CardContent className="pt-0 space-y-2">
                <div className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-300 mb-2">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="font-medium">Prerequisites required</span>
                </div>
                {!prereqs.hasProfile && (
                  <div className="flex items-center justify-between p-2 rounded-lg bg-muted border text-sm">
                    <span>Complete the Project Details Wizard</span>
                    <Button size="sm" variant="outline" onClick={() => navigate(`/project/${projectId}/details-wizard`)}>Set up</Button>
                  </div>
                )}
                {!prereqs.hasScope && (
                  <div className="flex items-center justify-between p-2 rounded-lg bg-muted border text-sm">
                    <span>Complete the Scope Wizard</span>
                    <Button size="sm" variant="outline" onClick={() => navigate(`/project/${projectId}/scope-wizard`)}>Set up</Button>
                  </div>
                )}
                {!prereqs.hasContract && (
                  <div className="flex items-center justify-between p-2 rounded-lg bg-muted border text-sm">
                    <span>Create a contract with a value</span>
                    <Button size="sm" variant="outline" onClick={() => navigate(`/project/${projectId}/contracts`)}>Set up</Button>
                  </div>
                )}
              </CardContent>
            )}

            {/* SOV Table + Scope Coverage */}
            {allReady && (
              <CardContent className="pt-0">
                {/* Status strip */}
                <div className="flex items-center gap-3 mb-3 overflow-x-auto text-xs">
                  <StatusChip ok={prereqs.hasProfile} label={prereqs.profileSummary || 'Profile ready'} link={`/project/${projectId}/details-wizard`} />
                  <StatusChip ok={prereqs.hasScope} label={`Scope — ${prereqs.scopeCount} items`} link={`/project/${projectId}/scope-wizard`} />
                  <StatusChip ok={prereqs.hasContract} label={`$${(prereqs.contractValue || 0).toLocaleString()} · ${prereqs.retainagePct}% ret.`} link={`/project/${projectId}/contracts`} />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4">
                  {/* Table */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">SOV Lines</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={cn("text-sm font-mono", Math.abs(totalPct - 100) > 0.05 ? "text-destructive" : "text-green-600")}>
                          {totalPct.toFixed(2)}%
                        </span>
                        {canEdit && items.length > 0 && (
                          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
                            <DialogTrigger asChild>
                              <Button size="sm" variant="outline"><Plus className="h-3.5 w-3.5 mr-1" />Add</Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader><DialogTitle>Add SOV Line</DialogTitle></DialogHeader>
                              <div className="space-y-3">
                                <div><Label>Line Item Name</Label><Input value={newItemName} onChange={e => setNewItemName(e.target.value)} placeholder="e.g. Balcony framing" /></div>
                                <div><Label>Group</Label><Input value={newItemGroup} onChange={e => setNewItemGroup(e.target.value)} placeholder="e.g. Decks" /></div>
                                <div><Label>Scope Section (slug)</Label><Input value={newItemSection} onChange={e => setNewItemSection(e.target.value)} placeholder="e.g. decks_balconies" /></div>
                              </div>
                              <DialogFooter><Button onClick={handleAddLine} disabled={!newItemName.trim()}>Add Line</Button></DialogFooter>
                            </DialogContent>
                          </Dialog>
                        )}
                      </div>
                    </div>

                    {items.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground border rounded-lg">
                        <FileSpreadsheet className="h-8 w-8 mb-2 opacity-40" />
                        <p className="text-sm">No SOV lines yet</p>
                        <p className="text-xs mt-1">Click "Generate" to create an AI-generated SOV</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto border rounded-lg">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b bg-muted/50">
                              <th className="text-left px-3 py-2 w-8">#</th>
                              <th className="text-left px-3 py-2">Line Item</th>
                              <th className="text-left px-3 py-2 hidden md:table-cell">Group</th>
                              <th className="text-right px-3 py-2 w-20">%</th>
                              <th className="text-right px-3 py-2 w-28 hidden sm:table-cell">Value</th>
                              <th className="text-right px-3 py-2 w-24 hidden lg:table-cell">Retainage</th>
                              <th className="text-right px-3 py-2 w-28 hidden lg:table-cell">Net</th>
                              {isLocked && (
                                <>
                                  <th className="text-right px-3 py-2 w-24 hidden lg:table-cell">Billed</th>
                                  <th className="text-right px-3 py-2 w-20 hidden lg:table-cell">Status</th>
                                </>
                              )}
                              {canEdit && <th className="w-24 px-2"></th>}
                            </tr>
                          </thead>
                          <tbody>
                            {items.map((item, idx) => {
                              const retainageAmt = (item.value_amount || 0) * (prereqs.retainagePct || 0) / 100;
                              const net = (item.value_amount || 0) - retainageAmt;
                              const isEdited = item.ai_original_pct != null && item.percent_of_contract !== item.ai_original_pct;

                              return (
                                <tr
                                  key={item.id}
                                  className={cn("border-b hover:bg-muted/30 transition-colors", isEdited && "border-l-2 border-l-amber-400")}
                                >
                                  <td className="px-3 py-2 text-muted-foreground">{idx + 1}</td>
                                  <td className="px-3 py-2 font-medium">{item.item_name}</td>
                                  <td className="px-3 py-2 text-muted-foreground hidden md:table-cell">{item.item_group}</td>
                                  <td className="px-3 py-2 text-right">
                                    {canEdit && editingId === item.id ? (
                                      <Input
                                        type="number" step="0.01"
                                        className="w-20 h-7 text-right text-xs ml-auto"
                                        value={editingPct}
                                        onChange={e => setEditingPct(e.target.value)}
                                        onBlur={() => handlePctSave(item.id)}
                                        onKeyDown={e => e.key === 'Enter' && handlePctSave(item.id)}
                                        autoFocus
                                      />
                                    ) : (
                                      <span
                                        className={cn("font-mono cursor-pointer", canEdit && "hover:text-primary")}
                                        onClick={() => {
                                          if (canEdit && !item.is_locked) {
                                            setEditingId(item.id);
                                            setEditingPct((item.percent_of_contract || 0).toFixed(2));
                                          }
                                        }}
                                      >
                                        {(item.percent_of_contract || 0).toFixed(2)}%
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-3 py-2 text-right font-mono hidden sm:table-cell">
                                    ${(item.value_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </td>
                                  <td className="px-3 py-2 text-right text-muted-foreground font-mono hidden lg:table-cell">
                                    ${retainageAmt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </td>
                                  <td className="px-3 py-2 text-right font-mono hidden lg:table-cell">
                                    ${net.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </td>
                                  {isLocked && (
                                    <>
                                      <td className="px-3 py-2 text-right font-mono hidden lg:table-cell">
                                        ${(item.billed_to_date || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                      </td>
                                      <td className="px-3 py-2 text-right hidden lg:table-cell">
                                        <BillingStatusBadge status={item.billing_status} />
                                      </td>
                                    </>
                                  )}
                                  {canEdit && (
                                    <td className="px-2 py-2">
                                      <div className="flex items-center gap-1 justify-end">
                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toggleLineLock(item.id)} title={item.is_locked ? "Unlock" : "Lock"}>
                                          {item.is_locked ? <Lock className="h-3.5 w-3.5 text-green-600" /> : <Unlock className="h-3.5 w-3.5 text-muted-foreground" />}
                                        </Button>
                                        {isEdited && (
                                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => resetLine(item.id)} title="Reset to AI">
                                            <RotateCcw className="h-3.5 w-3.5 text-amber-500" />
                                          </Button>
                                        )}
                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteLine(item.id)}>
                                          <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                      </div>
                                    </td>
                                  )}
                                </tr>
                              );
                            })}
                          </tbody>
                          <tfoot>
                            <tr className="border-t-2 font-semibold">
                              <td></td>
                              <td className="px-3 py-2">Total</td>
                              <td className="hidden md:table-cell"></td>
                              <td className={cn("px-3 py-2 text-right font-mono", Math.abs(totalPct - 100) > 0.05 ? "text-destructive" : "text-green-600")}>
                                {totalPct.toFixed(2)}%
                              </td>
                              <td className="px-3 py-2 text-right font-mono hidden sm:table-cell">
                                ${items.reduce((s, i) => s + (i.value_amount || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td className="hidden lg:table-cell"></td>
                              <td className="hidden lg:table-cell"></td>
                              {isLocked && <><td className="hidden lg:table-cell"></td><td className="hidden lg:table-cell"></td></>}
                              {canEdit && <td></td>}
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Scope Coverage sidebar */}
                  <div className="space-y-3">
                    <div className="border rounded-lg p-3">
                      <p className="text-sm font-medium mb-1">Scope Coverage</p>
                      <p className="text-xs text-muted-foreground mb-2">{coveredCount} of {totalSections} sections</p>
                      {scopeCoverage.length === 0 ? (
                        <p className="text-xs text-muted-foreground">No active scope sections</p>
                      ) : (
                        <div className="space-y-1.5">
                          {scopeCoverage.map(sc => (
                            <div key={sc.sectionSlug} className="flex items-center gap-2 text-xs">
                              <div className={cn("h-2 w-2 rounded-full shrink-0", sc.covered ? "bg-green-500" : "bg-amber-500")} />
                              <span className="flex-1 truncate">{sc.sectionLabel}</span>
                              <span className="font-mono w-12 text-right">{sc.allocatedPct.toFixed(1)}%</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {currentSOV && (
                      <div className="border rounded-lg p-3 space-y-1.5 text-xs">
                        <div className="flex justify-between"><span className="text-muted-foreground">Version</span><span>{currentSOV.version}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Lines</span><span>{items.length}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Status</span><span>{isLocked ? 'Locked' : 'Draft'}</span></div>
                        {isLocked && currentSOV.locked_at && (
                          <div className="flex justify-between"><span className="text-muted-foreground">Locked</span><span>{new Date(currentSOV.locked_at).toLocaleDateString()}</span></div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            )}
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Version History Dialog */}
      <Dialog open={showVersions} onOpenChange={setShowVersions}>
        <DialogContent>
          <DialogHeader><DialogTitle>{contractLabel} — Version History</DialogTitle></DialogHeader>
          <div className="space-y-2 max-h-64 overflow-auto">
            {versions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No versions yet</p>
            ) : versions.map(v => (
              <div key={v.id} className="flex items-center justify-between p-3 rounded-lg border text-sm">
                <div>
                  <span className="font-medium">v{v.version}</span>
                  <span className="text-muted-foreground ml-2">{new Date(v.created_at).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-2">
                  {v.is_locked && <Badge className="bg-green-100 text-green-800 text-xs"><Lock className="h-3 w-3 mr-1" />Locked</Badge>}
                  {v.id === currentSOV?.id && <Badge variant="outline" className="text-xs">Current</Badge>}
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

/* ─── Page Component ─── */

export default function ProjectSOVPage() {
  const { id: projectId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, userOrgRoles } = useAuth();
  const userOrgId = userOrgRoles[0]?.organization_id || null;
  const defaultOpen = useDefaultSidebarOpen();

  // Fetch project info
  const { data: project } = useQuery({
    queryKey: ['project-basic', projectId],
    queryFn: async () => {
      const { data } = await supabase.from('projects').select('name, created_by').eq('id', projectId!).maybeSingle();
      return data;
    },
    enabled: !!projectId,
  });

  // Fetch all contracts for this project (excluding work orders)
  const { data: allContracts = [], isLoading: contractsLoading } = useQuery({
    queryKey: ['sov-all-contracts', projectId],
    queryFn: async () => {
      const { data } = await supabase
        .from('project_contracts')
        .select('id, contract_sum, retainage_percent, from_role, to_role, trade, from_org_id, to_org_id, from_org:organizations!project_contracts_from_org_id_fkey(name), to_org:organizations!project_contracts_to_org_id_fkey(name)')
        .eq('project_id', projectId!)
        .or('trade.is.null,and(trade.neq.Work Order,trade.neq.Work Order Labor)');
      return data || [];
    },
    enabled: !!projectId,
  });

  if (contractsLoading) {
    return (
      <SidebarProvider defaultOpen={defaultOpen}>
        <div className="min-h-screen flex w-full">
          <AppSidebar />
          <SidebarInset className="flex flex-col flex-1">
            <div className="p-6 space-y-4">
              <Skeleton className="h-10 w-64" />
              <Skeleton className="h-96 w-full" />
            </div>
          </SidebarInset>
        </div>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <SidebarInset className="flex flex-col flex-1 bg-background">
          {/* Sticky back bar */}
          <div className="sticky top-0 z-50 bg-card border-b px-4 py-2 flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/project/${projectId}?tab=overview`)}
              className="shrink-0"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to Overview
            </Button>
            <span className="text-sm text-muted-foreground truncate">{project?.name}</span>
          </div>

          {/* Header */}
          <header className="sticky top-[49px] z-40 border-b bg-card backdrop-blur">
            <div className="flex items-center gap-3 px-4 h-14">
              <h1 className="text-lg font-semibold font-heading truncate">Schedule of Values</h1>
            </div>
          </header>

          <main className="flex-1 overflow-auto pb-24 lg:pb-6">
            <div className="max-w-7xl mx-auto w-full px-3 sm:px-6 py-4 space-y-4">
              {(() => {
                const visibleContracts = allContracts.filter(c =>
                  c.from_org_id === userOrgId || c.to_org_id === userOrgId
                );
                if (visibleContracts.length === 0) return (
                  <Card>
                    <CardContent className="p-6 text-center text-muted-foreground">
                      <p className="text-sm">No contracts found for this project.</p>
                      <Button size="sm" variant="outline" className="mt-3" onClick={() => navigate(`/project/${projectId}/contracts`)}>
                        Create Contract
                      </Button>
                    </CardContent>
                  </Card>
                );
                return visibleContracts.map(contract => (
                  <SOVContractSection
                    key={contract.id}
                    projectId={projectId!}
                    contractId={contract.id}
                    contract={contract}
                    userOrgId={userOrgId}
                  />
                ));
              })()}
            </div>
          </main>
        </SidebarInset>
        <BottomNav />
      </div>
    </SidebarProvider>
  );
}

/* ─── Shared Helpers ─── */

function StatusChip({ ok, label, link }: { ok: boolean; label: string; link: string }) {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => !ok && navigate(link)}
      className={cn(
        "flex items-center gap-1.5 px-2.5 py-1 rounded-full whitespace-nowrap border transition-colors",
        ok
          ? "bg-green-50 border-green-200 text-green-700 dark:bg-green-900/20 dark:border-green-800 dark:text-green-300"
          : "bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-300 cursor-pointer hover:bg-amber-100"
      )}
    >
      {ok ? <CheckCircle2 className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
      <span>{label}</span>
    </button>
  );
}

function BillingStatusBadge({ status }: { status: string }) {
  if (status === 'paid') return <Badge className="bg-green-100 text-green-800 text-xs">Paid</Badge>;
  if (status === 'partial') return <Badge className="bg-blue-100 text-blue-800 text-xs">Partial</Badge>;
  return <Badge variant="outline" className="text-xs">Unbilled</Badge>;
}
