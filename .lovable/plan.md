

# Roof Section Updates: Always-In-Scope Sheathing + Roof Deck & Parapet Questions

## Problem
1. Roof sheathing is currently a Yes/No question — it should always be in scope (no question needed, always generates an SOV line)
2. Apartments/MF and Townhomes often have flat roof sections with rooftop decks and parapet walls — these need explicit questions in the roof phase

## Changes

### `src/hooks/useSetupWizardV2.ts`

**Remove Q7_roof question** (lines 268-276) — roof sheathing is always in scope, no need to ask.

**Add two new roof-phase questions:**
- `Q7_parapet` — "Has parapet walls?" (yes/no), for `townhome`, `apartments_mf`, `hotel`, `senior_living`
- `Q7_roof_deck` — "Has roof decks (flat roof sections)?" (yes/no), for `townhome`, `apartments_mf`

**Update `generateSOVLines()`** (lines 620-624):
- Always generate "Roof sheathing" line (remove the `if (a.roof_sheathing === 'yes')` check)
- Add "Parapet wall framing" line if `has_parapet === 'yes'`
- Add "Roof deck framing" line if `has_roof_deck === 'yes'`

### Files Changed

| File | Change |
|------|--------|
| `src/hooks/useSetupWizardV2.ts` | Remove roof sheathing question; add parapet + roof deck questions; update SOV generation |

