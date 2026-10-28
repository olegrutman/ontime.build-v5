import { ShieldCheck } from 'lucide-react';

/** Small list badge: the owner/architect signed off on this order outside the app. */
export function COExternalApprovedBadge({ co }: { co: any }) {
  const owner = co?.owner_approval_status === 'approved';
  const arch = co?.architect_approval_status === 'approved';
  if (!owner && !arch) return null;
  const who = owner && arch ? 'Owner & architect' : owner ? 'Owner' : 'Architect';
  const name = owner ? co?.owner_approver_name : co?.architect_approver_name;
  return (
    <span
      title={name ? `Signed by ${name}` : undefined}
      className="inline-flex items-center gap-1 rounded-full border border-emerald-300 bg-emerald-50 px-1.5 h-5 text-[10px] font-medium text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400 shrink-0"
    >
      <ShieldCheck className="h-3 w-3" /> {who} approved
    </span>
  );
}
