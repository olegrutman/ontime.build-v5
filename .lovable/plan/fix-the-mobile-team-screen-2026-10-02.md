# Fix the mobile Team screen

## What will change
- Turn member details into a full-screen mobile view with a visible back/close control and fixed header.
- Use one natural page scroll on phones, removing the cramped nested project-list scroll.
- Reflow project-copy controls, assignment rows, permissions, and action buttons for narrow screens and comfortable touch targets.
- Keep the permissions save action reachable while editing.
- Replace the wide project-assignment table on phones with stacked member assignment summaries; retain the current matrix on larger screens.
- Preserve all current access rules and desktop behavior.

## Verification
- Test the Team page and member details at the current 394 × 852 phone size.
- Confirm opening, scrolling, saving, and closing work without clipped content or horizontal overflow.
- Check the latest build result and targeted automated checks.

## Technical details
- Limit changes to the Team page and its presentation components.
- Reuse the existing design system controls and responsive breakpoints.
