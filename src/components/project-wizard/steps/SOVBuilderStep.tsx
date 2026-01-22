import { useEffect } from 'react';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ProjectWizardData, SOVLineItem } from '@/types/project';

interface SOVBuilderStepProps {
  data: ProjectWizardData;
  onChange: (data: Partial<ProjectWizardData>) => void;
}

export function SOVBuilderStep({ data, onChange }: SOVBuilderStepProps) {
  // Auto-generate SOV items based on scope if not already generated
  useEffect(() => {
    if (data.sov_items.length > 0) return;

    const items: SOVLineItem[] = [];
    let lineNumber = 1;

    // Add mobilization if enabled
    if (data.mobilization_enabled) {
      items.push({
        id: crypto.randomUUID(),
        code: `SOV-${String(lineNumber++).padStart(3, '0')}`,
        title: 'Mobilization',
        description: 'Project mobilization and setup',
      });
    }

    // Add items per structure
    data.structures.forEach((structure) => {
      // Foundation
      items.push({
        id: crypto.randomUUID(),
        code: `SOV-${String(lineNumber++).padStart(3, '0')}`,
        title: `${structure.name} - Foundation`,
        description: `Foundation framing for ${structure.name}`,
        structure_id: structure.id,
      });

      // Floors
      for (let floor = 1; floor <= (data.scope.floors || 1); floor++) {
        items.push({
          id: crypto.randomUUID(),
          code: `SOV-${String(lineNumber++).padStart(3, '0')}`,
          title: `${structure.name} - Floor ${floor} Framing`,
          description: `Floor ${floor} wall and floor framing`,
          structure_id: structure.id,
          floor: `Floor ${floor}`,
        });
      }

      // Roof
      items.push({
        id: crypto.randomUUID(),
        code: `SOV-${String(lineNumber++).padStart(3, '0')}`,
        title: `${structure.name} - Roof Framing`,
        description: `Roof framing and sheathing`,
        structure_id: structure.id,
      });

      // Stairs if applicable
      if (data.scope.has_stairs && (data.scope.floors || 1) > 1) {
        items.push({
          id: crypto.randomUUID(),
          code: `SOV-${String(lineNumber++).padStart(3, '0')}`,
          title: `${structure.name} - Stairs`,
          description: 'Stair framing',
          structure_id: structure.id,
        });
      }
    });

    onChange({ sov_items: items });
  }, [data.structures, data.scope, data.mobilization_enabled]);

  const updateItem = (id: string, updates: Partial<SOVLineItem>) => {
    onChange({
      sov_items: data.sov_items.map((item) =>
        item.id === id ? { ...item, ...updates } : item
      ),
    });
  };

  const removeItem = (id: string) => {
    onChange({ sov_items: data.sov_items.filter((item) => item.id !== id) });
  };

  const addItem = () => {
    const nextNum = data.sov_items.length + 1;
    const newItem: SOVLineItem = {
      id: crypto.randomUUID(),
      code: `SOV-${String(nextNum).padStart(3, '0')}`,
      title: '',
      description: '',
    };
    onChange({ sov_items: [...data.sov_items, newItem] });
  };

  const formatCurrency = (value: number | undefined) => {
    if (!value) return '';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const totalAmount = data.sov_items.reduce((sum, item) => sum + (item.amount || 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Schedule of Values</h2>
        <p className="text-sm text-muted-foreground">
          Review and edit the auto-generated SOV line items. You can add, remove, or modify items.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">SOV Line Items</CardTitle>
            <Button size="sm" onClick={addItem}>
              <Plus className="mr-2 h-4 w-4" />
              Add Line
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"></TableHead>
                  <TableHead className="w-24">Code</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead className="w-40">Amount</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.sov_items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={item.code}
                        onChange={(e) => updateItem(item.id, { code: e.target.value })}
                        className="h-8"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={item.title}
                        onChange={(e) => updateItem(item.id, { title: e.target.value })}
                        placeholder="Enter title"
                        className="h-8"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={item.amount || ''}
                        onChange={(e) => updateItem(item.id, { amount: parseFloat(e.target.value) || 0 })}
                        placeholder="$0"
                        className="h-8"
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => removeItem(item.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {data.sov_items.length > 0 && (
            <div className="flex justify-end mt-4 pt-4 border-t">
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Total Contract Value</p>
                <p className="text-xl font-semibold">{formatCurrency(totalAmount)}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
