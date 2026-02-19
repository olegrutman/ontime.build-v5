

# Use Uploaded Logo as Primary Brand Logo Globally

## What Changes

Replace the current hand-drawn SVG logo (`OntimeLogo` component) with the actual uploaded PNG image (`ontime-logo.png` already in `public/`). Update every location that still uses the generic `Building2` icon for branding. Ensure consistent application across all pages and responsive breakpoints.

---

## Part 1: Replace OntimeLogo SVG with PNG Image

**File: `src/components/ui/OntimeLogo.tsx`**
- Replace the inline SVG with an `<img>` tag pointing to `/ontime-logo.png`
- Keep the same props interface (`className`) for drop-in compatibility
- Add a `variant` prop: `"full"` (default, full logo) and `"icon"` (same image, smaller for collapsed sidebar/mobile icon use)
- This single change automatically updates: LandingHeader, Footer, AppSidebar, and Auth page (all already import `OntimeLogo`)

## Part 2: Fix Signup Page Logo

**File: `src/pages/Signup.tsx`**
- Replace the `Building2` icon in `SignupShell` (both desktop sidebar and mobile header) with `<OntimeLogo>`
- Desktop sidebar (line 330-331): Replace `<div className="... bg-primary rounded-xl"><Building2 /></div>` with `<OntimeLogo className="w-10 h-10" />`
- Mobile header (line 389-391): Same replacement

## Part 3: Demo Page Logo

**File: `src/pages/Demo.tsx`**
- Add the `OntimeLogo` to the demo header bar next to "Interactive Demo" for brand consistency

## Part 4: Confirm Color Palette (Already Done)

The CSS variables are already set to the brand palette from the previous branding pass:
- Primary blue: `207 90% 54%` (buttons, highlights, links)
- Dark navy sidebar: `222 47% 11%` (navigation background)
- White canvas: `209 40% 96%` (main background)
- Destructive/warning: `0 72% 50%` (alerts) -- orange accent reserved for financial alerts via state colors (`38 92% 50%`)
- No new colors introduced

## Part 5: Confirm Typography (Already Done)

Already using Poppins as primary font with proper weights:
- Semibold for headers (`font-semibold` on h1-h6)
- Regular for body
- Medium for buttons

## Part 6: Dark Mode Logo Handling

**File: `src/components/ui/OntimeLogo.tsx`**
- The PNG logo stays full-color in both light and dark modes (no CSS filter applied)
- No inversion or color manipulation

---

## Files Modified

```text
src/components/ui/OntimeLogo.tsx   -- Replace SVG with <img> using /ontime-logo.png
src/pages/Signup.tsx               -- Replace Building2 icon with OntimeLogo in SignupShell
src/pages/Demo.tsx                 -- Add OntimeLogo to demo header
```

## What Already Works (No Changes Needed)

These files already import and use `OntimeLogo` and will automatically pick up the PNG change:
- `src/components/landing/LandingHeader.tsx` -- desktop + mobile header
- `src/components/landing/Footer.tsx` -- footer logo
- `src/components/layout/AppSidebar.tsx` -- sidebar logo (full + collapsed)
- `src/pages/Auth.tsx` -- login page
- `index.html` -- favicon already points to `/ontime-logo.png`
- `public/ontime-logo.png` -- already copied from upload

## Implementation Order

1. Update `OntimeLogo.tsx` to render the PNG image
2. Update `Signup.tsx` to use `OntimeLogo` instead of `Building2`
3. Add `OntimeLogo` to `Demo.tsx` header
4. Verify all pages render the real logo with no legacy SVG or Building2 icons remaining in brand positions
