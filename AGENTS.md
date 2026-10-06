# Project architecture rules

- Shared interactive primitives must keep fixed controls non-shrinking and allow text to wrap safely on phone-width screens, because page-specific overflow fixes are inconsistent.- Run `scripts/mobile-audit/mobile_audit.py` (per account, 320/394px) after layout changes, because page-wide checks miss text clipped inside cards.
- Keep the public landing experience isolated from the signed-in Command Center design system, because marketing typography and storytelling must not alter operational screens.
