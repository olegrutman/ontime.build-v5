# Auth configuration — deep links for mobile

The codebase is wired to use a custom URL scheme on native (`build.ontime://`) and the regular https origin on web. To finish the setup, complete the steps below.

The scheme is defined in one place: `NATIVE_URL_SCHEME` in `src/lib/authRedirects.ts`. If you ever change it, change it there and re-run every step in this document that mentions `build.ontime`.

## What's already done in code

- `src/lib/authRedirects.ts` — returns the right redirect URL per platform.
- `src/components/auth/NativeDeepLinkHandler.tsx` — listens for `appUrlOpen`, calls `supabase.auth.exchangeCodeForSession()` for PKCE links, then routes the user to the matching in-app path.
- `src/hooks/useAuth.tsx`, `src/pages/Auth.tsx`, `src/pages/AuthCallback.tsx`, `src/pages/Signup.tsx`, `src/pages/VerifyEmail.tsx` — all email-link sites use the helper.
- `android/app/src/main/AndroidManifest.xml` — `MainActivity` has an `intent-filter` for the `build.ontime` scheme.

## 1. Supabase dashboard

Go to **Authentication → URL Configuration** in the Supabase dashboard for project `gzqgbfazwvmwmirbqfwf`.

Add these to the **Redirect URLs** allowlist (keep your existing https URLs):

```
build.ontime://auth/callback
build.ontime://reset-password
```

Save.

> The **Site URL** field can stay pointed at your https web origin. The allowlist is what authorizes the deep-link redirects.

## 2. Sync the native project

After pulling these changes, run:

```sh
npm run build
npx cap sync android
```

`cap sync` copies the web bundle into `android/` and re-applies any plugin config. The `AndroidManifest.xml` change is hand-edited, so it will *not* be overwritten by `cap sync` — but if you ever add the iOS platform, follow step 3.

## 3. iOS (when you add the iOS platform)

Run `npx cap add ios` once. Then open `ios/App/App/Info.plist` and add the URL scheme:

```xml
<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleURLName</key>
    <string>build.ontime.app</string>
    <key>CFBundleURLSchemes</key>
    <array>
      <string>build.ontime</string>
    </array>
  </dict>
</array>
```

No code changes needed — `Capacitor.isNativePlatform()` is true on iOS too, so the same redirect helper and listener work there.

## 4. Test on Android

1. Build and run the app: `npm run build && npx cap sync android && npx cap open android`, then run from Android Studio on an emulator or device.
2. From the device, sign up with a real email address.
3. Open the email on the **same device** and tap the verification link.
4. The OS should prompt "Open with OnTime.Build" (or open it directly). The app should resume on `/auth/callback` with a "Email verified!" state.
5. Repeat for password reset: trigger "Forgot password?" → tap link in email on device → app opens on `/reset-password` → set new password.

### Manually firing a deep link for testing

You can simulate an inbound deep link with `adb` without going through email:

```sh
adb shell am start -W -a android.intent.action.VIEW \
  -d "build.ontime://auth/callback?code=fake" \
  build.ontime.app
```

The app should open and the listener should log an `exchangeCodeForSession` failure (since the code is fake) — that's expected, and proves the intent-filter and listener are wired correctly.

## 5. Known gotchas

- **Email client must be on the device.** If a user opens the verification email on their desktop, the deep link won't work — it'll try to open `build.ontime://...` in a desktop browser. For that case, either keep an https fallback or instruct users to open the email on their phone.
- **`window.location.origin` on native is `capacitor://localhost`.** That's why every email-link site has to go through `authCallbackUrl()` — never hard-code the origin.
- **`src/components/landing/AuthSection.tsx:198`** still uses `emailRedirectTo: window.location.origin` (no `/auth/callback`). That path is the landing-page sign-up flow, used in the browser. It is intentionally left alone; if you ever expose the landing page inside the native shell, route it through `authCallbackUrl()` too.
- **Flow type.** The Supabase JS client in `src/integrations/supabase/client.ts` does not set `flowType` explicitly. The deep-link handler covers PKCE (`?code=`) and falls through to in-app navigation for implicit (`#access_token=`) URLs, where `AuthCallback.tsx`/`ResetPassword.tsx` pick up the session via the existing `onAuthStateChange` / `getSession` paths.

## 6. Switching to option (b) later (https-only redirect)

If you decide native users should hit your web domain instead of being deep-linked back into the app, the rollback is small:

1. Edit `src/lib/authRedirects.ts` — drop the `Capacitor.isNativePlatform()` branch and always return `https://your-domain.com/auth/callback`.
2. Add `https://your-domain.com/auth/callback` to the Supabase Redirect URLs allowlist (you can leave the `build.ontime://` entries in place during the transition so in-flight emails keep working).
3. Optionally remove the `intent-filter` from `AndroidManifest.xml` and unmount `<NativeDeepLinkHandler />` from `App.tsx`. They are harmless if left in.
