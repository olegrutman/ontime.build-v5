import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { HardHat, Clock, DollarSign, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import type { ChangeOrderTCLabor } from '@/types/changeOrderProject';

interface GCLaborReviewPanelProps {
  tcLabor: ChangeOrderTCLabor[];
  tcCompanyName?: string;
  laborTotal?: number;
}

export function GCLaborReviewPanel({ tcLabor, tcCompanyName, laborTotal }: GCLaborReviewPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const totalLabor = tcLabor.length > 0
    ? tcLabor.reduce((sum, entry) => sum + (entry.labor_total || 0), 0)
    : (laborTotal ?? 0);
  const title = tcCompanyName ? `Labor – ${tcCompanyName}` : 'Trade Contractor Labor';

  if (tcLabor.length === 0 && totalLabor <= 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <HardHat className="h-4 w-4 text-primary" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No labor entries submitted yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="pb-3 cursor-pointer hover:bg-muted/30 transition-colors">
            <CardTitle className="flex items-center justify-between text-base">
              <div className="flex items-center gap-2">
                <HardHat className="h-4 w-4 text-primary" />
                {title}
              </div>
              <ChevronDown className={cn('w-4 h-4 text-muted-foreground transition-transform', isOpen && 'rotate-180')} />
            </CardTitle>
            {/* Collapsed summary */}
            {!isOpen && (
              <div className="flex items-center justify-between mt-2 text-sm">
                <span className="text-muted-foreground">Responsible: Trade Contractor</span>
                <span className="font-semibold">
                  ${totalLabor.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            )}
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-4 pt-0">
            <Table>
              <TableBody>
                {tcLabor.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="py-3">
                      <div className="flex items-start gap-3">
                        {entry.pricing_type === 'hourly' ? (
                          <Clock className="h-4 w-4 mt-0.5 text-blue-500 shrink-0" />
                        ) : (
                          <DollarSign className="h-4 w-4 mt-0.5 text-green-500 shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">
                            {entry.description || (entry.pricing_type === 'hourly' ? 'Labor Hours' : 'Labor')}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {entry.pricing_type === 'hourly' ? (
                              <>{entry.hours} hours @ ${entry.hourly_rate?.toFixed(2)}/hr</>
                            ) : (
                              <>Lump Sum</>
                            )}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right py-3 font-medium">
                      ${entry.labor_total?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <Separator />

            <div className="flex justify-between items-center font-semibold">
              <span>Total Labor</span>
              <span className="text-lg">
                ${totalLabor.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="text-sm text-muted-foreground">
              Responsible: Trade Contractor
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
