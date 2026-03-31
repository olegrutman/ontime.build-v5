import { FileText, Wrench, Truck, GitBranch } from 'lucide-react';
import type { UrgentOrder } from './mockData';

const ICONS: Record<string, typeof FileText> = {
  INV: FileText,
  WO: Wrench,
  PO: Truck,
  CO: GitBranch,
};

interface UrgentItemProps {
  order: UrgentOrder;
  index: number;
  onClick: () => void;
}

export function UrgentItem({ order, index, onClick }: UrgentItemProps) {
  const Icon = ICONS[order.type] || FileText;

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-white/[0.02] transition-colors text-left opacity-0 animate-[fadeUp_400ms_ease-out_forwards]"
      style={{
        animationDelay: `${400 + index * 50}ms`,
        borderLeft: `3px solid ${order.borderColor}`,
      }}
    >
      <div
        className="w-8 h-8 rounded-md flex items-center justify-center shrink-0"
        style={{ background: `${order.borderColor}15` }}
      >
        <Icon className="w-4 h-4" style={{ color: order.borderColor }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-medium truncate">{order.title}</p>
        <p className="text-white/30 text-xs truncate">{order.subtitle}</p>
      </div>
      <div className="text-right shrink-0">
        <p className="text-white text-sm font-medium" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
          ${order.amount.toLocaleString()}
        </p>
        <span
          className="inline-block text-[10px] px-1.5 py-0.5 rounded mt-0.5 font-medium"
          style={{ background: `${order.statusColor}20`, color: order.statusColor }}
        >
          {order.status}
        </span>
      </div>
    </button>
  );
}
