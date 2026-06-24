import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  FileText, 
  MapPin,
  ArrowRight,
  User,
  Clock
} from 'lucide-react';
import {
  ChangeOrderRequest,
  StructuredLocation,
  CorStatus,
  AppRole,
  STATUS_CONFIG,
  ROLE_LABELS,
  getLocationDisplayString,
  formatCorRef,
} from './types';

interface CorListProps {
  projectId: string;
  onSelect: (id: string) => void;
  onCreateNew?: () => void;
  refreshTrigger?: number;
}

interface ProfileInfo {
  id: string;
  email: string;
  company_name: string;
}

export default function CorList({ 
  projectId, 
  onSelect, 
  onCreateNew,
  refreshTrigger = 0
}: CorListProps) {
  const [cors, setCors] = useState<ChangeOrderRequest[]>([]);
  const [creatorProfiles, setCreatorProfiles] = useState<Record<string, ProfileInfo>>({});
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<AppRole | null>(null);

  useEffect(() => {
    fetchUserRole();
    fetchCors();
  }, [projectId, refreshTrigger]);

  const fetchUserRole = async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

    const { data } = await supabase.rpc('get_user_project_role', {
      _project_id: projectId,
      _user_id: userData.user.id,
    });
    
    if (data) {
      setUserRole(data as AppRole);
    }
  };

  const fetchCors = async () => {
    try {
      const { data, error } = await supabase
        .from('change_order_requests')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Parse location JSON
      const parsedCors = (data || []).map((cor) => ({
        ...cor,
        location: typeof cor.location === 'string' 
          ? JSON.parse(cor.location) 
          : cor.location as StructuredLocation,
      })) as ChangeOrderRequest[];

      setCors(parsedCors);

      // Fetch creator profiles
      if (parsedCors.length > 0) {
        const creatorIds = [...new Set(parsedCors.map(cor => cor.created_by_user_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, email, company_id')
          .in('id', creatorIds);

        if (profiles) {
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
              company_name: p.company_id ? companyMap[p.company_id] || p.email.split('@')[0] : p.email.split('@')[0]
            };
          });
          setCreatorProfiles(profileMap);
        }
      }
    } catch (error) {
      console.error('Error fetching CORs:', error);
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

  const canCreate = userRole === 'GC' || userRole === 'TRADE_CONTRACTOR';

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
      {onCreateNew && canCreate && (
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">Change Order Requests</h3>
          <Button variant="accent" size="sm" onClick={onCreateNew}>
            <Plus className="h-4 w-4 mr-1" />
            New COR
          </Button>
        </div>
      )}

      {cors.length === 0 ? (
        <Card className="border-0 shadow-md">
          <CardContent className="py-8 text-center">
            <FileText className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-muted-foreground">No Change Order Requests yet</p>
            {onCreateNew && canCreate && (
              <Button variant="accent" size="sm" className="mt-4" onClick={onCreateNew}>
                <Plus className="h-4 w-4 mr-1" />
                Create First COR
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {cors.map((cor) => {
            const statusConfig = STATUS_CONFIG[cor.status as CorStatus];
            const creatorProfile = creatorProfiles[cor.created_by_user_id];
            const creatorName = creatorProfile?.company_name || 'Unknown';
            const locationStr = getLocationDisplayString(cor.location);

            return (
              <Card 
                key={cor.id} 
                className="border-0 shadow-md cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => onSelect(cor.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-xs bg-warning/10 text-warning border-warning/30 font-mono">
                          {formatCorRef(cor.reference_number)}
                        </Badge>
                        <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="font-semibold text-foreground truncate">
                          {locationStr}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                        <span className="px-2 py-0.5 rounded-full bg-muted text-xs">
                          {cor.scope_type}
                        </span>
                        <span>•</span>
                        <span>{formatDate(cor.created_at)}</span>
                      </div>
                      
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2 bg-muted/30 rounded-md px-2 py-1.5">
                        <User className="h-3 w-3 shrink-0" />
                        <span className="font-medium truncate">
                          {creatorName}
                        </span>
                        {cor.man_hours && (
                          <>
                            <Clock className="h-3 w-3 ml-2" />
                            <span>{cor.man_hours}h</span>
                          </>
                        )}
                        {cor.total_cost && (
                          <>
                            <ArrowRight className="h-3 w-3 ml-2 text-accent" />
                            <span className="font-medium text-accent">
                              ${cor.total_cost.toLocaleString()}
                            </span>
                          </>
                        )}
                      </div>
                      
                      {cor.description && (
                        <p className="text-sm text-muted-foreground line-clamp-1 mt-2">
                          {cor.description}
                        </p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusConfig.className}`}>
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
