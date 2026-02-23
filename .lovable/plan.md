

# Replace App Logo with New Image

## Summary
Copy the uploaded logo to the project and update all references to use it instead of the current `ontime-logo.png`.

## Changes

### 1. Copy the uploaded image
Copy `user-uploads://App_Store_icon_1024x1024.png` to `public/ontime-logo.png`, replacing the existing file. This way every reference (favicon, OG tags, OntimeLogo component, sidebar, landing header) picks it up automatically with zero code changes.

### 2. No code changes needed
The existing `OntimeLogo` component, `index.html` favicon/meta tags, `LandingHeader`, and `AppSidebar` all reference `/ontime-logo.png` already. Overwriting the file in place updates everything at once.

