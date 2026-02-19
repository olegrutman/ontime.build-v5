

# Auto-Format Phone Number Fields as (303)669-1130

## Overview

Create a reusable phone formatting utility and apply it to all 4 phone input fields so digits are automatically formatted as the user types, producing the pattern `(XXX)XXX-XXXX`.

## Part 1: Create Phone Formatting Utility

**New file: `src/lib/formatPhone.ts`**

- `formatPhone(value: string): string` -- strips all non-digit characters, then formats:
  - 1-3 digits: `(XXX`
  - 4-6 digits: `(XXX)XXX`
  - 7-10 digits: `(XXX)XXX-XXXX`
  - Caps at 10 digits
- Export a helper `handlePhoneChange(rawValue: string, setter: function)` or just use `formatPhone` inline in each onChange

## Part 2: Apply to All 4 Phone Fields

| File | Field | Current onChange |
|------|-------|----------------|
| `src/components/signup-wizard/AccountStep.tsx` line 109 | Signup Phone | `onChange({ phone: e.target.value })` |
| `src/components/landing/AuthSection.tsx` line 426 | Landing Signup Phone | `updateSignUpField('phone', e.target.value)` |
| `src/pages/Profile.tsx` line 336 | Personal Phone | `setPersonalForm(prev => ({ ...prev, phone: e.target.value }))` |
| `src/pages/Profile.tsx` line 497 | Company Phone | `setOrgForm(prev => ({ ...prev, phone: e.target.value }))` |

Each onChange will be updated to pass the value through `formatPhone()` before setting state:

```ts
onChange={(e) => onChange({ phone: formatPhone(e.target.value) })}
```

All placeholders will be updated from `(555) 123-4567` to `(303)669-1130` to match the desired format.

## Technical Details

**`formatPhone` function:**
```ts
export function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 10);
  if (digits.length === 0) return '';
  if (digits.length <= 3) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 3)})${digits.slice(3)}`;
  return `(${digits.slice(0, 3)})${digits.slice(3, 6)}-${digits.slice(6)}`;
}
```

## Files Modified

```
src/lib/formatPhone.ts                          -- NEW: formatting utility
src/components/signup-wizard/AccountStep.tsx     -- Use formatPhone in onChange
src/components/landing/AuthSection.tsx           -- Use formatPhone in onChange
src/pages/Profile.tsx                            -- Use formatPhone in both phone onChanges
```
