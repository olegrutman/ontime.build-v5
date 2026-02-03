import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { ChevronLeft, Loader2, Users, FileText, Save, Building2, User, Mail, Trash2, Plus } from 'lucide-react';
import { AppLayout } from '@/components/layout';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { TeamMember, ProjectContract, TEAM_ROLES, TRADES, TeamRole, Trade } from '@/types/projectWizard';

interface ExistingTeamMember {
  id: string;
  role: string;
  trade: string | null;
  trade_custom: string | null;
  invited_email: string | null;
  invited_name: string | null;
  invited_org_name: string | null;
  status: string;
  org_id: string | null;
}

interface ExistingContract {
  id: string;
  from_role: string;
  to_role: string;
  trade: string | null;
  contract_sum: number;
  retainage_percent: number;
  allow_mobilization_line_item: boolean;
  notes: string | null;
  to_project_team_id: string | null;
}

export default function EditProject() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, userOrgRoles, loading: authLoading } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [existingTeam, setExistingTeam] = useState<ExistingTeamMember[]>([]);
  const [existingContracts, setExistingContracts] = useState<ExistingContract[]>([]);
  
  // New member form state
  const [newMember, setNewMember] = useState<Omit<TeamMember, 'id'>>({
    companyName: '',
    contactName: '',
    contactEmail: '',
    role: 'Trade Contractor',
  });
  
  // New member contract values
  const [newContractSum, setNewContractSum] = useState<number>(0);
  const [newRetainagePercent, setNewRetainagePercent] = useState<number>(0);
  const [newAllowMobilization, setNewAllowMobilization] = useState<boolean>(false);
  
  // Contract editing state
  const [editingContracts, setEditingContracts] = useState<Record<string, Partial<ExistingContract>>>({});

  const currentOrg = userOrgRoles[0]?.organization;
  const creatorRole = currentOrg?.type === 'GC' ? 'General Contractor' : 
                      currentOrg?.type === 'TC' ? 'Trade Contractor' : null;

  const defaultTab = searchParams.get('step') || 'team';

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      
      setLoading(true);
      
      // Fetch project
      const { data: project } = await supabase
        .from('projects')
        .select('name')
        .eq('id', id)
        .single();
      
      if (project) {
        setProjectName(project.name);
      }

      // Fetch team members
      const { data: team } = await supabase
        .from('project_team')
        .select('*')
        .eq('project_id', id);
      
      setExistingTeam((team || []) as ExistingTeamMember[]);

      // Fetch contracts - filter to only show those where user's org is involved
      const { data: contracts } = await supabase
        .from('project_contracts')
        .select('*')
        .eq('project_id', id);
      
      // Filter contracts to only show those where current org is either from_org_id or to_org_id
      const visibleContracts = (contracts || []).filter(c => 
        c.from_org_id === currentOrg?.id || c.to_org_id === currentOrg?.id
      );
      setExistingContracts(visibleContracts as ExistingContract[]);
      
      setLoading(false);
    };

    fetchData();
  }, [id, currentOrg?.id]);

  // Filter available roles based on creator
  const availableRoles = TEAM_ROLES.filter(role => {
    if (creatorRole === 'General Contractor') {
      return role !== 'General Contractor';
    }
    if (creatorRole === 'Trade Contractor') {
      return role === 'General Contractor' || role === 'Field Crew' || role === 'Supplier';
    }
    return true;
  });

  const requiresTrade = newMember.role === 'Trade Contractor' || newMember.role === 'Field Crew';

  const addMember = async () => {
    if (!newMember.companyName || !newMember.contactEmail || !newMember.role) return;
    if (requiresTrade && !newMember.trade) return;
    if (!id || !user?.id) return;

    setSaving(true);
    try {
      // Insert into project_team
      const { data: teamMember, error: teamError } = await supabase
        .from('project_team')
        .insert({
          project_id: id,
          role: newMember.role,
          trade: newMember.trade,
          trade_custom: newMember.tradeCustom,
          invited_email: newMember.contactEmail,
          invited_name: newMember.contactName,
          invited_org_name: newMember.companyName,
          invited_by_user_id: user.id,
          status: 'Invited',
        })
        .select('*')
        .single();

      if (teamError) throw teamError;

      // Create invite
      await supabase.from('project_invites').insert({
        project_id: id,
        project_team_id: teamMember.id,
        role: newMember.role,
        trade: newMember.trade,
        trade_custom: newMember.tradeCustom,
        invited_email: newMember.contactEmail,
        invited_name: newMember.contactName,
        invited_org_name: newMember.companyName,
        invited_by_user_id: user.id,
      });

      // Create contract if applicable
      if (newMember.role !== 'Supplier') {
        // Determine contract direction based on who should invoice whom
        // Worker (invoice sender) = from_org, Payer = to_org
        const isCreatorUpstream = 
          (creatorRole === 'General Contractor') ||
          (creatorRole === 'Trade Contractor' && newMember.role === 'Field Crew');

        const contractPayload = isCreatorUpstream ? {
          // Invitee is worker, creator is payer
          project_id: id,
          from_org_id: null, // Invitee org not yet known (they haven't accepted)
          from_role: newMember.role,
          to_org_id: currentOrg?.id,
          to_role: creatorRole,
          trade: newMember.trade,
          to_project_team_id: teamMember.id,
          contract_sum: newContractSum,
          retainage_percent: newRetainagePercent,
          allow_mobilization_line_item: newAllowMobilization,
          created_by_user_id: user.id,
        } : {
          // Creator is worker, invitee is payer (e.g., TC inviting GC)
          project_id: id,
          from_org_id: currentOrg?.id,
          from_role: creatorRole,
          to_org_id: null, // Invitee org not yet known (they haven't accepted)
          to_role: newMember.role,
          trade: newMember.trade,
          to_project_team_id: teamMember.id,
          contract_sum: newContractSum,
          retainage_percent: newRetainagePercent,
          allow_mobilization_line_item: newAllowMobilization,
          created_by_user_id: user.id,
        };

        await supabase.from('project_contracts').insert(contractPayload);
      }

      setExistingTeam([...existingTeam, teamMember as ExistingTeamMember]);
      setNewMember({
        companyName: '',
        contactName: '',
        contactEmail: '',
        role: 'Trade Contractor',
      });
      setNewContractSum(0);
      setNewRetainagePercent(0);
      setNewAllowMobilization(false);
      
      toast({ title: 'Team member added', description: 'Invitation will be sent.' });
      
      // Refresh contracts
      const { data: contracts } = await supabase
        .from('project_contracts')
        .select('*')
        .eq('project_id', id);
      setExistingContracts((contracts || []) as ExistingContract[]);
      
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const removeMember = async (memberId: string) => {
    setSaving(true);
    try {
      // Delete invites first
      await supabase
        .from('project_invites')
        .delete()
        .eq('project_team_id', memberId);
      
      // Delete contracts for this team member
      await supabase
        .from('project_contracts')
        .delete()
        .eq('to_project_team_id', memberId);
      
      // Delete team member
      await supabase
        .from('project_team')
        .delete()
        .eq('id', memberId);

      setExistingTeam(existingTeam.filter(m => m.id !== memberId));
      toast({ title: 'Team member removed' });
      
      // Refresh contracts
      const { data: contracts } = await supabase
        .from('project_contracts')
        .select('*')
        .eq('project_id', id);
      setExistingContracts((contracts || []) as ExistingContract[]);
      
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const updateContract = (contractId: string, updates: Partial<ExistingContract>) => {
    setEditingContracts(prev => ({
      ...prev,
      [contractId]: { ...prev[contractId], ...updates }
    }));
  };

  const saveContract = async (contractId: string) => {
    const updates = editingContracts[contractId];
    if (!updates) return;

    setSaving(true);
    try {
      await supabase
        .from('project_contracts')
        .update({
          contract_sum: updates.contract_sum,
          retainage_percent: updates.retainage_percent,
          allow_mobilization_line_item: updates.allow_mobilization_line_item,
          notes: updates.notes,
        })
        .eq('id', contractId);

      // Update local state
      setExistingContracts(existingContracts.map(c => 
        c.id === contractId ? { ...c, ...updates } : c
      ));
      
      // Clear editing state
      setEditingContracts(prev => {
        const { [contractId]: _, ...rest } = prev;
        return rest;
      });

      toast({ title: 'Contract updated' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const getContractForMember = (memberId: string) => {
    return existingContracts.find(c => c.to_project_team_id === memberId);
  };

  const getEditingContract = (contractId: string): ExistingContract => {
    const original = existingContracts.find(c => c.id === contractId)!;
    return { ...original, ...editingContracts[contractId] };
  };

  if (authLoading || loading) {
    return (
      <AppLayout title="Edit Project">
        <div className="max-w-4xl mx-auto p-6 space-y-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-96 w-full" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title={`Edit ${projectName}`}>
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to={`/project/${id}`}>
              <ChevronLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Edit Project</h1>
            <p className="text-muted-foreground">{projectName}</p>
          </div>
        </div>

        <Tabs defaultValue={defaultTab}>
          <TabsList>
            <TabsTrigger value="team" className="gap-2">
              <Users className="h-4 w-4" />
              Team
            </TabsTrigger>
            <TabsTrigger value="contracts" className="gap-2">
              <FileText className="h-4 w-4" />
              Contracts
            </TabsTrigger>
          </TabsList>

          {/* Team Tab */}
          <TabsContent value="team" className="space-y-6">
            {/* Add new member form */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Add Team Member</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Company Name *</Label>
                    <Input
                      placeholder="ABC Framing LLC"
                      value={newMember.companyName}
                      onChange={(e) => setNewMember({ ...newMember, companyName: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Contact Name</Label>
                    <Input
                      placeholder="John Smith"
                      value={newMember.contactName}
                      onChange={(e) => setNewMember({ ...newMember, contactName: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Contact Email *</Label>
                    <Input
                      type="email"
                      placeholder="john@abcframing.com"
                      value={newMember.contactEmail}
                      onChange={(e) => setNewMember({ ...newMember, contactEmail: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Role *</Label>
                    <Select
                      value={newMember.role}
                      onValueChange={(value: TeamRole) => setNewMember({ ...newMember, role: value, trade: undefined })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableRoles.map((role) => (
                          <SelectItem key={role} value={role}>
                            {role}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {requiresTrade && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Trade *</Label>
                      <Select
                        value={newMember.trade}
                        onValueChange={(value: Trade) => setNewMember({ ...newMember, trade: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select trade" />
                        </SelectTrigger>
                        <SelectContent>
                          {TRADES.map((trade) => (
                            <SelectItem key={trade} value={trade}>
                              {trade}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {newMember.trade === 'Other' && (
                      <div className="space-y-2">
                        <Label>Trade Name</Label>
                        <Input
                          placeholder="Custom trade name"
                          value={newMember.tradeCustom || ''}
                          onChange={(e) => setNewMember({ ...newMember, tradeCustom: e.target.value })}
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Contract fields - only show for roles that need contracts */}
                {newMember.role !== 'Supplier' && (
                  <>
                    <Separator className="my-4" />
                    <p className="text-sm font-medium text-muted-foreground">Contract Terms</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Contract Sum</Label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                          <Input
                            type="number"
                            min="0"
                            step="1000"
                            className="pl-7"
                            value={newContractSum || ''}
                            onChange={(e) => setNewContractSum(parseFloat(e.target.value) || 0)}
                            placeholder="0.00"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Retainage %</Label>
                        <div className="relative">
                          <Input
                            type="number"
                            min="0"
                            max="20"
                            step="0.5"
                            className="pr-7"
                            value={newRetainagePercent || ''}
                            onChange={(e) => setNewRetainagePercent(parseFloat(e.target.value) || 0)}
                            placeholder="0"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <Label>Allow Mobilization as a line item?</Label>
                      <Switch
                        checked={newAllowMobilization}
                        onCheckedChange={setNewAllowMobilization}
                      />
                    </div>
                  </>
                )}

                {/* Validation message */}
                {newMember.role !== 'Supplier' && newContractSum <= 0 && newMember.companyName && newMember.contactEmail && (
                  <p className="text-sm text-amber-600">Contract sum must be greater than $0</p>
                )}

                <Button 
                  onClick={addMember}
                  disabled={
                    !newMember.companyName || 
                    !newMember.contactEmail || 
                    (requiresTrade && !newMember.trade) || 
                    (newMember.role !== 'Supplier' && newContractSum <= 0) ||
                    saving
                  }
                >
                  {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                  Add to Team
                </Button>
              </CardContent>
            </Card>

            {/* Existing team members */}
            <div className="space-y-3">
              <h3 className="font-medium">Team Members ({existingTeam.length})</h3>
              {existingTeam.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No team members added yet.
                </p>
              ) : (
                existingTeam.map((member) => (
                  <Card key={member.id}>
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <Building2 className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{member.invited_org_name}</p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            {member.invited_name && (
                              <span className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                {member.invited_name}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {member.invited_email}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="secondary">{member.role}</Badge>
                        {member.trade && (
                          <Badge variant="outline">
                            {member.trade === 'Other' ? member.trade_custom : member.trade}
                          </Badge>
                        )}
                        <Badge variant={member.status === 'Accepted' ? 'default' : 'outline'}>
                          {member.status}
                        </Badge>
                        {member.status === 'Invited' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeMember(member.id)}
                            disabled={saving}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          {/* Contracts Tab */}
          <TabsContent value="contracts" className="space-y-6">
            {existingContracts.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  No contracts found. Add team members first to create contracts.
                </CardContent>
              </Card>
            ) : (
              existingContracts.map((contract) => {
                const editingData = getEditingContract(contract.id);
                const hasChanges = !!editingContracts[contract.id];
                const teamMember = existingTeam.find(t => t.id === contract.to_project_team_id);
                
                return (
                  <Card key={contract.id}>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          {teamMember?.invited_org_name || contract.to_role}
                          {contract.trade && (
                            <Badge variant="outline">{contract.trade}</Badge>
                          )}
                        </span>
                        <Badge variant="secondary">
                          {contract.from_role} → {contract.to_role}
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Contract Sum</Label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                            <Input
                              type="number"
                              min="0"
                              step="100"
                              className="pl-7"
                              value={editingData.contract_sum || ''}
                              onChange={(e) => updateContract(contract.id, { 
                                contract_sum: parseFloat(e.target.value) || 0 
                              })}
                              placeholder="0.00"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Retainage %</Label>
                          <div className="relative">
                            <Input
                              type="number"
                              min="0"
                              max="20"
                              step="0.5"
                              className="pr-7"
                              value={editingData.retainage_percent || ''}
                              onChange={(e) => updateContract(contract.id, { 
                                retainage_percent: parseFloat(e.target.value) || 0 
                              })}
                              placeholder="0"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <Label>Allow Mobilization as a line item?</Label>
                        <Switch
                          checked={editingData.allow_mobilization_line_item}
                          onCheckedChange={(checked) => updateContract(contract.id, { 
                            allow_mobilization_line_item: checked 
                          })}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Notes (Optional)</Label>
                        <Textarea
                          placeholder="Additional contract notes..."
                          value={editingData.notes || ''}
                          onChange={(e) => updateContract(contract.id, { notes: e.target.value })}
                          rows={2}
                        />
                      </div>

                      {hasChanges && (
                        <Button 
                          onClick={() => saveContract(contract.id)}
                          disabled={saving}
                          className="w-full"
                        >
                          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                          Save Changes
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
