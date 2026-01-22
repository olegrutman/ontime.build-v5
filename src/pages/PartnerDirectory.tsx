import { useState, useEffect } from 'react';
import { Search, Plus, Trash2, Building, Check, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { AppLayout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

interface TrustedPartner {
  id: string;
  partner_org_id: string;
  notes: string | null;
  created_at: string;
  organization: {
    id: string;
    org_code: string;
    name: string;
    type: string;
  };
}

export default function PartnerDirectory() {
  const { user, userOrgRoles } = useAuth();
  const [orgCode, setOrgCode] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<{
    id: string;
    org_code: string;
    name: string;
    type: string;
  } | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [partners, setPartners] = useState<TrustedPartner[]>([]);
  const [loading, setLoading] = useState(true);

  const currentOrg = userOrgRoles[0]?.organization;

  useEffect(() => {
    fetchPartners();
  }, [userOrgRoles]);

  const fetchPartners = async () => {
    if (!currentOrg?.id) return;

    const { data, error } = await supabase
      .from('trusted_partners')
      .select(`
        id,
        partner_org_id,
        notes,
        created_at,
        organization:partner_org_id (id, org_code, name, type)
      `)
      .eq('organization_id', currentOrg.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching partners:', error);
    } else {
      setPartners((data || []) as unknown as TrustedPartner[]);
    }
    setLoading(false);
  };

  const searchOrg = async () => {
    if (!orgCode.trim()) return;

    setSearching(true);
    setSearchError(null);
    setSearchResult(null);

    const { data: org, error } = await supabase
      .from('organizations')
      .select('id, org_code, name, type')
      .eq('org_code', orgCode.toUpperCase().trim())
      .maybeSingle();

    setSearching(false);

    if (error || !org) {
      setSearchError('Organization not found. Please check the code and try again.');
      return;
    }

    // Check if it's their own org
    if (org.id === currentOrg?.id) {
      setSearchError('You cannot add your own organization as a partner.');
      return;
    }

    // Check if already a partner
    if (partners.some((p) => p.partner_org_id === org.id)) {
      setSearchError('This organization is already in your trusted partners list.');
      return;
    }

    setSearchResult(org);
  };

  const addPartner = async () => {
    if (!searchResult || !currentOrg?.id) return;

    const { error } = await supabase.from('trusted_partners').insert({
      organization_id: currentOrg.id,
      partner_org_id: searchResult.id,
    });

    if (error) {
      toast.error('Failed to add partner');
      console.error(error);
      return;
    }

    toast.success(`${searchResult.name} added to trusted partners`);
    setOrgCode('');
    setSearchResult(null);
    fetchPartners();
  };

  const removePartner = async (partnerId: string, partnerName: string) => {
    const { error } = await supabase
      .from('trusted_partners')
      .delete()
      .eq('id', partnerId);

    if (error) {
      toast.error('Failed to remove partner');
      console.error(error);
      return;
    }

    toast.success(`${partnerName} removed from trusted partners`);
    fetchPartners();
  };

  const getOrgTypeLabel = (type: string) => {
    switch (type) {
      case 'GC':
        return 'General Contractor';
      case 'TC':
        return 'Trade Contractor';
      case 'SUPPLIER':
        return 'Supplier';
      default:
        return type;
    }
  };

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
    <AppLayout title="Partner Directory" subtitle="Look up organizations by their code">
      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
        {/* Search Card */}
        <Card>
          <CardHeader className="pb-2 sm:pb-4">
            <CardTitle className="text-base">Look Up Organization</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                placeholder="Enter org code (e.g., ABC123)"
                value={orgCode}
                onChange={(e) => setOrgCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === 'Enter' && searchOrg()}
                className="flex-1"
              />
              <Button onClick={searchOrg} disabled={searching || !orgCode.trim()} className="shrink-0">
                <Search className="mr-2 h-4 w-4" />
                {searching ? 'Searching...' : 'Search'}
              </Button>
            </div>

            {searchError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{searchError}</AlertDescription>
              </Alert>
            )}

            {searchResult && (
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 shrink-0">
                    <Building className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium truncate">{searchResult.name}</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline">{searchResult.org_code}</Badge>
                      <span className="text-sm text-muted-foreground">
                        {getOrgTypeLabel(searchResult.type)}
                      </span>
                    </div>
                  </div>
                </div>
                <Button onClick={addPartner} className="w-full sm:w-auto">
                  <Plus className="mr-2 h-4 w-4" />
                  Add to Partners
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Trusted Partners List */}
        <Card>
          <CardHeader className="pb-2 sm:pb-4">
            <CardTitle className="text-base">
              Trusted Partners ({partners.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : partners.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No trusted partners yet. Search for organizations by their code to add them.
              </p>
            ) : (
              <div className="space-y-3">
                {partners.map((partner) => (
                  <div
                    key={partner.id}
                    className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary shrink-0">
                        <Building className="h-5 w-5 text-secondary-foreground" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium truncate">{partner.organization.name}</p>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline">{partner.organization.org_code}</Badge>
                          <span className="text-sm text-muted-foreground">
                            {getOrgTypeLabel(partner.organization.type)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
                      <div className="flex items-center gap-1.5">
                        <Check className="h-4 w-4 text-green-600" />
                        <span className="text-sm text-green-600">Trusted</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          removePartner(partner.id, partner.organization.name)
                        }
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
