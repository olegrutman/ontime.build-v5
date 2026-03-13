

# PWA Setup for OnTime.Build

## What This Does
Turn your app into an installable web app. Users visit your site on their phone, tap "Add to Home Screen," and it launches like a native app — with your logo, splash screen, and offline support. No app store needed.

## Steps

### 1. Install `vite-plugin-pwa`
Add the PWA plugin to handle manifest generation, service worker, and caching automatically.

### 2. Configure `vite.config.ts`
Add `VitePWA()` plugin with:
- App name: "OnTime.Build"
- Theme color matching your brand (navy `#0F172A`)
- Icons: use existing `ontime-logo.png` (192x192 and 512x512 variants)
- `navigateFallbackDenylist: [/^\/~oauth/]` to keep auth redirects working
- `registerType: 'autoUpdate'` for seamless updates
- Standalone display mode

### 3. Update `index.html`
Add mobile meta tags:
- `<meta name="apple-mobile-web-app-capable" content="yes">`
- `<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">`
- `<meta name="theme-color" content="#0F172A">`
- Apple touch icon link

### 4. Create PWA Icons
Generate `pwa-192x192.png` and `pwa-512x512.png` in `/public` from the existing logo. Since we can only work with what's available, we'll reference the existing `ontime-logo.png` at both sizes in the manifest.

### 5. Migrate Existing Service Worker
The current `public/sw.js` handles push notifications. The PWA plugin generates its own service worker, so we'll merge the push notification handlers into the PWA service worker using `injectManifest` strategy, or keep the existing push logic via `importScripts` in a custom worker.

### 6. Create `/install` Page
A simple page with install instructions and a "Install App" button that triggers the browser's install prompt (`beforeinstallprompt` event). Fallback instructions for Safari (Share → Add to Home Screen).

### 7. Add Route
Add `/install` route in `App.tsx`.

## Files

| File | Action |
|------|--------|
| `vite.config.ts` | Add VitePWA plugin config |
| `index.html` | Add mobile meta tags |
| `public/sw-custom.js` | Move push notification logic here for import |
| `src/pages/Install.tsx` | NEW — install prompt page |
| `src/App.tsx` | Add `/install` route |

