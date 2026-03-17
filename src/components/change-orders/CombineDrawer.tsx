import { useState } from 'react';
import {
  Drawer,
  DrawerContent,
  DrawerTitle,
  DrawerDescription,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, GitMerge } from 'lucide-react';
import { useChangeOrders } from '@/hooks/useChangeOrders';
import { toast } from 'sonner';

interface CombineDrawerProps {
  open:         boolean;
  onOpenChange: (open: boolean) => void;
  selectedIds:  string[];
  projectId:    string;
  onCombined:   () => void;
}

export function CombineDrawer({
  open,
  onOpenChange,
  selectedIds,
  projectId,
  onCombined,
}: CombineDrawerProps) {
  const { changeOrders, combineCOs } = useChangeOrders(projectId);
  const [title,      setTitle]      = useState('');
  const [submitting, setSubmitting] = useState(false);

  const selected = changeOrders.filter(co => selectedIds.includes(co.id));

  async function handleCombine() {
    setSubmitting(true);
    try {
      await combineCOs.mutateAsync({
        memberCoIds: selectedIds,
        title:       title.trim() || undefined,
      });
      toast.success('Change orders combined');
      setTitle('');
      onCombined();
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to combine');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <div className="mx-auto w-full max-w-md px-4 pb-6 pt-4">
          <DrawerTitle className="flex items-center gap-2 text-lg font-semibold">
            <GitMerge className="h-5 w-5 text-primary" />
            Combine {selectedIds.length} change orders
          </DrawerTitle>
          <DrawerDescription className="text-sm text-muted-foreground mt-1">
            Selected COs will be merged into one combined CO with all their line items.
          </DrawerDescription>

          <div className="mt-4 space-y-3">
            <div className="space-y-2">
              {selected.map(co => (
                <div key={co.id} className="rounded-md border border-border bg-muted/50 px-3 py-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">
                      {co.title ?? co.co_number ?? 'Untitled CO'}
                    </span>
                  </div>
                  {co.location_tag && (
                    <p className="text-xs text-muted-foreground mt-0.5">{co.location_tag}</p>
                  )}
                </div>
              ))}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="combine-title" className="text-sm">
                Combined CO title (optional)
              </Label>
              <Input
                id="combine-title"
                placeholder="e.g. Combined – Kitchen changes"
                value={title}
                onChange={e => setTitle(e.target.value)}
              />
            </div>
          </div>

          <div className="flex gap-2 mt-6">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              className="flex-1 gap-1.5"
              onClick={handleCombine}
              disabled={submitting || selectedIds.length < 2}
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <GitMerge className="h-4 w-4" />
              )}
              Combine
            </Button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
