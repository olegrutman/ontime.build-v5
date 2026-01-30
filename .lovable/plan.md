

# Plan: Enhance Scope & Details Display in Review Step

## Current State

The "Scope & Details" tile on the Review step currently shows a minimal summary:
- A 2-column grid with only 6 fields (home type, floors, foundation, roof type, stairs, buildings)
- A separator followed by simple badges for boolean flags (elevator, roof deck, porches, etc.)

Many collected scope details are not displayed at all, such as:
- Basement type and finish (when applicable)
- Construction type for multi-family
- Unit counts for townhomes/duplexes
- Decking type details
- Siding materials list
- Balcony type
- Fascia/soffit details
- Decorative items
- Elevator shaft type
- Roof deck type

## Solution

Reorganize the Scope & Details card into logical, labeled sections that match how data is collected in the ScopeStep. This will make the review more comprehensive and easier to scan.

## Changes

### File: `src/components/project-wizard-new/ReviewStep.tsx`

#### 1. Add Building2 icon import

Add `Building2` to the existing Lucide icon imports for the section headers.

#### 2. Replace the Scope & Details card content (lines 172-234)

**New structure:**

```text
Scope & Details
|
+-- Structure Details (conditionally shown)
|   - Home Type, Floors, Foundation
|   - Basement Type + Finish (if basement selected)
|
+-- Building Basics (for multi-family projects)
|   - Number of Buildings, Stories, Construction Type
|
+-- Unit Details (for townhomes/duplexes)
|   - Number of Units, Stories per Unit, Shared Walls
|
+-- Stairs & Elevator
|   - Stairs Type
|   - Elevator with Shaft Type (if has elevator)
|
+-- Roof
|   - Roof Type
|   - Roof Deck Type (if has roof deck)
|
+-- Exterior Features (grouped)
|   - Covered Porches, Balconies (with type)
|   - Decking (with type)
|
+-- Finishes Included
|   - Siding with materials list
|   - Fascia/Soffit with material
|   - Decorative items list
|   - Windows Install, WRB/Tyvek, Exterior Doors
```

#### 3. Implementation Details

**Section-based display with headers:**
- Group related fields under subheadings (e.g., "Structure", "Roof", "Exterior Features")
- Use `text-xs font-medium text-muted-foreground uppercase tracking-wide` for section headers
- Show more specific values instead of just "yes/no" badges

**Show additional context:**
- For basement: show "Walkout Basement (Finished)" instead of just "Basement"
- For elevator: show "Elevator (Sandeblock shaft)" 
- For siding: show comma-separated list of materials
- For balconies: show the balcony type
- For decking: show the decking type

**Conditional display:**
- Only show sections that have data
- Use helper functions to format compound values

#### 4. Helper function additions

Add a helper to format compound scope items:

```typescript
const formatFoundation = () => {
  if (!data.scope.foundationType) return null;
  if (data.scope.foundationType === 'Basement') {
    const parts = [data.scope.basementType, data.scope.basementFinish].filter(Boolean);
    return parts.length > 0 
      ? `Basement (${parts.join(', ')})` 
      : 'Basement';
  }
  return data.scope.foundationType;
};
```

## Example Output

Instead of:

| Foundation | Roof Type |
|------------|-----------|
| Basement   | Mixed     |

**Badges:** Elevator, Balconies, Siding

The new output would be:

```text
Structure
  Home Type: Custom Home
  Floors: 2
  Foundation: Basement (Walkout, Finished)

Stairs & Elevator
  Stairs: Field Built
  Elevator: Yes (Wood shaft)

Roof
  Type: Mixed
  Roof Deck: Framed

Exterior Features
  Covered Porches: Yes
  Balconies: Cantilever Framed
  Decking: Composite

Finishes Included
  Siding: Fiber Cement, Wood
  Fascia/Soffit: Wood
  Decorative: Corbels, Columns
  Other: Windows Install, WRB/Tyvek
```

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/project-wizard-new/ReviewStep.tsx` | Enhance Scope & Details card with sectioned, descriptive content |

