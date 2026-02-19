

# Fix: Input Component Default Type Bug

## Problem

The global `Input` component (`src/components/ui/input.tsx`) has its default `type` set to `"tel"` instead of `"text"`. This causes every input field that doesn't explicitly pass a `type` prop to show a numeric telephone keypad on mobile, making it impossible to easily type text into fields like names, addresses, and descriptions.

## Impact

Approximately 100+ input fields across 35+ files are affected. Any `<Input />` or `<Input placeholder="..." />` without an explicit `type` prop renders as a telephone input on mobile.

## Fix

**File: `src/components/ui/input.tsx` (line 6)**

Change the default type from `"tel"` to `"text"`:

```
// Before:
({ className, type = "tel", ...props }, ref) => {

// After:
({ className, type, ...props }, ref) => {
```

Removing the default entirely is the correct approach since the HTML `<input>` element already defaults to `type="text"`. This is a one-line fix.

## Phone Number Field

The Phone Number field in `AccountStep.tsx` does NOT set `type="tel"` explicitly, so after this fix it will become a regular text input. We should explicitly add `type="tel"` to that specific field so mobile users still get the phone keypad when entering their number.

**File: `src/components/signup-wizard/AccountStep.tsx` (line 105-106)**

Add `type="tel"` to the phone input.

## Files Modified

- `src/components/ui/input.tsx` -- Remove `"tel"` default (1 line)
- `src/components/signup-wizard/AccountStep.tsx` -- Add explicit `type="tel"` to Phone Number field

## No Other Changes Needed

All other text fields will correctly default to `type="text"` (the browser default). Fields that already set `type="email"`, `type="password"`, or `type="number"` are unaffected.

