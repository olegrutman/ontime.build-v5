
# Landing Page Improvement Plan

Based on what this app actually does (GC ↔ TC ↔ FC ↔ Supplier hierarchy, SOV invoicing, CO/WO mini-projects, T&M/Remodel mode, AI estimate parsing, Sasha onboarding, returns with credit memos, role-based financial privacy) the current landing under-sells the product, contains a few credibility bugs, and has accessibility/SEO gaps.

## 1. Fix the obvious bugs first (credibility)

- **Pricing card is broken.** Essentials and Operations both show `$89/mo`, and Essentials lists "Change orders" as both included and dimmed (missing). Decide actual price tiers, deduplicate, and fix the ✓/— states.
- **Hero dashboard mock has "Change Orders" twice** in the sidebar (lines 103–104). Replace one with a real nav item the app has (e.g. Schedule, Field Tasks, Returns).
- **CTAs lie.** "Start Free Demo" and "Book a Live Demo" both point to `/signup` or `#`. Either build a true `/demo` (read-only sandbox using the existing Demo route) or relabel to "Create Account" / "Talk to Sales" (with a real mailto or Calendly).
- **Fabricated trust signals.** "2,400+ active projects · $18B managed", the 8 customer logos, and the 3 named testimonials are placeholder content presented as fact. Replace with either (a) real numbers/logos once available, or (b) honest framing: "Built with input from working GCs, TCs, and field crews" + remove the logo strip until real.
- **Integrations strip lists 12 tools** (QuickBooks, Procore, Bluebeam, Trimble, BIM 360, etc.) that aren't actually integrated. Either build them, relabel as "Roadmap / Coming soon", or remove the strip.

## 2. Rewrite the hero to match what the product uniquely solves

Current sub is generic ("eliminating spreadsheets, phone calls…"). The real wedge is the **multi-party financial loop nobody else handles cleanly**: GC budget ↔ TC contracts ↔ FC labor ↔ Supplier POs ↔ Returns, with **role-based privacy** baked in (GCs don't see TC margins, TCs don't see supplier pricing when GC procures).

Proposed structure:
- Eyebrow: "One platform. Four roles. Zero margin leaks."
- Headline: keep the "Every Order. Every Job. One System." rhythm.
- Sub: lead with the specific problems — "Stop reconciling SOVs by hand, chasing change-order approvals over text, and finding $40k of unreturned material at closeout."
- Primary CTA → real demo sandbox (DemoContext already exists). Secondary → "See a 90-sec walkthrough" (embedded loom/video) instead of an anchor link.

## 3. Add the sections the product earns but the page doesn't show

- **"Built for the hierarchy" diagram.** Visual of GC → TC → FC with Supplier on the side, showing what each role sees and signs off on. This is the platform's actual differentiator vs Procore/Buildertrend.
- **AI section.** The app has: Gemini-powered estimate PDF parsing → POs, AI scope description generation, Sasha onboarding assistant, AI SOV generation. None of this is on the landing. One section with 3 short cards.
- **T&M / Remodel mode callout.** Most competitors are fixed-bid only. The product flips KPIs and invoicing to Work-Order-driven for remodel jobs — that's worth its own band.
- **Closed-loop returns.** Returns + credit memos + restocking fees flowing back to the budget is rare; pull it out of the generic features grid into a focused proof block with a screenshot.
- **Security & privacy band.** Role-based RLS, GCs can't see TC labor margins, configurable markup disclosure per project. Construction buyers care about this — currently invisible.
- **FAQ (5–7 questions).** Pricing, data ownership, who can see what, mobile/field use, onboarding time, cancellation, security.
- **Comparison strip.** "Spreadsheets vs Ontime" or "Procore vs Ontime for trade contractors" — 6-row table. Helps SEO and bottom-funnel conversion.

## 4. Replace the synthetic hero mock with real product screenshots

The current mock is a hand-built HTML facsimile. Use 3–4 actual product screenshots (Project Overview, SOV/invoicing, CO/WO detail, Supplier dashboard) in a tabbed or scrolling visual. Reuses real UI, looks more credible, less code to maintain.

## 5. Conversion + IA polish

- **Persona switcher above the fold** ("I'm a GC / TC / Field Crew / Supplier") that swaps the headline sub, the screenshot, and the CTA destination. The 4 roles are already first-class in the app.
- **Sticky bottom CTA bar** on mobile.
- **Pricing**: add an annual toggle and a clear "$X per company, unlimited users" framing — that's the real positioning vs per-seat competitors.
- **Footer**: currently minimal. Add status page, security page, changelog, docs, contact, social, legal links.

## 6. SEO, accessibility, performance

- **SEO**: `<title>` <60 chars w/ keyword ("Construction Ops Platform for GCs, Trades & Field Crews — Ontime.build"), meta description <160, single H1 (currently the Hero is correct), Organization + SoftwareApplication JSON-LD, OG/Twitter cards, canonical, `sitemap.xml`, `robots.txt` (exists). Add `/blog` shell so content can land later.
- **Accessibility**: many text colors are `white/0.28`–`white/0.38` on navy — fails WCAG AA. Bump to ≥ `white/0.6`. Emoji icons used as decorative icons need `aria-hidden`; replace key ones (📦 🔨 📄 💰 ↩ 📊) with lucide-react icons for crispness and theming. Anchor `▶` button is not a real button.
- **Performance**: hero dashboard mock is heavy; lazy-mount everything below the fold with `React.lazy` + `Suspense`. Preload the hero font subset.
- **Motion**: the `animate-fade-up-delay-*` chain stages 5 items — keep, but respect `prefers-reduced-motion`.

## 7. Technical details

Files touched:
- `src/pages/Landing.tsx` — section reorder, add new sections, lazy-load below fold.
- `src/components/landing/HeroSection.tsx` — copy, CTA wiring, fix mock duplicate, swap to real screenshot tabs, persona switcher.
- `src/components/landing/PricingSection.tsx` — fix tier data, add annual toggle.
- `src/components/landing/FeaturesSection.tsx` — replace emoji with lucide icons, tighten copy.
- `src/components/landing/RolesSection.tsx` — promote to "hierarchy diagram" treatment.
- `src/components/landing/TestimonialsSection.tsx` — remove fabricated content OR gate behind a "real-quotes-only" data file.
- `src/components/landing/IntegrationsStrip.tsx` — trim to real integrations or mark roadmap.
- `src/components/landing/CTASection.tsx` — wire "Book a Live Demo" to a real route or mailto.
- `src/components/landing/Footer.tsx` — expand.
- New: `AISection.tsx`, `TMModeSection.tsx`, `ReturnsLoopSection.tsx`, `SecurityPrivacySection.tsx`, `ComparisonTable.tsx`, `FAQSection.tsx`, `PersonaSwitcher.tsx`.
- `index.html` — meta, OG, JSON-LD.
- Assets: 3–4 product screenshots into `src/assets/landing/`.

No backend changes. No schema changes. Demo route already exists (`/demo`) and can be reused for the live sandbox CTA.

## 8. Suggested rollout order

1. Fix bugs (pricing, duplicate nav, broken CTA, fabricated stats/logos) — 1 pass, low risk, immediate credibility lift.
2. Hero rewrite + real screenshots + persona switcher.
3. New sections (AI, T&M mode, Returns loop, Security, FAQ, Comparison).
4. SEO + a11y + perf pass.
5. Footer + sticky mobile CTA.

Want me to proceed with all of this, or start with phase 1 (bug fixes) and confirm direction before the bigger restructuring?
