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
  most_recent_project: string | null;
  most_recent_date: string | null;
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

    // Get all orgs from those projects with project info (excluding current org)
    const { data: teamMembers, error: teamError } = await supabase
      .from('project_team')
      .select(`
        org_id,
        project_id,
        projects!inner (
          id,
          name,
          updated_at
        ),
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

    // Build org map and track projects with dates
    const orgMap = new Map<string, PartnerOrg>();
    const projectsByOrg = new Map<string, { 
      projectIds: Set<string>; 
      mostRecent: { name: string; date: string } | null;
    }>();

    teamMembers?.forEach((member) => {
      const org = member.organizations as unknown as { id: string; org_code: string; name: string; type: string };
      const project = member.projects as unknown as { id: string; name: string; updated_at: string };
      if (!org || !project) return;

      // Initialize org entry if needed
      if (!orgMap.has(org.id)) {
        orgMap.set(org.id, {
          org_id: org.id,
          org_code: org.org_code,
          name: org.name,
          type: org.type,
          project_count: 0,
          most_recent_project: null,
          most_recent_date: null,
        });
      }

      // Track projects per org
      if (!projectsByOrg.has(org.id)) {
        projectsByOrg.set(org.id, { projectIds: new Set(), mostRecent: null });
      }

      const entry = projectsByOrg.get(org.id)!;
      entry.projectIds.add(member.project_id);

      // Check if this is the most recent project
      if (!entry.mostRecent || new Date(project.updated_at) > new Date(entry.mostRecent.date)) {
        entry.mostRecent = { name: project.name, date: project.updated_at };
      }
    });

    // Update counts and most recent project info
    projectsByOrg.forEach((data, orgId) => {
      const partner = orgMap.get(orgId);
      if (partner) {
        partner.project_count = data.projectIds.size;
        partner.most_recent_project = data.mostRecent?.name || null;
        partner.most_recent_date = data.mostRecent?.date || null;
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
        p.org_code.toLowerCase().includes(query) ||
        (p.most_recent_project && p.most_recent_project.toLowerCase().includes(query))
    );
  }, [partners, searchQuery]);

  // Group partners by type
  const groupedPartners = useMemo(() => {
    const groups: Record<string, PartnerOrg[]> = {};
    
    ORG_TYPE_ORDER.forEach((type) => {
      groups[type] = filteredPartners
        .filter((p) => p.type === type)
        .sort((a, b) => {
          // Sort by most recent date first
          if (a.most_recent_date && b.most_recent_date) {
            return new Date(b.most_recent_date).getTime() - new Date(a.most_recent_date).getTime();
          }
          if (a.most_recent_date) return -1;
          if (b.most_recent_date) return 1;
          return b.project_count - a.project_count;
        });
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
            placeholder="Filter by name, org code, or project..."
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
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted shrink-0">
                              <Icon className={`h-4 w-4 ${config.color}`} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <p className="font-medium text-sm truncate">{partner.name}</p>
                                <Badge variant="outline" className="text-xs font-mono shrink-0">
                                  {partner.org_code}
                                </Badge>
                              </div>
                              {partner.most_recent_project && (
                                <p className="text-xs text-muted-foreground truncate">
                                  Last: {partner.most_recent_project}
                                </p>
                              )}
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground whitespace-nowrap ml-3">
                            {partner.project_count} project{partner.project_count !== 1 ? 's' : ''}
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
