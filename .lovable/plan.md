

# Project Setup Completion -- Bug Report and Fix Plan

## Wizard Steps Walkthrough (Plain English)

Here is every field in the wizard, what it does, and known issues:

---

### Step 1: Project Basics
- **Project Name** -- What you call the project (required)
- **Project Type** -- Single Family Home, Apartments/Condos, Townhomes, Duplex, or Hotels (required)
- **Street Address** -- The jobsite address (required)
- **City** -- City (required)
- **State** -- Two-letter state code (required)
- **Zip** -- Zip code (required)
- **Start Date** -- Optional target start date

**Status**: Working correctly after the `setup` status fix.

---

### Step 2: Project Team
- **Add Team Member** button opens a dialog where you can:
  - **Search Existing** organizations already in the system
  - **Invite by Email** for someone not yet in the system
- Each member gets a **Role** (General Contractor, Trade Contractor, Field Crew, Supplier)
- Trade Contractors and Field Crew also pick a **Trade** (Framer, Electrician, etc.)
- You can **Remove** a member (trash icon) and **Resend** an invite

**Status**: Working after the RLS DELETE policy fix.

---

### Step 3: Scope and Details
Depends on project type. For Single Family Home:
- **Home Type** -- Custom or Track Home
- **Number of Floors**
- **Foundation Type** -- Slab, Crawl Space, or Basement (with sub-options for basement)
- **Stairs Type** -- Field Built, Manufactured, or Both
- **Elevator** -- Yes/No (with shaft type details)
- **Roof Type** -- Gable, Hip, Flat, or Mixed
- **Roof Deck** -- Yes/No
- **Covered Porches** -- Yes/No
- **Balconies** -- Yes/No (with type)
- **Decking** -- Yes/No (with type)
- **Siding** -- Yes/No (with material choices)
- **Decorative Items** -- Corbels, Columns, etc.
- **Fascia/Soffit** -- Yes/No (with material)
- **Windows Install** -- Yes/No
- **WRB/Tyvek** -- Yes/No
- **Exterior Doors** -- Yes/No

For multi-family: Number of Buildings, Stories, Construction Type, etc.

**Status**: Working correctly.

---

### Step 4: Project Contracts

This is where the TC enters the **contract price** (dollar amount they agreed to with each party).

For a **Trade Contractor** creating the project, you see:
- **Your Contract with General Contractor** -- the price the GC is paying you
  - Contract Sum (dollar amount)
  - Retainage %
  - Allow Mobilization toggle
  - Notes
- **Contracts with Field Crew** -- the price you're paying each FC
  - Same fields per FC member

For a **General Contractor**, you see:
- **Material Responsibility** per TC (GC or TC pays for materials)
- **Contracts with Trade Contractors** -- price per TC
  - Contract Sum, Retainage %, Mobilization, Notes

**BUG FOUND**: The `saveContracts` function (line 282-288) includes **Suppliers** in `membersNeedingContracts`, but the **ContractsStep UI** (line 71-84) excludes Suppliers from the contract cards. This means:
- The save function tries to create a contract for Suppliers using contract data that was never entered in the UI
- It saves `contract_sum: 0` for Suppliers, which is harmless but misleading
- The `AddTeamMemberDialog` already correctly skips contract creation for Suppliers (line 332, 446)

**FIX**: Remove Suppliers from `membersNeedingContracts` in `saveContracts` to match the UI and the `AddTeamMemberDialog` behavior.

---

### Step 5: Review
Shows a summary of everything entered. No editable fields.

**Status**: Working correctly.

---

## Where to Edit Contract Price After the Wizard

If the TC skipped entering the contract price (left it at $0) during the wizard, there are **two places** to update it after project creation:

1. **Project Overview > Financial Signal Bar** -- At the top of the project page, clicking on the contract value tile opens an inline editor where you can type the new contract sum and retainage percentage. This is the fastest way.

2. **Project Overview > Contracts section** -- Expand the "Contracts" collapsible card. It shows all contracts. There is a "Manage" button that links to the project edit page with the contracts step open.

3. **Project Financials tab** -- The `ProjectFinancialsSectionNew` component has an `EditableContractValue` widget that lets you click the pencil icon next to the contract value and update it inline.

---

## Bug Fix Required

### Bug: Supplier contracts created with $0 during save

**File**: `src/pages/CreateProjectNew.tsx`, lines 282-289

**Current code** includes Suppliers in `membersNeedingContracts`:
```
if (creatorRole === 'General Contractor') {
  return m.role === 'Trade Contractor' || m.role === 'Supplier';
}
if (creatorRole === 'Trade Contractor') {
  return m.role === 'General Contractor' || m.role === 'Field Crew' || m.role === 'Supplier';
}
```

**Fix**: Remove `|| m.role === 'Supplier'` from both conditions. Supplier budgets should come from approved supplier estimates, not manual contract entry (consistent with the rest of the system and the `AddTeamMemberDialog` which already skips Suppliers).

```
if (creatorRole === 'General Contractor') {
  return m.role === 'Trade Contractor';
}
if (creatorRole === 'Trade Contractor') {
  return m.role === 'General Contractor' || m.role === 'Field Crew';
}
```

### Summary
- 1 bug to fix (Supplier contracts incorrectly created during save)
- All wizard fields working as expected
- Contract price can be edited post-wizard from the Project Overview (Financial Signal Bar or Contracts section) or the Financials tab
