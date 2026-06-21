# OnTime.Build — Lovable → Mobile App

This project started life as a [Lovable](https://lovable.dev) website and is being converted into a native mobile app using [Capacitor](https://capacitorjs.com). The same React + Vite codebase ships to two targets:

- **Web** — built with Vite and deployed as a PWA (vite-plugin-pwa).
- **Native** — wrapped by Capacitor so the compiled web bundle runs inside an iOS/Android WebView with access to native APIs (push notifications, file system, etc.).

## How the conversion works

1. The Vite build produces a static bundle in `dist/`.
2. Capacitor (`capacitor.config.ts`) copies `dist/` into the native `android/` (and later `ios/`) projects.
3. The native shell loads the bundle in a WebView. Web-only concerns like the service worker are gated off so they don't interfere with the native runtime — see `src/main.tsx`, where `registerSW()` only runs when `!Capacitor.isNativePlatform()`.

## Tech stack

- Vite + React + TypeScript
- shadcn-ui + Tailwind CSS
- vite-plugin-pwa (web only)
- Capacitor (native shell)

## Local development

Requires Node.js and npm.

```sh
# Install dependencies
npm install

# Run the web app with hot-reload
npm run dev

# Production web build
npm run build
```

## Building the mobile app

```sh
# 1. Build the web bundle
npm run build

# 2. Sync the bundle into the native projects
npx cap sync

# 3. Open the native IDE
npx cap open android
# npx cap open ios   # once the iOS platform is added
```

To add the iOS platform later:

```sh
npx cap add ios
```

## Lovable

The web app can still be edited via the original [Lovable project](https://lovable.dev). Changes made in Lovable are committed back to this repo, after which `npm run build && npx cap sync` rolls them into the native app.
