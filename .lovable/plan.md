

# QA Testing Report -- OntimeBuild Dashboard & Features (RESOLVED)

## Testing Methodology

Comprehensive code-level audit and database state analysis across all user roles (GC, TC, FC, Supplier). Reviewed database integrity, RLS policies, notification triggers, and all identified bugs.

---

## Bug Resolution Summary

| Bug | Severity | Status | Resolution |
|-----|----------|--------|------------|
| Bug 1: Badge forwardRef | Low | ✅ FIXED | Wrapped Badge with `React.forwardRef()` |
| Bug 2: Notifications unread | Medium | ✅ NOT A BUG | Verified: `get_my_notifications` RPC correctly joins `notification_reads` via `user_has_read_notification()`. `get_unread_count` uses `NOT EXISTS` on `notification_reads`. Working as designed. |
| Bug 3: GC financial card | Low | ✅ FIXED | Changed `c.from_org_id` to `c.to_org_id` for GC in `totalContractValue` calculation. Also added FC support. |
| Bug 4: Outstanding amounts | Medium | ✅ FIXED | Added contract-direction filtering. "Outstanding to Pay" now only shows invoices where current org is `to_org_id`. "Outstanding to Collect" only where current org is `from_org_id`. |
| Bug 5: Missing PO statuses | Low | ✅ FIXED | Added `FINALIZED` and `READY_FOR_DELIVERY` to PO filter dropdown. |
| Bug 6: Pending actions TC | Low | ✅ FIXED | Changed condition from `orgType === 'GC'` to `orgType === 'GC' || orgType === 'TC'` so TCs see pending invoice badges too. |
| Bug 7: Invoiced PO scope | Very Low | ✅ FIXED | Added `.eq('project_id', projectId)` to invoiced PO lookup query. |

## Files Modified

- `src/components/ui/badge.tsx` — Added `React.forwardRef`
- `src/hooks/useDashboardData.ts` — Fixed GC contract sum, role-filtered billing, TC pending actions
- `src/components/project/PurchaseOrdersTab.tsx` — Added missing PO statuses, scoped invoiced PO query

## All PASSING Tests (Unchanged)

1. Database Integrity — PASS
2. RLS Security — PASS
3. Notification Triggers — PASS
4. Contract Hierarchy — PASS
5. PO-to-Invoice Feature — PASS
6. Dashboard Two-Zone Layout — PASS
7. Project Team Access — PASS
8. Work Order Assignment — PASS
9. Invoice Workflow — PASS

**All 7 identified issues have been resolved. 0 remaining bugs.**
