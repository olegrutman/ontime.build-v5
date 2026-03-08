

# Stop Sasha from Bouncing

## Change

In `src/components/sasha/SashaBubble.tsx`, stop the bounce/ping animation when the user clicks the Sasha bubble — even without opening the chat. Currently `pulse` only turns off inside the `open` effect. The fix:

1. **On bubble click**, always set `setPulse(false)` regardless of whether the panel opens or closes. This stops the bounce immediately on first interaction.
2. **Persist dismissal** via `localStorage` key `sasha_pulse_dismissed` so the bounce never returns after the user has dismissed it once.
3. Initialize `pulse` from `localStorage` — if already dismissed, start with `false`.

### File: `src/components/sasha/SashaBubble.tsx`

- Change `pulse` init: `useState(() => !localStorage.getItem('sasha_pulse_dismissed'))`
- Update the bubble's `onClick` to also call `setPulse(false)` and set `localStorage.setItem('sasha_pulse_dismissed', 'true')`
- Keep the existing `open` effect that sets `setPulse(false)` as a safety net

Single file change, minimal diff.

