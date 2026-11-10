import { cn } from '@/lib/utils';

interface ContractStatusBadgeProps {
  status: string | null;
  className?: string;
}

const STATUS_CONFIG: Record<string, { label: string; classes: string }> = {
  draft: { label: 'Draft', classes: 'bg-muted text-muted-foreground border-border' },
  sent: { label: 'Sent', classes: 'bg-state-open/15 text-state-open-foreground border-state-open/30' },
  accepted: { label: 'Accepted', classes: 'bg-state-approved/15 text-state-approved-foreground border-state-approved/30' },
  rejected: { label: 'Rejected', classes: 'bg-destructive/15 text-destructive border-destructive/30' },
  revised: { label: 'Revised', classes: 'bg-type-sov/15 text-type-sov border-type-sov/30' },
};

export function ContractStatusBadge({ status, className }: ContractStatusBadgeProps) {
  const config = STATUS_CONFIG[status ?? 'draft'] ?? STATUS_CONFIG.draft;

  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 text-[10px] font-semibold rounded-full border',
        config.classes,
        className,
      )}
    >
      {config.label}
    </span>
  );
}
