import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Building2, Building, FileText, Package, MessageSquare, ChevronDown, ChevronUp } from 'lucide-react';
import { POWizardData } from '@/types/poWizard';

interface ReviewStepProps {
  data: POWizardData;
}

export function ReviewStep({ data }: ReviewStepProps) {
  const [itemsExpanded, setItemsExpanded] = useState(false);

  const totalItems = data.line_items.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold mb-1">Review Order</h2>
        <p className="text-muted-foreground text-sm">
          Confirm details before creating
        </p>
      </div>

      {/* Supplier */}
      <Card className="p-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Building2 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Supplier</p>
            <p className="font-medium">{data.supplier_name || 'Not selected'}</p>
          </div>
        </div>
      </Card>

      {/* Project */}
      <Card className="p-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Building className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-xs text-muted-foreground">Project</p>
            <p className="font-medium">{data.project_name || 'Not selected'}</p>
            {data.work_item_title && (
              <div className="flex items-center gap-1 mt-1">
                <FileText className="h-3 w-3 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{data.work_item_title}</span>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Items */}
      <Collapsible open={itemsExpanded} onOpenChange={setItemsExpanded}>
        <Card className="p-4">
          <CollapsibleTrigger className="w-full">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Package className="h-5 w-5 text-primary" />
                </div>
                <div className="text-left">
                  <p className="text-xs text-muted-foreground">Items</p>
                  <p className="font-medium">
                    {data.line_items.length} line item{data.line_items.length !== 1 ? 's' : ''}
                    {totalItems > 0 && (
                      <span className="text-muted-foreground font-normal">
                        {' '}({totalItems} units)
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-primary">
                  {itemsExpanded ? 'Hide' : 'View'}
                </span>
                {itemsExpanded ? (
                  <ChevronUp className="h-4 w-4 text-primary" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-primary" />
                )}
              </div>
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mt-4 pt-4 border-t space-y-2">
              {data.line_items.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between text-sm py-2">
                  <div className="flex-1 min-w-0">
                    <code className="text-xs font-mono bg-muted px-1 py-0.5 rounded">
                      {item.supplier_sku}
                    </code>
                    <p className="text-muted-foreground truncate mt-0.5">
                      {item.description}
                    </p>
                  </div>
                  <Badge variant="outline" className="ml-2 shrink-0">
                    {item.quantity} {item.uom}
                  </Badge>
                </div>
              ))}
            </div>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Notes */}
      {data.notes && (
        <Card className="p-4">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <MessageSquare className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground">Notes</p>
              <p className="text-sm whitespace-pre-wrap">{data.notes}</p>
            </div>
          </div>
        </Card>
      )}

      {/* Validation Summary */}
      {(!data.supplier_id || !data.project_id || data.line_items.length === 0) && (
        <Card className="p-4 border-destructive/50 bg-destructive/5">
          <p className="text-sm text-destructive font-medium mb-2">Missing required items:</p>
          <ul className="text-sm text-destructive/80 space-y-1">
            {!data.supplier_id && <li>• Select a supplier</li>}
            {!data.project_id && <li>• Select a project</li>}
            {data.line_items.length === 0 && <li>• Add at least one item</li>}
          </ul>
        </Card>
      )}
    </div>
  );
}
