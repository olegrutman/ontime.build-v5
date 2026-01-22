import { useState, useEffect } from 'react';
import { Search, Plus, Trash2, Building, Check, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Header } from '@/components/Header';
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
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-6">
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-muted-foreground">Please sign in to access the Partner Directory.</p>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Partner Directory</h1>
          <p className="text-muted-foreground">
            Look up organizations by their code and add them to your trusted partners list.
          </p>
        </div>

        {/* Search Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Look Up Organization</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Enter org code (e.g., ABC123)"
                value={orgCode}
                onChange={(e) => setOrgCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === 'Enter' && searchOrg()}
              />
              <Button onClick={searchOrg} disabled={searching || !orgCode.trim()}>
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
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                    <Building className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{searchResult.name}</p>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{searchResult.org_code}</Badge>
                      <span className="text-sm text-muted-foreground">
                        {getOrgTypeLabel(searchResult.type)}
                      </span>
                    </div>
                  </div>
                </div>
                <Button onClick={addPartner}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add to Partners
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Trusted Partners List */}
        <Card>
          <CardHeader>
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
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary">
                        <Building className="h-5 w-5 text-secondary-foreground" />
                      </div>
                      <div>
                        <p className="font-medium">{partner.organization.name}</p>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{partner.organization.org_code}</Badge>
                          <span className="text-sm text-muted-foreground">
                            {getOrgTypeLabel(partner.organization.type)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-600" />
                      <span className="text-sm text-green-600">Trusted</span>
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
      </main>
    </div>
  );
}
