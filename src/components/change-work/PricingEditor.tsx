import { useState } from 'react';
import { ChangeWorkPricing } from '@/types/changeWork';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Trash2, Save } from 'lucide-react';

interface PricingEditorProps {
  pricing: ChangeWorkPricing[];
  workItemId: string;
  readOnly?: boolean;
  onAdd: (data: {
    work_item_id: string;
    description: string;
    quantity: number;
    unit_price: number;
    uom: string;
  }) => void;
  onUpdate: (data: {
    id: string;
    work_item_id: string;
    description?: string;
    quantity?: number;
    unit_price?: number;
    uom?: string;
  }) => void;
  onDelete: (data: { id: string; work_item_id: string }) => void;
}

export function PricingEditor({
  pricing,
  workItemId,
  readOnly = false,
  onAdd,
  onUpdate,
  onDelete,
}: PricingEditorProps) {
  const [newItem, setNewItem] = useState({
    description: '',
    quantity: 1,
    unit_price: 0,
    uom: 'EA',
  });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<ChangeWorkPricing>>({});

  const total = pricing.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const handleAdd = () => {
    if (!newItem.description) return;
    onAdd({
      work_item_id: workItemId,
      ...newItem,
    });
    setNewItem({ description: '', quantity: 1, unit_price: 0, uom: 'EA' });
  };

  const handleSaveEdit = (id: string) => {
    onUpdate({
      id,
      work_item_id: workItemId,
      ...editValues,
    });
    setEditingId(null);
    setEditValues({});
  };

  const startEdit = (item: ChangeWorkPricing) => {
    setEditingId(item.id);
    setEditValues({
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unit_price,
      uom: item.uom,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-medium">Pricing Breakdown</h4>
        <p className="font-semibold">Total: {formatCurrency(total)}</p>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[40%]">Description</TableHead>
            <TableHead className="text-right">Qty</TableHead>
            <TableHead className="text-right">Unit Price</TableHead>
            <TableHead>UOM</TableHead>
            <TableHead className="text-right">Total</TableHead>
            {!readOnly && <TableHead className="w-[80px]"></TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {pricing.map((item) => (
            <TableRow key={item.id}>
              {editingId === item.id ? (
                <>
                  <TableCell>
                    <Input
                      value={editValues.description || ''}
                      onChange={(e) => setEditValues({ ...editValues, description: e.target.value })}
                      className="h-8"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={editValues.quantity || 0}
                      onChange={(e) => setEditValues({ ...editValues, quantity: Number(e.target.value) })}
                      className="h-8 w-20 text-right"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      step="0.01"
                      value={editValues.unit_price || 0}
                      onChange={(e) => setEditValues({ ...editValues, unit_price: Number(e.target.value) })}
                      className="h-8 w-24 text-right"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      value={editValues.uom || ''}
                      onChange={(e) => setEditValues({ ...editValues, uom: e.target.value })}
                      className="h-8 w-16"
                    />
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency((editValues.quantity || 0) * (editValues.unit_price || 0))}
                  </TableCell>
                  <TableCell>
                    <Button size="sm" variant="ghost" onClick={() => handleSaveEdit(item.id)}>
                      <Save className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </>
              ) : (
                <>
                  <TableCell 
                    className={readOnly ? '' : 'cursor-pointer hover:bg-muted/50'}
                    onClick={() => !readOnly && startEdit(item)}
                  >
                    {item.description}
                  </TableCell>
                  <TableCell className="text-right">{item.quantity}</TableCell>
                  <TableCell className="text-right">{formatCurrency(item.unit_price)}</TableCell>
                  <TableCell>{item.uom}</TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(item.quantity * item.unit_price)}
                  </TableCell>
                  {!readOnly && (
                    <TableCell>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        onClick={() => onDelete({ id: item.id, work_item_id: workItemId })}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  )}
                </>
              )}
            </TableRow>
          ))}
          {pricing.length === 0 && (
            <TableRow>
              <TableCell colSpan={readOnly ? 5 : 6} className="text-center text-muted-foreground py-8">
                No pricing items yet
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {!readOnly && (
        <div className="border rounded-lg p-4 bg-muted/30">
          <Label className="text-sm font-medium mb-3 block">Add Line Item</Label>
          <div className="grid grid-cols-12 gap-2">
            <div className="col-span-5">
              <Input
                placeholder="Description"
                value={newItem.description}
                onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
              />
            </div>
            <div className="col-span-2">
              <Input
                type="number"
                placeholder="Qty"
                value={newItem.quantity}
                onChange={(e) => setNewItem({ ...newItem, quantity: Number(e.target.value) })}
              />
            </div>
            <div className="col-span-2">
              <Input
                type="number"
                step="0.01"
                placeholder="Price"
                value={newItem.unit_price}
                onChange={(e) => setNewItem({ ...newItem, unit_price: Number(e.target.value) })}
              />
            </div>
            <div className="col-span-1">
              <Input
                placeholder="UOM"
                value={newItem.uom}
                onChange={(e) => setNewItem({ ...newItem, uom: e.target.value })}
              />
            </div>
            <div className="col-span-2">
              <Button onClick={handleAdd} disabled={!newItem.description} className="w-full">
                <Plus className="w-4 h-4 mr-1" />
                Add
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
