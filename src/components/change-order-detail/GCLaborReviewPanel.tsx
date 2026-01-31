import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { HardHat, Clock, DollarSign } from 'lucide-react';
import type { ChangeOrderTCLabor } from '@/types/changeOrderProject';

interface GCLaborReviewPanelProps {
  tcLabor: ChangeOrderTCLabor[];
}

export function GCLaborReviewPanel({ tcLabor }: GCLaborReviewPanelProps) {
  const totalLabor = tcLabor.reduce((sum, entry) => sum + (entry.labor_total || 0), 0);

  if (tcLabor.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <HardHat className="h-5 w-5 text-primary" />
            Trade Contractor Labor
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No labor entries submitted yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <HardHat className="h-5 w-5 text-primary" />
          Trade Contractor Labor
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
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
      </CardContent>
    </Card>
  );
}
