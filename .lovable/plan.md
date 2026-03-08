

# Add Pagination (25 per page) to Platform Users

## Changes: `src/pages/platform/PlatformUsers.tsx`

- Add `page` state (starting at 0), reset to 0 when search query changes
- Use Supabase `.range(page * 25, (page + 1) * 25 - 1)` instead of `.limit(200)` to fetch 25 rows per page
- Also fetch total count via `select('...', { count: 'exact' })` to know total pages
- Add Previous/Next pagination buttons below the table using the existing `Button` component
- Show "Showing 1-25 of 142 users" text

