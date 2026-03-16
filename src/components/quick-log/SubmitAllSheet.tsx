import { Drawer, DrawerContent, DrawerTitle } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import type { LogItem } from '@/types/quickLog';
import { DIVISION_LABELS } from '@/types/quickLog';

interface SubmitAllSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: LogItem[];
  role: 'fc' | 'tc' | 'gc';
  onConfirm: () => Promise<void>;
  isSubmitting: boolean;
}

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(n);

export function SubmitAllSheet({ open, onOpenChange, items, role, onConfirm, isSubmitting }: SubmitAllSheetProps) {
  // Group by division
  const grouped = items.reduce<Record<string, LogItem[]>>((acc, item) => {
    (acc[item.division] ||= []).push(item);
    return acc;
  }, {});

  const total = items.reduce((sum, i) => sum + (i.line_total || 0), 0);

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[85dvh]">
        <DrawerTitle className="px-4 pt-4 pb-2 text-lg font-bold">
          Submit {items.length} Item{items.length !== 1 ? 's' : ''}
        </DrawerTitle>

        <div className="overflow-y-auto px-4 pb-4 space-y-4">
          {Object.entries(grouped).map(([division, divItems]) => (
            <div key={division}>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                {DIVISION_LABELS[division] || division}
              </h4>
              <div className="space-y-1">
                {divItems.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm py-1">
                    <span className="truncate">{item.item_name}</span>
                    <span className="font-medium shrink-0 ml-2">{fmt(item.line_total)}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div className="border-t border-border pt-3 flex items-center justify-between">
            <span className="font-semibold">Total</span>
            <span className="font-bold text-lg">{fmt(total)}</span>
          </div>
        </div>

        <div className="px-4 pb-4" style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}>
          <Button
            onClick={onConfirm}
            disabled={isSubmitting}
            className="w-full min-h-[48px] text-base font-bold"
            size="lg"
          >
            {isSubmitting && <Loader2 className="h-5 w-5 animate-spin mr-2" />}
            {role === 'fc' ? 'Submit to Trade Contractor' : 'Submit to General Contractor'}
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
