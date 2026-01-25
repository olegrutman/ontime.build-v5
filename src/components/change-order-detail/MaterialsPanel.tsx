import { useState } from 'react';
import { ChangeOrderMaterial } from '@/types/changeOrderProject';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Plus, Package, Lock, Send } from 'lucide-react';

interface MaterialsPanelProps {
  materials: ChangeOrderMaterial[];
  isEditable: boolean;
  canViewCosts: boolean;
  isTC: boolean;
  isSupplier: boolean;
  onAddMaterial: (data: { description: string; quantity: number; uom: string; notes?: string }) => void;
  onUpdateMaterial: (data: { id: string } & Partial<ChangeOrderMaterial>) => void;
  onLockSupplierPricing: (materialId: string) => void;
}

export function MaterialsPanel({
  materials,
  isEditable,
  canViewCosts,
  isTC,
  isSupplier,
  onAddMaterial,
  onUpdateMaterial,
  onLockSupplierPricing,
}: MaterialsPanelProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [description, setDescription] = useState('');
  const [quantity, setQuantity] = useState('');
  const [uom, setUom] = useState('EA');
  const [notes, setNotes] = useState('');

  const handleSubmit = () => {
    onAddMaterial({
      description,
      quantity: parseFloat(quantity),
      uom,
      notes: notes || undefined,
    });
    setDescription('');
    setQuantity('');
    setUom('EA');
    setNotes('');
    setShowAddForm(false);
  };

  const totalMaterial = materials.reduce((sum, m) => sum + (m.final_price || m.line_total || 0), 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Package className="w-4 h-4" />
            Materials
          </CardTitle>
          {isEditable && isTC && (
            <Button size="sm" variant="outline" onClick={() => setShowAddForm(true)}>
              <Plus className="w-4 h-4 mr-1" />
              Add Material
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {materials.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No materials added yet
          </p>
        ) : (
          <div className="space-y-3">
            {materials.map((material) => (
              <div
                key={material.id}
                className="p-3 bg-muted/30 rounded-lg space-y-2"
              >
                <div className="flex items-center justify-between">
                  <p className="font-medium text-sm">{material.description}</p>
                  <div className="flex items-center gap-2">
                    {material.supplier_locked && (
                      <Badge variant="secondary" className="gap-1">
                        <Lock className="w-3 h-3" />
                        Priced
                      </Badge>
                    )}
                    {material.sent_to_supplier && !material.supplier_locked && (
                      <Badge variant="outline" className="gap-1">
                        <Send className="w-3 h-3" />
                        Sent to Supplier
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {material.quantity} {material.uom}
                  </span>
                  {canViewCosts && (
                    <div className="text-right">
                      {material.supplier_locked ? (
                        <span className="font-medium">
                          ${(material.final_price || material.line_total || 0).toFixed(2)}
                        </span>
                      ) : material.unit_cost ? (
                        <span className="font-medium">${material.line_total?.toFixed(2)}</span>
                      ) : (
                        <span className="text-muted-foreground">Not priced</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Supplier pricing form */}
                {isSupplier && !material.supplier_locked && (
                  <div className="flex items-center gap-2 pt-2 border-t">
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="Unit price"
                      className="w-32"
                      onChange={(e) =>
                        onUpdateMaterial({
                          id: material.id,
                          supplier_price: parseFloat(e.target.value),
                          supplier_priced: true,
                        })
                      }
                    />
                    <Button
                      size="sm"
                      onClick={() => onLockSupplierPricing(material.id)}
                    >
                      <Lock className="w-3 h-3 mr-1" />
                      Lock Price
                    </Button>
                  </div>
                )}

                {/* TC markup */}
                {isTC && material.supplier_locked && !material.final_price && (
                  <div className="flex items-center gap-2 pt-2 border-t">
                    <Label className="text-xs">Markup %</Label>
                    <Input
                      type="number"
                      step="1"
                      placeholder="0"
                      className="w-20"
                      value={material.markup_percent || ''}
                      onChange={(e) => {
                        const markup = parseFloat(e.target.value) || 0;
                        const basePrice = material.supplier_price || material.line_total || 0;
                        const finalPrice = basePrice * (1 + markup / 100);
                        onUpdateMaterial({
                          id: material.id,
                          markup_percent: markup,
                          final_price: finalPrice,
                        });
                      }}
                    />
                    <span className="text-xs text-muted-foreground">%</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Totals */}
        {materials.length > 0 && canViewCosts && (
          <div className="flex items-center justify-between pt-4 border-t">
            <span className="font-medium">Total Materials</span>
            <span className="text-xl font-bold">${totalMaterial.toFixed(2)}</span>
          </div>
        )}

        {/* Add Form */}
        {showAddForm && (
          <div className="p-4 border rounded-lg space-y-4 mt-4">
            <h4 className="font-medium">Add Material</h4>
            <div className="space-y-3">
              <div>
                <Label htmlFor="mat-description">Description *</Label>
                <Input
                  id="mat-description"
                  placeholder="Material description..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="mat-quantity">Quantity *</Label>
                  <Input
                    id="mat-quantity"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="mat-uom">Unit</Label>
                  <Input
                    id="mat-uom"
                    placeholder="EA"
                    value={uom}
                    onChange={(e) => setUom(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="mat-notes">Notes</Label>
                <Input
                  id="mat-notes"
                  placeholder="Optional notes..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowAddForm(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!description || !quantity || parseFloat(quantity) <= 0}
              >
                Add Material
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
