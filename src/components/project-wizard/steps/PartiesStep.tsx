import { useState } from 'react';
import { Search, Plus, Trash2, Building, Truck, AlertCircle, ArrowRight, HardHat } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ProjectWizardData, PartyInvite } from '@/types/project';
import { ORG_TYPE_LABELS, OrgType } from '@/types/organization';

interface PartiesStepProps {
  data: ProjectWizardData;
  onChange: (data: Partial<ProjectWizardData>) => void;
}

const ROLE_ICONS: Record<string, React.ElementType> = {
  GC: Building,
  TC: HardHat,
  FC: HardHat,
  SUPPLIER: Truck,
};

export function PartiesStep({ data, onChange }: PartiesStepProps) {
  const { userOrgRoles } = useAuth();
  const [orgCode, setOrgCode] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<{ id: string; name: string; type: OrgType } | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Determine creator's org type
  const creatorOrg = userOrgRoles[0]?.organization;
  const creatorOrgType = creatorOrg?.type as OrgType | undefined;
  const isGCCreator = creatorOrgType === 'GC';
  const isTCCreator = creatorOrgType === 'TC';

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

    // Validate based on creator type
    if (isGCCreator && org.type === 'GC') {
      setSearchError('Cannot invite another GC to a GC-created project.');
      return;
    }

    if (isTCCreator && org.type === 'TC') {
      setSearchError('Cannot invite another TC to a TC-created project.');
      return;
    }

    // Check if already added
    if (data.parties.some((p) => p.org_id === org.id)) {
      setSearchError('This organization is already added to the project.');
      return;
    }

    setSearchResult(org as { id: string; name: string; type: OrgType });
  };

  const addParty = (role: 'GC' | 'TC' | 'FC' | 'SUPPLIER') => {
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

  // Group parties by role
  const gcParties = data.parties.filter((p) => p.role === 'GC');
  const tcParties = data.parties.filter((p) => p.role === 'TC');
  const fcParties = data.parties.filter((p) => p.role === 'FC');
  const supplierParties = data.parties.filter((p) => p.role === 'SUPPLIER');

  // Determine what roles can be added based on search result
  const getAvailableRoles = (): ('GC' | 'TC' | 'FC' | 'SUPPLIER')[] => {
    if (!searchResult) return [];
    
    const orgType = searchResult.type;
    
    // GC orgs can only be added as GC (for TC-created projects)
    if (orgType === 'GC') return ['GC'];
    
    // TC orgs can be added as TC
    if (orgType === 'TC') return ['TC'];
    
    // FC orgs can be added as FC
    if (orgType === 'FC') return ['FC'];
    
    // Supplier orgs as SUPPLIER
    if (orgType === 'SUPPLIER') return ['SUPPLIER'];
    
    return [];
  };

  const availableRoles = getAvailableRoles();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Project Parties & Relationships</h2>
        <p className="text-sm text-muted-foreground">
          {isGCCreator 
            ? 'You are creating this project as a General Contractor. Invite Trade Contractors, Finishing Contractors, and Suppliers.'
            : isTCCreator
            ? 'You are creating this project as a Trade Contractor. Invite your upstream GC, downstream FC, and Suppliers.'
            : 'Invite organizations to this project.'}
        </p>
      </div>

      {/* Creator info badge */}
      <Alert>
        <Building className="h-4 w-4" />
        <AlertDescription>
          Creating as: <strong>{creatorOrg?.name}</strong> ({ORG_TYPE_LABELS[creatorOrgType || 'GC']})
        </AlertDescription>
      </Alert>

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
                  {ORG_TYPE_LABELS[searchResult.type]}
                </p>
              </div>
              <div className="flex gap-2">
                {availableRoles.map((role) => (
                  <Button key={role} size="sm" onClick={() => addParty(role)}>
                    <Plus className="mr-1 h-3 w-3" />
                    Add as {role}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Relationship diagram hint */}
      {(tcParties.length > 0 || gcParties.length > 0 || fcParties.length > 0) && (
        <Card className="bg-muted/50">
          <CardContent className="p-4">
            <p className="text-sm font-medium mb-2">Relationships will be created:</p>
            <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
              {isGCCreator && tcParties.map((tc) => (
                <span key={tc.org_id} className="flex items-center gap-1">
                  <Badge variant="outline">GC ({creatorOrg?.name})</Badge>
                  <ArrowRight className="h-3 w-3" />
                  <Badge variant="secondary">TC ({tc.org_name})</Badge>
                </span>
              ))}
              {isTCCreator && gcParties.map((gc) => (
                <span key={gc.org_id} className="flex items-center gap-1">
                  <Badge variant="outline">GC ({gc.org_name})</Badge>
                  <ArrowRight className="h-3 w-3" />
                  <Badge variant="secondary">TC ({creatorOrg?.name})</Badge>
                </span>
              ))}
              {isTCCreator && fcParties.map((fc) => (
                <span key={fc.org_id} className="flex items-center gap-1 ml-4">
                  <Badge variant="secondary">TC ({creatorOrg?.name})</Badge>
                  <ArrowRight className="h-3 w-3" />
                  <Badge variant="outline">FC ({fc.org_name})</Badge>
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* GC Parties (for TC-created projects) */}
      {isTCCreator && gcParties.length > 0 && (
        <PartySection
          title="General Contractor (Upstream)"
          icon={Building}
          parties={gcParties}
          onRemove={removeParty}
          onUpdate={updateParty}
          showMaterialResponsibility={false}
        />
      )}

      {/* Trade Contractors */}
      {tcParties.length > 0 && (
        <PartySection
          title="Trade Contractors"
          icon={HardHat}
          parties={tcParties}
          onRemove={removeParty}
          onUpdate={updateParty}
          showMaterialResponsibility={true}
        />
      )}

      {/* Finishing Contractors (for TC-created projects) */}
      {isTCCreator && fcParties.length > 0 && (
        <PartySection
          title="Finishing Contractors (Downstream)"
          icon={HardHat}
          parties={fcParties}
          onRemove={removeParty}
          onUpdate={updateParty}
          showMaterialResponsibility={false}
        />
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
                  <Label htmlFor={`po-${party.org_id}`}>PO Requires Upstream Approval</Label>
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

// Helper component for party sections
interface PartySectionProps {
  title: string;
  icon: React.ElementType;
  parties: PartyInvite[];
  onRemove: (orgId: string) => void;
  onUpdate: (orgId: string, updates: Partial<PartyInvite>) => void;
  showMaterialResponsibility: boolean;
}

function PartySection({ title, icon: Icon, parties, onRemove, onUpdate, showMaterialResponsibility }: PartySectionProps) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium flex items-center gap-2">
        <Icon className="h-4 w-4" />
        {title} ({parties.length})
      </h3>
      {parties.map((party) => (
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
                onClick={() => onRemove(party.org_id!)}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
            {showMaterialResponsibility && (
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
                      onUpdate(party.org_id!, { material_responsibility: checked ? 'TC' : 'GC' })
                    }
                  />
                  <span className={party.material_responsibility === 'TC' ? 'font-medium' : 'text-muted-foreground'}>
                    TC
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
