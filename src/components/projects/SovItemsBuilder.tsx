import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  GripVertical,
  Sparkles,
  PenLine,
  RefreshCw
} from 'lucide-react';
import {
  SovLineItem,
  generateSovItemsFromScope,
  normalizeSovItems,
  createBlankSovItem
} from '@/lib/generateSovItemsFromScope';
import { FramingScope } from '@/components/projects/FramingScopePicker';
import { ScopeLocation } from '@/components/projects/ScopeLocationPicker';

type StructureType = 'SINGLE_FAMILY' | 'TOWNHOME' | 'APARTMENT' | 'HOTEL';

interface SovItemsBuilderProps {
  structureType: StructureType;
  floors: number;
  tcProvidesMaterials: boolean;
  framingScope: FramingScope;
  scopeLocation: ScopeLocation;
  items: SovLineItem[];
  onChange: (items: SovLineItem[]) => void;
}

export default function SovItemsBuilder({
  structureType,
  floors,
  tcProvidesMaterials,
  framingScope,
  scopeLocation,
  items,
  onChange
}: SovItemsBuilderProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [hasManualEdits, setHasManualEdits] = useState(false);
  const [showRegenConfirm, setShowRegenConfirm] = useState(false);

  // Auto-generate on first render if items are empty
  useEffect(() => {
    if (items.length === 0) {
      handleRegenerate();
    }
  }, []); // Only on mount

  // Track user edits
  const markAsEdited = () => {
    if (!hasManualEdits) setHasManualEdits(true);
  };

  const handleRegenerate = () => {
    const generated = generateSovItemsFromScope({
      structureType,
      floors,
      tcProvidesMaterials,
      framingScope,
      scopeLocation,
    });
    onChange(generated);
    setHasManualEdits(false);
    setShowRegenConfirm(false);
  };

  const handleRegenerateClick = () => {
    if (hasManualEdits && items.length > 0) {
      setShowRegenConfirm(true);
    } else {
      handleRegenerate();
    }
  };

  const handleNameChange = (id: string, name: string) => {
    const updated = items.map(item =>
      item.id === id ? { ...item, name } : item
    );
    onChange(updated);
    markAsEdited();
  };

  const handleDelete = (id: string) => {
    const updated = normalizeSovItems(items.filter(item => item.id !== id));
    onChange(updated);
    markAsEdited();
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const updated = [...items];
    [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
    onChange(normalizeSovItems(updated));
    markAsEdited();
  };

  const handleMoveDown = (index: number) => {
    if (index === items.length - 1) return;
    const updated = [...items];
    [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
    onChange(normalizeSovItems(updated));
    markAsEdited();
  };

  const handleAddItem = () => {
    const newItem = createBlankSovItem();
    newItem.sort_order = items.length;
    onChange([...items, newItem]);
    setEditingId(newItem.id);
    markAsEdited();
  };

  // Stats
  const totalItems = items.length;
  const autoItems = items.filter(i => i.id.startsWith('sov-') && !i.name.startsWith('New Line')).length;

  return (
    <div className="space-y-4">
      {/* Header with Regenerate */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {totalItems} line items
          {hasManualEdits && (
            <Badge variant="outline" className="ml-2 text-xs">
              <PenLine className="h-3 w-3 mr-1" />
              Edited
            </Badge>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRegenerateClick}
          className="gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Regenerate from Scope
        </Button>
      </div>

      {/* Regenerate Confirmation */}
      {showRegenConfirm && (
        <Card className="border-warning bg-warning/5">
          <CardContent className="p-4">
            <p className="text-sm text-foreground mb-3">
              This will replace all current items with auto-generated ones based on your scope selections. Continue?
            </p>
            <div className="flex gap-2">
              <Button
                variant="destructive"
                size="sm"
                onClick={handleRegenerate}
              >
                Yes, Regenerate
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowRegenConfirm(false)}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Info Card */}
      <Card className="bg-accent/5 border-accent/20">
        <CardContent className="p-3">
          <p className="text-xs text-muted-foreground">
            <strong>SOV Line Items:</strong> These titles form your project's Schedule of Values baseline. 
            You can add, delete, or reorder items. Percentages and dollar amounts will be set later in the Project SOV screen.
          </p>
        </CardContent>
      </Card>

      {/* SOV Items List */}
      <div className="space-y-2">
        {items.map((item, index) => (
          <Card key={item.id} className="group">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                {/* Reorder Controls */}
                <div className="flex flex-col gap-0.5 opacity-50 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5"
                    onClick={() => handleMoveUp(index)}
                    disabled={index === 0}
                  >
                    <ChevronUp className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5"
                    onClick={() => handleMoveDown(index)}
                    disabled={index === items.length - 1}
                  >
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </div>

                {/* Drag Handle (visual only for now) */}
                <GripVertical className="h-4 w-4 text-muted-foreground/50" />

                {/* Item Content */}
                <div className="flex-1 min-w-0">
                  {editingId === item.id ? (
                    <Input
                      value={item.name}
                      onChange={(e) => handleNameChange(item.id, e.target.value)}
                      onBlur={() => setEditingId(null)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') setEditingId(null);
                        if (e.key === 'Escape') setEditingId(null);
                      }}
                      autoFocus
                      className="h-8 text-sm"
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => setEditingId(item.id)}
                      className="text-left font-medium text-sm text-foreground hover:text-accent transition-colors w-full truncate"
                    >
                      {item.name || 'Untitled'}
                    </button>
                  )}
                </div>

                {/* Item Number */}
                <Badge variant="secondary" className="text-xs tabular-nums">
                  #{index + 1}
                </Badge>

                {/* Delete */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-50 group-hover:opacity-100 transition-opacity"
                  onClick={() => handleDelete(item.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Empty State */}
        {items.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground mb-4">
                No SOV items yet. Add items manually or click "Regenerate from Scope" to auto-generate.
              </p>
              <Button onClick={handleAddItem} variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Add First Item
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Add Item Button */}
        {items.length > 0 && (
          <Button
            variant="outline"
            className="w-full border-dashed"
            onClick={handleAddItem}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Line Item
          </Button>
        )}
      </div>

      {/* Summary Footer */}
      {items.length > 0 && (
        <div className="text-xs text-muted-foreground text-center pt-2">
          {totalItems} items will be saved as your project's initial SOV
        </div>
      )}
    </div>
  );
}
