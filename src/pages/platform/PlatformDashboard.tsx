import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlatformLayout } from '@/components/platform/PlatformLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Building2, Users, FolderKanban, ScrollText, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { usePlatformSearch } from '@/hooks/usePlatformSearch';
import { usePlatformMetrics } from '@/hooks/usePlatformMetrics';
import { PlatformGrowthChart } from '@/components/platform/PlatformGrowthChart';
import { PlatformPeriodComparison } from '@/components/platform/PlatformPeriodComparison';
import { PlatformBreakdowns } from '@/components/platform/PlatformBreakdowns';
import { Skeleton } from '@/components/ui/skeleton';

export default function PlatformDashboard() {
  const navigate = useNavigate();
  const metrics = usePlatformMetrics();
  const [counts, setCounts] = useState({ orgs: 0, users: 0, projects: 0, logs: 0 });
  const [searchQuery, setSearchQuery] = useState('');
  const { results, searching, search } = usePlatformSearch();

  useEffect(() => {
    async function fetchCounts() {
      const [orgs, users, projects, logs] = await Promise.all([
        supabase.from('organizations').select('id', { count: 'exact', head: true }),
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('projects').select('id', { count: 'exact', head: true }),
        supabase.from('support_actions_log').select('id', { count: 'exact', head: true }),
      ]);
      setCounts({
        orgs: orgs.count || 0,
        users: users.count || 0,
        projects: projects.count || 0,
        logs: logs.count || 0,
      });
    }
    fetchCounts();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => search(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const tiles = [
    { label: 'Organizations', count: counts.orgs, icon: Building2, href: '/platform/orgs' },
    { label: 'Users', count: counts.users, icon: Users, href: '/platform/users' },
    { label: 'Projects', count: counts.projects, icon: FolderKanban, href: '/platform/projects' },
    { label: 'Support Logs', count: counts.logs, icon: ScrollText, href: '/platform/logs' },
  ];

  const hasResults = results.organizations.length > 0 || results.users.length > 0 || results.projects.length > 0;

  return (
    <PlatformLayout title="Platform Dashboard">
      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search organizations, users, projects..."
          className="pl-10"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        {searchQuery.length >= 2 && hasResults && (
          <Card className="absolute z-50 top-12 left-0 right-0 max-h-80 overflow-y-auto">
            <CardContent className="p-2 space-y-1">
              {results.organizations.map((org) => (
                <button
                  key={org.id}
                  onClick={() => navigate(`/platform/orgs/${org.id}`)}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-md hover:bg-accent text-sm text-left"
                >
                  <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="truncate">{org.name}</span>
                  <span className="text-xs text-muted-foreground ml-auto">{org.type}</span>
                </button>
              ))}
              {results.users.map((u) => (
                <button
                  key={u.user_id}
                  onClick={() => navigate(`/platform/users/${u.user_id}`)}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-md hover:bg-accent text-sm text-left"
                >
                  <Users className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="truncate">{u.full_name || u.email}</span>
                  <span className="text-xs text-muted-foreground ml-auto">{u.email}</span>
                </button>
              ))}
              {results.projects.map((p) => (
                <button
                  key={p.id}
                  onClick={() => navigate(`/platform/projects/${p.id}`)}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-md hover:bg-accent text-sm text-left"
                >
                  <FolderKanban className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="truncate">{p.name}</span>
                  <span className="text-xs text-muted-foreground ml-auto">{p.status}</span>
                </button>
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {tiles.map((tile) => (
          <Card
            key={tile.label}
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => navigate(tile.href)}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{tile.label}</CardTitle>
              <tile.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{tile.count.toLocaleString()}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Growth Metrics */}
      {metrics.loading ? (
        <div className="space-y-4 mt-6">
          <Skeleton className="h-72 w-full rounded-2xl" />
          <div className="grid grid-cols-5 gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-2xl" />
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-6 mt-6">
          <PlatformPeriodComparison comparisons={metrics.periodComparisons} />
          <PlatformGrowthChart data={metrics.monthlyTrends} />
          <PlatformBreakdowns
            orgsByType={metrics.orgsByType}
            projectsByStatus={metrics.projectsByStatus}
            invoicesByStatus={metrics.invoicesByStatus}
            recentLogs={metrics.recentLogs}
          />
        </div>
      )}
    </PlatformLayout>
  );
}
