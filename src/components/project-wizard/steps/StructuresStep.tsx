import { useState } from 'react';
import { Plus, Trash2, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { ProjectWizardData, Structure, STRUCTURE_TYPE_LABELS } from '@/types/project';

interface StructuresStepProps {
  data: ProjectWizardData;
  onChange: (data: Partial<ProjectWizardData>) => void;
}

export function StructuresStep({ data, onChange }: StructuresStepProps) {
  const [newStructure, setNewStructure] = useState<Partial<Structure>>({
    name: '',
    type: 'main',
  });

  const addStructure = () => {
    if (!newStructure.name) return;
    
    const structure: Structure = {
      id: crypto.randomUUID(),
      name: newStructure.name,
      type: newStructure.type || 'main',
      description: newStructure.description,
    };
    
    onChange({ structures: [...data.structures, structure] });
    setNewStructure({ name: '', type: 'main' });
  };

  const removeStructure = (id: string) => {
    onChange({ structures: data.structures.filter((s) => s.id !== id) });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Project Structures</h2>
        <p className="text-sm text-muted-foreground">
          Add structures to your project. Detached buildings (e.g., detached garages) should be separate structures.
        </p>
      </div>

      {/* Existing Structures */}
      {data.structures.length > 0 && (
        <div className="space-y-3">
          {data.structures.map((structure) => (
            <Card key={structure.id}>
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Building2 className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{structure.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {STRUCTURE_TYPE_LABELS[structure.type]}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeStructure(structure.id)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add New Structure */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <p className="text-sm font-medium">Add Structure</p>
          
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="structure_name">Name</Label>
              <Input
                id="structure_name"
                placeholder="e.g., Main House"
                value={newStructure.name || ''}
                onChange={(e) => setNewStructure({ ...newStructure, name: e.target.value })}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="structure_type">Type</Label>
              <Select
                value={newStructure.type}
                onValueChange={(value: Structure['type']) => 
                  setNewStructure({ ...newStructure, type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(STRUCTURE_TYPE_LABELS) as Structure['type'][]).map((type) => (
                    <SelectItem key={type} value={type}>
                      {STRUCTURE_TYPE_LABELS[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <Button onClick={addStructure} disabled={!newStructure.name}>
            <Plus className="mr-2 h-4 w-4" />
            Add Structure
          </Button>
        </CardContent>
      </Card>

      {data.structures.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          Add at least one structure to continue.
        </p>
      )}
    </div>
  );
}
