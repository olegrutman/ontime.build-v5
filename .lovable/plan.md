

# Org-Type-Specific Job Titles

Currently, a single flat `JOB_TITLES` array is used everywhere (signup wizard, profile page, team management, landing auth). The user wants each organization type to have its own set of job titles.

## New Job Titles by Org Type

| GC | TC | FC | Supplier |
|---|---|---|---|
| Owner/Manager | Owner/Manager | Owner/Manager | Owner |
| Project Manager | Project Manager | Project Manager | Sales Manager |
| Field Supervisor | Field Supervisor | Field Supervisor | Sales Support |
| Office Manager | Office Manager | Office Manager | Office Manager |
| Superintendent | Superintendent | Superintendent | Accounting |

## Changes

### 1. Central definition — `src/types/organization.ts`

Add a `JOB_TITLES_BY_ORG_TYPE` mapping and a helper `getJobTitlesForOrgType(orgType)`. Keep a flat `ALL_JOB_TITLES` array (union of all) for contexts where org type is unknown.

```ts
export const JOB_TITLES_BY_ORG_TYPE: Record<OrgType, string[]> = {
  GC: ['Owner/Manager', 'Project Manager', 'Field Supervisor', 'Office Manager', 'Superintendent'],
  TC: ['Owner/Manager', 'Project Manager', 'Field Supervisor', 'Office Manager', 'Superintendent'],
  FC: ['Owner/Manager', 'Project Manager', 'Field Supervisor', 'Office Manager', 'Superintendent'],
  SUPPLIER: ['Owner', 'Sales Manager', 'Sales Support', 'Office Manager', 'Accounting'],
};

export const ALL_JOB_TITLES = [...new Set(Object.values(JOB_TITLES_BY_ORG_TYPE).flat())];

export function getJobTitlesForOrgType(orgType: OrgType | null | undefined): string[] {
  return orgType ? JOB_TITLES_BY_ORG_TYPE[orgType] : ALL_JOB_TITLES;
}
```

### 2. Remove duplicate definitions

- **`src/components/signup-wizard/types.ts`** — Remove `JOB_TITLES`, re-export from organization.ts
- **`src/pages/Profile.tsx`** — Remove local `JOB_TITLES`, import `getJobTitlesForOrgType`, use current org type from `useAuth`
- **`src/components/landing/AuthSection.tsx`** — Remove local `JOB_TITLES`, use `getJobTitlesForOrgType` based on selected org type in the signup form

### 3. Update consumers to use org-type-aware titles

- **`src/components/signup-wizard/RoleStep.tsx`** — Already has org type in wizard data; pass it to `getJobTitlesForOrgType`
- **`src/components/signup-wizard/AccountStep.tsx`** — Same approach using wizard data's `orgType`
- **`src/components/team/MemberDetailDialog.tsx`** — Get org type from `useAuth().userOrgRoles[0].organization.type` and filter titles
- **`src/pages/Profile.tsx`** — Get org type from auth context
- **`src/components/landing/AuthSection.tsx`** — Get org type from the signup form state
- **`src/components/platform/AssignToOrgDialog.tsx`** — If job title selection exists, use selected org's type

### 4. No database changes needed

Job titles are cosmetic strings stored in the `job_title` column. Existing values remain valid. No migration required.

