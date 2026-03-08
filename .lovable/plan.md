

# Add `data-sasha-card` to All Remaining Cards Across Every Page

## Summary
Most cards outside the Overview tab are missing the `data-sasha-card` attribute. This plan tags every meaningful card component so Sasha's highlight mode works on all pages and tabs.

## Files to Update

### Dashboard Page
| File | Attribute |
|------|-----------|
| `DashboardQuickStats.tsx` | `"Quick Stat"` on each stat Card |
| `DashboardFinancialCard.tsx` | `"Financial Summary"` on root Card(s) |
| `NeedsAttentionTile.tsx` | `"Needs Attention"` |
| `RemindersTile.tsx` | `"Reminders"` |
| `FinancialSnapshotTile.tsx` | `"Financial Snapshot"` |
| `FinancialTrendCharts.tsx` | `"Billing Trend"` and `"Work Order Trend"` |
| `PendingInvitesPanel.tsx` | `"Pending Invites"` |
| `DashboardAttentionBanner.tsx` | `"Dashboard Attention"` |
| `OnboardingChecklist.tsx` | `"Onboarding"` |
| `ProjectRow.tsx` | `"Project"` (if it has a Card wrapper) |

### Invoices Tab
| File | Attribute |
|------|-----------|
| `InvoiceCard.tsx` | `"Invoice"` |
| `InvoicesTab.tsx` | `"Invoice Summary"` on each summary Card |

### SOV Tab
| File | Attribute |
|------|-----------|
| `SOVProgressSummary.tsx` | `"SOV Progress"` |
| `ProjectSOVEditor.tsx` | `"Schedule of Values"` on the main items Card |
| `ContractSOVEditor.tsx` | `"Contract SOV"` on each contract Card |

### Work Order Detail / Change Order Detail
| File | Attribute |
|------|-----------|
| `ContractedPricingCard.tsx` | `"Work Order Pricing"` |
| `LinkedPOCard.tsx` | `"Linked PO"` |
| `EquipmentPanel.tsx` | `"Equipment"` |
| `ParticipantActivationPanel.tsx` | `"Participants"` |
| `TMTimeCardsPanel.tsx` | `"Time Cards"` |
| `TCPricingPanel.tsx` | `"TC Pricing"` |
| `TCApprovalPanel.tsx` | `"TC Approval"` |
| `TCPricingSummary.tsx` | `"TC Pricing Summary"` |
| `FieldCrewHoursPanel.tsx` | `"Field Crew Hours"` |

### Work Item Detail
| File | Attribute |
|------|-----------|
| `WorkItemPage.tsx` | `"Work Item"` on the header Card, `"Work Item Details"` on details Card, etc. |
| `TMPeriodCard.tsx` | `"T&M Period"` |

### Partner Directory
| File | Attribute |
|------|-----------|
| `OrganizationsTab.tsx` | `"Partner Organization"` on each Card |
| `PeopleTab.tsx` | `"Partner Contact"` on each Card |

### Other
| File | Attribute |
|------|-----------|
| `EstimateSummaryCard.tsx` | `"Estimate Summary"` |

## Approach
Each file gets a single `data-sasha-card="Type"` attribute added to its root `<Card>` or `<div>` wrapper. No logic changes — the existing overlay and Sasha integration handle the rest automatically.

For components with multiple return branches (e.g. `DashboardFinancialCard` has TC vs default views), the attribute goes on each branch's root element.

## No Changes Needed
- Wizard dialogs (PO wizard, WO wizard, etc.) don't need tagging — they're modal overlays, not persistent cards
- The `SashaHighlightOverlay` and `SashaBubble` components need no changes

