import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlatformLayout } from '@/components/platform/PlatformLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { ORG_TYPE_LABELS, type OrgType } from '@/types/organization';
import { format } from 'date-fns';

interface OrgRow {
  id: string;
  name: string;
  type: OrgType;
  created_at: string;
  updated_at: string;
  user_org_roles: { count: number }[];
}

export default function PlatformOrgs() {
  const navigate = useNavigate();
  const [orgs, setOrgs] = useState<OrgRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    async function fetch() {
      const { data } = await supabase
        .from('organizations')
        .select('id, name, type, created_at, updated_at, user_org_roles(count)')
        .order('created_at', { ascending: false });
      setOrgs((data || []) as unknown as OrgRow[]);
      setLoading(false);
    }
    fetch();
  }, []);

  const filtered = filter
    ? orgs.filter((o) => o.name.toLowerCase().includes(filter.toLowerCase()))
    : orgs;

  return (
    <PlatformLayout
      title="Organizations"
      breadcrumbs={[{ label: 'Platform', href: '/platform' }, { label: 'Organizations' }]}
    >
      <div className="relative mb-4 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Filter by name..."
          className="pl-10"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Members</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Loading...</TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No organizations found</TableCell>
                </TableRow>
              ) : (
                filtered.map((org) => (
                  <TableRow
                    key={org.id}
                    className="cursor-pointer hover:bg-accent/50"
                    onClick={() => navigate(`/platform/orgs/${org.id}`)}
                  >
                    <TableCell className="font-medium">{org.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {ORG_TYPE_LABELS[org.type] || org.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {org.user_org_roles?.[0]?.count ?? 0}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {format(new Date(org.created_at), 'MMM d, yyyy')}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </PlatformLayout>
  );
}
