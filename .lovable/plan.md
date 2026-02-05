
# Plan: Add Estimate Approvals Link for GC Project Managers

## Summary

Add "Estimate Approvals" link to the sidebar navigation, visible only to GC Project Managers (GC_PM role).

---

## Changes

### File: `src/components/layout/AppSidebar.tsx`

**1. Add ClipboardCheck icon import (line 3-12):**
```tsx
import {
  // ... existing imports
  ClipboardCheck,  // NEW - for Estimate Approvals
} from 'lucide-react';
```

**2. Add GC-specific nav items array (after adminNavItems, ~line 50):**
```tsx
// GC-only nav items (approval workflows)
const gcNavItems = [
  { title: 'Estimate Approvals', url: '/approvals/estimates', icon: ClipboardCheck },
];
```

**3. Add role check for GC_PM (in component, ~line 61):**
```tsx
const isGC = currentRole === 'GC_PM';
```

**4. Add new Approvals section in sidebar content (after Supplier section, before Admin section):**
```tsx
{/* Approvals Section - GC_PM only */}
{isGC && (
  <SidebarGroup>
    <Collapsible defaultOpen={isInGroup(gcNavItems)} className="group/collapsible">
      <CollapsibleTrigger asChild>
        <SidebarGroupLabel className="cursor-pointer hover:bg-sidebar-accent rounded-md px-2 py-1.5 justify-between">
          {!collapsed && (
            <>
              <span>Approvals</span>
              <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-180" />
            </>
          )}
          {collapsed && <ClipboardCheck className="h-4 w-4 mx-auto" />}
        </SidebarGroupLabel>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <SidebarGroupContent>
          <SidebarMenu>
            {gcNavItems.map((item) => (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  asChild
                  isActive={isActive(item.url)}
                  tooltip={collapsed ? item.title : undefined}
                >
                  <NavLink
                    to={item.url}
                    className="gap-3"
                    activeClassName="nav-active"
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    {!collapsed && <span>{item.title}</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroupContent>
      </CollapsibleContent>
    </Collapsible>
  </SidebarGroup>
)}
```

---

## Visual Result

**GC_PM Sidebar:**
```
Navigation
├── Dashboard
├── Partners

Approvals           ← NEW section
├── Estimate Approvals

Admin
├── Manage Suppliers
```

---

## Files to Modify

| File | Change |
|------|--------|
| `src/components/layout/AppSidebar.tsx` | Add ClipboardCheck icon, gcNavItems array, isGC check, and Approvals section |
