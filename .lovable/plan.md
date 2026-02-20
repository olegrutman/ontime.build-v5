

# Remove Orange "Unmatched" Badge from Pack List

## Problem
The pack list in the ProductPicker shows an orange badge ("X unmatched") for packs that have items not yet matched to catalog products. This can confuse users who don't understand what "unmatched" means in this context.

## Solution
Remove the unmatched badge entirely from the pack cards. Keep only the green checkmark for fully matched packs, and show nothing extra for partially matched packs -- just the item count is sufficient.

### File: `src/components/po-wizard-v2/PackSelector.tsx`
- Remove the orange `Badge` showing "X unmatched" (around lines 148-151)
- Keep the green `CheckCircle2` icon for fully matched packs
- Remove the `matchedCount`, `totalCount`, and `allMatched` variables since they're no longer needed (or keep only `allMatched` for the green check)

**Before:** Green check OR orange "3 unmatched" badge
**After:** Green check for fully matched packs, nothing for others

