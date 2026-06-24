import { AppLayout } from '@/components/layout';
import { CatalogSearch } from '@/components/CatalogSearch';
import { Card } from '@/components/ui/card';

export default function CatalogPage() {
  return (
    <AppLayout title="Product Catalog" subtitle="Search supplier catalogs by SKU or description">
      <div>
        <Card className="p-4 sm:p-6">
          <CatalogSearch />
        </Card>
      </div>
    </AppLayout>
  );
}
