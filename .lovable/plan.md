

# Change Logo Color from Orange to Blue

## Approach
The logo is a static PNG (`/ontime-logo.png`) rendered via an `<img>` tag. Since we can't dynamically recolor a PNG natively, the cleanest approach is to apply a CSS `filter` to shift the hue from orange to blue. This avoids needing to create or upload a new image file.

The CSS filter `hue-rotate` combined with `saturate` can shift orange tones to the brand blue (HSL 207). Orange is roughly at hue 30, and the brand blue is at hue 207, so a rotation of approximately 177 degrees will shift orange to blue.

## Changes

### 1. `src/components/ui/OntimeLogo.tsx`
Add a CSS filter to the `<img>` element to shift the hue from orange to blue:
- Apply `hue-rotate(177deg)` to rotate orange to blue
- Fine-tune with `saturate(1.3)` and `brightness(1.1)` so it matches the brand blue

### 2. `src/index.css`
Add a utility class `.logo-blue-filter` with the filter values, keeping the component clean.

### 3. `index.html`
The favicon also uses `ontime-logo.png` -- this won't be affected by CSS filters (browser chrome). If you'd like the favicon blue too, that would require a separate blue PNG file, which can be done in a follow-up.

## Files Modified
1. `src/components/ui/OntimeLogo.tsx` -- add filter class
2. `src/index.css` -- add `.logo-blue-filter` utility class

