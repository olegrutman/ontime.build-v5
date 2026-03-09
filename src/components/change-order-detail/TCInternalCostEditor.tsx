import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { DollarSign, Check, ListPlus } from 'lucide-react';
import { ActualCostPopup } from './ActualCostPopup';
import { useActualCosts } from '@/hooks/useActualCosts';

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(amount);
}

interface TCInternalCostEditorProps {
  currentCost: number;
  isEditable: boolean;
  onSave: (cost: number) => void;
  isSaving: boolean;
  changeOrderId: string;
  revenue: number;
}

export function TCInternalCostEditor({ currentCost, isEditable, onSave, isSaving, changeOrderId, revenue }: TCInternalCostEditorProps) {
  const [value, setValue] = useState(currentCost > 0 ? currentCost.toString() : '');
  const [isDirty, setIsDirty] = useState(false);
  const [costPopupOpen, setCostPopupOpen] = useState(false);
  const { totalActualCost } = useActualCosts(changeOrderId);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value);
    setIsDirty(true);
  };

  const handleSave = () => {
    const num = parseFloat(value) || 0;
    onSave(num);
    setIsDirty(false);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <DollarSign className="h-4 w-4" />
          My Internal Cost
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground mb-3">
          Enter your total internal cost for this work (labor, overhead, etc.) to track your profit margin.
        </p>
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={value}
              onChange={handleChange}
              disabled={!isEditable}
              className="pl-7"
              placeholder="0.00"
            />
          </div>
          {isEditable && isDirty && (
            <Button size="sm" onClick={handleSave} disabled={isSaving}>
              <Check className="h-3.5 w-3.5 mr-1" />
              Save
            </Button>
          )}
        </div>

        {/* Daily cost log shortcut */}
        <button
          onClick={() => setCostPopupOpen(true)}
          className="mt-3 w-full flex items-center justify-between text-sm hover:bg-muted/50 rounded px-2 py-1.5 -mx-1 transition-colors cursor-pointer border border-dashed"
        >
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <ListPlus className="h-3.5 w-3.5" />
            Daily Cost Log
          </span>
          <span className="font-medium">{formatCurrency(totalActualCost)}</span>
        </button>

        <ActualCostPopup
          open={costPopupOpen}
          onOpenChange={setCostPopupOpen}
          changeOrderId={changeOrderId}
          earningsOrRevenue={revenue}
          label="Revenue"
        />
      </CardContent>
    </Card>
  );
}
