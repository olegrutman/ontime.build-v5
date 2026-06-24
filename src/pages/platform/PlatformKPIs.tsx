import { useState, useEffect } from 'react';
import { PlatformLayout } from '@/components/platform/PlatformLayout';
import { usePlatformSettings, useUpsertPlatformSetting } from '@/hooks/usePlatformSettings';
import { DEFAULT_KPI_MAP, type KpiCardConfig } from '@/constants/defaultKpiConfig';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Save, BarChart3, Plus, ArrowUp, ArrowDown, Trash2 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const TABS = [
  { key: 'gc', label: 'General Contractor' },
  { key: 'tc', label: 'Trade Contractor' },
  { key: 'fc', label: 'Field Contractor' },
  { key: 'supplier', label: 'Supplier' },
];

export default function PlatformKPIs() {
  const { data: settings, isLoading } = usePlatformSettings();
  const upsert = useUpsertPlatformSetting();
  const [configs, setConfigs] = useState<Record<string, KpiCardConfig[]>>({});
  const [dirty, setDirty] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (isLoading) return;
    const loaded: Record<string, KpiCardConfig[]> = {};
    for (const tab of TABS) {
      const key = `kpi_config_${tab.key}`;
      const saved = settings?.[key] as KpiCardConfig[] | undefined;
      loaded[tab.key] = saved && Array.isArray(saved) && saved.length > 0
        ? saved.sort((a, b) => a.order - b.order)
        : [...DEFAULT_KPI_MAP[tab.key]];
    }
    setConfigs(loaded);
  }, [settings, isLoading]);

  function updateCard(role: string, idx: number, patch: Partial<KpiCardConfig>) {
    setConfigs(prev => {
      const list = [...(prev[role] || [])];
      list[idx] = { ...list[idx], ...patch };
      return { ...prev, [role]: list };
    });
    setDirty(prev => ({ ...prev, [role]: true }));
  }

  function moveCard(role: string, idx: number, dir: -1 | 1) {
    setConfigs(prev => {
      const list = [...(prev[role] || [])];
      const target = idx + dir;
      if (target < 0 || target >= list.length) return prev;
      [list[idx], list[target]] = [list[target], list[idx]];
      return { ...prev, [role]: list.map((c, i) => ({ ...c, order: i })) };
    });
    setDirty(prev => ({ ...prev, [role]: true }));
  }

  function addCard(role: string) {
    setConfigs(prev => {
      const list = prev[role] || [];
      return { ...prev, [role]: [...list, { key: `custom_${Date.now()}`, label: 'New KPI', subtitle: 'Description', enabled: true, order: list.length }] };
    });
    setDirty(prev => ({ ...prev, [role]: true }));
  }

  function removeCard(role: string, idx: number) {
    setConfigs(prev => {
      const list = (prev[role] || []).filter((_, i) => i !== idx).map((c, i) => ({ ...c, order: i }));
      return { ...prev, [role]: list };
    });
    setDirty(prev => ({ ...prev, [role]: true }));
  }

  function handleSave(role: string) {
    const key = `kpi_config_${role}`;
    upsert.mutate({ [key]: configs[role] }, { onSuccess: () => setDirty(prev => ({ ...prev, [role]: false })) });
  }

  return (
    <PlatformLayout title="KPI Cards">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Dashboard KPI Configuration</CardTitle>
          <CardDescription>Choose which KPI cards each user type sees on their dashboard. Reorder, rename, or disable cards per role.</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="gc">
            <TabsList className="mb-4">
              {TABS.map(t => <TabsTrigger key={t.key} value={t.key}>{t.label}</TabsTrigger>)}
            </TabsList>
            {TABS.map(t => (
              <TabsContent key={t.key} value={t.key} className="space-y-4">
                <div className="flex justify-between items-center">
                  <Button size="sm" variant="outline" onClick={() => addCard(t.key)}>
                    <Plus className="h-4 w-4 mr-1" />Add KPI
                  </Button>
                  <Button size="sm" disabled={!dirty[t.key] || upsert.isPending} onClick={() => handleSave(t.key)}>
                    <Save className="h-4 w-4 mr-1" />{upsert.isPending ? 'Saving…' : 'Save'}
                  </Button>
                </div>
                <div className="border rounded-md overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">Order</TableHead>
                        <TableHead className="min-w-[160px]">Label</TableHead>
                        <TableHead className="min-w-[200px]">Subtitle</TableHead>
                        <TableHead className="text-center w-20">Enabled</TableHead>
                        <TableHead className="w-24">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? (
                        <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow>
                      ) : (configs[t.key] || []).length === 0 ? (
                        <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No KPI cards configured</TableCell></TableRow>
                      ) : (configs[t.key] || []).map((card, idx) => (
                        <TableRow key={card.key}>
                          <TableCell className="text-center">
                            <div className="flex flex-col items-center gap-0.5">
                              <button onClick={() => moveCard(t.key, idx, -1)} disabled={idx === 0} className="text-muted-foreground hover:text-foreground disabled:opacity-30"><ArrowUp className="h-3.5 w-3.5" /></button>
                              <span className="text-xs text-muted-foreground">{idx + 1}</span>
                              <button onClick={() => moveCard(t.key, idx, 1)} disabled={idx === (configs[t.key]?.length ?? 0) - 1} className="text-muted-foreground hover:text-foreground disabled:opacity-30"><ArrowDown className="h-3.5 w-3.5" /></button>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Input value={card.label} onChange={e => updateCard(t.key, idx, { label: e.target.value })} className="h-8 text-sm" />
                          </TableCell>
                          <TableCell>
                            <Input value={card.subtitle} onChange={e => updateCard(t.key, idx, { subtitle: e.target.value })} className="h-8 text-sm" />
                          </TableCell>
                          <TableCell className="text-center">
                            <Switch checked={card.enabled} onCheckedChange={v => updateCard(t.key, idx, { enabled: v })} />
                          </TableCell>
                          <TableCell>
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => removeCard(t.key, idx)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </PlatformLayout>
  );
}
