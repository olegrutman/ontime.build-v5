import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  ClipboardList, 
  FileText, 
  Clock,
  AlertCircle
} from 'lucide-react';
import { format } from 'date-fns';

interface PendingItem {
  item_id: string;
  item_type: string;
  project_id: string;
  project_name: string;
  created_by_role: string;
  submitted_at: string;
  description: string;
}

const ROLE_LABELS: Record<string, string> = {
  'FIELD_CREW': 'Field Crew',
  'TRADE_CONTRACTOR': 'Trade Contractor',
  'GC': 'General Contractor'
};

export default function PendingApprovals() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [pendingItems, setPendingItems] = useState<PendingItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchPendingItems();
    }
  }, [user]);

  const fetchPendingItems = async () => {
    try {
      const { data, error } = await supabase.rpc('get_pending_approvals_for_user');
      
      if (error) throw error;
      setPendingItems(data || []);
    } catch (error) {
      console.error('Error fetching pending approvals:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleItemClick = (item: PendingItem) => {
    // Navigate to the project with the appropriate item selected
    navigate(`/projects/${item.project_id}?pending=${item.item_type}&id=${item.item_id}`);
  };

  if (loading) {
    return (
      <Card className="border-0 shadow-md animate-pulse">
        <CardHeader className="pb-2">
          <div className="h-5 bg-muted rounded w-32" />
        </CardHeader>
        <CardContent>
          <div className="h-16 bg-muted rounded" />
        </CardContent>
      </Card>
    );
  }

  if (pendingItems.length === 0) {
    return null;
  }

  return (
    <Card className="border-0 shadow-md border-l-4 border-l-warning">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-warning" />
          Pending Approvals
          <Badge variant="warning" className="ml-auto bg-warning/10 text-warning border-warning/20">
            {pendingItems.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {pendingItems.map((item) => (
          <div
            key={`${item.item_type}-${item.item_id}`}
            className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted cursor-pointer transition-colors"
            onClick={() => handleItemClick(item)}
          >
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              item.item_type === 'change_order' ? 'bg-destructive/10' : 'bg-warning/10'
            }`}>
              {item.item_type === 'change_order' ? (
                <ClipboardList className="h-5 w-5 text-destructive" />
              ) : (
                <FileText className="h-5 w-5 text-warning" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <Badge 
                  variant="outline" 
                  className={`text-xs ${
                    item.item_type === 'change_order' 
                      ? 'border-destructive/30 text-destructive' 
                      : 'border-warning/30 text-warning'
                  }`}
                >
                  {item.item_type === 'change_order' ? 'CO' : 'Invoice'}
                </Badge>
                <span className="text-sm font-medium truncate">{item.project_name}</span>
              </div>
              <p className="text-xs text-muted-foreground truncate">{item.description}</p>
              <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                {item.submitted_at && format(new Date(item.submitted_at), 'MMM d, h:mm a')}
                <span className="text-muted-foreground/50">•</span>
                <span>From {ROLE_LABELS[item.created_by_role] || item.created_by_role}</span>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
