import { cn } from '@/lib/utils';

interface ContractStatusBadgeProps {
  status: string | null;
  className?: string;
}

const STATUS_CONFIG: Record<string, { label: string; classes: string }> = {
  draft: { label: 'Draft', classes: 'bg-muted text-muted-foreground border-border' },
  sent: { label: 'Sent', classes: 'bg-amber-500/15 text-amber-700 border-amber-500/30' },
  accepted: { label: 'Accepted', classes: 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30' },
  rejected: { label: 'Rejected', classes: 'bg-destructive/15 text-destructive border-destructive/30' },
  revised: { label: 'Revised', classes: 'bg-blue-500/15 text-blue-700 border-blue-500/30' },
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
