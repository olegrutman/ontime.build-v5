import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Check, Loader2, Pencil } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export function HourlyRateSetting() {
  const { user } = useAuth();

  const [rate, setRate] = useState('');
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [current, setCurrent] = useState<number | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('profiles')
      .select('hourly_rate')
      .eq('user_id', user.id)
      .single()
      .then(({ data }) => {
        if (data?.hourly_rate != null) {
          setCurrent(data.hourly_rate);
          setRate(String(data.hourly_rate));
        }
        setLoading(false);
      });
  }, [user]);

  async function save() {
    const parsed = parseFloat(rate);
    if (!parsed || parsed <= 0 || !user) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ hourly_rate: parsed })
        .eq('id', user.id);
      if (error) throw error;
      setCurrent(parsed);
      setEditing(false);
      toast.success('Hourly rate saved');
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to save rate');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return null;

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-foreground">Default hourly rate</p>
          <p className="text-xs text-muted-foreground">
            Pre-fills when you log labor on change orders
          </p>
        </div>
      </div>

      {editing ? (
        <div className="flex items-center gap-2">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
              $
            </span>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              className="pl-7 w-28 h-8 text-sm"
              placeholder="0.00"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && save()}
            />
          </div>
          <Button size="sm" className="h-8 w-8 p-0" onClick={save} disabled={saving}>
            {saving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Check className="h-3.5 w-3.5" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs"
            onClick={() => {
              setEditing(false);
              setRate(current != null ? String(current) : '');
            }}
            disabled={saving}
          >
            Cancel
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">
            {current != null
              ? `$${current.toLocaleString('en-US', { minimumFractionDigits: 2 })}/hr`
              : 'Not set'}
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs gap-1"
            onClick={() => setEditing(true)}
          >
            <Pencil className="h-3 w-3" />
            {current != null ? 'Edit' : 'Set rate'}
          </Button>
        </div>
      )}
    </div>
  );
}
