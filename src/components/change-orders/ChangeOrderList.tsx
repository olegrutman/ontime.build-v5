import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Plus, 
  FileText, 
  Clock,
  CheckCircle2,
  XCircle,
  MapPin,
  ArrowRight,
  User
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';

interface ChangeOrder {
  id: string;
  reference_number: number;
  location: string;
  description: string;
  title: string;
  scope_type: string;
  approval_status: string;
  work_status: string;
  created_at: string;
  submitted_at: string | null;
  approved_at: string | null;
  created_by_user_id: string;
  submitted_to_role: string | null;
  source_cor_id: string | null;
  source_cor_ref: string | null;
}

// Helper to format CO reference
function formatCoRef(referenceNumber: number): string {
  return `CO-${referenceNumber}`;
}

interface ProfileInfo {
  id: string;
  email: string;
  role: string;
  company_name: string;
}

interface ChangeOrderListProps {
  contractContextId?: string;
  projectId?: string;
  onSelectChangeOrder?: (id: string) => void;
  onSelect?: (id: string) => void;
  onCreateNew?: () => void;
  refreshTrigger?: number;
}

const SCOPE_LABELS: Record<string, string> = {
  'RE_FRAME': 'Re-Frame',
  'RE-FRAME': 'Re-Frame',
  'ADDITION': 'Addition',
  'FIXING': 'Fixing',
  'RE_INSTALL': 'Re-Install',
  'RE-INSTALL': 'Re-Install',
  'ADJUST': 'Adjust'
};

const ROLE_LABELS: Record<string, string> = {
  'FIELD_CREW': 'Field Crew',
  'TRADE_CONTRACTOR': 'Trade Contractor',
  'GC': 'General Contractor',
  'OWNER': 'Owner'
};

const STATUS_CONFIG: Record<string, { label: string; icon: typeof Clock; className: string }> = {
  DRAFT: { 
    label: 'Draft', 
    icon: FileText, 
    className: 'bg-muted text-muted-foreground' 
  },
  NEEDS_APPROVAL: { 
    label: 'Pending', 
    icon: Clock, 
    className: 'bg-warning/10 text-warning' 
  },
  APPROVED: { 
    label: 'Approved', 
    icon: CheckCircle2, 
    className: 'bg-success/10 text-success' 
  },
  REJECTED: { 
    label: 'Rejected', 
    icon: XCircle, 
    className: 'bg-destructive/10 text-destructive' 
  }
};

export default function ChangeOrderList({ 
  contractContextId,
  projectId,
  onSelectChangeOrder,
  onSelect,
  onCreateNew,
  refreshTrigger = 0
}: ChangeOrderListProps) {
  const handleSelect = onSelectChangeOrder || onSelect || (() => {});
  const [changeOrders, setChangeOrders] = useState<ChangeOrder[]>([]);
  const [creatorProfiles, setCreatorProfiles] = useState<Record<string, ProfileInfo>>({});
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    if (projectId) {
      fetchUserRole();
    }
    fetchChangeOrders();
  }, [contractContextId, projectId, refreshTrigger]);

  const fetchUserRole = async () => {
    if (!projectId) return;
    try {
      const { data } = await supabase.rpc('get_user_project_role', {
        _project_id: projectId,
        _user_id: (await supabase.auth.getUser()).data.user?.id
      });
      setUserRole(data);
    } catch (error) {
      console.error('Error fetching user role:', error);
    }
  };

  const fetchChangeOrders = async () => {
    try {
      let allCOs: ChangeOrder[] = [];
      const { data: user } = await supabase.auth.getUser();

      // If projectId is provided, fetch COs from ALL contexts the user has access to
      if (projectId && user.user) {
        const { data: contexts, error: contextsError } = await supabase
          .from('contract_contexts')
          .select('id')
          .eq('project_id', projectId);

        // Prefer project-wide fetch, but fall back to the provided context if contexts can't be read
        const contextIds = contexts?.map((c) => c.id) ?? [];

        if (contextsError || contextIds.length === 0) {
          if (contractContextId) {
            const { data, error } = await supabase
              .from('change_orders')
              .select('*')
              .eq('contract_context_id', contractContextId)
              .order('created_at', { ascending: false });

            if (error) throw error;
            allCOs = data || [];
          }
        } else {
          const { data, error } = await supabase
            .from('change_orders')
            .select('*')
            .in('contract_context_id', contextIds)
            .order('created_at', { ascending: false });

          if (error) throw error;
          allCOs = data || [];
        }

        // Also fetch COs pending approval for the user's role (cross-context visibility)
        const { data: roleData } = await supabase.rpc('get_user_project_role', {
          _project_id: projectId,
          _user_id: user.user.id,
        });

        if (roleData) {
          const { data: pendingCOs, error: pendingError } = await supabase
            .from('change_orders')
            .select('*')
            .eq('submitted_to_role', roleData)
            .eq('approval_status', 'NEEDS_APPROVAL')
            .order('created_at', { ascending: false });

          if (pendingError) throw pendingError;

          if (pendingCOs) {
            const existingIds = new Set(allCOs.map((co) => co.id));
            const newCOs = pendingCOs.filter((co) => !existingIds.has(co.id));
            allCOs = [...allCOs, ...newCOs];
          }

          // UI-level privacy guard: Field Crew should not see TC → GC COs unless they created them.
          if (roleData === 'FIELD_CREW') {
            allCOs = allCOs.filter(
              (co) => co.submitted_to_role !== 'GC' || co.created_by_user_id === user.user?.id
            );
          }
        }
      } else if (contractContextId) {
        // Fallback: fetch from specific context only
        const { data, error } = await supabase
          .from('change_orders')
          .select('*')
          .eq('contract_context_id', contractContextId)
          .order('created_at', { ascending: false });

        if (error) throw error;
        allCOs = data || [];
      }

      // Sort all COs by created_at descending
      allCOs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setChangeOrders(allCOs);

      // Fetch creator profiles with company names
      if (allCOs.length > 0) {
        const creatorIds = [...new Set(allCOs.map(co => co.created_by_user_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, email, role, company_id')
          .in('id', creatorIds);

        if (profiles) {
          // Fetch company names
          const companyIds = profiles.map(p => p.company_id).filter(Boolean) as string[];
          let companyMap: Record<string, string> = {};
          
          if (companyIds.length > 0) {
            const { data: companies } = await supabase
              .from('companies')
              .select('id, name')
              .in('id', companyIds);
            
            if (companies) {
              companies.forEach(c => {
                companyMap[c.id] = c.name;
              });
            }
          }

          const profileMap: Record<string, ProfileInfo> = {};
          profiles.forEach(p => {
            profileMap[p.id] = {
              id: p.id,
              email: p.email,
              role: p.role,
              company_name: p.company_id ? companyMap[p.company_id] || p.email.split('@')[0] : p.email.split('@')[0]
            };
          });
          setCreatorProfiles(profileMap);
        }
      }
    } catch (error) {
      console.error('Error fetching change orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 bg-muted/30 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {onCreateNew && (
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">Change Orders</h3>
          <Button variant="accent" size="sm" onClick={onCreateNew}>
            <Plus className="h-4 w-4 mr-1" />
            New
          </Button>
        </div>
      )}

      {changeOrders.length === 0 ? (
        <Card className="border-0 shadow-md">
          <CardContent className="py-8 text-center">
            <FileText className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-muted-foreground">No change orders yet</p>
            {onCreateNew && (
              <Button variant="accent" size="sm" className="mt-4" onClick={onCreateNew}>
                <Plus className="h-4 w-4 mr-1" />
                Create First Change Order
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {changeOrders.map((co) => {
            const statusConfig = STATUS_CONFIG[co.approval_status] || STATUS_CONFIG.DRAFT;
            const StatusIcon = statusConfig.icon;
            const creatorProfile = creatorProfiles[co.created_by_user_id];
            const creatorName = creatorProfile?.company_name || 'Unknown';
            const creatorRole = creatorProfile?.role ? ROLE_LABELS[creatorProfile.role] || creatorProfile.role : '';

            return (
              <Card 
                key={co.id} 
                className="border-0 shadow-md cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => handleSelect(co.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/30 font-mono">
                          {formatCoRef(co.reference_number)}
                        </Badge>
                        {co.source_cor_ref && (
                          <Badge variant="outline" className="text-xs bg-warning/10 text-warning border-warning/30 font-mono">
                            From {co.source_cor_ref}
                          </Badge>
                        )}
                        <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="font-semibold text-foreground truncate">
                          {co.location}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                        <span className="px-2 py-0.5 rounded-full bg-muted text-xs">
                          {SCOPE_LABELS[co.scope_type] || co.scope_type}
                        </span>
                        <span>•</span>
                        <span>{formatDate(co.created_at)}</span>
                      </div>
                      
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2 bg-muted/30 rounded-md px-2 py-1.5">
                        <User className="h-3 w-3 shrink-0" />
                        <span className="font-medium truncate" title={creatorProfile?.company_name}>
                          {creatorName}
                        </span>
                        {creatorRole && (
                          <span className="text-muted-foreground/70">({creatorRole})</span>
                        )}
                        {co.submitted_to_role && (
                          <>
                            <ArrowRight className="h-3 w-3 shrink-0 text-accent" />
                            <span className="font-medium">
                              {ROLE_LABELS[co.submitted_to_role] || co.submitted_to_role}
                            </span>
                          </>
                        )}
                      </div>
                      
                      {co.description && (
                        <p className="text-sm text-muted-foreground line-clamp-1 mt-2">
                          {co.description}
                        </p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusConfig.className}`}>
                        <StatusIcon className="h-3 w-3" />
                        {statusConfig.label}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
