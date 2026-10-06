# Rebuild the OnTime landing page as a connected jobsite story

## What will change

- Replace the current brochure-style opening with a full-width construction scene built around one clear message, one primary signup action, and a visible product moment.
- Introduce four recurring illustrated professionals: General Contractor, Subcontractor, Crew, and Supplier. Their clothing, tools, and safety equipment will match their work.
- Turn the page into a visual workflow: a field issue is captured, priced, approved, supplied, invoiced, and paid. The same work item visibly moves between the four companies.
- Anchor real OnTime interface examples beside the person using them instead of presenting isolated feature cards.
- Rework the existing roles, features, proof, pricing, and final signup content into fewer full-width story sections while preserving the current factual claims and links.
- Keep the current Jobsite Gold and navy brand, using Space Grotesk for landing-page headings and DM Sans for body copy.

## Character and motion direction

- Create an original, consistent 2D editorial illustration set rather than copying Zenzap’s characters.
- Use restrained animation: checking plans, recording a field issue, approving on a tablet, preparing an order, and passing the workflow forward.
- Keep movement calm and purposeful, stop or simplify it for reduced-motion visitors, and avoid bouncing mascots or constant decorative motion.

## Technical details

- Build the characters as optimized transparent image assets, with CSS animation for small body/tool movements and workflow handoffs.
- Keep the existing authentication, navigation, signup, pricing, role-page, and product behavior unchanged.
- Update landing-only typography and semantic design tokens without changing the signed-in application’s Command Center styling.
- Keep the first screen useful at desktop and phone sizes, with the next story section visibly beginning below it.

## Verification

- Inspect the result visually on desktop and at 320px and 394px phone widths.
- Check navigation, signup, sign-in, role links, pricing links, motion reduction, text wrapping, overlap, and image loading.
- Run the permanent mobile audit after the layout changes and confirm the preview build is clean.
