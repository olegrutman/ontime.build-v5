import type { COCreatedByRole } from '@/types/changeOrder';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';
import { useRoleLabelsContext } from '@/contexts/RoleLabelsContext';

interface RoutingNode {
  label: string;
  initials: string;
  roleColor: string;
  sub: string;
  isYou?: boolean;
}

interface RoutingChainProps {
  role: COCreatedByRole;
  tcName?: string;
  tcInitials?: string;
  fcName?: string;
  fcInitials?: string;
  gcName?: string;
  gcInitials?: string;
  requestFc?: boolean;
}

export function RoutingChain({
  role,
  tcName,
  tcInitials = 'TC',
  fcName,
  fcInitials = 'FC',
  gcName,
  gcInitials = 'GC',
  requestFc = false,
}: RoutingChainProps) {
  const rl = useRoleLabelsContext();
  const resolvedTcName = tcName ?? rl.TC;
  const resolvedFcName = fcName ?? rl.FC;
  const resolvedGcName = gcName ?? rl.GC;
  const nodes: RoutingNode[] = [];

  if (role === 'GC') {
    nodes.push({ label: 'You', initials: gcInitials, roleColor: 'bg-blue-600', sub: 'Create CO', isYou: true });
    if (requestFc) {
      nodes.push({ label: resolvedFcName, initials: fcInitials, roleColor: 'bg-amber-500', sub: 'Logs hours' });
    }
    nodes.push({ label: resolvedTcName, initials: tcInitials, roleColor: 'bg-green-600', sub: 'Prices & submits' });
    nodes.push({ label: 'You', initials: gcInitials, roleColor: 'bg-blue-600', sub: 'Approve', isYou: true });
  } else if (role === 'TC') {
    if (requestFc) {
      nodes.push({ label: resolvedFcName, initials: fcInitials, roleColor: 'bg-amber-500', sub: 'Logs hours' });
    }
    nodes.push({ label: 'You', initials: tcInitials, roleColor: 'bg-green-600', sub: 'Price & submit', isYou: true });
    nodes.push({ label: resolvedGcName, initials: gcInitials, roleColor: 'bg-blue-600', sub: 'Approves' });
  } else {
    nodes.push({ label: 'You', initials: fcInitials, roleColor: 'bg-amber-500', sub: 'Log hours', isYou: true });
    nodes.push({ label: resolvedTcName, initials: tcInitials, roleColor: 'bg-green-600', sub: 'Prices' });
    nodes.push({ label: resolvedGcName, initials: gcInitials, roleColor: 'bg-blue-600', sub: 'Approves' });
  }

  return (
    <div className="bg-gradient-to-br from-[hsl(var(--navy))] to-[hsl(var(--navy-light,220,50%,20%))] rounded-xl p-4 text-white mt-3">
      <p className="text-[0.6rem] font-bold text-amber-400 uppercase tracking-[1.5px] mb-2.5">
        Approval Chain
      </p>
      <div className="flex items-center gap-2 flex-wrap">
        {nodes.map((node, i) => (
          <div key={i} className="contents">
            <div
              className={cn(
                'flex items-center gap-[7px] px-2.5 py-[7px] rounded-lg text-[0.74rem] font-semibold border',
                node.isYou
                  ? 'bg-amber-500 text-[hsl(var(--navy))] border-amber-500'
                  : 'bg-white/[0.08] border-white/[0.15]',
              )}
            >
              <span
                className={cn(
                  'w-[22px] h-[22px] rounded-full flex items-center justify-center text-[0.6rem] font-bold text-white shrink-0',
                  node.roleColor,
                )}
              >
                {node.initials.slice(0, 2)}
              </span>
              <div>
                <div>{node.label}</div>
                <div className="text-[0.6rem] opacity-60 font-normal">{node.sub}</div>
              </div>
            </div>
            {i < nodes.length - 1 && (
              <span className="text-white/40 text-[0.85rem]">→</span>
            )}
          </div>
        ))}
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-green-600 text-white rounded-lg text-[0.68rem] font-bold uppercase tracking-[0.5px]">
          <Check className="h-3 w-3" /> Contracted
        </div>
      </div>
    </div>
  );
}
