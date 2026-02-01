import * as React from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

export interface StatusOption {
  value: string;
  label: string;
  color: string;
}

interface StatusColumnProps {
  value: string;
  options: StatusOption[];
  onChange?: (value: string) => void;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showPulse?: boolean;
}

const sizeClasses = {
  sm: 'h-6 px-2 text-xs min-w-[80px]',
  md: 'h-8 px-3 text-sm min-w-[100px]',
  lg: 'h-10 px-4 text-base min-w-[120px]',
};

export function StatusColumn({
  value,
  options,
  onChange,
  disabled = false,
  size = 'md',
  showPulse = false,
}: StatusColumnProps) {
  const [open, setOpen] = React.useState(false);
  const currentOption = options.find((opt) => opt.value === value);

  const handleSelect = (newValue: string) => {
    if (onChange) {
      onChange(newValue);
    }
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild disabled={disabled}>
        <button
          className={cn(
            'relative inline-flex items-center justify-center gap-1.5 rounded-md font-medium transition-all duration-200',
            'hover:opacity-90 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            sizeClasses[size],
            disabled && 'opacity-50 cursor-not-allowed'
          )}
          style={{
            backgroundColor: currentOption?.color || 'hsl(var(--muted))',
            color: getContrastColor(currentOption?.color || '#c4c4c4'),
          }}
        >
          {showPulse && (
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-white" />
            </span>
          )}
          <span className="truncate">{currentOption?.label || value}</span>
          {!disabled && <ChevronDown className="h-3 w-3 shrink-0 opacity-70" />}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-1" align="start">
        <div className="flex flex-col gap-0.5">
          {options.map((option) => (
            <button
              key={option.value}
              onClick={() => handleSelect(option.value)}
              className={cn(
                'flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-sm transition-colors',
                'hover:bg-accent focus-visible:bg-accent focus-visible:outline-none',
                value === option.value && 'bg-accent'
              )}
            >
              <span
                className="w-4 h-4 rounded-sm shrink-0"
                style={{ backgroundColor: option.color }}
              />
              <span className="flex-1 text-left truncate">{option.label}</span>
              {value === option.value && (
                <Check className="h-4 w-4 shrink-0 text-primary" />
              )}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// Helper to determine text color based on background
function getContrastColor(hexColor: string): string {
  // Handle HSL format or hex
  if (hexColor.startsWith('#')) {
    const r = parseInt(hexColor.slice(1, 3), 16);
    const g = parseInt(hexColor.slice(3, 5), 16);
    const b = parseInt(hexColor.slice(5, 7), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5 ? '#1a1a2e' : '#ffffff';
  }
  // Default to white for non-hex colors
  return '#ffffff';
}

// Preset status options for common use cases
export const PROJECT_STATUS_OPTIONS: StatusOption[] = [
  { value: 'draft', label: 'Draft', color: '#C4C4C4' },
  { value: 'active', label: 'Active', color: '#00C875' },
  { value: 'on_hold', label: 'On Hold', color: '#FDAB3D' },
  { value: 'completed', label: 'Completed', color: '#0086C0' },
  { value: 'archived', label: 'Archived', color: '#808080' },
];

export const WORK_ITEM_STATUS_OPTIONS: StatusOption[] = [
  { value: 'OPEN', label: 'Open', color: '#FDAB3D' },
  { value: 'PRICED', label: 'Priced', color: '#A25DDC' },
  { value: 'APPROVED', label: 'Approved', color: '#00C875' },
  { value: 'EXECUTED', label: 'Executed', color: '#808080' },
];

export const INVOICE_STATUS_OPTIONS: StatusOption[] = [
  { value: 'DRAFT', label: 'Draft', color: '#C4C4C4' },
  { value: 'PENDING_REVIEW', label: 'Pending', color: '#FDAB3D' },
  { value: 'APPROVED', label: 'Approved', color: '#00C875' },
  { value: 'REJECTED', label: 'Rejected', color: '#E2445C' },
  { value: 'PAID', label: 'Paid', color: '#0086C0' },
];

export const CHANGE_ORDER_STATUS_OPTIONS: StatusOption[] = [
  { value: 'draft', label: 'In Progress', color: '#C4C4C4' },
  { value: 'fc_input', label: 'FC Input', color: '#0086C0' },
  { value: 'tc_pricing', label: 'TC Pricing', color: '#FDAB3D' },
  { value: 'ready_for_approval', label: 'Ready', color: '#A25DDC' },
  { value: 'approved', label: 'Approved', color: '#00C875' },
  { value: 'rejected', label: 'Rejected', color: '#E2445C' },
  { value: 'contracted', label: 'Contracted', color: '#10B981' },
];
