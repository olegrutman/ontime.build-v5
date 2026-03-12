

# Use Landing Page SVG Logo Throughout the App

## Problem
The landing page (header + footer) uses an inline SVG logo, while the rest of the app (`OntimeLogo` component) renders `<img src="/ontime-logo.png">` with a CSS filter. This creates visual inconsistency.

## Solution
Replace the `OntimeLogo` component in `src/components/ui/OntimeLogo.tsx` with the same SVG used on the landing page. Then remove the duplicate `LogoSVG` definitions from the landing page files and have them import `OntimeLogo` instead.

## Changes

| File | Change |
|------|--------|
| `src/components/ui/OntimeLogo.tsx` | Replace the `<img>` tag with the inline SVG from the landing page. Keep the `className` prop for sizing. |
| `src/components/landing/LandingHeader.tsx` | Remove local `LogoSVG` component, import and use `OntimeLogo` instead |
| `src/components/landing/Footer.tsx` | Remove local `LogoSVG` component, import and use `OntimeLogo` instead |

This is a 3-file change. All 8 files that already import `OntimeLogo` will automatically get the new SVG logo with no further edits needed.

