import { Flag } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { correctionLabel, type OrderCorrection } from '@/lib/coCorrection';

export function COCorrectionBadge({ correction }: { correction?: OrderCorrection | null }) {
  const label = correctionLabel(correction);
  if (!label) return null;
  return <Badge variant="outline" className="max-w-full gap-1.5 whitespace-normal border-secondary/40 bg-secondary/10 text-secondary text-xs"><Flag className="h-3.5 w-3.5 shrink-0" />{label}</Badge>;
}