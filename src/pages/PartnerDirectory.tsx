import { useState, useEffect, useMemo } from 'react';
import { Search, Building2, Wrench, HardHat, Package } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { AppLayout } from '@/components/layout';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

interface PartnerOrg {
  org_id: string;
  org_code: string;
  name: string;
  type: string;
  project_count: number;
}

const ORG_TYPE_ORDER = ['GC', 'TC', 'FC', 'SUPPLIER'] as const;

const ORG_TYPE_CONFIG: Record<string, { label: string; icon: typeof Building2; color: string }> = {
  GC: { label: 'General Contractors', icon: Building2, color: 'text-blue-600' },
  TC: { label: 'Trade Contractors', icon: Wrench, color: 'text-orange-600' },
  FC: { label: 'Field Crews', icon: HardHat, color: 'text-green-600' },
  SUPPLIER: { label: 'Suppliers', icon: Package, color: 'text-purple-600' },
};

export default function PartnerDirectory() {
  const { user, userOrgRoles } = useAuth();
  const [partners, setPartners] = useState<PartnerOrg[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const currentOrg = userOrgRoles[0]?.organization;

  useEffect(() => {
    if (currentOrg?.id) {
      fetchPartners();
    }
  }, [currentOrg?.id]);

  const fetchPartners = async () => {
    if (!currentOrg?.id) return;

    setLoading(true);

    // Get all projects where current org is a team member
    const { data: myProjects, error: projectsError } = await supabase
      .from('project_team')
      .select('project_id')
      .eq('org_id', currentOrg.id)
      .eq('status', 'active');

    if (projectsError || !myProjects?.length) {
      setPartners([]);
      setLoading(false);
      return;
    }

    const projectIds = myProjects.map((p) => p.project_id);

    // Get all orgs from those projects (excluding current org)
    const { data: teamMembers, error: teamError } = await supabase
      .from('project_team')
      .select(`
        org_id,
        project_id,
        organizations!inner (
          id,
          org_code,
          name,
          type
        )
      `)
      .in('project_id', projectIds)
      .neq('org_id', currentOrg.id)
      .eq('status', 'active');

    if (teamError) {
      console.error('Error fetching team members:', teamError);
      setPartners([]);
      setLoading(false);
      return;
    }

    // Aggregate by org_id and count unique projects
    const orgMap = new Map<string, PartnerOrg>();

    teamMembers?.forEach((member) => {
      const org = member.organizations as unknown as { id: string; org_code: string; name: string; type: string };
      if (!org) return;

      if (orgMap.has(org.id)) {
        const existing = orgMap.get(org.id)!;
        // Check if this project is already counted
        existing.project_count = existing.project_count;
        // We need to track unique projects - use a Set approach
      } else {
        orgMap.set(org.id, {
          org_id: org.id,
          org_code: org.org_code,
          name: org.name,
          type: org.type,
          project_count: 0,
        });
      }
    });

    // Count unique projects per org
    const projectsByOrg = new Map<string, Set<string>>();
    teamMembers?.forEach((member) => {
      const org = member.organizations as unknown as { id: string };
      if (!org) return;
      
      if (!projectsByOrg.has(org.id)) {
        projectsByOrg.set(org.id, new Set());
      }
      projectsByOrg.get(org.id)!.add(member.project_id);
    });

    // Update counts
    projectsByOrg.forEach((projects, orgId) => {
      const partner = orgMap.get(orgId);
      if (partner) {
        partner.project_count = projects.size;
      }
    });

    setPartners(Array.from(orgMap.values()));
    setLoading(false);
  };

  // Filter partners by search query
  const filteredPartners = useMemo(() => {
    if (!searchQuery.trim()) return partners;
    const query = searchQuery.toLowerCase();
    return partners.filter(
      (p) =>
        p.name.toLowerCase().includes(query) ||
        p.org_code.toLowerCase().includes(query)
    );
  }, [partners, searchQuery]);

  // Group partners by type
  const groupedPartners = useMemo(() => {
    const groups: Record<string, PartnerOrg[]> = {};
    
    ORG_TYPE_ORDER.forEach((type) => {
      groups[type] = filteredPartners
        .filter((p) => p.type === type)
        .sort((a, b) => b.project_count - a.project_count);
    });

    return groups;
  }, [filteredPartners]);

  if (!user) {
    return (
      <AppLayout title="Partner Directory">
        <div className="p-4 sm:p-6">
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-muted-foreground">Please sign in to access the Partner Directory.</p>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Partner Directory" subtitle="Everyone you've worked with on projects">
      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Filter by name or org code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {loading ? (
          <div className="space-y-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="h-6 w-40" />
                <div className="space-y-2">
                  {[1, 2].map((j) => (
                    <Skeleton key={j} className="h-16 w-full" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : partners.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Building2 className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
              <p className="text-muted-foreground">No project collaborators yet.</p>
              <p className="text-sm text-muted-foreground mt-1">
                Partners will appear here once you work together on projects.
              </p>
            </CardContent>
          </Card>
        ) : filteredPartners.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Search className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
              <p className="text-muted-foreground">No partners match your search.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {ORG_TYPE_ORDER.map((type) => {
              const typePartners = groupedPartners[type];
              if (!typePartners || typePartners.length === 0) return null;

              const config = ORG_TYPE_CONFIG[type];
              const Icon = config.icon;

              return (
                <Card key={type}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Icon className={`h-4 w-4 ${config.color}`} />
                      {config.label}
                      <Badge variant="secondary" className="ml-auto">
                        {typePartners.length}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-2">
                      {typePartners.map((partner) => (
                        <div
                          key={partner.org_id}
                          className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`flex h-9 w-9 items-center justify-center rounded-full bg-muted shrink-0`}>
                              <Icon className={`h-4 w-4 ${config.color}`} />
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-sm truncate">{partner.name}</p>
                              <Badge variant="outline" className="text-xs font-mono">
                                {partner.org_code}
                              </Badge>
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground whitespace-nowrap ml-3">
                            {partner.project_count} project{partner.project_count !== 1 ? 's' : ''} together
                          </p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
