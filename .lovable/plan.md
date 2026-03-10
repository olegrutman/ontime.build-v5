

# Landing Page Redesign — Based on Uploaded HTML Reference

## Design Direction

The uploaded HTML showcases a bold, construction-industry-specific design with:
- **Typography**: Barlow Condensed (bold/uppercase headlines), DM Sans (body)
- **Color**: Orange (#E85A00) as primary accent, dark ink (#1C2230), clean white backgrounds
- **Layout patterns**: Dot-grid backgrounds, numbered feature cards with hover top-border reveals, dark stats strip, construction dashboard mock in hero, testimonials grid, 3-tier pricing, full-orange CTA section, dark footer
- **Animations**: Scroll-reveal fade-up effects, pulse dot on eyebrow badge

## Sections to Rebuild

### 1. LandingHeader — Nav bar
Keep existing auth logic, update styling: fixed top bar with frosted glass, "OT" clip-path logo mark + "OnTime.build" text, nav links (Features, How It Works, Customers, Pricing), ghost "Sign In" + primary "Start Free Trial" buttons. Mobile hamburger stays.

### 2. HeroSection — Bold uppercase headline
- Eyebrow badge with pulse dot: "Construction Project Management"
- Giant Barlow Condensed headline: `Every Project. On Time. Every Time.` with outline text effect
- Subtitle in DM Sans, muted color
- CTA: "Start Free — 14 Days" primary + "Watch 2-min Demo" play button
- Trust section: avatar stack + "Trusted by 2,400+ projects"
- Dashboard mock: 3-column layout (sidebar, main with KPIs + Gantt bars, activity feed) inside a browser-chrome frame with dot-grid background

### 3. StatsStrip — Dark stat bar (NEW section)
Dark (#111418) full-width bar with 4 stats: 2,400+ Projects, $18B Value Managed, 94% On-Time Rate, 34% Rework Reduction. Barlow Condensed numbers in orange.

### 4. FeaturesSection — 3x2 grid with numbered cards
Section eyebrow + Barlow Condensed title. 6 feature cards in a 1px-gap grid with hover top-border reveal animation, numbered 01-06, icon boxes, tags at bottom.

### 5. HowItWorksSection — 2-column (steps + visual)
Left: 4 numbered steps with active state highlighting. Right: visual card with phone mockup + office live feed + metric row.

### 6. IntegrationsStrip — Dark bar with integration badges (NEW)
Dark background, badge grid showing partner tools (Procore, Sage, QuickBooks, etc.)

### 7. TestimonialsSection — 3-column quote grid (NEW)
Star ratings, italic quotes with large opening quote mark, author avatar + name/role. Below: logo row of trusted companies.

### 8. PricingSection — 3-tier cards (NEW)
Starter ($299), Professional ($699, featured/dark), Enterprise (Custom). Checkmark lists, dimmed unavailable features, "Most Popular" badge.

### 9. CTASection — Full orange background
Orange background with dot-grid overlay. Big uppercase headline with outline text. Two buttons (white primary + outline). Trust badges below.

### 10. Footer — Dark 4-column
Dark background, brand column with socials, 3 link columns (Product, Company, Resources), bottom bar with copyright + legal links.

## Font Setup
Add Google Fonts link to `index.html` for Barlow Condensed + DM Sans. Add `font-heading` (Barlow Condensed) and `font-body` (DM Sans) to Tailwind config.

## Files to Modify/Create

| File | Action |
|------|--------|
| `index.html` | ADD Google Fonts link |
| `tailwind.config.ts` | ADD font-heading, font-body families |
| `src/index.css` | ADD reveal animation + utility classes |
| `src/pages/Landing.tsx` | UPDATE section order, add new sections |
| `src/components/landing/LandingHeader.tsx` | REWRITE — new nav styling with logo mark |
| `src/components/landing/HeroSection.tsx` | REWRITE — bold headline, dashboard mock, trust avatars |
| `src/components/landing/StatsStrip.tsx` | NEW — dark stat bar |
| `src/components/landing/FeaturesSection.tsx` | REWRITE — numbered grid cards with hover effects |
| `src/components/landing/HowItWorksSection.tsx` | REWRITE — 2-column with visual |
| `src/components/landing/IntegrationsStrip.tsx` | NEW — dark integrations bar |
| `src/components/landing/TestimonialsSection.tsx` | NEW — 3-col testimonials + logos |
| `src/components/landing/PricingSection.tsx` | NEW — 3-tier pricing |
| `src/components/landing/CTASection.tsx` | REWRITE — full orange background |
| `src/components/landing/Footer.tsx` | REWRITE — dark footer |
| `src/components/landing/index.ts` | UPDATE exports |
| `src/components/landing/LogoMarquee.tsx` | REMOVE — replaced by StatsStrip + IntegrationsStrip |

## Responsive
All sections fully responsive. Features/pricing/testimonials grids collapse to single column on mobile. Dashboard mock hides sidebar + right panel on mobile. Stats strip becomes 2x2 grid.

