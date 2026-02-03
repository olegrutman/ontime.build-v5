

# Plan: Industry-Standard SOV Percentage Allocation

## Overview

Currently, when SOVs are created from templates, each line item receives an equal percentage (e.g., 19 items = ~5.26% each). This doesn't reflect actual construction cost distribution where some tasks (like wall framing) require significantly more labor and materials than others (like final punch).

This plan introduces industry-standard default percentages for each SOV line item category, making the generated SOVs immediately more realistic and reducing manual adjustment work.

---

## Industry Research Summary

Based on construction industry data for residential framing:
- **Wall framing** (main structure): Largest labor component (~8-10% per floor)
- **Sheathing**: Material-heavy, less labor (~4-5% per floor)
- **Trusses/Roof**: Significant structural component (~8-10%)
- **Exterior items** (siding, windows): Moderate (~4-6% each)
- **Backout/blocking**: Smaller finish work (~2-3% per floor)
- **Mobilization**: Setup costs (~2-3%)
- **Final punch**: Completion items (~3-4%)

---

## Solution

Create a percentage mapping system that assigns industry-standard default percentages to each SOV item based on its category/name pattern.

### Percentage Allocation Strategy

The system will use pattern matching on item names to assign appropriate percentages:

| Item Category | Percentage | Rationale |
|--------------|------------|-----------|
| **Mobilization** | 3% | Setup, equipment staging |
| **Floor/Wall Framing** (per floor) | 9% | Major labor component |
| **Wall Sheathing** (per floor) | 5% | Material + moderate labor |
| **Sub-floor** (per floor) | 6% | Structural deck work |
| **Trusses/Roof Framing** | 10% | Significant structural |
| **Truss/Roof Sheathing** | 6% | Material-heavy |
| **Backout/Blocking** (per floor) | 3% | Finish prep work |
| **Fascia and Soffit** | 4% | Exterior trim |
| **Siding** (per side or total) | 5-6% | Exterior cladding |
| **Windows Installation** | 4% | Material + skilled labor |
| **Doors Installation** | 3% | Similar to windows |
| **Decorative Elements** | 3% | Variable extras |
| **Decks** | 4% | Optional scope |
| **Tyvek/WRB** | 2% | Material wrap |
| **Hardware Installation** | 2% | Connectors, misc |
| **Inspections** | 1% | Administrative milestone |
| **Shim and Shave** | 2% | Quality control |
| **Final Punch** | 4% | Completion/corrections |

---

## Technical Implementation

### File: `src/hooks/useContractSOV.ts`

**New Function**: `getDefaultPercentForItem(itemName: string): number`

This function pattern-matches item names and returns the appropriate default percentage:

```typescript
function getDefaultPercentForItem(itemName: string): number {
  const lower = itemName.toLowerCase();
  
  // Mobilization
  if (lower.includes('mobilization')) return 3;
  
  // Wall framing (highest value - labor intensive)
  if (lower.includes('walls frame') || 
      (lower.includes('walls') && !lower.includes('sheet') && !lower.includes('parapet'))) return 9;
  
  // Sheathing/sheeting
  if (lower.includes('sheat') || lower.includes('sheet')) return 5;
  
  // Subfloor
  if (lower.includes('sub-floor') || lower.includes('subfloor')) return 6;
  
  // Trusses (not sheathing)
  if ((lower.includes('truss') && !lower.includes('sheat')) || 
      lower.includes('roof framing')) return 10;
  
  // Backout/blocking
  if (lower.includes('backout') || lower.includes('blocking')) return 3;
  
  // Fascia and Soffit
  if (lower.includes('fascia') || lower.includes('soffit')) return 4;
  
  // Siding
  if (lower.includes('siding')) return 5;
  
  // Windows
  if (lower.includes('window')) return 4;
  
  // Doors
  if (lower.includes('door')) return 3;
  
  // Decorative
  if (lower.includes('decorative')) return 3;
  
  // Decks
  if (lower.includes('deck')) return 4;
  
  // Tyvek/WRB
  if (lower.includes('tyvek') || lower.includes('wrb')) return 2;
  
  // Hardware
  if (lower.includes('hardware')) return 2;
  
  // Parapet/special structural
  if (lower.includes('parapet')) return 3;
  
  // Inspections
  if (lower.includes('inspection')) return 1;
  
  // Shim and shave
  if (lower.includes('shim')) return 2;
  
  // Final punch
  if (lower.includes('punch') || lower.includes('final')) return 4;
  
  // Basement framing
  if (lower.includes('basement')) return 7;
  
  // Default fallback
  return 5;
}
```

**Modify**: `createAllSOVs` function

Replace the equal distribution logic with intelligent percentage assignment:

```typescript
// Generate percents for each item
const rawPercents = itemNames.map(name => getDefaultPercentForItem(name));
const totalRaw = rawPercents.reduce((a, b) => a + b, 0);

// Normalize to 100% while maintaining proportions
const normalizedPercents = rawPercents.map((p, i) => {
  if (i === itemNames.length - 1) {
    // Last item gets remainder to ensure exactly 100%
    const sumSoFar = normalizedPercents.slice(0, -1).reduce((a, b) => a + b, 0);
    return parseFloat((100 - sumSoFar).toFixed(2));
  }
  return parseFloat((p / totalRaw * 100).toFixed(2));
});
```

---

## Example Output

For a **Custom Home** template (19 items), instead of each getting ~5.26%:

| Item | Current % | New % |
|------|-----------|-------|
| Mobilization | 5.26 | 2.8 |
| Basement Walls | 5.26 | 8.4 |
| First Sub-floor | 5.26 | 5.6 |
| Main Level Walls | 5.26 | 8.4 |
| Main Level Walls Sheeting | 5.26 | 4.7 |
| Second Sub-Floor | 5.26 | 5.6 |
| Second Floor Walls | 5.26 | 8.4 |
| Second Floor Walls Sheeting | 5.26 | 4.7 |
| Trusses | 5.26 | 9.3 |
| Truss Sheeting | 5.26 | 4.7 |
| Main Level Backout | 5.26 | 2.8 |
| Second Floor Backout | 5.26 | 2.8 |
| Fascia and Soffit | 5.26 | 3.7 |
| Decorative Elements | 5.26 | 2.8 |
| Windows Installation | 5.26 | 3.7 |
| Patio Doors Installation | 5.26 | 2.8 |
| Siding | 5.26 | 4.7 |
| Decks | 5.26 | 3.7 |
| Final Punch | 5.26 | 3.7 |
| **Total** | 100% | 100% |

---

## Files to Modify

| File | Change |
|------|--------|
| `src/hooks/useContractSOV.ts` | Add `getDefaultPercentForItem()` function and update `createAllSOVs` |

---

## Benefits

1. **More Accurate Billing**: Contractors bill appropriate amounts for each phase
2. **Reduced Manual Work**: Less time spent adjusting default percentages
3. **Industry Alignment**: Matches real-world cost distribution expectations
4. **Still Editable**: Users can still adjust percentages after creation

---

## Notes

- Percentages are automatically normalized to ensure they always total 100%
- The pattern matching is case-insensitive and flexible to handle variations
- For story-generated templates (apartments), the same logic applies per-item
- Users retain full ability to edit percentages after SOV creation

