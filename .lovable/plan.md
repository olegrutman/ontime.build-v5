

# Three Fixes: Roof Deck Question, Mobilization %, Basement Walkout

## Issues

1. **Roof deck question is in the wrong section** — `has_roof_deck` (Q7_roof_deck) is in the `roof` phase but user wants it asked in the roof section of the wizard (it currently is there — but there's also a *separate* `has_rooftop_deck` in exterior_finish). These are actually the same concept split confusingly into two questions. The roof-phase one generates structural framing; the exterior one generates finish decking. They should be unified: ask once in roof, then conditionally ask about decking scope.

2. **Mobilization % is asked but ignored** — The mobilization question (`yes_no_percent`) captures a user-entered percentage, but the SOV generation only uses it for the label text. The actual weight calculation falls back to `w('mobilization')` (a base weight of ~5) when the percentage string can't be parsed correctly relative to the total. The user-entered % should drive the SOV dollar amount directly.

3. **Basement needs walkout question** — Currently asks "Finished / Partially finished / Unfinished" but doesn't ask if it's a walkout basement. Walkout basements have exposed exterior walls that need framing. Need: add "Is it a walkout basement?" follow-up, and if yes, generate "Exterior wall framing — Basement" SOV line.

## Changes

### `src/hooks/useSetupWizardV2.ts`

**1. Consolidate roof deck questions**
- Remove `Q7_roof_deck` from the `roof` phase (line 304-312)
- Move the roof deck question to exterior_finish where the full rooftop deck question already lives, OR keep one in roof and remove the exterior duplicate
- Actually, these serve different purposes: `has_roof_deck` = flat roof structural sections, `has_rooftop_deck` = amenity rooftop deck. Keep both but the user said "ask about rooftop deck in the roof section" — so move `has_rooftop_deck` (Q11_rooftop_deck) from `exterior_finish` phase to `roof` phase. The decking scope follow-up stays in exterior_finish.

**2. Fix mobilization % driving the SOV amount**
- In `generateSOVLines` (line 712-716), when the user enters a percentage, use it as the actual percentage of contract value instead of using the base weight
- Current: `const mobWeight = pct ? parseFloat(pct) : w('mobilization');` — `parseFloat(pct)` returns e.g. `5` but the weight system expects relative weights, not direct percentages. Fix: when user provides a %, set the weight to `(parseFloat(pct) / 100) * contractValue` and mark it as a fixed amount, OR adjust so the normalization respects user-entered mobilization %

Actually the simpler fix: the weight system normalizes all weights to 100%. So if mobilization weight is 5 and total weights sum to ~100, it gets ~5%. If user says 8%, we should set mobWeight to 8 (matching the scale). The current code already does `parseFloat(pct)` which returns `8` from `"8"`. Let me re-check — the issue might be that `pct` is not being extracted correctly from the object.

Looking at line 713: `const pct = typeof a.mobilization === 'object' ? a.mobilization.percent : '';`
And line 714: `const mobWeight = pct ? parseFloat(pct) : w('mobilization');`

If user enters 8%, `pct = "8"`, `parseFloat("8") = 8`, and `w('mobilization') = 5`. So mobWeight = 8. Since total weights sum to ~100, this would give ~8% — which is correct. The issue might be that the normalization adjusts it. Let me check the normalization logic.

Actually, the user said "mobilization is asking for the % in the questioner but does whatever in the SOV." This suggests the entered % isn't being respected after normalization. The fix: after normalization, override mobilization to be exactly the user-entered %. This requires special handling.

**3. Add walkout basement question + exterior wall SOV line**
- Add `S_basement_walkout` question: "Is it a walkout basement?" (yes_no), visible when `has_basement=yes`
- Place after `S_basement_type` 
- In `generateSOVLines`, if `basement_walkout === 'yes'`, add `Exterior wall framing — Basement` line
- If walkout + finished: both exterior walls AND interior walls
- If walkout + unfinished: exterior walls only (exposed side needs framing regardless)

### Files Changed

| File | Change |
|------|--------|
| `src/hooks/useSetupWizardV2.ts` | Move rooftop deck Q to roof phase; fix mobilization % to be respected in final SOV; add walkout basement question + exterior wall SOV line |

