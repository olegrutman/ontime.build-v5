
# Plan: Dashboard Redesign

## Summary

Complete redesign of the dashboard to:
1. Remove redundant elements (search bar, quick actions)
2. Add sticky status menu with project counts
3. Create new Financial Snapshot tile (TC-focused with contracts and profit margins)
4. Create enhanced Needs Attention tile
5. Add new Reminders tile

---

## Current vs. New Layout

**Current Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│ TopBar (with search bar)                                     │
├─────────────────────────────────────────────────────────────┤
│ Quick Actions (New Project, New Work Order, etc.)           │
├─────────────────────────────────────────────────────────────┤
│ Summary Cards (4 tiles)                                      │
├────────────────────────────────────────┬────────────────────┤
│ Status Tabs + Search                   │ Pending Invites    │
│ Project List                           │ Needs Attention    │
└────────────────────────────────────────┴────────────────────┘
```

**New Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│ TopBar (NO search bar)                                       │
├─────────────────────────────────────────────────────────────┤
│ Sticky Status Menu                                           │
│ [Active (5)] [On Hold (2)] [Completed (3)] [Archived (1)]   │
├─────────────────────────────────────────────────────────────┤
│ Dashboard Tiles (3 columns)                                  │
│ ┌──────────────┬──────────────┬──────────────┐              │
│ │ Financial    │ Needs        │ Reminders    │              │
│ │ Snapshot     │ Attention    │              │              │
│ └──────────────┴──────────────┴──────────────┘              │
├─────────────────────────────────────────────────────────────┤
│ Pending Invites (if any)                                     │
├─────────────────────────────────────────────────────────────┤
│ Project List                                                 │
└─────────────────────────────────────────────────────────────┘
```

---

## Technical Changes

### File 1: `src/components/layout/TopBar.tsx`

**Remove search bar**, keep only sidebar trigger, title, notifications, and optional new button.

```tsx
export function TopBar({ title, subtitle, showNewButton, onNewClick, newButtonLabel }: TopBarProps) {
  return (
    <header className="sticky top-0 z-40 flex h-14 items-center gap-2 sm:gap-4 border-b bg-background/95 backdrop-blur px-3 sm:px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="h-6 hidden sm:block" />
      
      {/* Page Title */}
      {title && (
        <div className="min-w-0">
          <h1 className="text-sm font-semibold truncate">{title}</h1>
          {subtitle && <p className="text-xs text-muted-foreground truncate">{subtitle}</p>}
        </div>
      )}
      
      <div className="flex-1" />
      
      {/* Actions - notifications only */}
      <div className="flex items-center gap-2 ml-auto shrink-0">
        <NotificationSheet />
        {showNewButton && (
          <Button size="sm" onClick={onNewClick} className="gap-1.5 h-9">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">{newButtonLabel}</span>
          </Button>
        )}
      </div>
    </header>
  );
}
```

---

### File 2: `src/components/dashboard/StatusMenu.tsx` (NEW)

**Sticky horizontal menu** with status tabs and project counts.

```tsx
import { cn } from '@/lib/utils';

export type ProjectStatusFilter = 'active' | 'on_hold' | 'completed' | 'archived';

interface StatusMenuProps {
  currentFilter: ProjectStatusFilter;
  onFilterChange: (filter: ProjectStatusFilter) => void;
  counts: { active: number; on_hold: number; completed: number; archived: number };
}

const STATUS_CONFIG = [
  { key: 'active', label: 'Active', color: 'bg-green-500' },
  { key: 'on_hold', label: 'On Hold', color: 'bg-amber-500' },
  { key: 'completed', label: 'Completed', color: 'bg-blue-500' },
  { key: 'archived', label: 'Archived', color: 'bg-gray-400' },
];

export function StatusMenu({ currentFilter, onFilterChange, counts }: StatusMenuProps) {
  return (
    <div className="sticky top-14 z-30 bg-background/95 backdrop-blur border-b">
      <div className="flex items-center gap-1 p-2 overflow-x-auto">
        {STATUS_CONFIG.map(({ key, label, color }) => (
          <button
            key={key}
            onClick={() => onFilterChange(key as ProjectStatusFilter)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap",
              currentFilter === key 
                ? "bg-primary text-primary-foreground" 
                : "hover:bg-muted"
            )}
          >
            <span className={cn("w-2 h-2 rounded-full", color)} />
            {label}
            <span className={cn(
              "px-2 py-0.5 rounded-full text-xs",
              currentFilter === key 
                ? "bg-primary-foreground/20 text-primary-foreground" 
                : "bg-muted-foreground/10"
            )}>
              {counts[key as keyof typeof counts]}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
```

---

### File 3: `src/components/dashboard/FinancialSnapshotTile.tsx` (NEW)

**Role-aware financial tile** showing contracts and profit margins.

```tsx
interface FinancialSnapshotTileProps {
  role: 'GC' | 'TC' | 'FC';
  totalContractValue: number;
  outstandingToPay: number;
  outstandingToCollect: number;
  profitMargin?: number; // TC only
  totalRevenue?: number; // TC only
  totalCosts?: number; // TC only
}

export function FinancialSnapshotTile({ 
  role, 
  totalContractValue, 
  outstandingToPay, 
  outstandingToCollect,
  profitMargin,
  totalRevenue,
  totalCosts 
}: FinancialSnapshotTileProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <DollarSign className="h-5 w-5 text-green-600" />
          Financial Snapshot
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Total Contracts */}
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Total Contracts</span>
          <span className="font-semibold">{formatCurrency(totalContractValue)}</span>
        </div>
        
        {role === 'GC' && (
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Outstanding to Pay</span>
            <span className="font-semibold text-amber-600">{formatCurrency(outstandingToPay)}</span>
          </div>
        )}
        
        {role === 'TC' && (
          <>
            <Separator />
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Revenue</span>
              <span className="font-semibold">{formatCurrency(totalRevenue || 0)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Costs</span>
              <span className="font-medium text-red-600">-{formatCurrency(totalCosts || 0)}</span>
            </div>
            <Separator />
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Profit Margin</span>
              <span className={cn(
                "font-bold text-lg",
                (profitMargin || 0) >= 0 ? "text-green-600" : "text-red-600"
              )}>
                {profitMargin?.toFixed(1)}%
              </span>
            </div>
          </>
        )}
        
        {(role === 'TC' || role === 'FC') && (
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Outstanding to Collect</span>
            <span className="font-semibold text-green-600">{formatCurrency(outstandingToCollect)}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

---

### File 4: `src/components/dashboard/NeedsAttentionTile.tsx` (NEW)

Enhanced attention tile with categorized items.

```tsx
interface NeedsAttentionTileProps {
  items: AttentionItem[];
  pendingInvites: PendingInvite[];
}

export function NeedsAttentionTile({ items, pendingInvites }: NeedsAttentionTileProps) {
  const groupedItems = {
    change_orders: items.filter(i => i.type === 'change_order'),
    invoices: items.filter(i => i.type === 'invoice'),
    invites: items.filter(i => i.type === 'invite'),
  };
  
  const totalCount = items.length + pendingInvites.length;
  
  return (
    <Card className={cn(totalCount > 0 && "border-amber-500/50")}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-base">
          <div className="flex items-center gap-2">
            <AlertCircle className={cn("h-5 w-5", totalCount > 0 ? "text-amber-600" : "text-muted-foreground")} />
            Needs Attention
          </div>
          {totalCount > 0 && (
            <Badge variant="destructive">{totalCount}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {totalCount === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            All caught up!
          </p>
        ) : (
          <div className="space-y-3">
            {groupedItems.change_orders.length > 0 && (
              <AttentionCategory 
                icon={ClipboardList} 
                label="Work Orders" 
                count={groupedItems.change_orders.length}
                items={groupedItems.change_orders}
              />
            )}
            {groupedItems.invoices.length > 0 && (
              <AttentionCategory 
                icon={FileText} 
                label="Invoices" 
                count={groupedItems.invoices.length}
                items={groupedItems.invoices}
              />
            )}
            {(groupedItems.invites.length + pendingInvites.length) > 0 && (
              <AttentionCategory 
                icon={UserPlus} 
                label="Invitations" 
                count={groupedItems.invites.length + pendingInvites.length}
              />
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

---

### File 5: `src/components/dashboard/RemindersTile.tsx` (NEW)

New reminders tile for user-defined reminders.

```tsx
interface Reminder {
  id: string;
  title: string;
  due_date: string;
  project_id?: string;
  project_name?: string;
  completed: boolean;
}

interface RemindersTileProps {
  reminders: Reminder[];
  onComplete: (id: string) => void;
  onAdd: () => void;
}

export function RemindersTile({ reminders, onComplete, onAdd }: RemindersTileProps) {
  const upcomingReminders = reminders
    .filter(r => !r.completed)
    .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
    .slice(0, 5);
  
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-base">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-blue-600" />
            Reminders
          </div>
          <Button variant="ghost" size="sm" onClick={onAdd}>
            <Plus className="h-4 w-4" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {upcomingReminders.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No upcoming reminders
          </p>
        ) : (
          <div className="space-y-2">
            {upcomingReminders.map(reminder => (
              <div 
                key={reminder.id}
                className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50"
              >
                <Checkbox 
                  checked={reminder.completed}
                  onCheckedChange={() => onComplete(reminder.id)}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{reminder.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(reminder.due_date), 'MMM d')}
                    {reminder.project_name && ` • ${reminder.project_name}`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

---

### File 6: `src/pages/Dashboard.tsx`

**Major refactor** with new layout.

**Key Changes:**
1. Remove `QuickActions` component
2. Remove inline search input
3. Replace `ProjectListFilters` with `StatusMenu`
4. Replace `SummaryCards` with new tile grid
5. Add `FinancialSnapshotTile`, `NeedsAttentionTile`, `RemindersTile`
6. Fetch additional data for TC profit margins

**New Layout Structure:**
```tsx
return (
  <AppLayout title="Dashboard">
    {/* Sticky Status Menu */}
    <StatusMenu
      currentFilter={statusFilter}
      onFilterChange={setStatusFilter}
      counts={statusCounts}
    />
    
    <div className="p-4 sm:p-6 space-y-6">
      {/* Dashboard Tiles - 3 columns on desktop */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <FinancialSnapshotTile
          role={billingRole}
          totalContractValue={financials.totalContracts}
          outstandingToPay={billing.outstandingToPay}
          outstandingToCollect={billing.outstandingToCollect}
          profitMargin={financials.profitMargin}
          totalRevenue={financials.totalRevenue}
          totalCosts={financials.totalCosts}
        />
        
        <NeedsAttentionTile
          items={attentionItems}
          pendingInvites={pendingInvites}
        />
        
        <RemindersTile
          reminders={reminders}
          onComplete={handleCompleteReminder}
          onAdd={() => setAddReminderOpen(true)}
        />
      </div>
      
      {/* Pending Invites - if any */}
      <PendingInvitesPanel invites={pendingInvites} onRefresh={refetch} />
      
      {/* Project List */}
      <div className="space-y-3">
        {filteredProjects.map((project) => (
          <ProjectRow key={project.id} ... />
        ))}
      </div>
    </div>
  </AppLayout>
);
```

---

### File 7: `src/hooks/useDashboardData.ts`

**Add data for:**
1. Total contract values across all projects
2. TC profit margin calculation (revenue - costs)
3. Reminders fetching (new table)

---

### Database: `reminders` table (NEW)

```sql
CREATE TABLE public.reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  org_id UUID NOT NULL REFERENCES public.organizations(id),
  project_id UUID REFERENCES public.projects(id),
  title TEXT NOT NULL,
  description TEXT,
  due_date TIMESTAMPTZ NOT NULL,
  completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS policies
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own reminders"
  ON public.reminders FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own reminders"
  ON public.reminders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own reminders"
  ON public.reminders FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own reminders"
  ON public.reminders FOR DELETE
  USING (auth.uid() = user_id);
```

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `src/components/layout/TopBar.tsx` | MODIFY - Remove search bar |
| `src/components/dashboard/StatusMenu.tsx` | CREATE - Sticky status menu with counts |
| `src/components/dashboard/FinancialSnapshotTile.tsx` | CREATE - Role-aware financial card |
| `src/components/dashboard/NeedsAttentionTile.tsx` | CREATE - Enhanced attention tile |
| `src/components/dashboard/RemindersTile.tsx` | CREATE - Reminders tile with add/complete |
| `src/components/dashboard/AddReminderDialog.tsx` | CREATE - Dialog to add new reminder |
| `src/components/dashboard/index.ts` | MODIFY - Export new components |
| `src/pages/Dashboard.tsx` | MODIFY - Complete layout refactor |
| `src/hooks/useDashboardData.ts` | MODIFY - Add financial and reminder data |
| Database migration | CREATE - `reminders` table with RLS |

---

## Components to Remove

- `src/components/dashboard/QuickActions.tsx` - No longer needed
- `src/components/dashboard/SummaryCards.tsx` - Replaced by new tiles
- `src/components/dashboard/ProjectListFilters.tsx` - Replaced by StatusMenu

---

## Visual Summary

```text
┌─────────────────────────────────────────────────────────────────┐
│ [≡] Dashboard                                      [🔔] [User] │
├─────────────────────────────────────────────────────────────────┤
│ [● Active (5)] [● On Hold (2)] [● Completed (3)] [● Archived]  │  ← Sticky
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐   │
│  │ 💵 Financial    │ │ ⚠️ Needs        │ │ 🔔 Reminders    │   │
│  │                 │ │    Attention    │ │                 │   │
│  │ Contracts $1.2M │ │                 │ │ □ Follow up PO  │   │
│  │ Revenue   $890K │ │ 3 Work Orders   │ │   Due: Feb 10   │   │
│  │ Costs    -$720K │ │ 2 Invoices      │ │                 │   │
│  │ ────────────────│ │ 1 Invitation    │ │ □ Review scope  │   │
│  │ Margin   19.1%  │ │                 │ │   Due: Feb 12   │   │
│  │                 │ │                 │ │                 │   │
│  │ Outstanding:    │ │                 │ │        [+ Add]  │   │
│  │ To Collect $45K │ │                 │ │                 │   │
│  └─────────────────┘ └─────────────────┘ └─────────────────┘   │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ 📬 Pending Invites                                        │ │
│  │ Metro GC invited you to Oak Ridge Residence               │ │
│  │                                    [Decline] [Accept]     │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ 🏢 Oak Ridge Residence                 $245,000   Active  │ │
│  │    Commercial • Trade Contractor        Feb 3, 2025       │ │
│  └───────────────────────────────────────────────────────────┘ │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ 🏢 Downtown Office Tower               $180,000   Active  │ │
│  │    Commercial • Trade Contractor        Jan 28, 2025      │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```
