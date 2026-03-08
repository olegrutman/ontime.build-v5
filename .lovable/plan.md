

# Show All Users on Platform Users Page

## Change
Update `src/pages/platform/PlatformUsers.tsx` to load all users on mount (instead of requiring a 2-character search), while keeping search as a filter.

### `src/pages/platform/PlatformUsers.tsx`
- On mount, fetch all profiles ordered by `created_at desc` (limit 200)
- When search query is entered, filter with `ilike` as before (no minimum character requirement)
- When query is empty, show all users
- Add a total count display (e.g., "Showing 42 users")

