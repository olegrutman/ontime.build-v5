import { useState } from 'react';
import { ArrowLeft, CheckCircle2, Clock3, Hammer, Receipt, ShieldCheck } from 'lucide-react';
import { COHeaderStrip } from '@/components/change-orders/COHeaderStrip';
import { COHeaderCommandPanel } from '@/components/change-orders/COHeaderCommandPanel';
import { Button } from '@/components/ui/button';
import type { ChangeOrder } from '@/types/changeOrder';

const previewOrder = {
  id: 'presentation-only-order',
  org_id: 'presentation-only-subcontractor',
  project_id: 'presentation-only-project',
  created_by_user_id: 'presentation-only-user',
  created_by_role: 'TC',
  co_number: 'WO-5 C-PA-IM-0005',
  title: 'Porch — Gazebo Structural Support Reinforcement',
  status: 'approved',
  pricing_type: 'tm',
  document_type: 'WO',
  problem_summary: 'Steel angles between porch joists to support the gazebo structure.',
} as unknown as ChangeOrder;

const kpis = [
  { label: 'Running actuals', value: '$4,120.00' },
  { label: 'Logged hours', value: '48h' },
  { label: 'Available to invoice', value: '$0.00' },
  { label: 'Billed to date', value: '$4,120.00' },
];

const scopeItems = [
  { name: 'Install steel support angles between porch joists', detail: 'Hourly · 48.0h', amount: '$3,120.00' },
  { name: 'Weld studs to steel angle', detail: 'Lump sum', amount: '$1,000.00' },
];

export default function COActionsDesign2Preview() {
  const [previewMessage, setPreviewMessage] = useState('Presentation-only preview · representative content · no records are read or written');
  const showAction = (label: string) => setPreviewMessage(`Presentation preview · ${label} selected`);

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-card/95">
        <div className="mx-auto flex max-w-[1800px] items-center gap-2 px-4 py-2.5">
          <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <span className="font-mono text-xs font-medium text-foreground">{previewOrder.co_number}</span>
        </div>
      </div>

      <main className="mx-auto max-w-[1800px] space-y-4 px-4 py-4 lg:px-5">
        <p className="rounded-lg border border-type-sov/30 bg-type-sov/10 px-3 py-2 text-xs font-medium text-foreground" role="status">
          {previewMessage}
        </p>

        <COHeaderStrip
          co={previewOrder}
          role="TC"
          myOrgName="IMIS, LLC"
          myOrgId="presentation-only-general-contractor"
          pricingReadiness="ready"
          fromLabel="IMIS, LLC"
          toLabel="Haley Custom Homes"
          documentActions={(
            <COHeaderCommandPanel
              documentType="WO"
              linkedInvoiceNumber="INV-5 C-PA-IM-COMULTI-0002"
              canCreateInvoice
              downloadingPdf={false}
              downloadingProposal={false}
              onDownloadPdf={() => showAction('PDF document')}
              onDownloadProposal={() => showAction('Proposal')}
              onInvoice={() => showAction('linked invoice')}
              onOutsideApproval={() => showAction('Outside approval')}
            />
          )}
        />

        <section aria-label="Order numbers" className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          {kpis.map((kpi) => (
            <div key={kpi.label} className="rounded-xl border-t-2 border-state-approved bg-card px-4 py-3 shadow-sm">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{kpi.label}</p>
              <p className="mt-2 font-mono text-lg font-semibold text-foreground">{kpi.value}</p>
            </div>
          ))}
        </section>

        <div className="grid items-start gap-3 xl:grid-cols-[minmax(0,1fr)_340px]">
          <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm" aria-labelledby="preview-scope-title">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-4">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-command text-command-foreground"><Hammer className="h-4 w-4" /></span>
                <div>
                  <h2 id="preview-scope-title" className="font-heading text-base font-bold uppercase tracking-wide">Scope &amp; Labor</h2>
                  <p className="mt-1 text-[11px] text-muted-foreground">2 items · open an item to review or log dated actuals</p>
                </div>
              </div>
              <Button size="sm">Add item</Button>
            </div>
            <div className="border-b border-border px-4 py-3 text-xs text-muted-foreground">
              <p>Pricing method: <span className="font-semibold text-foreground">Use crew hours</span></p>
              <p className="mt-2">48 hours logged · Running actuals update as dated entries are saved</p>
            </div>
            <div className="space-y-2 p-3">
              {scopeItems.map((item, index) => (
                <div key={item.name} className="flex flex-wrap items-center gap-3 rounded-xl border border-border p-3 sm:flex-nowrap">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-state-open-bg font-mono text-xs">{index + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="break-words text-sm font-semibold">{item.name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{item.detail}</p>
                  </div>
                  <span className="font-mono text-sm font-semibold">{item.amount}</span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-state-approved-bg px-2 py-1 text-[10px] font-semibold text-state-approved"><CheckCircle2 className="h-3 w-3" />Approved</span>
                </div>
              ))}
            </div>
          </section>

          <aside className="space-y-3">
            <section className="space-y-3 rounded-2xl border-2 border-primary/30 bg-card p-3 shadow-sm" aria-label="Actions">
              <Button className="w-full gap-2"><Clock3 className="h-4 w-4" />Log hours &amp; actuals</Button>
              <Button variant="outline" className="w-full gap-2"><Receipt className="h-4 w-4" />Close out order</Button>
            </section>
            <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground"><ShieldCheck className="h-4 w-4" />Team</h2>
              <div className="mt-3 space-y-2 text-sm">
                <p className="rounded-lg bg-muted/50 px-3 py-2 font-medium">IMIS, LLC</p>
                <p className="rounded-lg bg-muted/50 px-3 py-2 font-medium">Haley Custom Homes</p>
                <p className="rounded-lg bg-muted/50 px-3 py-2 font-medium">Pacifico Builders</p>
              </div>
            </section>
          </aside>
        </div>
      </main>
    </div>
  );
}
