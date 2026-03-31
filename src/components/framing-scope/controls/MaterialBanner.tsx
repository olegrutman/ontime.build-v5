import { Package } from 'lucide-react';
import type { MaterialResponsibility } from '@/types/framingScope';

const LABELS: Record<MaterialResponsibility, string> = {
  LABOR_ONLY: 'Labor Only',
  FURNISH_INSTALL: 'Furnish & Install',
  SPLIT: 'Split Responsibility',
};

const COLORS: Record<MaterialResponsibility, string> = {
  LABOR_ONLY: 'bg-blue-500/10 text-blue-700 border-blue-500/20',
  FURNISH_INSTALL: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20',
  SPLIT: 'bg-amber-500/10 text-amber-700 border-amber-500/20',
};

interface MaterialBannerProps {
  matResp: MaterialResponsibility | null;
  onEdit: () => void;
}

export function MaterialBanner({ matResp, onEdit }: MaterialBannerProps) {
  if (!matResp) return null;

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-md border text-xs font-medium mb-4 ${COLORS[matResp]}`}>
      <Package className="w-3.5 h-3.5" />
      <span>Material responsibility: {LABELS[matResp]}</span>
      <button type="button" onClick={onEdit} className="ml-auto underline opacity-70 hover:opacity-100">
        Edit
      </button>
    </div>
  );
}
