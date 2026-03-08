import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlatformLayout } from '@/components/platform/PlatformLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface UserRow {
  user_id: string;
  email: string;
  full_name: string | null;
  created_at: string;
}

export default function PlatformUsers() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const PAGE_SIZE = 25;

  useEffect(() => { setPage(0); }, [query]);

  useEffect(() => {
    const timer = setTimeout(async () => {
      setLoading(true);
      let request = supabase
        .from('profiles')
        .select('user_id, email, full_name, created_at', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (query.trim().length > 0) {
        const q = `%${query.trim()}%`;
        request = request.or(`email.ilike.${q},full_name.ilike.${q}`);
      }

      const { data, count } = await request;
      setUsers((data || []) as UserRow[]);
      setTotalCount(count || 0);
      setLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [query, page]);

  return (
    <PlatformLayout
      title="Users"
      breadcrumbs={[{ label: 'Platform', href: '/platform' }, { label: 'Users' }]}
    >
      <div className="relative mb-4 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search by email or name..." className="pl-10" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>

      {!loading && totalCount > 0 && (
        <p className="text-sm text-muted-foreground mb-3">
          Showing {page * PAGE_SIZE + 1}&ndash;{Math.min((page + 1) * PAGE_SIZE, totalCount)} of {totalCount} user{totalCount !== 1 ? 's' : ''}
        </p>
      )}

      {/* Desktop table */}
      <Card className="hidden md:block">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={3} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
              ) : users.length === 0 ? (
                <TableRow><TableCell colSpan={3} className="text-center py-8 text-muted-foreground">No users found</TableCell></TableRow>
              ) : (
                users.map((u) => (
                  <TableRow key={u.user_id} className="cursor-pointer hover:bg-accent/50" onClick={() => navigate(`/platform/users/${u.user_id}`)}>
                    <TableCell className="font-medium">{u.full_name || '—'}</TableCell>
                    <TableCell className="text-muted-foreground">{u.email}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{format(new Date(u.created_at), 'MMM d, yyyy')}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Mobile cards */}
      <div className="md:hidden space-y-2">
        {loading ? (
          <p className="text-center py-8 text-muted-foreground">Loading...</p>
        ) : users.length === 0 ? (
          <p className="text-center py-8 text-muted-foreground">No users found</p>
        ) : (
          users.map((u) => (
            <Card key={u.user_id} className="cursor-pointer active:bg-accent/50" onClick={() => navigate(`/platform/users/${u.user_id}`)}>
              <CardContent className="p-4">
                <p className="font-medium text-sm truncate">{u.full_name || '—'}</p>
                <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                <p className="text-xs text-muted-foreground mt-1">{format(new Date(u.created_at), 'MMM d, yyyy')}</p>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {totalCount > PAGE_SIZE && (
        <div className="flex items-center justify-between mt-4">
          <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
            <ChevronLeft className="h-4 w-4 mr-1" /> Previous
          </Button>
          <span className="text-sm text-muted-foreground">Page {page + 1} of {Math.ceil(totalCount / PAGE_SIZE)}</span>
          <Button variant="outline" size="sm" disabled={(page + 1) * PAGE_SIZE >= totalCount} onClick={() => setPage((p) => p + 1)}>
            Next <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}
    </PlatformLayout>
  );
}
