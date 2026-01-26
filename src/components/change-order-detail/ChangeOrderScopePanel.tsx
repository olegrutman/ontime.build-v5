import { useState } from 'react';
import { ChangeOrderProject } from '@/types/changeOrderProject';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Package, Truck, Building2, HardHat, Pencil, Check, X } from 'lucide-react';

interface ChangeOrderScopePanelProps {
  changeOrder: ChangeOrderProject;
  isEditable?: boolean;
  onUpdateDescription?: (data: { id: string; description: string }) => void;
  isUpdating?: boolean;
}

export function ChangeOrderScopePanel({ 
  changeOrder, 
  isEditable = false,
  onUpdateDescription,
  isUpdating = false,
}: ChangeOrderScopePanelProps) {
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [description, setDescription] = useState(changeOrder.description || '');

  const handleSaveDescription = () => {
    if (onUpdateDescription) {
      onUpdateDescription({ id: changeOrder.id, description: description.trim() });
    }
    setIsEditingDescription(false);
  };

  const handleCancelEdit = () => {
    setDescription(changeOrder.description || '');
    setIsEditingDescription(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Scope Details</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Description */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Description</span>
            {isEditable && !isEditingDescription && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setIsEditingDescription(true)}
                className="h-7 px-2"
              >
                <Pencil className="w-3 h-3 mr-1" />
                Edit
              </Button>
            )}
          </div>
          
          {isEditingDescription ? (
            <div className="space-y-2">
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the scope of work..."
                rows={3}
                className="resize-none"
              />
              <div className="flex gap-2 justify-end">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleCancelEdit}
                  disabled={isUpdating}
                >
                  <X className="w-3 h-3 mr-1" />
                  Cancel
                </Button>
                <Button 
                  size="sm" 
                  onClick={handleSaveDescription}
                  disabled={isUpdating || !description.trim()}
                >
                  <Check className="w-3 h-3 mr-1" />
                  Save
                </Button>
              </div>
            </div>
          ) : (
            <div className="p-3 bg-muted/30 rounded-lg min-h-[60px]">
              {changeOrder.description ? (
                <p className="text-sm">{changeOrder.description}</p>
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  No description provided. {isEditable && 'Click Edit to add one.'}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Materials */}
        <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
          <div className="flex items-center gap-3">
            <Package className="w-5 h-5 text-muted-foreground" />
            <span className="font-medium">Materials Required</span>
          </div>
          {changeOrder.requires_materials ? (
            <div className="flex items-center gap-2">
              <Badge variant="outline">Yes</Badge>
              {changeOrder.material_cost_responsibility && (
                <Badge variant="secondary" className="gap-1">
                  {changeOrder.material_cost_responsibility === 'GC' ? (
                    <>
                      <Building2 className="w-3 h-3" />
                      General Contractor
                    </>
                  ) : (
                    <>
                      <HardHat className="w-3 h-3" />
                      Trade Contractor
                    </>
                  )}
                </Badge>
              )}
            </div>
          ) : (
            <Badge variant="outline">No</Badge>
          )}
        </div>

        {/* Equipment */}
        <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
          <div className="flex items-center gap-3">
            <Truck className="w-5 h-5 text-muted-foreground" />
            <span className="font-medium">Equipment Required</span>
          </div>
          {changeOrder.requires_equipment ? (
            <div className="flex items-center gap-2">
              <Badge variant="outline">Yes</Badge>
              {changeOrder.equipment_cost_responsibility && (
                <Badge variant="secondary" className="gap-1">
                  {changeOrder.equipment_cost_responsibility === 'GC' ? (
                    <>
                      <Building2 className="w-3 h-3" />
                      General Contractor
                    </>
                  ) : (
                    <>
                      <HardHat className="w-3 h-3" />
                      Trade Contractor
                    </>
                  )}
                </Badge>
              )}
            </div>
          ) : (
            <Badge variant="outline">No</Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
