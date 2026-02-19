import { useDemoProjectData } from '@/hooks/useDemoData';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function DemoSOVTab() {
  const data = useDemoProjectData();
  if (!data) return null;

  const { sovItems } = data;

  const totalScheduled = sovItems.reduce((s, i) => s + i.scheduled_value, 0);
  const totalBilled = sovItems.reduce((s, i) => s + i.billed_to_date, 0);
  const totalRetainage = sovItems.reduce((s, i) => s + i.retainage, 0);
  const overallPercent = totalScheduled > 0 ? (totalBilled / totalScheduled) * 100 : 0;

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Schedule of Values</h2>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Overall Progress</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{overallPercent.toFixed(1)}% complete</span>
            <span className="font-medium">${totalBilled.toLocaleString()} / ${totalScheduled.toLocaleString()}</span>
          </div>
          <Progress value={overallPercent} className="h-3" />
          <p className="text-xs text-muted-foreground">
            Retainage held: ${totalRetainage.toLocaleString()}
          </p>
        </CardContent>
      </Card>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">Code</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Scheduled Value</TableHead>
              <TableHead className="text-right">Billed to Date</TableHead>
              <TableHead className="text-right">Retainage</TableHead>
              <TableHead className="text-right">Remaining</TableHead>
              <TableHead className="w-24">%</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sovItems.map(item => {
              const remaining = item.scheduled_value - item.billed_to_date;
              const pct = item.scheduled_value > 0 ? (item.billed_to_date / item.scheduled_value) * 100 : 0;
              return (
                <TableRow key={item.id}>
                  <TableCell className="font-mono text-sm">{item.code}</TableCell>
                  <TableCell className="text-sm">{item.title}</TableCell>
                  <TableCell className="text-right">${item.scheduled_value.toLocaleString()}</TableCell>
                  <TableCell className="text-right">${item.billed_to_date.toLocaleString()}</TableCell>
                  <TableCell className="text-right">${item.retainage.toLocaleString()}</TableCell>
                  <TableCell className="text-right">${remaining.toLocaleString()}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress value={pct} className="h-2 flex-1" />
                      <span className="text-xs w-8 text-right">{pct.toFixed(0)}%</span>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
