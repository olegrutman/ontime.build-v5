## Problem

On mobile (390–440px), several landing sections use font sizes that are technically legible but feel cramped for outdoor/site reading (bright screens, gloves, older eyes). Specifically:

| Location | Current mobile size | Issue |
|---|---|---|
| Hero sub-paragraph | `1rem` (16px) | Fine, but line-height 1.65 is tight for the long paragraph |
| Hero KPI tile labels ("Contract", "Paid", "Approvals") | `0.58rem` (~9px) | Way below readable minimum |
| Hero KPI hint row ("Active", "1 INV · 2 WO…") | `0.58rem` (~9px) | Same — unreadable at arm's length |
| Hero KPI values | `1.35rem` (~22px) | OK but small for a headline number |
| Hero "Material budget vs orders" label | `0.62rem` (~10px) | Too small |
| Hero progress bar row labels (Lumber, Hardware…) | `0.68rem` (~11px) | Below comfort threshold |
| Hero progress % values | `0.62rem` (~10px) | Too small |
| Hero trust row ("Built with real GCs…") | `0.78rem` (~12.5px) | Borderline |
| Hero eyebrow pill | `0.68rem` (~11px) | OK for a label, but tracking is tight |
| ProblemSolution "before" / "after" text | `0.9–0.95rem` (~14–15px) | Fine, keep |
| CTASection subhead | `1.05rem` | Fine |
| CTASection trust chips | `0.8rem` (~13px) | Borderline |
| StatsStrip label | `0.83rem` (~13px) | Borderline on 390px |

Root cause: mobile sizes were set to make the "browser mockup" tile look proportional. That's the wrong priority — legibility beats mockup fidelity.

## Fix approach

**Adopt a mobile minimum of 12px (0.75rem) for any label, 14px (0.875rem) for any body-adjacent text, 16px (1rem) for paragraphs.** This matches Apple HIG and Material guidance and is what leading construction/SaaS sites (Procore, Linear, Stripe) use on mobile.

### Specific changes (mobile only — desktop sizes unchanged)

**HeroSection.tsx**
1. Sub-paragraph: keep `1rem` but bump line-height from 1.65 → 1.7 and add a hair more bottom margin so it breathes.
2. Product mockup KPI tiles:
   - Label: `0.58rem` → `0.7rem` (~11.2px) with tighter tracking, or accept a slightly larger tile
   - Value: `1.35rem` → `1.6rem` — the headline number should dominate
   - Hint: `0.58rem` → `0.68rem` and truncate more aggressively
3. Progress section:
   - Section label: `0.62rem` → `0.72rem`
   - Row label: `0.68rem` → `0.8rem`, widen label column from 74px → 88px
   - Percent value: `0.62rem` → `0.75rem` bold
4. Trust row copy: `0.78rem` → `0.85rem`
5. Eyebrow pill: `0.68rem` → `0.72rem`, loosen letter-spacing from 1.2px → 1px

**CTASection.tsx**
6. Trust chips ("No credit card required" etc.): `0.8rem` → `0.88rem`, and stack to 2×2 grid on mobile instead of 4-wrap so each chip has room.
7. Headline `clamp(2.8rem, 6vw, 5.5rem)` → `clamp(2.4rem, 8vw, 5.5rem)` — the 6vw minimum is too small on 390px (~23px).

**StatsStrip.tsx**
8. Label: `0.83rem` → `0.9rem` on mobile.
9. Number: keep clamp but raise floor from 2.2rem → 2.6rem so the numbers feel like stats, not captions.

**ProblemSolutionSection.tsx** — already fine, no changes.

### Why this works
- **12px floor** removes the "squinting" complaint without breaking the compact aesthetic.
- **Bumping the KPI values proportionally** keeps the visual hierarchy (big number > small label) intact.
- **Only mobile breakpoints change** (`sm:` and above stay the same), so desktop stays polished.
- **No layout thrash** — the mockup tile grows ~8–12px in height, still fits the viewport.

### Not changing
- Desktop typography (already well-tuned).
- Font families, colors, spacing tokens.
- Section order or content.

## Technical scope

Files touched:
- `src/components/landing/HeroSection.tsx` (~10 className tweaks)
- `src/components/landing/CTASection.tsx` (2 className tweaks + grid on mobile)
- `src/components/landing/StatsStrip.tsx` (2 className tweaks)

Zero new dependencies, no design tokens changed, no logic changes. Purely presentational.
