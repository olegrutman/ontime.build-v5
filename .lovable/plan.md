

# Fix: Platform admin redirect — fetch order race condition

## Root Cause
In `useAuth.tsx`, `fetchUserData` runs queries sequentially. `setUserOrgRoles()` fires on line 61 BEFORE the `platform_users` query even starts on line 76. In React 18, state updates across `await` boundaries are NOT batched, so `userOrgRoles` triggers a re-render immediately. The Auth.tsx effect sees `userOrgRoles.length > 0` with `isPlatformUser` still `false`, and redirects to `/dashboard`.

## Fix
**`src/hooks/useAuth.tsx`** — Fetch platform_users in PARALLEL with org roles (not after), and delay setting `userOrgRoles` until `platformRole` is also ready:

```tsx
const fetchUserData = async (userId: string) => {
  // Fetch all data in parallel
  const [profileResult, rolesResult, platformResult] = await Promise.all([
    supabase.from('profiles').select('*').eq('user_id', userId).maybeSingle(),
    supabase.from('user_org_roles').select('*, organization:organizations(*)').eq('user_id', userId),
    supabase.from('platform_users').select('platform_role, two_factor_verified').eq('user_id', userId).maybeSingle(),
  ]);

  // Set platform role FIRST
  if (platformResult.data) {
    setPlatformRole(platformResult.data.platform_role as PlatformRole);
    setTwoFactorVerified(platformResult.data.two_factor_verified ?? false);
  } else {
    setPlatformRole(null);
    setTwoFactorVerified(false);
  }

  if (profileResult.data) {
    setProfile(profileResult.data as Profile);
  }

  if (rolesResult.data) {
    setUserOrgRoles(rolesResult.data as UserOrgRole[]);
    // Then fetch member_permissions
    if (rolesResult.data.length > 0) {
      const { data: permsData } = await supabase
        .from('member_permissions').select('*')
        .eq('user_org_role_id', rolesResult.data[0].id).maybeSingle();
      setMemberPermissions(permsData as MemberPermissions | null);
    }
  }
};
```

This ensures `platformRole` is set BEFORE `userOrgRoles`, so when the Auth.tsx effect fires on `userOrgRoles` change, `isPlatformUser` is already `true` and the redirect goes to `/platform`.

## Scope
One function rewrite in `useAuth.tsx`. No other files need changes.

