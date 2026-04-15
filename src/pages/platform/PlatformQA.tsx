import { useState, useEffect } from 'react';
import { PlatformLayout } from '@/components/platform/PlatformLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { FlaskConical, Trash2, RefreshCw, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';

const GC_USER_ID = 'ef6822a5-c7c0-4a0d-8ac6-3e8647d0452a';

interface QAProject {
  id: string;
  name: string;
  project_type: string;
  build_type: string;
  contract_mode: string;
  status: string;
  city: string;
  state: string;
  retainage_percent: number;
  poCount: number;
  coCount: number;
  invoiceCount: number;
  rfiCount: number;
  returnCount: number;
  participantCount: number;
  sovCount: number;
  hasSov: boolean;
  gcConnected: boolean;
  tcConnected: boolean;
  fcConnected: boolean;
  suppConnected: boolean;
  fcPending: boolean;
  hasRejectedInvoice: boolean;
  hasRejectedCO: boolean;
  hasPaidInvoice: boolean;
}

export default function PlatformQA() {
  const [projects, setProjects] = useState<QAProject[]>([]);
  const [loading, setLoading] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [seedResult, setSeedResult] = useState<any>(null);
  const { toast } = useToast();

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const { data: rawProjects } = await supabase
        .from('projects')
        .select('id, name, project_type, build_type, contract_mode, status, city, state, retainage_percent')
        .eq('created_by', GC_USER_ID)
        .order('name');

      if (!rawProjects?.length) { setProjects([]); setLoading(false); return; }

      const enriched: QAProject[] = [];
      for (const p of rawProjects) {
        const [pos, cos, invs, rfis, rets, parts, sovs] = await Promise.all([
          supabase.from('purchase_orders').select('id', { count: 'exact', head: true }).eq('project_id', p.id),
          supabase.from('change_orders').select('id, status', { count: 'exact' }).eq('project_id', p.id),
          supabase.from('invoices').select('id, status', { count: 'exact' }).eq('project_id', p.id),
          supabase.from('project_rfis').select('id', { count: 'exact', head: true }).eq('project_id', p.id),
          supabase.from('returns').select('id', { count: 'exact', head: true }).eq('project_id', p.id),
          supabase.from('project_participants').select('organization_id, role, invite_status').eq('project_id', p.id),
          supabase.from('project_sov').select('id', { count: 'exact', head: true }).eq('project_id', p.id),
        ]);

        const participants = parts.data || [];
        const gcPart = participants.find((pp: any) => pp.role === 'GC');
        const tcPart = participants.find((pp: any) => pp.role === 'TC');
        const fcPart = participants.find((pp: any) => pp.role === 'FC');

        const invoiceData = invs.data || [];
        const coData = cos.data || [];

        enriched.push({
          ...p,
          poCount: pos.count || 0,
          coCount: cos.count || 0,
          invoiceCount: invs.count || 0,
          rfiCount: rfis.count || 0,
          returnCount: rets.count || 0,
          participantCount: participants.length,
          sovCount: sovs.count || 0,
          hasSov: (sovs.count || 0) > 0,
          gcConnected: !!gcPart,
          tcConnected: !!tcPart && tcPart.invite_status === 'accepted',
          fcConnected: !!fcPart && fcPart.invite_status === 'accepted',
          suppConnected: true, // all projects have designated supplier
          fcPending: !!fcPart && fcPart.invite_status === 'pending',
          hasRejectedInvoice: invoiceData.some((i: any) => i.status === 'REJECTED'),
          hasRejectedCO: coData.some((c: any) => c.status === 'rejected'),
          hasPaidInvoice: invoiceData.some((i: any) => i.status === 'PAID'),
        });
      }
      setProjects(enriched);
    } catch (e: any) {
      toast({ title: 'Error loading QA projects', description: e.message, variant: 'destructive' });
    }
    setLoading(false);
  };

  useEffect(() => { fetchProjects(); }, []);

  const handleSeed = async () => {
    setSeeding(true); setSeedResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('seed-qa-environment', { body: { action: 'seed' } });
      if (error) throw error;
      setSeedResult(data);
      toast({ title: 'QA environment seeded', description: `${data.projects?.length || 0} projects created` });
      await fetchProjects();
    } catch (e: any) {
      toast({ title: 'Seed failed', description: e.message, variant: 'destructive' });
    }
    setSeeding(false);
  };

  const handleClear = async () => {
    setClearing(true);
    try {
      const { data, error } = await supabase.functions.invoke('seed-qa-environment', { body: { action: 'clear' } });
      if (error) throw error;
      toast({ title: 'QA data cleared', description: `${data.deleted || 0} projects removed` });
      setSeedResult(null);
      await fetchProjects();
    } catch (e: any) {
      toast({ title: 'Clear failed', description: e.message, variant: 'destructive' });
    }
    setClearing(false);
  };

  const totalPOs = projects.reduce((s, p) => s + p.poCount, 0);
  const totalCOs = projects.reduce((s, p) => s + p.coCount, 0);
  const totalInvoices = projects.reduce((s, p) => s + p.invoiceCount, 0);
  const totalRFIs = projects.reduce((s, p) => s + p.rfiCount, 0);
  const totalReturns = projects.reduce((s, p) => s + p.returnCount, 0);

  return (
    <PlatformLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <FlaskConical className="h-6 w-6" /> QA Test Environment
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Seed and manage test data across all project types, workflows, and role interactions.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchProjects} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </Button>
            <Button variant="destructive" size="sm" onClick={handleClear} disabled={clearing || !projects.length}>
              <Trash2 className="h-4 w-4 mr-1" /> {clearing ? 'Clearing...' : 'Clear QA Data'}
            </Button>
            <Button size="sm" onClick={handleSeed} disabled={seeding}>
              <FlaskConical className="h-4 w-4 mr-1" /> {seeding ? 'Seeding...' : 'Seed QA Environment'}
            </Button>
          </div>
        </div>

        {/* Summary KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          {[
            { label: 'Projects', value: projects.length },
            { label: 'POs', value: totalPOs },
            { label: 'COs / WOs', value: totalCOs },
            { label: 'Invoices', value: totalInvoices },
            { label: 'RFIs', value: totalRFIs },
            { label: 'Returns', value: totalReturns },
          ].map(k => (
            <Card key={k.label} className="p-3 text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">{k.label}</p>
              <p className="text-2xl font-bold mt-1">{k.value}</p>
            </Card>
          ))}
        </div>

        {/* Seed result */}
        {seedResult && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Last Seed Result</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-xs bg-muted p-3 rounded-lg overflow-auto max-h-48">
                {JSON.stringify(seedResult, null, 2)}
              </pre>
            </CardContent>
          </Card>
        )}

        {/* Projects table */}
        {loading ? (
          <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
        ) : projects.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">No QA projects found. Click "Seed QA Environment" to create test data.</p>
          </Card>
        ) : (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">QA Projects</CardTitle>
              <CardDescription>{projects.length} projects seeded</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-2 font-medium">Project</th>
                      <th className="text-left p-2 font-medium">Type</th>
                      <th className="text-left p-2 font-medium">Mode</th>
                      <th className="text-center p-2 font-medium">Roles</th>
                      <th className="text-center p-2 font-medium">SOV</th>
                      <th className="text-center p-2 font-medium">POs</th>
                      <th className="text-center p-2 font-medium">COs</th>
                      <th className="text-center p-2 font-medium">Inv</th>
                      <th className="text-center p-2 font-medium">RFIs</th>
                      <th className="text-center p-2 font-medium">Ret</th>
                      <th className="text-left p-2 font-medium">Flags</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projects.map(p => (
                      <tr key={p.id} className="border-b hover:bg-muted/30 transition-colors">
                        <td className="p-2">
                          <div className="font-medium">{p.name}</div>
                          <div className="text-muted-foreground">{p.city}, {p.state}</div>
                        </td>
                        <td className="p-2">
                          <Badge variant="outline" className="text-[10px]">{p.project_type}</Badge>
                          <div className="text-muted-foreground mt-0.5">{p.build_type}</div>
                        </td>
                        <td className="p-2">
                          <Badge variant={p.contract_mode === 'tm' ? 'secondary' : 'outline'} className="text-[10px]">
                            {p.contract_mode === 'tm' ? 'T&M' : 'Fixed'}
                          </Badge>
                        </td>
                        <td className="p-2 text-center">
                          <div className="flex justify-center gap-0.5 flex-wrap">
                            {p.gcConnected && <Badge className="bg-green-600 text-[9px] px-1">GC</Badge>}
                            {p.tcConnected && <Badge className="bg-blue-600 text-[9px] px-1">TC</Badge>}
                            {p.fcConnected && <Badge className="bg-purple-600 text-[9px] px-1">FC</Badge>}
                            {p.fcPending && <Badge variant="outline" className="text-[9px] px-1 border-orange-400 text-orange-500">FC⏳</Badge>}
                            {p.suppConnected && <Badge className="bg-amber-600 text-[9px] px-1">SUP</Badge>}
                          </div>
                        </td>
                        <td className="p-2 text-center">
                          {p.hasSov ? <CheckCircle2 className="h-4 w-4 text-green-500 mx-auto" /> : <XCircle className="h-4 w-4 text-red-400 mx-auto" />}
                        </td>
                        <td className="p-2 text-center font-mono">{p.poCount}</td>
                        <td className="p-2 text-center font-mono">{p.coCount}</td>
                        <td className="p-2 text-center font-mono">{p.invoiceCount}</td>
                        <td className="p-2 text-center font-mono">{p.rfiCount}</td>
                        <td className="p-2 text-center font-mono">{p.returnCount}</td>
                        <td className="p-2">
                          <div className="flex flex-wrap gap-0.5">
                            {p.hasRejectedInvoice && <Badge variant="destructive" className="text-[9px] px-1">Rej Inv</Badge>}
                            {p.hasRejectedCO && <Badge variant="destructive" className="text-[9px] px-1">Rej CO</Badge>}
                            {p.hasPaidInvoice && <Badge className="bg-green-600 text-[9px] px-1">Paid</Badge>}
                            {!p.hasSov && <Badge variant="outline" className="text-[9px] px-1 text-orange-500">No SOV</Badge>}
                            {p.fcPending && <Badge variant="outline" className="text-[9px] px-1 text-orange-500">FC Pending</Badge>}
                            {p.status === 'setup' && <Badge variant="outline" className="text-[9px] px-1">Setup</Badge>}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </PlatformLayout>
  );
}