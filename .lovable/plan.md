# Proposal: scope type, AI summary, work-order numbers, PDF page flow

## 1. What the proposal includes (labor only vs. materials and equipment)
- New required choice in the builder's Cover details: **Labor only**, **Labor + materials**, **Labor + materials + equipment**.
- Default is picked from the bundled work orders (for example, if none have material or equipment lines, it suggests Labor only). The user can change it.
- If the choice doesn't match the work orders (for example, Labor only is picked but a work order has material lines), a warning appears in the builder.
- The PDF shows it clearly in three places: a labeled badge under the title ("SCOPE: LABOR ONLY"), a line in the summary next to the total, and a sentence in the terms. For Labor only, that sentence says "Materials and equipment are not included and will be supplied by others." This replaces today's fixed sentence, which says everything is included.
- For Labor only, material and equipment lines are left out of the PDF.

## 2. AI package summary
- A "Write summary with AI" button next to the Intro paragraph.
- It writes 2–4 plain sentences using only the bundled work orders' titles, descriptions, locations, scope items and the scope choice. It doesn't invent quantities, dates or details, and never mentions internal costs or margins.
- The text goes into the Intro box, where the user can edit it before saving. It is never saved automatically.

## 3. Show work-order numbers?
- New toggle: **"Show work order numbers on the proposal"** (default on).
- When it's off, the PDF lists items as "Item 1, Item 2…" by title, with no WO/CO numbers. This applies to the scope sections and the summary table.

## 4. PDF page flow
- Work orders run one after another on the same page. A new page starts only when the page is actually full, and never right after a work order's heading (heading and first lines stay together).
- The Acceptance section (both signature blocks) is kept together as one unit. If it doesn't fit, it moves to the next page as a whole, along with the total line just above it.

## Technical details
- Migration: add `co_proposals.scope_type` (text, default `labor_materials_equipment`, check in `labor_only|labor_materials|labor_materials_equipment`) and `show_wo_numbers` (boolean, default true). Existing rows keep today's behavior.
- `useCOProposals.ts`: types, create/update payloads. `ProposalBuilder.tsx`: segmented scope selector, mismatch warning, WO-number switch, AI button.
- New edge function `proposal-ai-summary`: checks the user, loads the selected COs through RLS, and streams a summary from the Lovable AI Gateway (`openai/gpt-6-astra`, Responses API, low reasoning). It handles 402/429 errors with clear messages.
- `generate-proposal-pdf/index.ts`: render the scope badge and the scope sentence, filter out materials/equipment for Labor only, use WO-number or "Item N" labels, and measure-before-draw with keep-together blocks for WO headers and the summary total + acceptance, in place of the fixed `y > 620` check.
- Verify: typecheck, tests, generate a 4-WO PDF for each scope type with numbers on and off, then look at every page for page splits.
