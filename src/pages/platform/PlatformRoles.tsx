import { useState, useEffect } from 'react';
import { PlatformLayout } from '@/components/platform/PlatformLayout';
import { usePlatformSettings, useUpsertPlatformSetting } from '@/hooks/usePlatformSettings';
import { DEFAULT_ROLE_RULES, type RoleRule } from '@/constants/defaultRoleRules';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Search, Save, ShieldCheck } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const CATEGORIES = [...new Set(DEFAULT_ROLE_RULES.map(r => r.category))];
const ROLE_COLS = ['gc', 'tc', 'fc', 'supplier'] as const;
const ROLE_LABELS: Record<string, string> = { gc: 'GC', tc: 'TC', fc: 'FC', supplier: 'Supplier' };

export default function PlatformRoles() {
  const { data: settings, isLoading } = usePlatformSettings();
  const upsert = useUpsertPlatformSetting();
  const [rules, setRules] = useState<RoleRule[]>([]);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (isLoading) return;
    const saved = settings?.role_rules as RoleRule[] | undefined;
    if (saved && Array.isArray(saved) && saved.length > 0) {
      setRules(saved);
    } else {
      setRules(DEFAULT_ROLE_RULES);
    }
  }, [settings, isLoading]);

  const filtered = rules.filter(r => {
    if (catFilter && r.category !== catFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return r.rule_name.toLowerCase().includes(q) || r.description.toLowerCase().includes(q) || r.category.toLowerCase().includes(q);
    }
    return true;
  });

  function toggle(id: string, field: 'gc' | 'tc' | 'fc' | 'supplier' | 'enabled') {
    setRules(prev => prev.map(r => r.id === id ? { ...r, [field]: !r[field] } : r));
    setDirty(true);
  }

  function handleSave() {
    upsert.mutate({ role_rules: rules }, { onSuccess: () => setDirty(false) });
  }

  return (
    <PlatformLayout title="Role Rules">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Permission Rules by Role</CardTitle>
          <CardDescription>Configure which roles can perform each action. Changes are saved as configuration intent — enforcement wiring is separate.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search rules..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9" />
            </div>
            <div className="flex gap-1.5 flex-wrap">
              <Badge variant={catFilter === null ? 'default' : 'outline'} className="cursor-pointer" onClick={() => setCatFilter(null)}>All</Badge>
              {CATEGORIES.map(c => (
                <Badge key={c} variant={catFilter === c ? 'default' : 'outline'} className="cursor-pointer" onClick={() => setCatFilter(c)}>{c}</Badge>
              ))}
            </div>
            <Button size="sm" disabled={!dirty || upsert.isPending} onClick={handleSave}>
              <Save className="h-4 w-4 mr-1" />{upsert.isPending ? 'Saving…' : 'Save Rules'}
            </Button>
          </div>

          {/* Table */}
          <div className="border rounded-md overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[140px]">Rule</TableHead>
                  <TableHead className="min-w-[200px]">Description</TableHead>
                  <TableHead className="min-w-[100px]">Category</TableHead>
                  {ROLE_COLS.map(r => <TableHead key={r} className="text-center w-16">{ROLE_LABELS[r]}</TableHead>)}
                  <TableHead className="text-center w-20">Enabled</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No rules match your search</TableCell></TableRow>
                ) : filtered.map(rule => (
                  <TableRow key={rule.id}>
                    <TableCell className="font-medium text-sm">{rule.rule_name}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{rule.description}</TableCell>
                    <TableCell><Badge variant="secondary" className="text-xs">{rule.category}</Badge></TableCell>
                    {ROLE_COLS.map(col => (
                      <TableCell key={col} className="text-center">
                        <Checkbox checked={rule[col]} onCheckedChange={() => toggle(rule.id, col)} />
                      </TableCell>
                    ))}
                    <TableCell className="text-center">
                      <Switch checked={rule.enabled} onCheckedChange={() => toggle(rule.id, 'enabled')} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </PlatformLayout>
  );
}
