import { useDemo } from '@/contexts/DemoContext';
import { getDemoDataForProject, getDemoProjectById, type DemoRole } from '@/data/demoData';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  AlertTriangle,
  FileText,
  Hammer,
  Package,
  Receipt,
  MessageSquareMore,
} from 'lucide-react';

interface Props {
  onNavigate: (tab: string) => void;
}

export function DemoProjectOverview({ onNavigate }: Props) {
  const { demoProjectId, demoRole } = useDemo();
  if (!demoProjectId || !demoRole) return null;

  const project = getDemoProjectById(demoProjectId);
  const data = getDemoDataForProject(demoProjectId, demoRole);
  if (!project || !data) return null;

  const { attentionItems, workOrders, purchaseOrders, invoices, contracts, sovItems } = data;

  return (
    <div className="space-y-4">
      {/* Attention Banner */}
      {attentionItems.length > 0 && (
        <Card data-demo-target="attention-banner" className="border-destructive/30 bg-destructive/5">
          <CardContent className="p-4">
            <h3 className="font-semibold flex items-center gap-2 mb-3">
              <AlertTriangle className="w-4 h-4 text-destructive" />
              Needs Attention ({attentionItems.length})
            </h3>
            <div className="space-y-2">
              {attentionItems.map(item => (
                <div key={item.id} className="flex items-start gap-3 p-2 rounded bg-card border text-sm">
                  <Badge variant={item.urgency === 'high' ? 'destructive' : 'secondary'} className="mt-0.5 text-xs shrink-0">
                    {item.urgency}
                  </Badge>
                  <div>
                    <p className="font-medium">{item.title}</p>
                    <p className="text-muted-foreground text-xs">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Financial Signal (GC/TC) */}
      {(demoRole === 'GC' || demoRole === 'TC') && (
        <div data-demo-target="financial-signal" className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground mb-1">Contract Value</p>
              <p className="text-xl font-bold">${contracts.reduce((s, c) => s + c.contract_value, 0).toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground mb-1">Billed to Date</p>
              <p className="text-xl font-bold">${sovItems.reduce((s, i) => s + i.billed_to_date, 0).toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground mb-1">Retainage Held</p>
              <p className="text-xl font-bold">${sovItems.reduce((s, i) => s + i.retainage, 0).toLocaleString()}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Operational Grid */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Work Orders */}
        {demoRole !== 'SUPPLIER' && (
          <Card data-demo-target="wo-section">
            <CardContent className="p-4">
              <button onClick={() => onNavigate('work-orders')} className="flex items-center gap-2 font-semibold mb-3 hover:text-primary transition-colors">
                <Hammer className="w-4 h-4" />
                Work Orders ({workOrders.length})
              </button>
              <div data-demo-target="wo-list" className="space-y-2">
                {workOrders.map((wo, i) => (
                  <div key={wo.id} data-demo-target={`wo-card-${i}`} className="p-2 border rounded text-sm flex items-center justify-between">
                    <span>{wo.title}</span>
                    <Badge variant="outline" className="text-xs">{wo.status}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Purchase Orders */}
        <Card data-demo-target="po-section">
          <CardContent className="p-4">
            <button onClick={() => onNavigate('purchase-orders')} className="flex items-center gap-2 font-semibold mb-3 hover:text-primary transition-colors">
              <Package className="w-4 h-4" />
              Purchase Orders ({purchaseOrders.length})
            </button>
            <div data-demo-target="po-list" className="space-y-2">
              {purchaseOrders.map((po, i) => (
                <div key={po.id} data-demo-target={`po-card-${i}`} className="p-2 border rounded text-sm flex items-center justify-between">
                  <div>
                    <span className="font-medium">{po.po_number}</span>
                    <span className="text-muted-foreground ml-2">{po.supplier_name}</span>
                  </div>
                  <Badge variant="outline" className="text-xs">{po.status}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Invoices */}
        {demoRole !== 'SUPPLIER' && (
          <Card data-demo-target="invoice-section">
            <CardContent className="p-4">
              <button onClick={() => onNavigate('invoices')} className="flex items-center gap-2 font-semibold mb-3 hover:text-primary transition-colors">
                <Receipt className="w-4 h-4" />
                Invoices ({invoices.length})
              </button>
              <div data-demo-target="invoice-list" className="space-y-2">
                {invoices.map(inv => (
                  <div key={inv.id} className="p-2 border rounded text-sm flex items-center justify-between">
                    <div>
                      <span className="font-medium">{inv.invoice_number}</span>
                      <span className="text-muted-foreground ml-2">${inv.total_amount.toLocaleString()}</span>
                    </div>
                    <Badge variant="outline" className="text-xs">{inv.status}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Contracts (GC/TC only) */}
        {(demoRole === 'GC' || demoRole === 'TC') && (
          <Card>
            <CardContent className="p-4">
              <h3 className="flex items-center gap-2 font-semibold mb-3">
                <FileText className="w-4 h-4" />
                Contracts ({contracts.length})
              </h3>
              <div className="space-y-2">
                {contracts.map(c => (
                  <div key={c.id} className="p-2 border rounded text-sm">
                    <p className="font-medium">{c.title}</p>
                    <p className="text-xs text-muted-foreground">${c.contract_value.toLocaleString()} · {c.status}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
