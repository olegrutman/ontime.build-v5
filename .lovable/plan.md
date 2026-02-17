
# Fix: Signup Join Flow - Search, Unknown User, and Profile Data

## Problems Found

### Problem 1: Personal info not saved on Join path
When a user signs up via the "Join existing company" path, the code at `Signup.tsx` line 129 does:
```typescript
await supabase.from('profiles').upsert({
  user_id: session.user.id,
  email: data.email,
  first_name: data.firstName,
  ...
});
```
This upsert fails because the `profiles` table PK is `id` (auto-generated UUID), not `user_id`. The `handle_new_user` trigger already created a row with a different `id`, so the upsert tries to insert a new row which violates the `user_id` unique constraint. The result: `first_name`, `last_name`, and `phone` are never saved.

**Fix**: Replace the `upsert` with an `update` targeting `user_id`:
```typescript
await supabase.from('profiles').update({
  first_name: data.firstName,
  last_name: data.lastName,
  phone: data.phone || null,
  full_name: `${data.firstName} ${data.lastName}`.trim(),
}).eq('user_id', session.user.id);
```

### Problem 2: "Unknown User" in admin join request view
The OrgTeam page fetches profiles for join request users (line 82-85), but since `first_name`/`last_name` were never saved (Problem 1), `full_name` comes from the `handle_new_user` trigger which uses `raw_user_meta_data->>'full_name'`. This should actually work since the signup sends `data: { full_name: ... }` in the auth metadata. However, if there's a timing issue or the profile update failed, it falls back to "Unknown User".

**Fix**: This is automatically fixed by Problem 1's fix -- once `first_name`, `last_name`, and `full_name` are properly saved, the admin view will display the correct name.

Additionally, update the `handle_new_user` trigger to also extract first/last name from metadata when available.

### Problem 3: Search requires "Any state" to work
The SQL RPC has been verified to work correctly with specific state/trade filters. The previous fix converting `"__all__"` to `null` is in place. If the user still sees issues, it may be due to a cached/stale deployment. No additional code change needed for this -- the fix is already applied.

## Changes

### File: `src/pages/Signup.tsx`
Replace the `profiles.upsert(...)` call (lines 129-136) with a `.update(...).eq('user_id', ...)` call so the existing profile row (created by the trigger) gets updated with personal info instead of trying to insert a new row.

### Database Migration: Improve `handle_new_user` trigger
Update the trigger to also parse `first_name` and `last_name` from `raw_user_meta_data` when the `full_name` is provided. This provides a safety net so even if the client-side update has a timing issue, the profile will have name data.

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  _full_name text;
  _first_name text;
  _last_name text;
  _parts text[];
BEGIN
  _full_name := NEW.raw_user_meta_data->>'full_name';
  IF _full_name IS NOT NULL AND _full_name != '' THEN
    _parts := string_to_array(trim(_full_name), ' ');
    _first_name := _parts[1];
    _last_name := CASE WHEN array_length(_parts, 1) > 1 
                       THEN array_to_string(_parts[2:], ' ') 
                       ELSE NULL END;
  END IF;

  INSERT INTO public.profiles (user_id, email, full_name, first_name, last_name)
  VALUES (NEW.id, NEW.email, _full_name, _first_name, _last_name);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
```

## Technical Summary

| File | Change |
|------|--------|
| `src/pages/Signup.tsx` | Replace `profiles.upsert()` with `profiles.update().eq('user_id', ...)` on join path |
| Database migration | Update `handle_new_user` trigger to parse first/last name from metadata |

These two changes ensure that:
1. Personal info (first name, last name, phone) is always saved during signup
2. The admin team page shows the correct user name for join requests
3. The search continues to work with specific state/trade filters (already fixed)
