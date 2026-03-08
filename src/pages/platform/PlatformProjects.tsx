import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlatformLayout } from '@/components/platform/PlatformLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface ProjectRow {
  id: string;
  name: string;
  status: string;
  address: any;
  created_at: string;
  owner_org_name: string | null;
  wo_count: number;
  po_count: number;
  inv_count: number;
}

const STATUSES = ['all', 'setup', 'active', 'on_hold', 'completed', 'archived'];
const PAGE_SIZE = 25;

export default function PlatformProjects() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  async function fetchProjects() {
    setLoading(true);

    // Build query for count
    let countQuery = supabase.from('projects').select('id', { count: 'exact', head: true });
    if (filter) countQuery = countQuery.ilike('name', `%${filter}%`);
    if (statusFilter !== 'all') countQuery = countQuery.eq('status', statusFilter);
    const { count } = await countQuery;
    setTotalCount(count || 0);

    // Build data query
    let query = supabase
      .from('projects')
      .select('id, name, status, address, created_at')
      .order('created_at', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (filter) query = query.ilike('name', `%${filter}%`);
    if (statusFilter !== 'all') query = query.eq('status', statusFilter);

    const { data: projData } = await query;
    const rows = (projData || []) as any[];

    // Get owner org for each project via project_team where role = 'GC' or first team entry
    const projectIds = rows.map((r) => r.id);
    let ownerMap = new Map<string, string>();
    let countMaps = { wo: new Map<string, number>(), po: new Map<string, number>(), inv: new Map<string, number>() };

    if (projectIds.length > 0) {
      // Get owner orgs (GC role in project_team)
      const { data: teamData } = await supabase
        .from('project_team')
        .select('project_id, role, organization:organizations(name)')
        .in('project_id', projectIds)
        .eq('role', 'GC');

      (teamData || []).forEach((t: any) => {
        if (!ownerMap.has(t.project_id)) {
          ownerMap.set(t.project_id, t.organization?.name || '—');
        }
      });

      // Get counts in parallel
      const [woRes, poRes, invRes] = await Promise.all([
        supabase.from('work_items').select('project_id').in('project_id', projectIds),
        supabase.from('purchase_orders').select('project_id').in('project_id', projectIds),
        supabase.from('invoices').select('project_id').in('project_id', projectIds),
      ]);

      (woRes.data || []).forEach((r: any) => countMaps.wo.set(r.project_id, (countMaps.wo.get(r.project_id) || 0) + 1));
      (poRes.data || []).forEach((r: any) => countMaps.po.set(r.project_id, (countMaps.po.get(r.project_id) || 0) + 1));
      (invRes.data || []).forEach((r: any) => countMaps.inv.set(r.project_id, (countMaps.inv.get(r.project_id) || 0) + 1));
    }

    setProjects(
      rows.map((r) => ({
        id: r.id,
        name: r.name,
        status: r.status,
        address: r.address,
        created_at: r.created_at,
        owner_org_name: ownerMap.get(r.id) || null,
        wo_count: countMaps.wo.get(r.id) || 0,
        po_count: countMaps.po.get(r.id) || 0,
        inv_count: countMaps.inv.get(r.id) || 0,
      }))
    );
    setLoading(false);
  }

  useEffect(() => {
    fetchProjects();
  }, [page, statusFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(0);
      fetchProjects();
    }, 300);
    return () => clearTimeout(timer);
  }, [filter]);

  const cityState = (addr: any) => {
    if (!addr) return '—';
    const parts = [addr.city, addr.state].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : '—';
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <PlatformLayout
      title="Projects"
      breadcrumbs={[{ label: 'Platform', href: '/platform' }, { label: 'Projects' }]}
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Filter by name..."
            className="pl-10"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(0); }}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s === 'all' ? 'All Statuses' : s.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Owner Org</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Location</TableHead>
                <TableHead className="text-right">WOs</TableHead>
                <TableHead className="text-right">POs</TableHead>
                <TableHead className="text-right">Invoices</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Loading...</TableCell>
                </TableRow>
              ) : projects.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No projects found</TableCell>
                </TableRow>
              ) : (
                projects.map((p) => (
                  <TableRow
                    key={p.id}
                    className="cursor-pointer hover:bg-accent/50"
                    onClick={() => navigate(`/platform/projects/${p.id}`)}
                  >
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{p.owner_org_name || '—'}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs capitalize">{p.status}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">{cityState(p.address)}</TableCell>
                    <TableCell className="text-right">{p.wo_count}</TableCell>
                    <TableCell className="text-right">{p.po_count}</TableCell>
                    <TableCell className="text-right">{p.inv_count}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {format(new Date(p.created_at), 'MMM d, yyyy')}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-muted-foreground">
            {totalCount} project{totalCount !== 1 ? 's' : ''} · Page {page + 1} of {totalPages}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </PlatformLayout>
  );
}
