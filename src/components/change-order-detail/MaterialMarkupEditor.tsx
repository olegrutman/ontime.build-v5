import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Percent, DollarSign, TrendingUp } from 'lucide-react';

interface MaterialMarkupEditorProps {
  markupType: 'percent' | 'lump_sum' | null;
  markupPercent: number;
  markupAmount: number;
  baseAmount: number;
  onUpdate: (
    markupType: 'percent' | 'lump_sum' | null,
    markupPercent: number,
    markupAmount: number
  ) => void;
  isEditable: boolean;
}

export function MaterialMarkupEditor({
  markupType,
  markupPercent,
  markupAmount,
  baseAmount,
  onUpdate,
  isEditable,
}: MaterialMarkupEditorProps) {
  const calculatedMarkup = markupType === 'percent'
    ? baseAmount * (markupPercent / 100)
    : markupAmount;
  
  const totalWithMarkup = baseAmount + calculatedMarkup;

  const handleTypeChange = (value: string) => {
    const newType = value as 'percent' | 'lump_sum';
    onUpdate(newType, markupPercent, markupAmount);
  };

  const handlePercentChange = (value: string) => {
    const numValue = parseFloat(value) || 0;
    onUpdate('percent', numValue, markupAmount);
  };

  const handleAmountChange = (value: string) => {
    const numValue = parseFloat(value) || 0;
    onUpdate('lump_sum', markupPercent, numValue);
  };

  if (!isEditable) {
    // Read-only view
    return (
      <Card className="bg-muted/30">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Material Markup</span>
            </div>
            <div className="text-right">
              {markupType === 'percent' ? (
                <span className="font-medium">{markupPercent}% (${calculatedMarkup.toFixed(2)})</span>
              ) : markupType === 'lump_sum' ? (
                <span className="font-medium">${markupAmount.toFixed(2)}</span>
              ) : (
                <span className="text-muted-foreground">No markup</span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          Material Markup
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <RadioGroup
          value={markupType || ''}
          onValueChange={handleTypeChange}
          className="flex gap-4"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="percent" id="markup-percent" />
            <Label htmlFor="markup-percent" className="flex items-center gap-1 cursor-pointer">
              <Percent className="h-3 w-3" />
              Percentage
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="lump_sum" id="markup-lumpsum" />
            <Label htmlFor="markup-lumpsum" className="flex items-center gap-1 cursor-pointer">
              <DollarSign className="h-3 w-3" />
              Lump Sum
            </Label>
          </div>
        </RadioGroup>

        {markupType === 'percent' && (
          <div className="space-y-2">
            <Label htmlFor="markup-percent-value">Markup Percentage</Label>
            <div className="flex items-center gap-2">
              <Input
                id="markup-percent-value"
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={markupPercent}
                onChange={(e) => handlePercentChange(e.target.value)}
                className="w-24"
              />
              <span className="text-muted-foreground">%</span>
            </div>
          </div>
        )}

        {markupType === 'lump_sum' && (
          <div className="space-y-2">
            <Label htmlFor="markup-amount-value">Markup Amount</Label>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">$</span>
              <Input
                id="markup-amount-value"
                type="number"
                min="0"
                step="0.01"
                value={markupAmount}
                onChange={(e) => handleAmountChange(e.target.value)}
                className="w-32"
              />
            </div>
          </div>
        )}

        {/* Preview */}
        {markupType && (
          <div className="pt-2 border-t space-y-1 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Base Materials</span>
              <span>${baseAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Markup</span>
              <span>+${calculatedMarkup.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-medium">
              <span>Total Materials</span>
              <span>${totalWithMarkup.toFixed(2)}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
