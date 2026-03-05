import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlatformLayout } from '@/components/platform/PlatformLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Search, Plus, MapPin } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { ORG_TYPE_LABELS, type OrgType } from '@/types/organization';
import { US_STATES } from '@/types/projectWizard';
import { format } from 'date-fns';
import { toast } from '@/hooks/use-toast';

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

  // Create dialog state
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [orgName, setOrgName] = useState('');
  const [orgType, setOrgType] = useState<OrgType>('GC');
  const [orgPhone, setOrgPhone] = useState('');
  const [orgStreet, setOrgStreet] = useState('');
  const [orgCity, setOrgCity] = useState('');
  const [orgState, setOrgState] = useState('');
  const [orgZip, setOrgZip] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [reason, setReason] = useState('');

  async function fetchOrgs() {
    const { data } = await supabase
      .from('organizations')
      .select('id, name, type, created_at, updated_at, user_org_roles(count)')
      .order('created_at', { ascending: false });
    setOrgs((data || []) as unknown as OrgRow[]);
    setLoading(false);
  }

  useEffect(() => { fetchOrgs(); }, []);

  const filtered = filter
    ? orgs.filter((o) => o.name.toLowerCase().includes(filter.toLowerCase()))
    : orgs;

  async function handleCreate() {
    if (!orgName.trim() || !reason.trim()) return;
    setCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke('platform-support-action', {
        body: {
          action_type: 'CREATE_ORGANIZATION',
          reason,
          org_name: orgName.trim(),
          org_type: orgType,
          org_phone: orgPhone.trim() || undefined,
          org_address: orgStreet.trim() ? {
            street: orgStreet.trim(),
            city: orgCity.trim(),
            state: orgState,
            zip: orgZip.trim(),
          } : undefined,
          admin_email: adminEmail.trim() || undefined,
        },
      });

      if (error || data?.error) {
        toast({ title: 'Failed', description: data?.error || error?.message, variant: 'destructive' });
        return;
      }

      toast({ title: 'Organization created', description: data?.message });
      setShowCreate(false);
      resetForm();
      await fetchOrgs();
      if (data?.org_id) {
        navigate(`/platform/orgs/${data.org_id}`);
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  }

  function resetForm() {
    setOrgName('');
    setOrgType('GC');
    setOrgPhone('');
    setOrgStreet('');
    setOrgCity('');
    setOrgState('');
    setOrgZip('');
    setAdminEmail('');
    setReason('');
  }

  return (
    <PlatformLayout
      title="Organizations"
      breadcrumbs={[{ label: 'Platform', href: '/platform' }, { label: 'Organizations' }]}
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
        <Button onClick={() => setShowCreate(true)} size="sm">
          <Plus className="h-4 w-4 mr-1" /> Create Organization
        </Button>
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

      {/* Create Organization Dialog */}
      <Dialog open={showCreate} onOpenChange={(o) => { if (!o) resetForm(); setShowCreate(o); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Organization</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Organization Name *</Label>
              <Input value={orgName} onChange={(e) => setOrgName(e.target.value)} placeholder="Acme Construction" />
            </div>
            <div className="space-y-2">
              <Label>Type *</Label>
              <Select value={orgType} onValueChange={(v) => setOrgType(v as OrgType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.entries(ORG_TYPE_LABELS) as [OrgType, string][]).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input value={orgPhone} onChange={(e) => setOrgPhone(e.target.value)} placeholder="(555) 123-4567" />
            </div>
            <div className="space-y-2">
              <Label>Address</Label>
              <div className="relative mt-1">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input value={orgStreet} onChange={(e) => setOrgStreet(e.target.value)} placeholder="123 Main St" className="pl-10" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label>City</Label>
                <Input value={orgCity} onChange={(e) => setOrgCity(e.target.value)} placeholder="Denver" />
              </div>
              <div className="space-y-1">
                <Label>State</Label>
                <Select value={orgState} onValueChange={setOrgState}>
                  <SelectTrigger><SelectValue placeholder="CO" /></SelectTrigger>
                  <SelectContent>
                    {US_STATES.map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>ZIP</Label>
                <Input value={orgZip} onChange={(e) => setOrgZip(e.target.value)} placeholder="80202" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Initial Admin Email</Label>
              <Input value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} placeholder="admin@acme.com" type="email" />
              <p className="text-xs text-muted-foreground">If provided, this user will be added as admin. They must already have an account.</p>
            </div>
            <div className="space-y-2">
              <Label>Reason (audit log) *</Label>
              <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Customer onboarding request..." rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { resetForm(); setShowCreate(false); }}>Cancel</Button>
            <Button onClick={handleCreate} disabled={creating || !orgName.trim() || !reason.trim()}>
              {creating ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PlatformLayout>
  );
}
