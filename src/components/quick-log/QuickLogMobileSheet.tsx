import { Drawer, DrawerContent, DrawerTitle } from '@/components/ui/drawer';
import { QuickLogDetailPanel } from './QuickLogDetailPanel';
import type { CatalogItem } from '@/types/quickLog';
import type { UseMutationResult } from '@tanstack/react-query';

interface QuickLogMobileSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: CatalogItem | null;
  role: 'fc' | 'tc' | 'gc';
  projectId: string;
  orgId: string;
  onSuccess: () => void;
  logItem: UseMutationResult<any, Error, any>;
}

export function QuickLogMobileSheet({ open, onOpenChange, item, role, projectId, orgId, onSuccess, logItem }: QuickLogMobileSheetProps) {
  if (!item) return null;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[90dvh]">
        <DrawerTitle className="sr-only">Log Work</DrawerTitle>
        <div className="overflow-y-auto px-4 py-4" style={{ maxHeight: 'calc(90dvh - 40px)' }}>
          <QuickLogDetailPanel
            item={item}
            role={role}
            projectId={projectId}
            orgId={orgId}
            onSuccess={() => {
              onSuccess();
              onOpenChange(false);
            }}
            logItem={logItem}
            inline
          />
        </div>
      </DrawerContent>
    </Drawer>
  );
}
