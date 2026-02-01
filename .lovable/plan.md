
# Plan: Redesign Work Order Wizard to Match Project Creation Pattern

## Overview
Transform the current single-page Sheet-based Work Order creation into a multi-step wizard with step-by-step navigation (similar to the Project Creation wizard). This will improve consistency across the app and add several new features:

1. **Title step first** - moved from below location
2. **Dynamic level dropdown** - based on project's floor count
3. **Exterior location options** - project-aware dropdown (balconies, siding sides, roof, fascia, etc.)
4. **"Other" room/area option** - allows manual location entry
5. **Fixing work type** - adds comment field for blaming other trades
6. **Smart materials/equipment questions** - hidden when TC is responsible
7. **AI-generated description** - based on all collected data

---

## Wizard Step Structure

| Step | Name | Content |
|------|------|---------|
| 1 | Title | Work order title (optional, auto-generates from location) |
| 2 | Location | Inside/Outside toggle, dynamic level selector, room/area or exterior feature |
| 3 | Work Type | Type selection (Reframe, Reinstall, etc.) + Fixing comments |
| 4 | Resources | Materials/Equipment (conditional on cost responsibility) |
| 5 | Assignment | Assign TC/FC + Additional participants |
| 6 | Review | AI-generated description + Review & Create |

---

## Detailed Implementation

### Step 1: Title Step
```
┌─────────────────────────────────────────────────────────────┐
│  Step 1 of 6: Work Order Title                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Work Order Title (Optional)                                │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ Enter a descriptive title...                         │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  ℹ️ Leave blank to auto-generate from location details      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Step 2: Location Step (Enhanced)

**When "Inside" is selected:**
- Level dropdown populated from project scope (e.g., if project has 3 floors + basement, show: Basement, Floor 1, Floor 2, Floor 3, Attic, Other)
- Unit ID (optional)
- Room/Area dropdown with "Other" option → shows text input

**When "Outside" is selected:**
- Exterior feature dropdown (dynamically built from project scope):
  - Balconies (if `has_balconies` is true): Left, Right, Front, Back, East, West, North, South
  - Siding (if `siding_included`): Left Side, Right Side, Front, Back, East, West, North, South
  - Roof (always): General, Deck (if `has_roof_deck`)
  - Fascia (if `fascia_included`)
  - Soffit (if `soffit_included`)
  - Decorative (if `decorative_included`): shows configured items (Corbels, Columns, etc.)
  - Covered Porches (if `has_covered_porches`)
  - Other → manual text input

```
┌─────────────────────────────────────────────────────────────┐
│  Step 2 of 6: Location of Work                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Where is the work?                                         │
│  ┌────────────────────┐  ┌────────────────────┐             │
│  │    🏠 Inside       │  │   🏢 Outside       │             │
│  └────────────────────┘  └────────────────────┘             │
│                                                             │
│  [If Inside selected]                                       │
│  Level:  [Floor 1 ▼] (populated from project: 1-N floors)   │
│  Unit:   [Optional unit ID]                                 │
│  Area:   [Kitchen ▼] → if "Other", show text input          │
│                                                             │
│  [If Outside selected]                                      │
│  Feature: [Balcony - Left Side ▼]                           │
│  (Options based on project scope configuration)             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Step 3: Work Type Step (Enhanced)

- Display work type buttons: Reframe, Reinstall, Addition, Adjust, Fixing
- When **Fixing** is selected, show:
  - Reason dropdown with "Other Trades" option
  - If "Other Trades" → text field for specifying trade and issue

```
┌─────────────────────────────────────────────────────────────┐
│  Step 3 of 6: Scope of Work                                 │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  What type of work?                                         │
│  [Reframe] [Reinstall] [Addition] [Adjust] [Fixing]         │
│                                                             │
│  [If Fixing selected]                                       │
│  Reason: [Other Trade's Mistake ▼]                          │
│                                                             │
│  [If "Other Trade" reason]                                  │
│  Which trade caused the issue?                              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ e.g., Plumber damaged framing while running pipes    │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Step 4: Resources Step (Conditional)

**Materials section:**
- First ask: "Who is responsible for material costs?" → TC or GC
- **If GC selects "TC responsible"** → Skip "Add extra materials?" question entirely
- If TC responsible is NOT selected → Show "Add extra materials?" Yes/No

**Equipment section (same logic):**
- First ask: "Who is responsible for equipment costs?" → TC or GC
- **If GC selects "TC responsible"** → Skip "Add equipment?" question entirely

```
┌─────────────────────────────────────────────────────────────┐
│  Step 4 of 6: Materials & Equipment                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  MATERIALS                                                  │
│  Who is responsible for material costs?                     │
│  [Trade Contractor]  [General Contractor]                   │
│                                                             │
│  [Only shown if GC is responsible]                          │
│  Add extra materials?  [Yes] [No]                           │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  EQUIPMENT                                                  │
│  Who is responsible for equipment costs?                    │
│  [Trade Contractor]  [General Contractor]                   │
│                                                             │
│  [Only shown if GC is responsible]                          │
│  Add equipment?  [Yes] [No]                                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Step 5: Assignment Step
- Assign to TC/FC dropdown (based on creator role)
- Additional participants toggle list

### Step 6: Review Step with AI Description

**AI generates description based on:**
- Work type (reframe, reinstall, addition, adjust, fixing)
- Location details (inside/outside, level, room/area or exterior feature)
- Project context (project name, project type)
- Fixing reason (if applicable, including trade blame comments)
- Materials/equipment requirements

**AI Prompt Context (additional questions for accuracy):**
- Trade specialty of assigned TC (from project_team.trade)
- Project type (Single Family, Apartments, etc.)
- Building details (floors, construction type)

```
┌─────────────────────────────────────────────────────────────┐
│  Step 6 of 6: Review & Create                               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  SUMMARY                                                    │
│  Title: Floor 2 - Kitchen                                   │
│  Work Type: Fixing                                          │
│  Location: Inside, Floor 2, Kitchen                         │
│  Reason: Other Trade (Plumber damaged header)               │
│  Materials: TC Responsible                                  │
│  Equipment: None required                                   │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  DESCRIPTION OF WORK                                        │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ [AI-generated description]                            │  │
│  │                                                       │  │
│  │ Repair damaged framing in the second floor kitchen   │  │
│  │ caused by plumbing work. Scope includes...           │  │
│  └───────────────────────────────────────────────────────┘  │
│  [✨ Regenerate]  [✏️ Edit manually]                         │
│                                                             │
│                              [Create Work Order]            │
└─────────────────────────────────────────────────────────────┘
```

---

## Technical Implementation

### New Files to Create

| File | Purpose |
|------|---------|
| `src/components/work-order-wizard/WorkOrderWizard.tsx` | Main wizard container with step navigation |
| `src/components/work-order-wizard/steps/TitleStep.tsx` | Step 1: Title input |
| `src/components/work-order-wizard/steps/LocationStep.tsx` | Step 2: Enhanced location with project-aware options |
| `src/components/work-order-wizard/steps/WorkTypeStep.tsx` | Step 3: Work type + fixing comments |
| `src/components/work-order-wizard/steps/ResourcesStep.tsx` | Step 4: Conditional materials/equipment |
| `src/components/work-order-wizard/steps/AssignmentStep.tsx` | Step 5: TC/FC assignment |
| `src/components/work-order-wizard/steps/ReviewStep.tsx` | Step 6: AI description + review |
| `src/components/work-order-wizard/index.ts` | Exports |
| `src/hooks/useProjectScope.ts` | Hook to fetch project scope details |
| `supabase/functions/generate-work-order-description/index.ts` | AI edge function |

### Files to Modify

| File | Change |
|------|--------|
| `src/types/changeOrderProject.ts` | Add new fields: `fixing_trade_notes`, `exterior_feature`, `custom_location` |
| `src/hooks/useChangeOrderProject.ts` | Update mutation to handle new fields |
| `src/components/project/WorkOrdersTab.tsx` | Replace old wizard dialog with new wizard |

### Database Changes

Add columns to `change_order_projects` table:
```sql
ALTER TABLE change_order_projects
ADD COLUMN IF NOT EXISTS fixing_trade_notes TEXT,
ADD COLUMN IF NOT EXISTS reason TEXT;
```

Update `location_data` JSONB to support:
```typescript
interface LocationData {
  inside_outside?: 'inside' | 'outside';
  level?: string;
  unit?: string;
  room_area?: string;
  custom_room_area?: string; // When "Other" selected
  exterior_feature?: string; // e.g., "balcony_left", "siding_front", "roof_deck"
  exterior_direction?: string; // left, right, front, back, east, west, north, south
  custom_exterior?: string; // When "Other" selected
}
```

### Edge Function: AI Description Generator

The edge function will receive:
```typescript
interface GenerateDescriptionRequest {
  work_type: string;
  location: LocationData;
  project_name: string;
  project_type: string;
  assigned_trade?: string;
  reason?: string;
  fixing_trade_notes?: string;
  requires_materials: boolean;
  requires_equipment: boolean;
  material_responsibility?: 'TC' | 'GC';
  equipment_responsibility?: 'TC' | 'GC';
}
```

And return a generated scope description.

---

## Dynamic Level Options Logic

```typescript
function getLevelOptions(scope: ProjectScopeDetails): string[] {
  const levels: string[] = [];
  
  // Add basement if foundation type is basement
  if (scope.foundationType === 'Basement') {
    levels.push('Basement');
  }
  
  // Add floors based on project floors count
  const floorCount = scope.floors || scope.stories || 1;
  for (let i = 1; i <= floorCount; i++) {
    levels.push(`Floor ${i}`);
  }
  
  // Add attic if roof type suggests it
  if (scope.roofType && scope.roofType !== 'Flat') {
    levels.push('Attic');
  }
  
  // Add mezzanine option
  levels.push('Mezzanine');
  levels.push('Other');
  
  return levels;
}
```

---

## Dynamic Exterior Options Logic

```typescript
function getExteriorOptions(scope: ProjectScopeDetails): ExteriorOption[] {
  const options: ExteriorOption[] = [];
  const directions = ['Left', 'Right', 'Front', 'Back', 'East', 'West', 'North', 'South'];
  
  // Balconies
  if (scope.hasBalconies) {
    directions.forEach(dir => {
      options.push({ category: 'Balcony', direction: dir, value: `balcony_${dir.toLowerCase()}` });
    });
  }
  
  // Siding
  if (scope.sidingIncluded) {
    directions.forEach(dir => {
      options.push({ category: 'Siding', direction: dir, value: `siding_${dir.toLowerCase()}` });
    });
  }
  
  // Roof
  options.push({ category: 'Roof', direction: 'General', value: 'roof_general' });
  if (scope.hasRoofDeck) {
    options.push({ category: 'Roof Deck', direction: null, value: 'roof_deck' });
  }
  
  // Fascia & Soffit
  if (scope.fasciaIncluded) {
    options.push({ category: 'Fascia', direction: null, value: 'fascia' });
  }
  if (scope.soffitIncluded) {
    options.push({ category: 'Soffit', direction: null, value: 'soffit' });
  }
  
  // Decorative items
  if (scope.decorativeIncluded && scope.decorativeItems) {
    scope.decorativeItems.forEach(item => {
      options.push({ category: 'Decorative', direction: item, value: `decorative_${item.toLowerCase()}` });
    });
  }
  
  // Covered porches
  if (scope.hasCoveredPorches) {
    options.push({ category: 'Covered Porch', direction: null, value: 'covered_porch' });
  }
  
  // Other
  options.push({ category: 'Other', direction: null, value: 'other' });
  
  return options;
}
```

---

## Testing Checklist

1. Create a project with various scope settings (basement, 3 floors, balconies, siding)
2. Open Work Order wizard and verify:
   - Title step appears first
   - Level dropdown shows correct floors from project
   - "Outside" shows only features configured in project scope
   - "Other" in room/area shows text input
   - "Fixing" work type shows trade blame comment field
   - Materials/equipment questions are hidden when TC responsible
   - AI generates relevant description on Review step
3. Complete wizard and verify work order is created correctly
4. Test as different roles (GC, TC) to verify role-specific behavior
