import { Plus, FileText, ClipboardCheck, Briefcase, Archive, FileEdit } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

interface QuickActionsProps {
  onViewArchived: () => void;
}

export function QuickActions({ onViewArchived }: QuickActionsProps) {
  const navigate = useNavigate();

  return (
    <div className="flex flex-wrap gap-2">
      <Button onClick={() => navigate('/create-project')} size="sm">
        <Plus className="h-4 w-4 mr-2" />
        New Project
      </Button>
      <Button variant="outline" size="sm" onClick={() => navigate('/change-orders')}>
        <FileEdit className="h-4 w-4 mr-2" />
        New Work Order
      </Button>
      <Button variant="outline" size="sm" onClick={() => navigate('/invoices')}>
        <FileText className="h-4 w-4 mr-2" />
        Create Invoice
      </Button>
      <Button variant="outline" size="sm" onClick={() => navigate('/change-orders')}>
        <ClipboardCheck className="h-4 w-4 mr-2" />
        Review Work Orders
      </Button>
      <Button variant="outline" size="sm" onClick={() => navigate('/dashboard')}>
        <Briefcase className="h-4 w-4 mr-2" />
        View Active Projects
      </Button>
      <Button variant="ghost" size="sm" onClick={onViewArchived}>
        <Archive className="h-4 w-4 mr-2" />
        Archived Projects
      </Button>
    </div>
  );
}
