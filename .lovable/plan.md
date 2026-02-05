
# Plan: Add Estimate Creation to Project Overview

## Summary

Add a "New Estimate" button to the `SupplierEstimatesSection` component on the Project Overview page. Since the project context is already known, the dialog will only need the estimate name.

---

## Visual Design

```text
┌────────────────────────────────────────┐
│ 📋 My Estimates                    [+] │  ← Add button in header
│ 2 estimates                            │
├────────────────────────────────────────┤
│ Phase 1 Materials        [Draft]       │
│ Lumber Quote             [Submitted]   │
│                                        │
│ [+ Add Estimate]                       │  ← OR empty state button
└────────────────────────────────────────┘
```

---

## Technical Changes

### File: `src/components/project/SupplierEstimatesSection.tsx`

**Changes:**
1. Add state for dialog visibility and form data
2. Add "+" button in the header next to the title
3. Add a simple dialog with just "Estimate Name" field
4. Handle create with mutation that auto-sets `project_id` and `supplier_org_id`
5. Invalidate query on success to refresh the list

```tsx
// Add imports
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

// Add state
const [showCreate, setShowCreate] = useState(false);
const [newEstimateName, setNewEstimateName] = useState('');

// Add mutation
const createMutation = useMutation({
  mutationFn: async (name: string) => {
    const { data, error } = await supabase
      .from('supplier_estimates')
      .insert({
        supplier_org_id: supplierOrgId,
        project_id: projectId,
        name: name.trim(),
        status: 'DRAFT',
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  onSuccess: () => {
    toast({ title: 'Success', description: 'Estimate created' });
    setShowCreate(false);
    setNewEstimateName('');
    queryClient.invalidateQueries({ 
      queryKey: ['supplier-project-estimates', projectId, supplierOrgId] 
    });
  },
  onError: () => {
    toast({ title: 'Error', description: 'Failed to create estimate', variant: 'destructive' });
  },
});

// In header - add button next to title
<CardTitle className="flex items-center gap-2 text-sm font-medium">
  <FileText className="h-4 w-4 text-muted-foreground" />
  My Estimates
</CardTitle>
<Button 
  variant="ghost" 
  size="icon" 
  className="h-6 w-6"
  onClick={(e) => { e.stopPropagation(); setShowCreate(true); }}
>
  <Plus className="h-4 w-4" />
</Button>

// Add dialog at end of component
<Dialog open={showCreate} onOpenChange={setShowCreate}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Create New Estimate</DialogTitle>
    </DialogHeader>
    <div className="space-y-4 py-4">
      <div className="space-y-2">
        <Label>Estimate Name</Label>
        <Input
          placeholder="e.g., Phase 1 Materials"
          value={newEstimateName}
          onChange={(e) => setNewEstimateName(e.target.value)}
        />
      </div>
    </div>
    <DialogFooter>
      <Button variant="outline" onClick={() => setShowCreate(false)}>
        Cancel
      </Button>
      <Button 
        onClick={() => createMutation.mutate(newEstimateName)}
        disabled={!newEstimateName.trim() || createMutation.isPending}
      >
        {createMutation.isPending ? 'Creating...' : 'Create'}
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

---

## Files to Modify

| File | Change |
|------|--------|
| `src/components/project/SupplierEstimatesSection.tsx` | Add create dialog, button, and mutation |

---

## User Flow

1. Supplier opens Project Overview
2. In "My Estimates" card, clicks "+" button
3. Dialog opens with just "Estimate Name" field
4. Enters name, clicks "Create"
5. Estimate created with DRAFT status
6. List refreshes to show new estimate
