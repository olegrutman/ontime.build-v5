import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

interface CascadeBottomSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  downstreamCount: number;
  onCascade: () => void;
  onKeepOthers: () => void;
  onCancel: () => void;
}

export function CascadeBottomSheet({
  open, onOpenChange, downstreamCount, onCascade, onKeepOthers, onCancel,
}: CascadeBottomSheetProps) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader className="text-center">
          <div className="mx-auto mb-2 h-12 w-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
            <AlertTriangle className="h-6 w-6 text-amber-600" />
          </div>
          <DrawerTitle>Schedule Change</DrawerTitle>
          <DrawerDescription>
            This affects <strong>{downstreamCount}</strong> downstream task{downstreamCount !== 1 ? 's' : ''}.
            Cascade changes or keep them in place?
          </DrawerDescription>
        </DrawerHeader>
        <DrawerFooter className="gap-2">
          <Button onClick={onCascade} className="w-full">Cascade All</Button>
          <Button variant="secondary" onClick={onKeepOthers} className="w-full">Keep Others</Button>
          <Button variant="outline" onClick={onCancel} className="w-full">Cancel</Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
