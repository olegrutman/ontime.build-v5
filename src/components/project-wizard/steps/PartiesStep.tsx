import { useState } from 'react';
import { Search, Plus, Trash2, Building, Truck, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ProjectWizardData, PartyInvite } from '@/types/project';

interface PartiesStepProps {
  data: ProjectWizardData;
  onChange: (data: Partial<ProjectWizardData>) => void;
}

export function PartiesStep({ data, onChange }: PartiesStepProps) {
  const [orgCode, setOrgCode] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<{ id: string; name: string; type: string } | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

  const searchOrg = async () => {
    if (!orgCode.trim()) return;
    
    setSearching(true);
    setSearchError(null);
    setSearchResult(null);

    const { data: org, error } = await supabase
      .from('organizations')
      .select('id, name, type')
      .eq('org_code', orgCode.toUpperCase().trim())
      .maybeSingle();

    setSearching(false);

    if (error || !org) {
      setSearchError('Organization not found. Please check the code and try again.');
      return;
    }

    if (org.type === 'GC') {
      setSearchError('Cannot invite a General Contractor as a party.');
      return;
    }

    // Check if already added
    if (data.parties.some((p) => p.org_id === org.id)) {
      setSearchError('This organization is already added to the project.');
      return;
    }

    setSearchResult(org);
  };

  const addParty = (role: 'TC' | 'SUPPLIER') => {
    if (!searchResult) return;

    const party: PartyInvite = {
      org_code: orgCode.toUpperCase().trim(),
      org_name: searchResult.name,
      org_id: searchResult.id,
      role,
      material_responsibility: role === 'TC' ? 'TC' : undefined,
      po_approval_required: role === 'SUPPLIER' ? true : undefined,
    };

    onChange({ parties: [...data.parties, party] });
    setOrgCode('');
    setSearchResult(null);
  };

  const removeParty = (orgId: string) => {
    onChange({ parties: data.parties.filter((p) => p.org_id !== orgId) });
  };

  const updateParty = (orgId: string, updates: Partial<PartyInvite>) => {
    onChange({
      parties: data.parties.map((p) =>
        p.org_id === orgId ? { ...p, ...updates } : p
      ),
    });
  };

  const tcParties = data.parties.filter((p) => p.role === 'TC');
  const supplierParties = data.parties.filter((p) => p.role === 'SUPPLIER');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Project Parties</h2>
        <p className="text-sm text-muted-foreground">
          Invite Trade Contractors and Suppliers by their organization code.
        </p>
      </div>

      {/* Search by org_code */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <Label>Search Organization by Code</Label>
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
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div>
                <p className="font-medium">{searchResult.name}</p>
                <p className="text-sm text-muted-foreground">
                  {searchResult.type === 'TC' ? 'Trade Contractor' : 'Supplier'}
                </p>
              </div>
              <div className="flex gap-2">
                {searchResult.type === 'TC' && (
                  <Button size="sm" onClick={() => addParty('TC')}>
                    <Plus className="mr-1 h-3 w-3" />
                    Add as TC
                  </Button>
                )}
                {searchResult.type === 'SUPPLIER' && (
                  <Button size="sm" onClick={() => addParty('SUPPLIER')}>
                    <Plus className="mr-1 h-3 w-3" />
                    Add as Supplier
                  </Button>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Trade Contractors */}
      {tcParties.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium flex items-center gap-2">
            <Building className="h-4 w-4" />
            Trade Contractors ({tcParties.length})
          </h3>
          {tcParties.map((party) => (
            <Card key={party.org_id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="font-medium">{party.org_name}</p>
                      <Badge variant="outline">{party.org_code}</Badge>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeParty(party.org_id!)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <Label htmlFor={`mat-${party.org_id}`}>Material Responsibility</Label>
                  <div className="flex items-center gap-2">
                    <span className={party.material_responsibility === 'GC' ? 'font-medium' : 'text-muted-foreground'}>
                      GC
                    </span>
                    <Switch
                      id={`mat-${party.org_id}`}
                      checked={party.material_responsibility === 'TC'}
                      onCheckedChange={(checked) =>
                        updateParty(party.org_id!, { material_responsibility: checked ? 'TC' : 'GC' })
                      }
                    />
                    <span className={party.material_responsibility === 'TC' ? 'font-medium' : 'text-muted-foreground'}>
                      TC
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Suppliers */}
      {supplierParties.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium flex items-center gap-2">
            <Truck className="h-4 w-4" />
            Suppliers ({supplierParties.length})
          </h3>
          {supplierParties.map((party) => (
            <Card key={party.org_id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="font-medium">{party.org_name}</p>
                      <Badge variant="outline">{party.org_code}</Badge>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeParty(party.org_id!)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <Label htmlFor={`po-${party.org_id}`}>PO Approval Required</Label>
                  <Switch
                    id={`po-${party.org_id}`}
                    checked={party.po_approval_required}
                    onCheckedChange={(checked) =>
                      updateParty(party.org_id!, { po_approval_required: checked })
                    }
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {data.parties.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          Search and add organizations to invite them to this project.
        </p>
      )}
    </div>
  );
}
