# Page-by-Page Problem List

I'll reorganize the existing audit into a new file, **`PROBLEMS.md`**, structured exactly how you asked: one section per page, every problem listed as a plain-English bullet, no jargon, no fix recommendations mixed in. You pick what to fix.

## Format for each page

```
### /route-name  (What this page is for)
Who sees it: GC / TC / FC / Supplier / Admin / Everyone

Problems found:
1. [Plain English description of what's broken or missing]
2. ...
```

Each bullet will say:
- what the user sees or experiences
- why it's a problem (confusing, broken, unsafe, looks unfinished, leaks data, etc.)
- severity in plain words: **Blocker** (broken/unsafe), **Embarrassing** (works but looks bad), **Rough edge** (small polish), **Missing** (feature gap)

No code snippets. No file paths. No sprint plans. Just the list.

## Pages that will be covered

**Public / Visitor**
- Landing `/`
- Login `/auth`
- Signup `/signup` (and the older `/auth` signup)
- Verify email
- Reset password
- Legal pages (Terms, Privacy, Security)
- 404 / Not Found
- External CO approval link

**General Contractor (GC)**
- Dashboard
- Project setup wizard (all 5 steps)
- Project overview
- SOV / Schedule of Values
- Change Orders list + detail
- Purchase Orders
- Invoices / Payment Applications
- Financials
- Team / Partner Directory
- Settings
- Notifications

**Trade Contractor (TC)**
- Dashboard
- Project overview (their view)
- Change Order intake + detail
- Contract scope wizard
- Invoices they send
- Materials & Equipment
- Team
- Settings

**Field Crew (FC)**
- Dashboard (mobile)
- Quick Capture
- Daily Log
- Field photos
- Change Order tasks assigned to them
- Their invoices to TC
- Settings

**Supplier**
- Dashboard
- Supplier project view
- Estimates inbox
- Inventory / Catalog
- Purchase orders received
- Returns
- Settings

**Platform Admin**
- Platform dashboard
- Orgs list + detail
- Users list + detail
- Roles & permissions
- Plans / subscriptions
- KPI config
- Logs
- QA tools
- Impersonation

**Cross-cutting (things that apply everywhere)**
- Navigation / sidebar
- Loading states
- Empty states
- Error messages
- Mobile behavior
- Design consistency

## What I need from you before I write it

Just confirm one thing:

**Length preference** — a full page-by-page list will be long (probably 800–1200 lines). Do you want:
- (a) **The full thing in one file** (`PROBLEMS.md`) — comprehensive, you scroll through it, or
- (b) **Split into 6 files by role** (`PROBLEMS-GC.md`, `PROBLEMS-TC.md`, etc.) — easier to hand to different people or tackle one role at a time?

Once you pick, I'll switch to build mode and write it. No code changes will happen — this is just a report.
