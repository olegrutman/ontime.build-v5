# Landing Page: Conversion Rework Plan

## 1. Honest audit of what we have

Current stack (top → bottom): Header → Hero → StatsStrip → ProblemSolution → Features → HowItWorks → Roles → AI → Testimonials → Pricing → FAQ → CTA → Footer + StickyMobileCTA.

What's working
- Mobile-first hero with a real product proof strip (KPI tiles + progress bars) — better than a generic screenshot.
- Clear value prop headline ("Every Order. Every Job. One System.").
- Sticky mobile CTA. Trust avatars. Amber/navy identity is distinctive (not the generic purple-gradient SaaS look).
- Problem→Solution section is a real conversion angle.

What's blocking sign-ups
1. **No above-the-fold social proof with weight.** "Built with real GCs, trades, crews & suppliers" is vague. Linear/Ramp/Vercel show *named* logos or hard numbers ("$X billed", "N projects live") in the hero.
2. **Too many sections before the CTA re-appears.** 9 sections of scroll before the closing CTA. Ramp and Linear re-CTA every 2–3 sections.
3. **Sign-up cost isn't dramatized.** The offer is "$89/company/month, unlimited users" — that's a huge wedge vs Procore ($$$/user). We bury it in Pricing instead of leading with it.
4. **Role confusion.** GC/TC/FC/SUP is our superpower but a cold visitor doesn't know which they are. No "I am a ___" selector to personalize the page.
5. **Hero CTA is generic.** "Create an Account — Free" doesn't tell them what happens next. Best-in-class: "Start free — no card, 2 min setup" with the exact next step visible.
6. **No risk-reversal.** No "cancel anytime", "your data stays yours", "free until you invite your team" reassurance near the button.
7. **AI section reads like a feature list.** It should show one concrete before/after (photo of a PDF estimate → generated PO in 30s).
8. **Testimonials load below-the-fold and are lazy.** First-time visitors on mobile bounce before they load.
9. **FAQ answers the wrong questions.** Should answer sign-up objections: "Do I need to migrate data?", "What if my sub doesn't have an account?", "Is my QuickBooks safe?"
10. **No urgency / recency.** No "shipped this week", changelog, or "N teams joined this month" signal.

## 2. Who we're benchmarking against and why

| Site | What they do well | What we steal |
|---|---|---|
| **Linear.app** | Product-in-hero with real UI, not a mockup. Tight copy. Named customer logos strip. | Real product screenshot loop, customer logos row directly under hero. |
| **Ramp.com** | Aggressive numeric proof ("$10B saved"). Repeats CTA every section. Role-based paths ("For CFOs / Controllers / Accountants"). | Big number in hero, role selector, repeated inline CTAs. |
| **Vercel.com** | "Deploy in 30 seconds" — dramatizes time-to-value. Live demo embedded. | Time-to-value promise in hero eyebrow. |
| **Procore.com** (direct competitor) | Segmented by role. Case studies with hard $ savings. | Our anti-Procore angle: flat pricing, all roles included. Call it out. |
| **Notion.so** | Free tier prominent, "Get Notion free" as the primary CTA. | Free-forever framing before the $89 price. |
| **Stripe.com** | Dense but scannable. Code/receipt shown side-by-side. Trust badges under fold. | Side-by-side "before Ontime / after Ontime" visual. |
| **Attio / Cal.com** | Changelog and "shipped today" bar → shows momentum. | "What shipped this week" strip near footer. |

Common pattern across all: **hero → logos → one killer visual proof → repeated CTA → role paths → pricing high → FAQ answers objections → final CTA**. Our order is close but we bury proof and delay the second CTA.

## 3. Design decisions and why

### A. Rework the hero (highest ROI)
- **Eyebrow becomes time-to-value:** "Set up in under 30 minutes • No credit card" (replaces "Construction Operations Platform").
- **Sub-headline gets one hard number:** "Used by teams to reconcile $X in change orders since 2024." Even a modest real number beats vague copy.
- **CTA copy:** "Start free — invite your crew in 2 min" (concrete, tells them what happens).
- **Micro-copy under CTA:** "No card. Cancel anytime. Your data exports on demand." (kills the 3 biggest B2B objections).
- Keep the KPI/progress proof strip — it's already good.

**Why:** Every high-converting SaaS hero answers three questions in one screen — *what is it, how fast do I get value, what do I risk*. We currently answer #1 only.

### B. Add a logos/proof band directly under hero
- Named GCs/trades who piloted, or if we can't name yet: "12 GCs · 40 trades · 180 crews using Ontime this week" — a real *live* count read from the DB via a public metrics function. Recency > vanity.
- **Why:** Social proof at the fold is the single biggest known conversion lever (Baymard, ConversionXL studies). Our current avatar row is decorative, not evidential.

### C. Role selector chip band ("I am a…")
- 4 chips: GC / Trade / Field Crew / Supplier. Clicking one filters the Roles section and re-anchors the hero sub-copy.
- **Why:** Ramp's role paths lifted sign-up 20%+ in their public case studies. Our audience is 4 distinct personas — one-size copy under-serves all of them.

### D. Move Pricing up, above Testimonials
- Our $89/company (not per-user) is the *reason* someone switches from Procore. Burying it below testimonials is malpractice.
- Add a comparison row: "Procore: $$$/user · Ontime: $89/company flat".
- **Why:** Pricing is the #1 clicked nav item on B2B sites (Klaviyo internal data, widely cited). Lead with the wedge.

### E. Insert an inline CTA band after Problem→Solution and after AI section
- Two additional CTAs mid-scroll, styled as slim bands not full sections.
- **Why:** Users decide to click at different points. Ramp/Linear repeat CTAs every 2 sections; we make users scroll 9 sections to the closing CTA.

### F. Rebuild AI section as one concrete before/after
- Left: a real supplier PDF thumbnail. Right: the generated PO card. Arrow between. Timer: "17 seconds."
- Keep the 4 capability cards but demote them below the demo.
- **Why:** Show don't tell. Every AI marketing page in 2025 that converts (Cursor, v0, Perplexity) leads with a single concrete artifact, not a capability grid.

### G. Rewrite FAQ around sign-up objections
Replace generic Qs with the ones stopping sign-up:
- "Do I have to migrate my existing projects?" (No — start with one job.)
- "What if my sub-contractor doesn't have an account?" (External approval links, no account needed.)
- "Does it work on my phone in the field?" (Yes — offline-tolerant PWA with push.)
- "Is my QuickBooks data safe?" (We never store their creds, OAuth-only, per-user.)
- "How is this different from Procore?" (Flat $89, all roles included, actually usable on a phone.)
- "Can I cancel?" (Yes, anytime, data exports.)

### H. Add a "Shipped this month" strip above the final CTA
- Pulls the last 3 shipped items from a simple hardcoded list initially, later from a CMS/changelog table.
- **Why:** Signals velocity. A dead-looking product is the silent sign-up killer.

### I. Mobile-specific
- Reduce hero vertical padding on <390px (currently pt-[104px] pb-16 pushes the proof strip below the fold).
- Sticky mobile CTA already exists — good. Add a subtle "12 sign-ups this week" counter to it to add urgency.

## 4. What I will NOT change (and why)

- The amber/navy color system — it's differentiated and construction-appropriate. Don't touch.
- Typography (Barlow Condensed / DM Sans / IBM Plex Mono) — already professional, dense, on-brand.
- The KPI proof strip in the hero — it's already better than most competitors' hero screenshots.
- The RolesSection and HowItWorksSection structure — solid, just needs the role-chip entry point.

## 5. Build order (proposed sprint)

**Phase 1 — highest lift, lowest risk (ship first):**
1. Rewrite hero eyebrow + sub-copy + CTA + risk-reversal micro-copy.
2. Insert logos/live-count proof band under hero.
3. Move Pricing above Testimonials in `src/pages/Landing.tsx`.
4. Add 2 inline CTA bands (after ProblemSolution, after AI).
5. Rewrite FAQ copy around sign-up objections.

**Phase 2 — medium lift:**
6. Role selector chip band + wire to RolesSection filter.
7. Rebuild AI section around one before/after artifact.
8. Add "Shipped this month" strip.

**Phase 3 — data-backed:**
9. Public `get_landing_metrics()` RPC for live GC/TC/FC/SUP counts.
10. A/B test hero variants (needs analytics hook).

## 6. How I'll measure success

- Sign-ups per unique landing visit (needs an analytics event on `/signup` open from `/`).
- Scroll depth to Pricing.
- Sticky CTA click-through on mobile.
- Bounce on the hero on 390px.

I recommend I ship **Phase 1 in one pass** — it's copy + reordering + two new small components, no risky refactors — then we measure and decide on Phase 2. Want me to start Phase 1?
