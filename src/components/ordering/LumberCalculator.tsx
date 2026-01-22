import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  DIMENSIONAL_SIZES, 
  STANDARD_LENGTHS, 
  calculateBoardFeet, 
  calculateLinearFeet 
} from '@/types/materialOrder';

interface LumberCalculatorProps {
  category: 'Dimensional' | 'Engineered';
  onChange: (data: {
    pieces: number;
    lengthFt: number;
    widthIn?: number;
    thicknessIn?: number;
    computedBf?: number;
    computedLf?: number;
    quantity: number;
    uom: string;
  }) => void;
}

export function LumberCalculator({ category, onChange }: LumberCalculatorProps) {
  const [selectedSize, setSelectedSize] = useState('');
  const [pieces, setPieces] = useState(1);
  const [lengthFt, setLengthFt] = useState(8);
  const [customLength, setCustomLength] = useState('');

  const isDimensional = category === 'Dimensional';
  const sizeInfo = DIMENSIONAL_SIZES.find(s => s.nominal === selectedSize);

  useEffect(() => {
    const actualLength = customLength ? parseFloat(customLength) : lengthFt;
    
    if (isDimensional && sizeInfo) {
      const bf = calculateBoardFeet(sizeInfo.thickness, sizeInfo.width, actualLength, pieces);
      onChange({
        pieces,
        lengthFt: actualLength,
        widthIn: sizeInfo.width,
        thicknessIn: sizeInfo.thickness,
        computedBf: Math.round(bf * 100) / 100,
        quantity: pieces,
        uom: 'PC',
      });
    } else if (!isDimensional) {
      const lf = calculateLinearFeet(actualLength, pieces);
      onChange({
        pieces,
        lengthFt: actualLength,
        computedLf: Math.round(lf * 100) / 100,
        quantity: pieces,
        uom: 'PC',
      });
    }
  }, [selectedSize, pieces, lengthFt, customLength, isDimensional, sizeInfo, onChange]);

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
      <h4 className="font-medium text-sm">
        {isDimensional ? 'Dimensional Lumber Calculator' : 'Engineered Lumber Calculator'}
      </h4>

      {isDimensional && (
        <div>
          <Label>Size (Nominal)</Label>
          <Select value={selectedSize} onValueChange={setSelectedSize}>
            <SelectTrigger>
              <SelectValue placeholder="Select size" />
            </SelectTrigger>
            <SelectContent>
              {DIMENSIONAL_SIZES.map(size => (
                <SelectItem key={size.nominal} value={size.nominal}>
                  {size.nominal} (actual: {size.thickness}" × {size.width}")
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Pieces</Label>
          <Input
            type="number"
            min={1}
            value={pieces}
            onChange={(e) => setPieces(Math.max(1, parseInt(e.target.value) || 1))}
          />
        </div>
        <div>
          <Label>Length (ft)</Label>
          <Select 
            value={customLength ? 'custom' : lengthFt.toString()} 
            onValueChange={(v) => {
              if (v === 'custom') {
                setCustomLength(lengthFt.toString());
              } else {
                setCustomLength('');
                setLengthFt(parseInt(v));
              }
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STANDARD_LENGTHS.map(len => (
                <SelectItem key={len} value={len.toString()}>
                  {len} ft
                </SelectItem>
              ))}
              <SelectItem value="custom">Custom...</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {customLength && (
        <div>
          <Label>Custom Length (ft)</Label>
          <Input
            type="number"
            step="0.5"
            min={1}
            value={customLength}
            onChange={(e) => setCustomLength(e.target.value)}
          />
        </div>
      )}

      {/* Computed values */}
      <div className="flex gap-4 pt-2 border-t">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Total:</span>
          <Badge variant="secondary" className="text-base">
            {pieces} PC
          </Badge>
        </div>
        {isDimensional && sizeInfo && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Board Feet:</span>
            <Badge variant="outline" className="text-base">
              {calculateBoardFeet(
                sizeInfo.thickness,
                sizeInfo.width,
                customLength ? parseFloat(customLength) : lengthFt,
                pieces
              ).toFixed(2)} BF
            </Badge>
          </div>
        )}
        {!isDimensional && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Linear Feet:</span>
            <Badge variant="outline" className="text-base">
              {calculateLinearFeet(
                customLength ? parseFloat(customLength) : lengthFt,
                pieces
              ).toFixed(2)} LF
            </Badge>
          </div>
        )}
      </div>
    </div>
  );
}
