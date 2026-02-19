

# Brand the App with OnTime.Build Identity

## Overview

Apply the OnTime.Build brand identity from the uploaded logo sheet across the entire application. This includes using the uploaded logo image as the favicon and in-app logo, updating the color palette to match the brand colors (blues, dark navy, teal accents), switching typography to Montserrat/Poppins, updating the tagline, and setting proper HTML meta tags.

---

## Part 1: Logo Asset

**Copy the uploaded image to the project:**
- Copy `user-uploads://ChatGPT_Image_Feb_19_2026_01_06_13_PM.png` to `public/ontime-logo.png` for use as favicon and OG image
- Since the uploaded image is a brand sheet (not a clean icon), we will create a clean SVG logo component (`src/components/ui/OntimeLogo.tsx`) that renders the hexagonal shield + building icon mark from the brand sheet using inline SVG -- matching the blue/dark color scheme

---

## Part 2: Color Palette Update

**File: `src/index.css`**

Update CSS custom properties to match the brand colors extracted from the sheet:

| Role | Current | New (from brand sheet) |
|------|---------|----------------------|
| Primary | `200 98% 39%` (cyan) | `207 90% 54%` (brand blue) |
| Secondary | `215 24% 26%` (dark gray) | `220 26% 14%` (dark navy) |
| Sidebar BG | `222 47% 11%` | `222 47% 11%` (keep -- matches dark brand) |
| Accent green | (state-approved) | keep existing |
| Ring/focus | match primary | `207 90% 54%` |

Light mode adjustments:
- `--primary`: shift to the brand blue `207 90% 54%`
- `--ring`: match primary
- `--sidebar-primary`: match primary

Dark mode adjustments:
- `--primary`: lighter brand blue `207 90% 64%`

---

## Part 3: Typography Update

**File: `src/index.css`**
- Replace the `Plus Jakarta Sans` Google Font import with `Poppins` (weights 400, 500, 600, 700, 800)
- Update `body` and heading font-family to `'Poppins', system-ui, sans-serif`

**File: `tailwind.config.ts`**
- Update `fontFamily.sans` to start with `'Poppins'` instead of `'Inter'`

---

## Part 4: Replace Logo in All Locations

Create a reusable `OntimeLogo` SVG component that renders the hexagonal shield icon.

**Files to update (replace `Building2` icon with `OntimeLogo`):**

1. `src/components/landing/LandingHeader.tsx` -- header logo
2. `src/components/landing/Footer.tsx` -- footer logo
3. `src/components/layout/AppSidebar.tsx` -- sidebar logo
4. `src/pages/Auth.tsx` -- auth page logo
5. `src/pages/Demo.tsx` -- if it has a logo reference
6. `src/components/signup-wizard/AccountStep.tsx` -- if it shows a logo

Each location: replace the `<div className="... bg-primary rounded-xl"><Building2 .../></div>` pattern with `<OntimeLogo className="w-9 h-9" />`.

---

## Part 5: HTML Meta Tags and Favicon

**File: `index.html`**
- Update `<title>` to "OnTime.Build -- Construction Intelligence"
- Update `og:title` to "OnTime.Build"
- Update `og:description` to "Build Smarter. Deliver On Time. Modern construction billing and change order management."
- Add favicon link pointing to `/ontime-logo.png`
- Update Twitter meta tags

---

## Part 6: Tagline Updates

**File: `src/components/landing/HeroSection.tsx`**
- Update the badge text or add a tagline: "Schedule. Manage. Deliver"
- Keep existing headline but ensure it aligns with brand voice

**File: `src/components/landing/Footer.tsx`**
- Update description to "Build Smarter. Deliver On Time."

---

## File Summary

```text
New files:
  src/components/ui/OntimeLogo.tsx    -- Reusable SVG logo component
  public/ontime-logo.png             -- Copied from user upload (favicon/OG)

Modified files:
  index.html                          -- Title, meta tags, favicon
  src/index.css                       -- Colors, typography
  tailwind.config.ts                  -- Font family
  src/components/landing/LandingHeader.tsx  -- Logo swap
  src/components/landing/Footer.tsx         -- Logo swap + tagline
  src/components/layout/AppSidebar.tsx      -- Logo swap
  src/pages/Auth.tsx                        -- Logo swap
  src/components/landing/HeroSection.tsx    -- Tagline alignment
```

## Implementation Sequence

1. Copy logo image to public/ for favicon
2. Create OntimeLogo SVG component
3. Update index.html meta tags and favicon
4. Update CSS colors and typography
5. Update tailwind.config.ts font family
6. Swap logos in all 4+ locations
7. Update taglines in landing/footer

