import { useState } from 'react';
import { WorkItem, WorkItemType, WorkItemState } from '@/types/workItem';
import { mockWorkItems } from '@/data/mockWorkItems';
import { Header } from '@/components/Header';
import { StatsCards } from '@/components/StatsCards';
import { FilterBar } from '@/components/FilterBar';
import { WorkItemList } from '@/components/WorkItemList';
import { WorkItemDetail } from '@/components/WorkItemDetail';

const Index = () => {
  const [selectedItem, setSelectedItem] = useState<WorkItem | null>(null);
  const [filterType, setFilterType] = useState<WorkItemType | 'ALL'>('ALL');
  const [filterState, setFilterState] = useState<WorkItemState | 'ALL'>('ALL');

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-6">
        {/* Stats Overview */}
        <div className="mb-6">
          <StatsCards items={mockWorkItems} />
        </div>

        {/* Filter Bar */}
        <div className="mb-6">
          <FilterBar
            selectedType={filterType}
            selectedState={filterState}
            onTypeChange={setFilterType}
            onStateChange={setFilterState}
          />
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Work Item List */}
          <div className={selectedItem ? 'lg:col-span-2' : 'lg:col-span-3'}>
            <div className="mb-4">
              <h2 className="text-lg font-semibold">Work Items</h2>
              <p className="text-sm text-muted-foreground">
                Hierarchical view of all project work
              </p>
            </div>
            <WorkItemList
              items={mockWorkItems}
              onSelect={setSelectedItem}
              selectedId={selectedItem?.id}
              filterType={filterType}
              filterState={filterState}
            />
          </div>

          {/* Detail Panel */}
          {selectedItem && (
            <div className="lg:col-span-1">
              <WorkItemDetail
                item={selectedItem}
                onClose={() => setSelectedItem(null)}
              />
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Index;
