
# Plan: Enhance Partner Directory with Most Recent Project

## Summary

Update the Partner Directory to show the **most recent project name** next to each partner, helping users quickly recall their latest collaboration.

---

## Current vs. New Display

**Current:**
```
Elite Framing          EF789    5 projects together
```

**New:**
```
Elite Framing          EF789    
Last: Oak Ridge Residence • 5 projects together
```

---

## Technical Changes

### File: `src/pages/PartnerDirectory.tsx`

**1. Update Interface:**
```typescript
interface PartnerOrg {
  org_id: string;
  org_code: string;
  name: string;
  type: string;
  project_count: number;
  most_recent_project: string | null;  // NEW
  most_recent_date: string | null;     // NEW (for sorting)
}
```

**2. Update Query Logic:**

Fetch project details alongside team members to get project names and dates:

```typescript
// Get all projects where current org is a team member - include project details
const { data: myProjects } = await supabase
  .from('project_team')
  .select('project_id, projects!inner(id, name, updated_at)')
  .eq('org_id', currentOrg.id)
  .eq('status', 'active');

// Get all orgs from those projects with project info
const { data: teamMembers } = await supabase
  .from('project_team')
  .select(`
    org_id,
    project_id,
    projects!inner(id, name, updated_at),
    organizations!inner(id, org_code, name, type)
  `)
  .in('project_id', projectIds)
  .neq('org_id', currentOrg.id)
  .eq('status', 'active');
```

**3. Track Most Recent Project Per Partner:**

```typescript
// Track projects per org with dates
const projectsByOrg = new Map<string, { 
  projectIds: Set<string>; 
  mostRecent: { name: string; date: string } | null;
}>();

teamMembers?.forEach((member) => {
  const org = member.organizations;
  const project = member.projects;
  
  if (!projectsByOrg.has(org.id)) {
    projectsByOrg.set(org.id, { projectIds: new Set(), mostRecent: null });
  }
  
  const entry = projectsByOrg.get(org.id)!;
  entry.projectIds.add(member.project_id);
  
  // Check if this is the most recent project
  if (!entry.mostRecent || new Date(project.updated_at) > new Date(entry.mostRecent.date)) {
    entry.mostRecent = { name: project.name, date: project.updated_at };
  }
});
```

**4. Update UI Display:**

```tsx
<div
  key={partner.org_id}
  className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
>
  <div className="flex items-center gap-3 min-w-0">
    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted shrink-0">
      <Icon className={`h-4 w-4 ${config.color}`} />
    </div>
    <div className="min-w-0 flex-1">
      <div className="flex items-center gap-2">
        <p className="font-medium text-sm truncate">{partner.name}</p>
        <Badge variant="outline" className="text-xs font-mono shrink-0">
          {partner.org_code}
        </Badge>
      </div>
      {partner.most_recent_project && (
        <p className="text-xs text-muted-foreground truncate">
          Last: {partner.most_recent_project}
        </p>
      )}
    </div>
  </div>
  <p className="text-xs text-muted-foreground whitespace-nowrap ml-3">
    {partner.project_count} project{partner.project_count !== 1 ? 's' : ''}
  </p>
</div>
```

---

## Sorting

Partners will be sorted by:
1. **Most recent collaboration first** (by `most_recent_date`)
2. Then by project count as tiebreaker

```typescript
groups[type] = filteredPartners
  .filter((p) => p.type === type)
  .sort((a, b) => {
    // Sort by most recent date first
    if (a.most_recent_date && b.most_recent_date) {
      return new Date(b.most_recent_date).getTime() - new Date(a.most_recent_date).getTime();
    }
    return b.project_count - a.project_count;
  });
```

---

## Visual Layout

```text
┌──────────────────────────────────────────────────────────────┐
│ TRADE CONTRACTORS (4)                                        │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 🔧 Elite Framing                    EF789               │ │
│ │    Last: Oak Ridge Residence         5 projects        │ │
│ ├─────────────────────────────────────────────────────────┤ │
│ │ 🔧 Pro Plumbing                      PP321              │ │
│ │    Last: Downtown Office Tower       2 projects        │ │
│ └─────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

---

## Files to Modify

| File | Change |
|------|--------|
| `src/pages/PartnerDirectory.tsx` | Add `most_recent_project` and `most_recent_date` fields, update query to join with projects table, update UI to show last project name |

---

## Data Flow

```text
project_team
    ↓ join on project_id
projects (name, updated_at)
    ↓ group by org_id
PartnerOrg {
  ...existing fields,
  most_recent_project: "Oak Ridge Residence",
  most_recent_date: "2025-02-01T..."
}
```
