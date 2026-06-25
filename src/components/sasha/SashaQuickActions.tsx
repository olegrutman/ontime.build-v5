import { Button } from '@/components/ui/button';
import {
  ArrowRight,
  Sparkles,
  Play,
  FileText,
  ShoppingCart,
  HelpCircle,
  MessageCircle,
  Receipt,
  Users,
  LayoutDashboard,
  Wrench,
  type LucideIcon,
} from 'lucide-react';

interface SashaQuickActionsProps {
  actions: string[];
  onSelect: (label: string) => void;
  disabled?: boolean;
}

function iconFor(label: string): LucideIcon {
  const l = label.toLowerCase();
  if (/demo|explore/.test(l)) return Play;
  if (/change order/.test(l)) return FileText;
  if (/purchase order|order/.test(l)) return ShoppingCart;
  if (/invoice|bill/.test(l)) return Receipt;
  if (/team|member|invite/.test(l)) return Users;
  if (/dashboard|home|overview/.test(l)) return LayoutDashboard;
  if (/scope|setup|sov/.test(l)) return Wrench;
  if (/what'?s|explain|how/.test(l)) return HelpCircle;
  if (/tip|suggest/.test(l)) return Sparkles;
  return MessageCircle;
}

export function SashaQuickActions({ actions, onSelect, disabled }: SashaQuickActionsProps) {
  if (!actions.length) return null;

  const [primary, ...rest] = actions;
  const PrimaryIcon = iconFor(primary);

  return (
    <div className="mt-2.5 space-y-2">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/80">
        Try one
      </p>

      <Button
        size="sm"
        className="group w-full justify-between gap-2 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm h-9 px-4"
        onClick={() => onSelect(primary)}
        disabled={disabled}
      >
        <span className="flex items-center gap-2 text-xs font-medium">
          <PrimaryIcon className="h-3.5 w-3.5" />
          {primary}
        </span>
        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
      </Button>

      {rest.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {rest.map((label) => {
            const Icon = iconFor(label);
            return (
              <button
                key={label}
                type="button"
                onClick={() => onSelect(label)}
                disabled={disabled}
                className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 hover:bg-primary/20 text-primary text-xs font-medium px-3 py-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Icon className="h-3 w-3" />
                {label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
