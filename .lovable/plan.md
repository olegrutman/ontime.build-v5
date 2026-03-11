

# Amber + Navy Design System Overhaul

## Summary
Replace the current orange (#E85A00) + light gray design with the uploaded amber (#F5A623) + navy (#0D1F3C) palette across the entire application — landing page, in-app layout, wizards, auth, and all UI components.

## Color Palette (from uploaded HTML)

| Token | Current | New |
|-------|---------|-----|
| Primary accent | `#E85A00` (orange) | `#F5A623` (amber) |
| Primary dark | — | `#D4880A` (amber-d) |
| Primary light | `#FF6F1A` | `#FFBA45` (amber-l) |
| Primary pale | `#FFF0E6` | `#FFF7E8` (amber-pale) |
| Navy / ink | `hsl(220,22%,15%)` | `#0D1F3C` (navy) |
| Navy dark | — | `#080E1C` (navy-d) |
| Navy extra dark | — | `#04080F` (navy-xd) |
| Surface | `#F5F6F8` | `#F5F7FB` |
| Surface 2 | — | `#EBEEF5` |
| Border | `hsl(220,13%,91%)` | `#DDE2EC` |
| Border 2 | `hsl(220,13%,82%)` | `#C6CDD9` |
| Muted text | `hsl(220,5%,42%)` | `#546070` |
| Muted 2 | `hsl(220,5%,62%)` | `#8E9BAD` |
| Green | `#0D9A6A` | `#0C9268` |
| Info blue | `#2563EB` | `#1B52C4` |

## Scope of Changes

### 1. CSS Variables — `src/index.css`
Update `:root` and `.dark` CSS custom properties to match the new amber/navy tokens. Update `--primary`, `--sidebar-background`, `--sidebar-primary`, shadow definitions, and add amber-specific custom properties.

### 2. Landing Page Components (full content replacement from uploaded HTML)
All 10 landing components get new content + colors from the uploaded HTML:

| Component | Key Content Changes |
|-----------|-------------------|
| **LandingHeader** | Navy background nav bar (was white/frosted), amber CTA buttons, amber `.build` wordmark, SVG logo from HTML |
| **HeroSection** | New gradient (`#fff → #F6F8FD → #FFF8EC`), navy dot-grid, amber-d headline emphasis, amber hero buttons, navy-themed dashboard mock with amber sidebar active states |
| **StatsStrip** | Navy bg, amber stat numbers (was `#E85A00`), updated stat values ($89/mo, 4 Roles) |
| **FeaturesSection** | New feature content (POs, WOs, COs, Invoicing, Returns, Budget), amber icon backgrounds, amber hover borders |
| **HowItWorksSection** | New content (Set Up → Order → Track → Close Out), new "Live Document View" visual panel replacing phone mockup |
| **IntegrationsStrip** | `navy-xd` background (deeper), amber dots |
| **TestimonialsSection** | Updated quotes matching HTML, amber stars/accents, logo strip |
| **PricingSection** | New $89/mo pricing, navy featured card with amber top border, amber checkmarks |
| **CTASection** | Navy gradient background (was solid orange), amber headline emphasis, amber CTA button |
| **Footer** | `navy-d` background, SVG logo, amber social hover states |

**New section to add:** `RolesSection` — navy background, 4-card grid (GC, TC, FC, SP) with amber accents. Insert between HowItWorks and Integrations.

### 3. In-App Layout — Sidebar & TopBar
- **AppSidebar**: Change sidebar colors to use navy background with amber active states (amber left border + amber text on active items, amber-tinted hover). Update the logo SVG.
- **TopBar**: Keep white/card background but update accent buttons to amber.
- **BottomNav**: Amber active state icons.

### 4. Global UI Components
- **Button** (`src/components/ui/button.tsx`): `--primary` CSS var handles this automatically via the CSS variable change.
- **StateBadge, StateProgressBar**: Already use CSS vars — will update automatically.
- **Cards/Inputs**: Border colors update via `--border` var change.

### 5. Auth Page — `AuthSection.tsx`
- Update accent colors in the auth card (amber buttons, amber links).
- These will mostly flow from the CSS variable changes.

### 6. Wizards
- Per the memory note, wizards use standardized `WizardProgress` with `h-2` progress pills and sticky headers.
- The progress pills and action buttons inherit from `--primary` → will turn amber automatically.
- No structural wizard changes needed — just the CSS variable cascade.

### 7. Tailwind Config — `tailwind.config.ts`
- No structural changes needed since colors reference CSS variables.
- Optionally add `amber` utility color shortcuts for direct use.

## File Changes

| File | Action |
|------|--------|
| `src/index.css` | MODIFY — update CSS custom properties |
| `src/components/landing/LandingHeader.tsx` | REWRITE — navy bar, SVG logo |
| `src/components/landing/HeroSection.tsx` | REWRITE — new content + amber/navy dashboard mock |
| `src/components/landing/StatsStrip.tsx` | MODIFY — amber numbers, new stats |
| `src/components/landing/FeaturesSection.tsx` | REWRITE — new feature content |
| `src/components/landing/HowItWorksSection.tsx` | REWRITE — new steps + document visual |
| `src/components/landing/RolesSection.tsx` | NEW — 4-role grid on navy |
| `src/components/landing/IntegrationsStrip.tsx` | MODIFY — darker bg, amber dots |
| `src/components/landing/TestimonialsSection.tsx` | MODIFY — updated quotes, amber accents |
| `src/components/landing/PricingSection.tsx` | REWRITE — $89 pricing, new tiers |
| `src/components/landing/CTASection.tsx` | REWRITE — navy gradient bg |
| `src/components/landing/Footer.tsx` | MODIFY — SVG logo, amber accents, new links |
| `src/components/landing/index.ts` | MODIFY — add RolesSection export |
| `src/pages/Landing.tsx` | MODIFY — add RolesSection |
| `src/components/layout/AppSidebar.tsx` | MODIFY — amber active state colors |

Total: ~15 files. The CSS variable cascade handles buttons, wizard progress bars, form inputs, badges, and all other UI components automatically.

