import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Pencil, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface Props {
  coId: string;
  status: string;
  lineItemId?: string | null;
  title: string;
  description: string;
  label?: string;
  onSaved?: () => void;
}

/** Creator-only text editor. On sent orders the creator picks: save quietly or ask for review. */
export function CODescriptionEditor({ coId, status, lineItemId = null, title, description, label = 'Edit description', onSaved }: Props) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [t, setT] = useState(title);
  const [d, setD] = useState(description);
  const [saving, setSaving] = useState(false);
  const sent = status !== 'draft';

  async function save(requestReview: boolean) {
    setSaving(true);
    const { error } = await supabase.rpc('update_co_description', {
      _co_id: coId, _line_item_id: lineItemId as string, _title: t, _description: d, _request_review: requestReview,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(requestReview ? 'Saved and sent for review' : 'Description updated');
    setOpen(false);
    qc.invalidateQueries({ queryKey: ['co-detail', coId] });
    qc.invalidateQueries({ queryKey: ['co-corrections'] });
    onSaved?.();
  }

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (o) { setT(title); setD(description); } }}>
      <PopoverTrigger asChild>
        <button type="button" aria-label={label} title={label}
          className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors shrink-0"
          onClick={(e) => e.stopPropagation()}>
          <Pencil className="h-3.5 w-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[calc(100vw-2.5rem)] max-w-md p-4 space-y-3" onClick={(e) => e.stopPropagation()}>
        <p className="text-sm font-bold text-foreground">{label}</p>
        <div>
          <Label className="text-xs text-muted-foreground">Title</Label>
          <Input value={t} maxLength={lineItemId ? 200 : 100} onChange={(e) => setT(e.target.value)} className="h-8 text-sm" />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Description</Label>
          <Textarea value={d} rows={5} onChange={(e) => setD(e.target.value)} className="text-sm" />
        </div>
        {sent && <p className="text-xs text-muted-foreground">Prices don't change. Choose whether the other company needs to approve this wording.</p>}
        <div className="flex flex-wrap justify-end gap-2">
          {saving && <Loader2 className="h-4 w-4 animate-spin self-center" />}
          {sent ? (
            <>
              <Button size="sm" variant="outline" disabled={saving} onClick={() => save(false)}>Save without approval</Button>
              <Button size="sm" disabled={saving} onClick={() => save(true)}>Save &amp; request approval</Button>
            </>
          ) : (
            <Button size="sm" disabled={saving} onClick={() => save(false)}>Save</Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
