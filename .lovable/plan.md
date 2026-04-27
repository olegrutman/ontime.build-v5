## What I found (in plain English)

You picked **Tear out / demo + Addition** in Step 1, and **Exterior · Roof system · Roof trusses · East elevation** in Step 2. That's enough information for any human to know exactly what's being asked. But Step 3 still asked you "What are you tearing out?" and showed you a list of **interior** options — Partition wall, Bearing wall, Cabinets, Flooring, Fixtures, Ceiling. Then when you typed "sheathing and moving trusses," Sasha handed back generic catalog items ("Scope addition – general," "Temporary bracing," "Layout and layout checks") that have nothing to do with a roof tear-out.

Three real bugs are stacked on top of each other.

### Bug 1 — Zone resolver throws away the roof context

`resolveZoneFromLocationTag()` checks for the word "truss" *first*, before it checks whether you're on the roof. As soon as it sees "truss" anywhere in the tag, it returns `'structural'` and stops.

Then `tearOutZoneKey()` in the demo flow only knows four buckets — `roof`, `exterior_wall`, `site`, `interior`. It doesn't know what to do with `'structural'`, so it falls through to **`interior`**. That's why you got cabinets and flooring on a roof job.

### Bug 2 — Pre-seed silently fails, so Q1 isn't skipped

The Step-2 → Step-3 hand-off was supposed to recognize "Roof trusses" and pre-fill the first question with `rafter_truss`, then skip straight to Q2. But because the question is now showing the **interior** answer set (which doesn't contain `rafter_truss`), the safety check `staticAnswers.some(a => a.id === answerId) || dynamicAnswers.some(a => a.id === answerId)` fails. So instead of auto-skipping, you got asked the question with the wrong options. Same root cause as Bug 1.

### Bug 3 — Demo flow asks logistics questions that don't belong on a roof

Even if Bugs 1 and 2 are fixed, `TEAR_OUT_FLOW` always asks the same 4 questions: *what / extent / disposal / protection*. "Protection / dust control needed?" with options like "Poly + zip walls" and "Occupied — full negative-air" makes no sense for an exterior roof tear-off. That's the "extra confusing steps" you felt.

### Bug 4 — AI suggester ignores the demo intent

The "Type instead" path in screenshot 2 returned generic items because the edge function `suggest-scope-items` doesn't know the user's **intent** is `tear_out`. It receives `reason`, `work_type`, `building_type`, but the system prompt and ranking logic don't bias toward demolition catalog items when the intent is demo. Result: a tear-out request gets matched against general-purpose framing items.

---

## The fix (4 small, focused changes)

**1. Fix the zone resolver — check location before structural keywords.**
In `src/lib/resolveZone.ts`, move the exterior/roof check *above* the structural check. If a tag starts with "Exterior" and contains "roof", that's `'roof'`, full stop — even if "truss" appears in it. Structural-member detection should only kick in when no location zone is identifiable.

**2. Teach the demo flow to recognize structural roof/wall tags.**
In `src/lib/intentFlows.ts`, update `tearOutZoneKey()` so that when zone is `'structural'`, it inspects the location tag itself to decide between `roof`, `exterior_wall`, `site`, or `interior`. Belt-and-suspenders coverage in case the resolver still returns `'structural'` for edge cases.

**3. Trim the demo flow to 2 questions for exterior/roof zones.**
The "disposal" and "dust protection" questions are interior-renovation questions. For roof and exterior_wall demos, ask only:
- Q1: What component (already pre-seeded from Step 2 → auto-skip)
- Q2: How much (extent)

That's it. Disposal stays only for interior (where dumpster vs. haul matters more) and site (concrete). Dust protection only for interior. This is done by gating questions in the flow with a `showFor(ctx)` predicate, then teaching `useQuestionFlow` to skip questions whose predicate returns false.

**4. Pass intent to the AI suggester and bias the ranking.**
In `supabase/functions/suggest-scope-items/index.ts`:
- Accept a top-level `intent` field in the request body.
- Add it to the user message ("Work intent: tear_out").
- Update the system prompt with one rule: *"When intent is `tear_out`, prioritize demolition / removal / tear-off catalog items. Do not suggest 'general scope addition' or generic placeholder items unless no demo item exists."*
- In `StepCatalogQA.tsx`, pass `intent: resolvedIntent` alongside the existing `__intent` field in `answers` so it's a first-class request parameter, not just a hidden answer.

---

## What you will see after the fix

For your exact scenario (Tear out + Roof trusses on East elevation):

1. Step 3 opens, sees "Roof trusses" in the tag, recognizes `rafter_truss`, **skips Q1 entirely**.
2. Shows a small "Pre-filled from your location: Roof trusses · Change" chip.
3. Asks **one** question: "How much is coming out? Spot / Small / Medium / Large / Full".
4. Sasha summary reads: *"Demo of a [extent] of rafter/truss at the Roof system / East elevation. Structural roof member — temporary shoring + engineer review required."*
5. AI returns demo-specific catalog items (truss removal, roof tear-off, temporary shoring) instead of "Scope addition – general."

Total: **1 click in Step 3** instead of 4 questions and a confused AI response.

## Files touched

- `src/lib/resolveZone.ts` — reorder checks (exterior + roof beats structural keyword).
- `src/lib/intentFlows.ts` — `tearOutZoneKey()` location-aware fallback; add `showFor(ctx)` to disposal/protection questions.
- `src/hooks/useQuestionFlow.ts` — honor `showFor(ctx)` and auto-skip hidden questions.
- `src/components/change-orders/wizard/StepCatalogQA.tsx` — pass `intent` to suggester request.
- `supabase/functions/suggest-scope-items/index.ts` — accept `intent`, add it to prompt + system rule.
- `src/test/tearOutFlow.test.ts` + `src/test/resolveZone.test.ts` — cover "Exterior · Roof system · Roof trusses · …" → zone `roof`, demo flow seeds `rafter_truss`, only `extent` is asked, summary reads "Demo … at the Roof system".
