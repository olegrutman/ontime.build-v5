import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useIsMobile } from '@/hooks/use-mobile';
import { useWorkOrderCatalog } from '@/hooks/useWorkOrderCatalog';
import { useWorkOrderLog } from '@/hooks/useWorkOrderLog';
import { QuickLogKPIStrip } from './QuickLogKPIStrip';
import { QuickLogAlertBanner } from './QuickLogAlertBanner';
import { CatalogBrowser } from './CatalogBrowser';
import { QuickLogDetailPanel } from './QuickLogDetailPanel';
import { LoggedItemsList } from './LoggedItemsList';
import { SubmitAllSheet } from './SubmitAllSheet';
import { QuickLogMobileSheet } from './QuickLogMobileSheet';
import type { CatalogItem } from '@/types/quickLog';

interface QuickLogViewProps {
  projectId: string;
  orgId: string;
}

export function QuickLogView({ projectId, orgId }: QuickLogViewProps) {
  const { currentRole } = useAuth();
  const isMobile = useIsMobile();
  const catalog = useWorkOrderCatalog(orgId);
  const log = useWorkOrderLog(projectId, orgId);
  const [selectedItem, setSelectedItem] = useState<CatalogItem | null>(null);
  const [showSubmitAll, setShowSubmitAll] = useState(false);

  const isGC = currentRole === 'GC_PM';
  const isFC = currentRole === 'FC_PM' || currentRole === 'FS';
  const role = isGC ? 'gc' : isFC ? 'fc' : 'tc';

  const handleItemSelect = (item: CatalogItem | null) => {
    setSelectedItem(item);
  };

  const handleLogSuccess = () => {
    // Keep catalog position, just clear detail
  };

  return (
    <div className="space-y-4">
      <QuickLogKPIStrip
        openCount={log.openCount}
        openTotal={log.openTotal}
        submittedCount={log.submittedCount}
        submittedTotal={log.submittedTotal}
        approvedCount={log.approvedCount}
        approvedTotal={log.approvedTotal}
      />

      <QuickLogAlertBanner
        role={role}
        openCount={log.openCount}
        openTotal={log.openTotal}
        submittedCount={log.submittedCount}
        submittedTotal={log.submittedTotal}
        onSubmit={() => setShowSubmitAll(true)}
      />

      {/* Two-column desktop, single-column mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left: Catalog + Logged items */}
        <div className="space-y-4">
          <CatalogBrowser
            catalog={catalog}
            selectedItemId={selectedItem?.id || null}
            onSelect={handleItemSelect}
          />
          {!isGC && (
            <LoggedItemsList
              items={log.items}
              openCount={log.openCount}
              openTotal={log.openTotal}
              onSubmitAll={() => setShowSubmitAll(true)}
            />
          )}
        </div>

        {/* Right: Detail panel — hidden on mobile, shown in sheet instead */}
        <div className="hidden lg:block sticky top-4 self-start">
          <QuickLogDetailPanel
            item={selectedItem}
            role={role}
            projectId={projectId}
            orgId={orgId}
            onSuccess={handleLogSuccess}
            logItem={log.logItem}
          />
        </div>
      </div>

      {/* Mobile detail sheet */}
      <QuickLogMobileSheet
        open={!!selectedItem}
        onOpenChange={(open) => { if (!open) setSelectedItem(null); }}
        item={selectedItem}
        role={role}
        projectId={projectId}
        orgId={orgId}
        onSuccess={handleLogSuccess}
        logItem={log.logItem}
      />

      <SubmitAllSheet
        open={showSubmitAll}
        onOpenChange={setShowSubmitAll}
        items={log.items.filter(i => i.status === 'open')}
        role={role}
        onConfirm={async () => {
          await log.submitAllOpen.mutateAsync({
            targetStatus: role === 'fc' ? 'submitted_to_tc' : 'submitted_to_gc',
          });
          setShowSubmitAll(false);
        }}
        isSubmitting={log.submitAllOpen.isPending}
      />
    </div>
  );
}
