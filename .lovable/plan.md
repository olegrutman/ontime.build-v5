

# Remove Two Sign-Up Links from Landing Page Header

Remove the "Sign Up" navigation link and the "Start free" button from the landing page header (`LandingHeader.tsx`).

## Changes

**File: `src/components/landing/LandingHeader.tsx`**

1. Remove `{ label: 'Sign Up', href: '/signup' }` from the `navLinks` array (line ~19)
2. Remove the `<Link to="/signup">Start free</Link>` button from the desktop actions section (around line ~55)
3. Remove the corresponding `<Link to="/signup">Start free</Link>` button from the mobile menu (around line ~75)

The "Sign in" button and link will remain in both desktop and mobile views. The CTA section further down the page is unchanged.

