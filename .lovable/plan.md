

# Plan: Lock PO to Project Context and Auto-Select Project Supplier

## Problem

When creating a PO from within a project (e.g., the Purchase Orders tab on a project page):
1. The project selection step is still shown even though we already know the project
2. Users have to manually confirm the supplier even when there's only one invited to the project
3. The wizard should be smarter about skipping steps when context is already known

## Solution

**Streamline the wizard when opened from a project context:**
1. Skip the Project step entirely when `initialProjectId` is provided (project is locked)
2. Auto-select the single project supplier and skip to Items step if possible
3. Show a locked project banner on subsequent steps for context

---

## Changes

### 1. Update `POWizard.tsx`

**Modify step logic to skip when context is pre-filled:**

```typescript
// Determine starting step based on initial context
const getStartingStep = () => {
  // If project is pre-selected, skip project step
  if (initialProjectId) {
    return 2; // Start at Supplier step
  }
  return 1;
};

// Update STEPS to be conditional
const getVisibleSteps = () => {
  if (initialProjectId) {
    // Skip project step when pre-filled
    return [
      { title: 'Supplier', key: 'supplier' },
      { title: 'Items', key: 'items' },
      { title: 'Notes', key: 'notes' },
      { title: 'Review', key: 'review' },
    ];
  }
  return [
    { title: 'Project', key: 'project' },
    { title: 'Supplier', key: 'supplier' },
    { title: 'Items', key: 'items' },
    { title: 'Notes', key: 'notes' },
    { title: 'Review', key: 'review' },
  ];
};
```

**Add locked project context display:**

When project is pre-selected, show a small banner at the top of the dialog:

```tsx
{initialProjectId && (
  <div className="px-6 py-2 bg-muted/50 border-b flex items-center gap-2 text-sm">
    <Building className="h-4 w-4 text-muted-foreground" />
    <span className="text-muted-foreground">Creating PO for:</span>
    <span className="font-medium">{initialProjectName}</span>
  </div>
)}
```

### 2. Update `SupplierStep.tsx`

**Enhance auto-selection to also auto-advance when single supplier:**

```typescript
// After finding project suppliers
if (projSuppliers.length === 1 && !data.supplier_id && !autoSelected) {
  onChange({
    supplier_id: projSuppliers[0].id,
    supplier_name: projSuppliers[0].name,
  });
  setAutoSelected(true);
  // Notify parent that supplier was auto-selected
  // (Parent can decide to auto-advance)
}
```

**Simplify UI when only one project supplier:**

```tsx
{projectSuppliers.length === 1 && (
  <div className="text-center py-4">
    <p className="text-sm text-muted-foreground mb-2">
      Project supplier auto-selected
    </p>
    <Card className="p-4 border-primary bg-primary/5 inline-block">
      <div className="flex items-center gap-3">
        <Check className="h-5 w-5 text-primary" />
        <div>
          <p className="font-medium">{projectSuppliers[0].name}</p>
          <p className="text-xs text-muted-foreground">{projectSuppliers[0].supplier_code}</p>
        </div>
      </div>
    </Card>
    <p className="text-xs text-muted-foreground mt-3">
      Tap Next to continue, or search for a different supplier
    </p>
  </div>
)}
```

### 3. Update `ProjectStep.tsx`

**Show locked state when project is pre-selected:**

When `initialProjectId` is provided and can't be changed, show a read-only view:

```tsx
if (initialProjectId && !allowChange) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-1">Project</h2>
        <p className="text-muted-foreground text-sm">
          Creating PO for this project
        </p>
      </div>
      <Card className="p-4 border-primary bg-primary/5">
        <div className="flex items-center gap-3">
          <Building className="h-5 w-5 text-primary" />
          <div>
            <p className="font-medium">{initialProjectName}</p>
          </div>
        </div>
      </Card>
      {/* Work Item selection still available */}
    </div>
  );
}
```

---

## Files to Modify

| File | Change |
|------|--------|
| `src/components/po-wizard/POWizard.tsx` | Skip project step when `initialProjectId` provided, add context banner |
| `src/components/po-wizard/steps/SupplierStep.tsx` | Improve auto-selection UX, simplify single-supplier view |
| `src/components/po-wizard/steps/ProjectStep.tsx` | Show locked/read-only view when project is pre-selected |

---

## Result After Changes

**When creating PO from Project Page:**
```text
1. User clicks "Create PO" on project
2. Wizard opens showing:
   - Context banner: "Creating PO for: Oak Ridge Townhomes"
   - Step 1 (Supplier): Auto-selected to project's supplier
   - "Tap Next to continue"
3. User taps Next → Items step
4. User adds items → Notes → Review → Create
```

**When creating PO from /purchase-orders page (no context):**
```text
1. User clicks "New PO"
2. Wizard opens showing:
   - Step 1: Select Project (full list)
   - Step 2: Select Supplier (project's suppliers highlighted)
   - Step 3-5: Items, Notes, Review
```

---

## Technical Flow

```text
┌─────────────────────────────────────────────────────────────┐
│                    POWizard Opens                           │
└─────────────────────┬───────────────────────────────────────┘
                      │
         ┌────────────┴────────────┐
         │                         │
    [From Project]           [From /purchase-orders]
         │                         │
         ▼                         ▼
┌─────────────────┐       ┌─────────────────────┐
│ Skip Project    │       │ Show Project Step   │
│ step (locked)   │       │ (user selects)      │
│                 │       │                     │
│ Show context    │       │                     │
│ banner          │       │                     │
└────────┬────────┘       └──────────┬──────────┘
         │                           │
         ▼                           ▼
┌─────────────────────────────────────────────────────────────┐
│              Supplier Step                                   │
│  • Find suppliers on project team                           │
│  • If exactly 1: auto-select + show confirmation            │
│  • If multiple: show project suppliers first                │
│  • If none: show all suppliers with search                  │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
            [Items → Notes → Review → Create]
```

