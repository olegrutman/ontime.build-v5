import { useState } from 'react';
import { Plus, Trash2, Building, Truck, ArrowRight, HardHat, Mail } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { InviteSearchInput } from '@/components/invite';
import { ProjectWizardData, PartyInvite } from '@/types/project';
import { ORG_TYPE_LABELS, OrgType } from '@/types/organization';

interface PartiesStepProps {
  data: ProjectWizardData;
  onChange: (data: Partial<ProjectWizardData>) => void;
}

interface InviteTarget {
  result_type: 'organization' | 'person' | 'email';
  id: string | null;
  display_name: string;
  organization_name: string | null;
  email: string | null;
  city_state: string | null;
  org_type: OrgType | null;
}

export function PartiesStep({ data, onChange }: PartiesStepProps) {
  const { userOrgRoles } = useAuth();
  const [pendingInvite, setPendingInvite] = useState<InviteTarget | null>(null);
  const [emailInvite, setEmailInvite] = useState({ firstName: '', lastName: '', email: '' });

  // Determine creator's org type
  const creatorOrg = userOrgRoles[0]?.organization;
  const creatorOrgType = creatorOrg?.type as OrgType | undefined;
  const isGCCreator = creatorOrgType === 'GC';
  const isTCCreator = creatorOrgType === 'TC';

  const handleSearchSelect = (target: InviteTarget) => {
    if (target.result_type === 'email') {
      // Show email invite form
      setEmailInvite({ firstName: '', lastName: '', email: target.email || '' });
      setPendingInvite(target);
    } else if (target.result_type === 'organization' && target.id) {
      // Check if already added
      if (data.parties.some((p) => p.org_id === target.id)) {
        return; // Already added
      }
      
      // Validate based on creator type
      if (isGCCreator && target.org_type === 'GC') return;
      if (isTCCreator && target.org_type === 'TC') return;

      setPendingInvite(target);
    } else if (target.result_type === 'person') {
      // For person, we'd need to get their org - for now just show as pending
      setPendingInvite(target);
    }
  };

  const addParty = (role: 'GC' | 'TC' | 'FC' | 'SUPPLIER') => {
    if (!pendingInvite) return;

    if (pendingInvite.result_type === 'email') {
      // Email invite - store with email info
      const party: PartyInvite = {
        org_code: '',
        org_name: `${emailInvite.firstName} ${emailInvite.lastName}`,
        org_id: undefined,
        role,
        invitee_email: emailInvite.email,
        invitee_first_name: emailInvite.firstName,
        invitee_last_name: emailInvite.lastName,
        material_responsibility: role === 'TC' ? 'TC' : undefined,
        po_approval_required: role === 'SUPPLIER' ? true : undefined,
      };
      onChange({ parties: [...data.parties, party] });
    } else if (pendingInvite.id) {
      const party: PartyInvite = {
        org_code: '',
        org_name: pendingInvite.display_name,
        org_id: pendingInvite.id,
        role,
        material_responsibility: role === 'TC' ? 'TC' : undefined,
        po_approval_required: role === 'SUPPLIER' ? true : undefined,
      };
      onChange({ parties: [...data.parties, party] });
    }

    setPendingInvite(null);
    setEmailInvite({ firstName: '', lastName: '', email: '' });
  };

  const removeParty = (index: number) => {
    onChange({ parties: data.parties.filter((_, i) => i !== index) });
  };

  const updateParty = (index: number, updates: Partial<PartyInvite>) => {
    onChange({
      parties: data.parties.map((p, i) => (i === index ? { ...p, ...updates } : p)),
    });
  };

  // Group parties by role
  const gcParties = data.parties.map((p, i) => ({ ...p, index: i })).filter((p) => p.role === 'GC');
  const tcParties = data.parties.map((p, i) => ({ ...p, index: i })).filter((p) => p.role === 'TC');
  const fcParties = data.parties.map((p, i) => ({ ...p, index: i })).filter((p) => p.role === 'FC');
  const supplierParties = data.parties.map((p, i) => ({ ...p, index: i })).filter((p) => p.role === 'SUPPLIER');

  // Determine what roles can be added based on pending invite
  const getAvailableRoles = (): ('GC' | 'TC' | 'FC' | 'SUPPLIER')[] => {
    if (!pendingInvite) return [];

    if (pendingInvite.result_type === 'email') {
      // Email invites can be any role based on creator
      if (isGCCreator) return ['TC', 'FC', 'SUPPLIER'];
      if (isTCCreator) return ['GC', 'FC', 'SUPPLIER'];
      return ['TC', 'FC', 'SUPPLIER'];
    }

    const orgType = pendingInvite.org_type;
    if (orgType === 'GC') return ['GC'];
    if (orgType === 'TC') return ['TC'];
    if (orgType === 'FC') return ['FC'];
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
            ? 'Invite Trade Contractors, Finishing Contractors, and Suppliers by name or email.'
            : isTCCreator
            ? 'Invite your upstream GC, downstream FC, and Suppliers by name or email.'
            : 'Invite organizations to this project by name or email.'}
        </p>
      </div>

      {/* Creator info badge */}
      <Alert>
        <Building className="h-4 w-4" />
        <AlertDescription>
          Creating as: <strong>{creatorOrg?.name}</strong> ({ORG_TYPE_LABELS[creatorOrgType || 'GC']})
        </AlertDescription>
      </Alert>

      {/* Search by name or email */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <Label>Invite by name or email</Label>
          <InviteSearchInput
            onSelect={handleSearchSelect}
            placeholder="Type name, organization, or email..."
          />

          {/* Pending invite UI */}
          {pendingInvite && (
            <div className="p-4 bg-muted rounded-lg space-y-4">
              {pendingInvite.result_type === 'email' ? (
                <>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Invite by Email</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="firstName">First Name</Label>
                      <Input
                        id="firstName"
                        value={emailInvite.firstName}
                        onChange={(e) => setEmailInvite((prev) => ({ ...prev, firstName: e.target.value }))}
                        placeholder="John"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input
                        id="lastName"
                        value={emailInvite.lastName}
                        onChange={(e) => setEmailInvite((prev) => ({ ...prev, lastName: e.target.value }))}
                        placeholder="Smith"
                        className="mt-1"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={emailInvite.email}
                      onChange={(e) => setEmailInvite((prev) => ({ ...prev, email: e.target.value }))}
                      placeholder="john@example.com"
                      className="mt-1"
                    />
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-3">
                  <Building className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{pendingInvite.display_name}</p>
                    {pendingInvite.organization_name && pendingInvite.organization_name !== pendingInvite.display_name && (
                      <p className="text-sm text-muted-foreground">{pendingInvite.organization_name}</p>
                    )}
                    {pendingInvite.city_state && pendingInvite.city_state !== ', ' && (
                      <p className="text-xs text-muted-foreground">{pendingInvite.city_state}</p>
                    )}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm text-muted-foreground">Add as:</span>
                {availableRoles.map((role) => (
                  <Button
                    key={role}
                    size="sm"
                    onClick={() => addParty(role)}
                    disabled={pendingInvite.result_type === 'email' && (!emailInvite.firstName || !emailInvite.email)}
                  >
                    <Plus className="mr-1 h-3 w-3" />
                    {ORG_TYPE_LABELS[role]}
                  </Button>
                ))}
                <Button variant="ghost" size="sm" onClick={() => setPendingInvite(null)}>
                  Cancel
                </Button>
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
              {isGCCreator &&
                tcParties.map((tc) => (
                  <span key={tc.index} className="flex items-center gap-1">
                    <Badge variant="outline">GC ({creatorOrg?.name})</Badge>
                    <ArrowRight className="h-3 w-3" />
                    <Badge variant="secondary">TC ({tc.org_name})</Badge>
                  </span>
                ))}
              {isTCCreator &&
                gcParties.map((gc) => (
                  <span key={gc.index} className="flex items-center gap-1">
                    <Badge variant="outline">GC ({gc.org_name})</Badge>
                    <ArrowRight className="h-3 w-3" />
                    <Badge variant="secondary">TC ({creatorOrg?.name})</Badge>
                  </span>
                ))}
              {isTCCreator &&
                fcParties.map((fc) => (
                  <span key={fc.index} className="flex items-center gap-1 ml-4">
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
          onRemove={(index) => removeParty(index)}
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
          onRemove={(index) => removeParty(index)}
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
          onRemove={(index) => removeParty(index)}
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
            <Card key={party.index}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="font-medium">{party.org_name}</p>
                      {party.invitee_email && (
                        <Badge variant="outline" className="text-xs">
                          <Mail className="h-3 w-3 mr-1" />
                          {party.invitee_email}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => removeParty(party.index)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <Label htmlFor={`po-${party.index}`}>PO Requires Upstream Approval</Label>
                  <Switch
                    id={`po-${party.index}`}
                    checked={party.po_approval_required}
                    onCheckedChange={(checked) => updateParty(party.index, { po_approval_required: checked })}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {data.parties.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          Search and add organizations or invite by email to include them in this project.
        </p>
      )}
    </div>
  );
}

// Helper component for party sections
interface PartySectionProps {
  title: string;
  icon: React.ElementType;
  parties: (PartyInvite & { index: number })[];
  onRemove: (index: number) => void;
  onUpdate: (index: number, updates: Partial<PartyInvite>) => void;
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
        <Card key={party.index}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div>
                  <p className="font-medium">{party.org_name}</p>
                  {party.invitee_email && (
                    <Badge variant="outline" className="text-xs">
                      <Mail className="h-3 w-3 mr-1" />
                      {party.invitee_email}
                    </Badge>
                  )}
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => onRemove(party.index)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
            {showMaterialResponsibility && (
              <div className="flex items-center justify-between text-sm">
                <Label htmlFor={`mat-${party.index}`}>Material Responsibility</Label>
                <div className="flex items-center gap-2">
                  <span className={party.material_responsibility === 'GC' ? 'font-medium' : 'text-muted-foreground'}>GC</span>
                  <Switch
                    id={`mat-${party.index}`}
                    checked={party.material_responsibility === 'TC'}
                    onCheckedChange={(checked) => onUpdate(party.index, { material_responsibility: checked ? 'TC' : 'GC' })}
                  />
                  <span className={party.material_responsibility === 'TC' ? 'font-medium' : 'text-muted-foreground'}>TC</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
