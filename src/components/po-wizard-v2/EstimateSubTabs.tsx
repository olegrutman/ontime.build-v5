import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Package, LayoutGrid } from 'lucide-react';
import { PackSelector } from './PackSelector';
import { PSMBrowser } from './PSMBrowser';
import { POWizardV2LineItem } from '@/types/poWizardV2';

interface EstimatePackItem {
  id: string;
  supplier_sku: string | null;
  description: string;
  quantity: number;
  uom: string;
  catalog_item_id: string | null;
  pack_name: string | null;
}

interface EstimatePack {
  name: string;
  items: EstimatePackItem[];
}

interface EstimateSubTabsProps {
  projectId: string;
  supplierId: string | null;
  onSelectPack: (pack: EstimatePack, estimateId: string) => void;
  onSwitchToCatalog: () => void;
  onAddPSMItem: (item: POWizardV2LineItem) => void;
}

export function EstimateSubTabs({
  projectId,
  supplierId,
  onSelectPack,
  onSwitchToCatalog,
  onAddPSMItem,
}: EstimateSubTabsProps) {
  const [tab, setTab] = useState<string>('packs');

  return (
    <div className="space-y-3">
      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="w-full">
          <TabsTrigger value="packs" className="flex-1 gap-1.5">
            <Package className="h-4 w-4" />
            Packs
          </TabsTrigger>
          <TabsTrigger value="psm" className="flex-1 gap-1.5">
            <LayoutGrid className="h-4 w-4" />
            Materials
          </TabsTrigger>
        </TabsList>

        <TabsContent value="packs" className="mt-3">
          <PackSelector
            projectId={projectId}
            supplierId={supplierId}
            onSelectPack={onSelectPack}
            onSwitchToCatalog={onSwitchToCatalog}
          />
        </TabsContent>

        <TabsContent value="psm" className="mt-3">
          <PSMBrowser
            projectId={projectId}
            supplierId={supplierId}
            onAddItem={onAddPSMItem}
            onSwitchToCatalog={onSwitchToCatalog}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
