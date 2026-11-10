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
  tcInitials,
  fcName,
  fcInitials,
  gcName,
  gcInitials,
  requestFc = false,
}: RoutingChainProps) {
  const rl = useRoleLabelsContext();
  const resolvedTcName = tcName ?? rl.TC;
  const resolvedFcName = fcName ?? rl.FC;
  const resolvedGcName = gcName ?? rl.GC;
  const tcI = tcInitials ?? rl.initials('TC');
  const fcI = fcInitials ?? rl.initials('FC');
  const gcI = gcInitials ?? rl.initials('GC');
  const nodes: RoutingNode[] = [];

  if (role === 'GC') {
    nodes.push({ label: 'You', initials: gcI, roleColor: 'bg-type-sov', sub: 'Create CO', isYou: true });
    if (requestFc) {
      nodes.push({ label: resolvedFcName, initials: fcI, roleColor: 'bg-state-open', sub: 'Logs hours' });
    }
    nodes.push({ label: resolvedTcName, initials: tcI, roleColor: 'bg-state-approved', sub: 'Prices & submits' });
    nodes.push({ label: 'You', initials: gcI, roleColor: 'bg-type-sov', sub: 'Approve', isYou: true });
  } else if (role === 'TC') {
    if (requestFc) {
      nodes.push({ label: resolvedFcName, initials: fcI, roleColor: 'bg-state-open', sub: 'Logs hours' });
    }
    nodes.push({ label: 'You', initials: tcI, roleColor: 'bg-state-approved', sub: 'Price & submit', isYou: true });
    nodes.push({ label: resolvedGcName, initials: gcI, roleColor: 'bg-type-sov', sub: 'Approves' });
  } else {
    nodes.push({ label: 'You', initials: fcI, roleColor: 'bg-state-open', sub: 'Log hours', isYou: true });
    nodes.push({ label: resolvedTcName, initials: tcI, roleColor: 'bg-state-approved', sub: 'Prices' });
    nodes.push({ label: resolvedGcName, initials: gcI, roleColor: 'bg-type-sov', sub: 'Approves' });
  }

  return (
    <div className="bg-gradient-to-br from-[hsl(var(--navy))] to-[hsl(var(--navy-light,220,50%,20%))] rounded-xl p-4 text-white mt-3">
      <p className="text-[0.6rem] font-bold text-state-open uppercase tracking-[1.5px] mb-2.5">
        Approval Chain
      </p>
      <div className="flex items-center gap-2 flex-wrap">
        {nodes.map((node, i) => (
          <div key={i} className="contents">
            <div
              className={cn(
                'flex items-center gap-[7px] px-2.5 py-[7px] rounded-lg text-[0.74rem] font-semibold border',
                node.isYou
                  ? 'bg-state-open text-[hsl(var(--navy))] border-state-open'
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
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-state-approved text-white rounded-lg text-[0.68rem] font-bold uppercase tracking-[0.5px]">
          <Check className="h-3 w-3" /> Contracted
        </div>
      </div>
    </div>
  );
}
