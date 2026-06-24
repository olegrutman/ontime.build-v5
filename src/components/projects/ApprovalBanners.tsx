import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  ClipboardList, 
  FileText, 
  AlertCircle
} from 'lucide-react';

interface ApprovalBannersProps {
  projectId: string;
  onNavigateToCOs?: () => void;
  onNavigateToInvoices?: () => void;
}

export default function ApprovalBanners({ 
  projectId, 
  onNavigateToCOs, 
  onNavigateToInvoices 
}: ApprovalBannersProps) {
  const { user } = useAuth();
  const [pendingCOs, setPendingCOs] = useState(0);
  const [pendingInvoices, setPendingInvoices] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && projectId) {
      fetchPendingCounts();
    }
  }, [user, projectId]);

  const fetchPendingCounts = async () => {
    try {
      const { data, error } = await supabase.rpc('get_project_pending_counts', {
        _project_id: projectId,
      });

      if (error) throw error;

      const row = Array.isArray(data) ? data[0] : (data as any);

      // Debug: helps confirm what the RPC returns for the current user
      console.log('[ApprovalBanners] get_project_pending_counts', {
        projectId,
        data,
      });

      if (row) {
        setPendingCOs(Number(row.pending_cos) || 0);
        setPendingInvoices(Number(row.pending_invoices) || 0);
      } else {
        setPendingCOs(0);
        setPendingInvoices(0);
      }
    } catch (error) {
      console.error('Error fetching pending counts:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || (pendingCOs === 0 && pendingInvoices === 0)) {
    return null;
  }

  return (
    <div className="space-y-2">
      {pendingCOs > 0 && (
        <Button
          variant="outline"
          className="w-full justify-start gap-3 h-auto py-3 border-destructive/30 bg-destructive/5 hover:bg-destructive/10"
          onClick={onNavigateToCOs}
        >
          <div className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center">
            <ClipboardList className="h-4 w-4 text-destructive" />
          </div>
          <div className="flex-1 text-left">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-destructive" />
              <span className="font-medium text-destructive">Change Orders Need Approval</span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {pendingCOs} pending your review
            </p>
          </div>
          <Badge variant="destructive" className="ml-auto">
            {pendingCOs}
          </Badge>
        </Button>
      )}

      {pendingInvoices > 0 && (
        <Button
          variant="outline"
          className="w-full justify-start gap-3 h-auto py-3 border-warning/30 bg-warning/5 hover:bg-warning/10"
          onClick={onNavigateToInvoices}
        >
          <div className="w-8 h-8 rounded-lg bg-warning/10 flex items-center justify-center">
            <FileText className="h-4 w-4 text-warning" />
          </div>
          <div className="flex-1 text-left">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-warning" />
              <span className="font-medium text-warning">Invoices Need Approval</span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {pendingInvoices} pending your review
            </p>
          </div>
          <Badge className="ml-auto bg-warning text-warning-foreground">
            {pendingInvoices}
          </Badge>
        </Button>
      )}
    </div>
  );
}
