import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Download, Loader2, CalendarDays } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function PaymentApplicationsPage() {
  const { id: projectId } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [selectedCOs, setSelectedCOs] = useState<Set<string>>(new Set());
  const [periodFrom, setPeriodFrom] = useState('');
  const [periodTo, setPeriodTo] = useState('');
  const [generating, setGenerating] = useState(false);

  // Fetch approved/contracted COs
  const { data: approvedCOs = [] } = useQuery({
    queryKey: ['approved-cos', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('change_orders')
        .select('id, co_number, title, status, approved_at, created_at')
        .eq('project_id', projectId!)
        .in('status', ['approved', 'contracted'])
        .order('created_at');
      if (error) throw error;
      return data ?? [];
    },
  });

  // Fetch previous payment applications
  const { data: previousApps = [] } = useQuery({
    queryKey: ['payment-applications', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payment_applications')
        .select('*')
        .eq('project_id', projectId!)
        .order('application_number', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const toggleCO = (coId: string) => {
    setSelectedCOs(prev => {
      const next = new Set(prev);
      if (next.has(coId)) next.delete(coId);
      else next.add(coId);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedCOs.size === approvedCOs.length) {
      setSelectedCOs(new Set());
    } else {
      setSelectedCOs(new Set(approvedCOs.map(co => co.id)));
    }
  };

  const handleGenerate = async () => {
    if (selectedCOs.size === 0) {
      toast.error('Select at least one change order');
      return;
    }
    setGenerating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-payment-app-pdf`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({
            project_id: projectId,
            co_ids: Array.from(selectedCOs),
            period_from: periodFrom || undefined,
            period_to: periodTo || undefined,
          }),
        }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Failed to generate PDF' }));
        throw new Error(err.error);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `PaymentApplication.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Payment application downloaded');
    } catch (e: any) {
      toast.error(e.message ?? 'Failed to generate payment application');
    } finally {
      setGenerating(false);
    }
  };

  const fmt = (n: number) => '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading text-lg font-bold uppercase tracking-wide text-foreground">Payment Applications</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Generate payment application documents from approved change orders</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: CO selector */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="border-border rounded-2xl">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-heading uppercase tracking-wide">Select Change Orders</CardTitle>
                <Button variant="ghost" size="sm" className="text-xs h-7" onClick={selectAll}>
                  {selectedCOs.size === approvedCOs.length ? 'Deselect All' : 'Select All'}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-1">
              {approvedCOs.length === 0 && (
                <p className="text-sm text-muted-foreground py-6 text-center">No approved change orders available</p>
              )}
              {approvedCOs.map(co => (
                <label
                  key={co.id}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-colors',
                    selectedCOs.has(co.id) ? 'bg-primary/5 border border-primary/20' : 'hover:bg-muted/50 border border-transparent'
                  )}
                >
                  <Checkbox
                    checked={selectedCOs.has(co.id)}
                    onCheckedChange={() => toggleCO(co.id)}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-foreground">{co.co_number ?? '—'}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium">
                        {co.status}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground truncate mt-0.5">{co.title ?? 'Untitled'}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {co.approved_at ? new Date(co.approved_at).toLocaleDateString() : '—'}
                  </span>
                </label>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Right: period + generate */}
        <div className="space-y-4">
          <Card className="border-border rounded-2xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-heading uppercase tracking-wide flex items-center gap-2">
                <CalendarDays className="h-4 w-4" /> Billing Period
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-xs text-muted-foreground">From</Label>
                <Input type="date" value={periodFrom} onChange={e => setPeriodFrom(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">To</Label>
                <Input type="date" value={periodTo} onChange={e => setPeriodTo(e.target.value)} />
              </div>
            </CardContent>
          </Card>

          <Button
            className="w-full gap-2"
            size="lg"
            onClick={handleGenerate}
            disabled={generating || selectedCOs.size === 0}
          >
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Generate Payment Application
          </Button>

          <p className="text-[11px] text-muted-foreground text-center">
            {selectedCOs.size} change order{selectedCOs.size !== 1 ? 's' : ''} selected
          </p>
        </div>
      </div>

      {/* Previous applications */}
      {previousApps.length > 0 && (
        <Card className="border-border rounded-2xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-heading uppercase tracking-wide">Previous Applications</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {previousApps.map((app: any) => (
                <div key={app.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted/50">
                  <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">Application #{app.application_number}</p>
                    <p className="text-xs text-muted-foreground">
                      {app.period_from && app.period_to
                        ? `${new Date(app.period_from).toLocaleDateString()} — ${new Date(app.period_to).toLocaleDateString()}`
                        : new Date(app.created_at).toLocaleDateString()
                      }
                    </p>
                  </div>
                  <span className="text-sm font-mono font-bold">{fmt(app.current_payment_due)}</span>
                  <span className={cn(
                    'text-xs px-2 py-0.5 rounded-full font-medium',
                    app.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                    app.status === 'submitted' ? 'bg-amber-100 text-amber-700' :
                    'bg-muted text-muted-foreground'
                  )}>
                    {app.status}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
