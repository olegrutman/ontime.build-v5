import { useNavigate } from 'react-router-dom';
import { useDemo } from '@/contexts/DemoContext';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

const ROLE_LABELS: Record<string, string> = {
  GC: 'General Contractor',
  TC: 'Trade Contractor',
  FC: 'Field Crew',
  SUPPLIER: 'Supplier',
};

export function DemoBanner() {
  const { isDemoMode, demoRole, exitDemo } = useDemo();
  const navigate = useNavigate();

  if (!isDemoMode) return null;

  const handleExit = () => {
    exitDemo();
    navigate('/');
  };

  return (
    <div className="sticky top-0 z-50 bg-primary text-primary-foreground px-4 py-2 flex items-center justify-between text-sm">
      <span>
        <strong>Demo Mode</strong> — Viewing as{' '}
        <span className="font-semibold">{demoRole ? ROLE_LABELS[demoRole] : 'unknown'}</span>.
        No real data is affected.
      </span>
      <Button variant="ghost" size="sm" onClick={handleExit} className="text-primary-foreground hover:bg-primary-foreground/20 h-7 gap-1">
        <X className="w-3.5 h-3.5" />
        Exit Demo
      </Button>
    </div>
  );
}
