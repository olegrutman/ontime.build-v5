// Shared design tokens for the demo-v2 visual language

export const DT = {
  // Typography
  sectionHeader: "text-[0.7rem] uppercase tracking-[0.4px] text-muted-foreground font-medium",
  cardWrapper: "bg-card border border-border rounded-lg",
  cardPadding: "px-3.5 py-3.5",
  // Font class names (use Tailwind classes instead of inline styles)
  monoClass: "font-mono",
  headingClass: "font-heading",
} as const;

// Status accent colors for left borders (3px)
export const STATUS_ACCENTS = {
  // Invoice statuses
  DRAFT: '#6B7280',
  SUBMITTED: '#F59E0B',
  APPROVED: '#10B981',
  REJECTED: '#EF4444',
  PAID: '#3B82F6',
  // RFI priorities
  urgent: '#EF4444',
  high: '#F59E0B',
  normal: '#3B82F6',
  low: '#6B7280',
} as const;
