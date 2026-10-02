# Fix mobile sizing and text overflow across the app

## Goal
Make phone screens consistently readable without changing desktop layouts or any access and business rules.

## Changes
- Standardize shared checkboxes, switches, icons, and compact controls so flex layouts cannot squeeze them out of shape.
- Make reusable badges and labels wrap or truncate deliberately instead of overflowing their containers.
- Update high-traffic mobile screens—Team, projects, change orders, purchase orders, invoices, estimates, and dialogs—to stack crowded rows and let long names use available width.
- Replace problematic nested phone scrolling with natural page scrolling where practical, while retaining horizontal tables on larger screens.
- Preserve the current Ontime.Build colors, typography, card style, desktop layouts, and all existing behavior.

## Verification
- Check representative pages at 394 × 852 and 320 × 700.
- Detect document-level horizontal overflow and inspect long project, company, role, status, and currency labels.
- Confirm square controls retain equal computed width and height.
- Run focused tests and confirm the preview build is clean.

## Technical details
- Fix shared primitives first using non-shrinking dimensions and safe text constraints.
- Use responsive `min-w-0`, wrapping, stacking, and breakpoint-specific widths in page rows rather than hiding overflow globally.
- Avoid altering desktop data tables that intentionally scroll horizontally.
