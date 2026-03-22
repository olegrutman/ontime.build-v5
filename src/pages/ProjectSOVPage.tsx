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
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { useDefaultSidebarOpen } from '@/hooks/use-sidebar-default';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  ArrowLeft, CheckCircle2, AlertTriangle, Lock, Unlock, Trash2, Plus,
  RotateCcw, Loader2, FileSpreadsheet, History, Sparkles,
} from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export default function ProjectSOVPage() {
  const { id: projectId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, userOrgRoles } = useAuth();
  const userOrgId = userOrgRoles[0]?.organization_id || null;
  const { toast } = useToast();
  const defaultOpen = useDefaultSidebarOpen();
  const [selectedContractId, setSelectedContractId] = useState<string | null>(null);

  const {
    prereqs, prereqsLoading, currentSOV, sovLoading, items, itemsLoading,
    scopeCoverage, versions, generating, generateSOV, updateLinePct,
    toggleLineLock, deleteLine, addLine, resetLine, lockSOV,
    totalPct, contractMismatch, coveredCount, totalSections,
    allContracts, activeContractId,
  } = useSOVPage(projectId || '', selectedContractId);

  // Fetch project info
  const { data: project } = useQuery({
    queryKey: ['project-basic', projectId],
    queryFn: async () => {
      const { data } = await supabase.from('projects').select('name, created_by').eq('id', projectId!).maybeSingle();
      return data;
    },
    enabled: !!projectId,
  });

  const isCreator = project?.created_by === user?.id;
  const isLocked = currentSOV?.is_locked || false;
  const canEdit = isCreator && !isLocked;

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemGroup, setNewItemGroup] = useState('');
  const [newItemSection, setNewItemSection] = useState('');
  const [showVersions, setShowVersions] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingPct, setEditingPct] = useState('');

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

  if (prereqsLoading || sovLoading) {
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

  const allReady = prereqs.hasProfile && prereqs.hasScope && prereqs.hasContract;

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
              <div className="flex-1 min-w-0">
                <h1 className="text-lg font-semibold font-heading truncate">Schedule of Values</h1>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => setShowVersions(true)}>
                  <History className="h-4 w-4 mr-1" />
                  <span className="hidden sm:inline">Versions</span>
                </Button>
                {canEdit && allReady && (
                  <>
                    <Button
                      size="sm"
                      className="bg-amber-500 hover:bg-amber-600 text-white"
                      onClick={generateSOV}
                      disabled={generating}
                    >
                      {generating ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Sparkles className="h-4 w-4 mr-1" />}
                      Generate
                    </Button>
                    {items.length > 0 && (
                      <Button size="sm" onClick={lockSOV} disabled={isLocked}>
                        <Lock className="h-4 w-4 mr-1" />
                        Lock
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Contract selector (if multiple contracts) */}
            {allContracts.length > 1 && (
              <div className="flex items-center gap-2 px-4 pb-2 overflow-x-auto">
                {allContracts.map(c => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedContractId(c.id)}
                    className={cn(
                      "px-3 py-1 rounded-full text-xs font-medium border transition-colors whitespace-nowrap",
                      activeContractId === c.id
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-muted text-muted-foreground border-border hover:bg-accent"
                    )}
                  >
                    {c.from_role} → {c.to_role} · ${(c.contract_sum || 0).toLocaleString()}
                  </button>
                ))}
              </div>
            )}

            {/* Status strip */}
            <div className="flex items-center gap-4 px-4 pb-2 overflow-x-auto text-xs">
              <StatusChip
                ok={prereqs.hasProfile}
                label={prereqs.hasProfile ? prereqs.profileSummary || 'Profile ready' : 'No profile'}
                link={`/project/${projectId}/details-wizard`}
              />
              <StatusChip
                ok={prereqs.hasScope}
                label={prereqs.hasScope ? `Scope — ${prereqs.scopeCount} items active` : 'No scope'}
                link={`/project/${projectId}/scope-wizard`}
              />
              <StatusChip
                ok={prereqs.hasContract}
                label={prereqs.hasContract ? `Contract — $${(prereqs.contractValue || 0).toLocaleString()} · ${prereqs.retainagePct}% ret.` : 'No contract'}
                link={`/project/${projectId}/contracts`}
              />
            </div>
          </header>

          {/* Contract mismatch banner */}
          {contractMismatch && currentSOV && (
            <div className="mx-3 sm:mx-6 mt-3">
              <div className="flex items-center justify-between gap-3 p-3 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-900/10">
                <div className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-300">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>Contract value has changed to <strong>${(prereqs.contractValue || 0).toLocaleString()}</strong>. {isLocked ? 'Create a new version to update.' : 'Regenerate the SOV to update.'}</span>
                </div>
                {isCreator && (
                  <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-white shrink-0" onClick={generateSOV} disabled={generating}>
                    {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : isLocked ? 'Create New Version' : 'Regenerate'}
                  </Button>
                )}
              </div>
            </div>
          )}

          <main className="flex-1 overflow-auto pb-24 lg:pb-6">
            <div className="max-w-7xl mx-auto w-full px-3 sm:px-6 py-4 space-y-4">
              {/* Blocking states */}
              {!allReady && (
                <Card className="border-amber-300 bg-amber-50/50 dark:bg-amber-900/10">
                  <CardContent className="p-6 space-y-3">
                    <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
                      <AlertTriangle className="h-5 w-5" />
                      <span className="font-semibold">Prerequisites required</span>
                    </div>
                    {!prereqs.hasProfile && (
                      <div className="flex items-center justify-between p-3 rounded-lg bg-background border">
                        <span className="text-sm">Complete the Project Details Wizard</span>
                        <Button size="sm" variant="outline" onClick={() => navigate(`/project/${projectId}/details-wizard`)}>Set up</Button>
                      </div>
                    )}
                    {!prereqs.hasScope && (
                      <div className="flex items-center justify-between p-3 rounded-lg bg-background border">
                        <span className="text-sm">Complete the Scope Wizard</span>
                        <Button size="sm" variant="outline" onClick={() => navigate(`/project/${projectId}/scope-wizard`)}>Set up</Button>
                      </div>
                    )}
                    {!prereqs.hasContract && (
                      <div className="flex items-center justify-between p-3 rounded-lg bg-background border">
                        <span className="text-sm">Create a contract with a contract value</span>
                        <Button size="sm" variant="outline" onClick={() => navigate(`/project/${projectId}/contracts`)}>Set up</Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Main content */}
              {allReady && (
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
                  {/* SOV Table */}
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base flex items-center gap-2">
                          <FileSpreadsheet className="h-4 w-4" />
                          SOV Lines
                          {currentSOV && (
                            <Badge variant="outline" className="text-xs">v{currentSOV.version}</Badge>
                          )}
                          {isLocked && <Badge className="bg-green-100 text-green-800 text-xs"><Lock className="h-3 w-3 mr-1" />Locked</Badge>}
                        </CardTitle>
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
                                  <div>
                                    <Label>Line Item Name</Label>
                                    <Input value={newItemName} onChange={e => setNewItemName(e.target.value)} placeholder="e.g. Balcony framing" />
                                  </div>
                                  <div>
                                    <Label>Group</Label>
                                    <Input value={newItemGroup} onChange={e => setNewItemGroup(e.target.value)} placeholder="e.g. Decks" />
                                  </div>
                                  <div>
                                    <Label>Scope Section (slug)</Label>
                                    <Input value={newItemSection} onChange={e => setNewItemSection(e.target.value)} placeholder="e.g. decks_balconies" />
                                  </div>
                                </div>
                                <DialogFooter>
                                  <Button onClick={handleAddLine} disabled={!newItemName.trim()}>Add Line</Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-0">
                      {items.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                          <FileSpreadsheet className="h-10 w-10 mb-3 opacity-40" />
                          <p className="text-sm">No SOV lines yet</p>
                          <p className="text-xs mt-1">Click "Generate" to create an AI-generated SOV</p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
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
                                    className={cn(
                                      "border-b hover:bg-muted/30 transition-colors",
                                      isEdited && "border-l-2 border-l-amber-400"
                                    )}
                                  >
                                    <td className="px-3 py-2 text-muted-foreground">{idx + 1}</td>
                                    <td className="px-3 py-2 font-medium">{item.item_name}</td>
                                    <td className="px-3 py-2 text-muted-foreground hidden md:table-cell">{item.item_group}</td>
                                    <td className="px-3 py-2 text-right">
                                      {canEdit && editingId === item.id ? (
                                        <Input
                                          type="number"
                                          step="0.01"
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
                    </CardContent>
                  </Card>

                  {/* Scope Coverage Panel */}
                  <div className="space-y-4">
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm">Scope Coverage</CardTitle>
                        <p className="text-xs text-muted-foreground">{coveredCount} of {totalSections} sections covered</p>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {scopeCoverage.length === 0 ? (
                          <p className="text-xs text-muted-foreground">No active scope sections</p>
                        ) : (
                          scopeCoverage.map(sc => (
                            <div key={sc.sectionSlug} className="flex items-center gap-2 text-xs">
                              {sc.covered ? (
                                <div className="h-2 w-2 rounded-full bg-green-500 shrink-0" />
                              ) : (
                                <div className="h-2 w-2 rounded-full bg-amber-500 shrink-0" />
                              )}
                              <span className="flex-1 truncate">{sc.sectionLabel}</span>
                              <span className="text-muted-foreground">{sc.itemCount} items</span>
                              <span className="font-mono w-12 text-right">{sc.allocatedPct.toFixed(1)}%</span>
                            </div>
                          ))
                        )}
                        {scopeCoverage.some(s => !s.covered) && (
                          <div className="mt-3 p-2 rounded bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800">
                            <p className="text-xs text-amber-700 dark:text-amber-300">
                              <AlertTriangle className="h-3 w-3 inline mr-1" />
                              Some scope sections have no SOV lines. The TC cannot bill for uncovered work.
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Version info */}
                    {currentSOV && (
                      <Card>
                        <CardContent className="p-4 space-y-2 text-xs">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Version</span>
                            <span>{currentSOV.version}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Lines</span>
                            <span>{items.length}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Status</span>
                            <span>{isLocked ? 'Locked' : 'Draft'}</span>
                          </div>
                          {isLocked && currentSOV.locked_at && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Locked</span>
                              <span>{new Date(currentSOV.locked_at).toLocaleDateString()}</span>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </div>
              )}
            </div>
          </main>
        </SidebarInset>
        <BottomNav />
      </div>

      {/* Version History Dialog */}
      <Dialog open={showVersions} onOpenChange={setShowVersions}>
        <DialogContent>
          <DialogHeader><DialogTitle>Version History</DialogTitle></DialogHeader>
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
    </SidebarProvider>
  );
}

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
