import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Pencil, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { ReactNode } from 'react';

interface Props {
  coId: string;
  status: string;
  lineItemId?: string | null;
  title: string;
  description: string;
  label?: string;
  onSaved?: () => void;
  /** Optional custom trigger content (e.g. the text being edited). */
  children?: ReactNode;
  triggerClassName?: string;
}

/** Creator-only text editor. On sent orders the creator picks: save quietly or ask for review. */
export function CODescriptionEditor({ coId, status, lineItemId = null, title, description, label = 'Edit description', onSaved, children, triggerClassName }: Props) {
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

  const openEditor = (e: React.MouseEvent) => { e.stopPropagation(); setT(title); setD(description); setOpen(true); };
  return (
    <>
      <button type="button" aria-label={label} title={label} onClick={openEditor}
        className={triggerClassName ?? 'p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors shrink-0'}>
        {children ?? <Pencil className="h-3.5 w-3.5" />}
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90dvh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>{label}</DialogTitle>
            {sent && <DialogDescription>Prices don't change. Choose whether the other company needs to approve this wording.</DialogDescription>}
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="co-desc-title">Title</Label>
              <Input id="co-desc-title" value={t} maxLength={lineItemId ? 200 : 100} onChange={(e) => setT(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="co-desc-body">Description</Label>
              <Textarea id="co-desc-body" value={d} rows={6} onChange={(e) => setD(e.target.value)} />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            {saving && <Loader2 className="h-4 w-4 animate-spin self-center" />}
            {sent ? (
              <>
                <Button variant="outline" disabled={saving} onClick={() => save(false)}>Save without approval</Button>
                <Button disabled={saving} onClick={() => save(true)}>Save &amp; request approval</Button>
              </>
            ) : (
              <Button disabled={saving} onClick={() => save(false)}>Save</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
