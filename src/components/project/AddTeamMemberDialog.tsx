import { useState, useEffect, useRef } from 'react';
import { Search, Building2, User, Mail, Loader2, UserPlus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ORG_TYPE_LABELS, OrgType } from '@/types/organization';
import { TEAM_ROLES, TRADES, TeamRole, Trade } from '@/types/projectWizard';

interface SearchResult {
  result_type: string;
  org_id: string;
  org_name: string;
  org_type: string;
  org_trade: string | null;
  contact_user_id: string | null;
  contact_name: string | null;
  contact_email: string | null;
  city_state: string | null;
}

import { TeamMember } from '@/types/projectWizard';

interface AddTeamMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId?: string;
  creatorOrgType: OrgType | null;
  onMemberAdded: () => void;
  /** 'direct' saves to DB (default). 'collect' returns data via onCollect without DB writes. */
  mode?: 'direct' | 'collect';
  onCollect?: (member: TeamMember) => void;
}

export function AddTeamMemberDialog({
  open,
  onOpenChange,
  projectId,
  creatorOrgType,
  onMemberAdded,
  mode = 'direct',
  onCollect,
}: AddTeamMemberDialogProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'search' | 'invite'>('search');
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedResult, setSelectedResult] = useState<SearchResult | null>(null);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [showResults, setShowResults] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  
  // Selected org role/trade state
  const [selectedRole, setSelectedRole] = useState<TeamRole>('Trade Contractor');
  const [selectedTrade, setSelectedTrade] = useState<Trade | undefined>();
  
  // Invite form state
  const [inviteForm, setInviteForm] = useState({
    companyName: '',
    contactName: '',
    contactEmail: '',
    role: 'Trade Contractor' as TeamRole,
    trade: undefined as Trade | undefined,
  });
  
  // Duplicate check state
  const [emailExists, setEmailExists] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);
  
  const [saving, setSaving] = useState(false);
  
  // Filter available roles based on creator org type
  // Rules:
  // - General Contractor can add: Trade Contractor, Supplier (NOT Field Crew)
  // - Trade Contractor can add: General Contractor, Field Crew, Supplier (NOT another TC)
  // - Field Crew cannot add anyone
  const availableRoles = TEAM_ROLES.filter(role => {
    if (creatorOrgType === 'GC') {
      // GC can add Trade Contractor, Field Crew, and Supplier, but NOT another GC
      return role === 'Trade Contractor' || role === 'Field Crew' || role === 'Supplier';
    }
    if (creatorOrgType === 'TC') {
      // TC can add General Contractor, Field Crew, and Supplier (NOT another TC)
      return role === 'General Contractor' || role === 'Field Crew' || role === 'Supplier';
    }
    if (creatorOrgType === 'FC') {
      // FC cannot invite anyone
      return false;
    }
    if (creatorOrgType === 'SUPPLIER') {
      // Supplier can add GC and TC, but NOT FC or another Supplier
      return role === 'General Contractor' || role === 'Trade Contractor';
    }
    return true;
  });

  const requiresTrade = (role: TeamRole) => role === 'Trade Contractor' || role === 'Field Crew';

  // Ensure default roles always comply with availableRoles
  useEffect(() => {
    if (!open) return;
    if (availableRoles.length === 0) return;

    if (!availableRoles.includes(selectedRole)) {
      setSelectedRole(availableRoles[0]);
      setSelectedTrade(undefined);
    }

    if (!availableRoles.includes(inviteForm.role)) {
      setInviteForm((prev) => ({ ...prev, role: availableRoles[0], trade: undefined }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, creatorOrgType]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setSearchQuery('');
      setSearchResults([]);
      setSelectedResult(null);
      setSelectedRole('Trade Contractor');
      setSelectedTrade(undefined);
      setInviteForm({
        companyName: '',
        contactName: '',
        contactEmail: '',
        role: 'Trade Contractor',
        trade: undefined,
      });
      setEmailExists(false);
      setActiveTab('search');
    }
  }, [open]);

  // Handle click outside search dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Search for existing organizations
  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setSearchLoading(true);
      const { data, error } = await supabase.rpc('search_existing_team_targets', {
        _query: searchQuery,
        _project_id: projectId || '00000000-0000-0000-0000-000000000000',
        _limit: 10,
      });

      setSearchLoading(false);

      if (error) {
        console.error('Search error:', error);
        setSearchResults([]);
      } else {
        setSearchResults((data || []) as SearchResult[]);
        setShowResults(true);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, projectId]);

  // Check for existing email when typing in invite form
  useEffect(() => {
    if (!inviteForm.contactEmail || !inviteForm.contactEmail.includes('@')) {
      setEmailExists(false);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setCheckingEmail(true);
      const { data } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', inviteForm.contactEmail.toLowerCase())
        .maybeSingle();
      
      setEmailExists(!!data);
      setCheckingEmail(false);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [inviteForm.contactEmail]);

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (!showResults || searchResults.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev < searchResults.length - 1 ? prev + 1 : 0));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : searchResults.length - 1));
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && searchResults[highlightedIndex]) {
          handleSelectResult(searchResults[highlightedIndex]);
        }
        break;
      case 'Escape':
        setShowResults(false);
        break;
    }
  };

  const handleSelectResult = (result: SearchResult) => {
    setSelectedResult(result);
    setShowResults(false);
    setSearchQuery('');
    setHighlightedIndex(-1);
    
    // Set default role based on org type
    const orgTypeToRole: Record<string, TeamRole> = {
      'GC': 'General Contractor',
      'TC': 'Trade Contractor',
      'FC': 'Field Crew',
      'SUPPLIER': 'Supplier',
    };
    const defaultRole = orgTypeToRole[result.org_type] || 'Trade Contractor';
    setSelectedRole(defaultRole);
    
    // Set trade from org if available
    if (result.org_trade) {
      setSelectedTrade(result.org_trade as Trade);
    }
  };

  // Map role string to org_type enum
  const roleToOrgType = (role: TeamRole): 'GC' | 'TC' | 'FC' | 'SUPPLIER' => {
    switch (role) {
      case 'General Contractor': return 'GC';
      case 'Trade Contractor': return 'TC';
      case 'Field Crew': return 'FC';
      case 'Supplier': return 'SUPPLIER';
      default: return 'TC';
    }
  };


  const handleAddExisting = async () => {
    if (!selectedResult || !user?.id) return;
    
    if (requiresTrade(selectedRole) && !selectedTrade) {
      toast.error('Please select a trade');
      return;
    }

    // Collect mode: return data without DB writes
    if (mode === 'collect' && onCollect) {
      onCollect({
        id: crypto.randomUUID(),
        companyName: selectedResult.org_name,
        contactName: selectedResult.contact_name || '',
        contactEmail: selectedResult.contact_email || '',
        role: selectedRole,
        trade: requiresTrade(selectedRole) ? selectedTrade : undefined,
        orgId: selectedResult.org_id,
        userId: selectedResult.contact_user_id || undefined,
      });
      onOpenChange(false);
      return;
    }

    if (!projectId) return;

    setSaving(true);
    try {
      // Get current user's org info for contract creation
      const { data: userOrgData } = await supabase
        .from('user_org_roles')
        .select('organization_id, organizations:organization_id (type)')
        .eq('user_id', user.id)
        .single();
      
      const currentOrgId = userOrgData?.organization_id;
      const currentOrgType = (userOrgData?.organizations as any)?.type;

      // Insert into project_team with status = Invited
      // Existing orgs should NOT be auto-accepted; they must accept via dashboard invite flow.
      const { data: teamData, error: teamError } = await supabase
        .from('project_team')
        .insert({
          project_id: projectId,
          org_id: selectedResult.org_id,
          user_id: selectedResult.contact_user_id,
          role: selectedRole,
          trade: requiresTrade(selectedRole) ? selectedTrade : null,
          invited_email: selectedResult.contact_email,
          invited_name: selectedResult.contact_name,
          invited_org_name: selectedResult.org_name,
          invited_by_user_id: user.id,
          status: 'Invited',
        })
        .select('id')
        .single();

      if (teamError) throw teamError;

      // Create project_invites record for existing orgs too (ensures consistent invite acceptance flow)
      await supabase.from('project_invites').insert({
        project_id: projectId,
        project_team_id: teamData.id,
        role: selectedRole,
        trade: requiresTrade(selectedRole) ? selectedTrade : null,
        invited_email: selectedResult.contact_email,
        invited_name: selectedResult.contact_name,
        invited_org_name: selectedResult.org_name,
        invited_by_user_id: user.id,
      });

      // Note: project_participants insert is now handled by database trigger
      // (trg_sync_team_to_participants) which also fires the notification

      // Create contract if applicable (not for Suppliers)
      // Determine contract direction based on who should invoice whom
      // Worker (invoice sender) = from_org, Payer = to_org
      if (selectedRole !== 'Supplier' && currentOrgId) {
        const creatorRoleLabel = currentOrgType === 'GC' ? 'General Contractor' 
          : currentOrgType === 'TC' ? 'Trade Contractor' : null;
        
        const isCreatorUpstream = 
          (currentOrgType === 'GC') ||
          (currentOrgType === 'TC' && selectedRole === 'Field Crew');

        // Check if a contract already exists for this org pair
        const { data: existingContract } = await supabase
          .from('project_contracts')
          .select('id')
          .eq('project_id', projectId)
          .or(`and(from_org_id.eq.${selectedResult.org_id},to_org_id.eq.${currentOrgId}),and(from_org_id.eq.${currentOrgId},to_org_id.eq.${selectedResult.org_id})`)
          .limit(1);

        if (!existingContract || existingContract.length === 0) {
          const contractPayload = isCreatorUpstream ? {
            project_id: projectId,
            from_org_id: selectedResult.org_id,
            from_role: selectedRole,
            to_org_id: currentOrgId,
            to_role: creatorRoleLabel,
            trade: selectedTrade || null,
            contract_sum: 0,
            retainage_percent: 0,
            created_by_user_id: user.id,
            to_project_team_id: teamData.id,
          } : {
            project_id: projectId,
            from_org_id: currentOrgId,
            from_role: creatorRoleLabel,
            to_org_id: selectedResult.org_id,
            to_role: selectedRole,
            trade: selectedTrade || null,
            contract_sum: 0,
            retainage_percent: 0,
            created_by_user_id: user.id,
            to_project_team_id: teamData.id,
          };

          await supabase.from('project_contracts').insert(contractPayload);
        }
      }

      // Log activity
      await supabase.from('project_activity').insert({
        project_id: projectId,
        activity_type: 'team_member_added',
        description: `Added existing ${selectedRole} to project`,
        actor_user_id: user.id,
        actor_name: selectedResult.contact_name || null,
        actor_company: selectedResult.org_name,
        metadata: { org_name: selectedResult.org_name, role: selectedRole },
      });

      toast.success(`Invitation sent to ${selectedResult.org_name}`);
      onMemberAdded();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error adding team member:', error);
      toast.error(error.message || 'Failed to add team member');
    } finally {
      setSaving(false);
    }
  };

  const handleInviteByEmail = async () => {
    if (!inviteForm.companyName || !inviteForm.contactEmail || !user?.id) return;
    
    if (requiresTrade(inviteForm.role) && !inviteForm.trade) {
      toast.error('Please select a trade');
      return;
    }

    if (emailExists) {
      toast.error('This user already exists. Use Search Existing instead.');
      return;
    }

    setSaving(true);
    try {
      // Get current user's org info for contract creation
      const { data: userOrgData } = await supabase
        .from('user_org_roles')
        .select('organization_id, organizations:organization_id (type)')
        .eq('user_id', user.id)
        .single();
      
      const currentOrgId = userOrgData?.organization_id;
      const currentOrgType = (userOrgData?.organizations as any)?.type;

      // Insert into project_team with status = Invited
      const { data: teamMember, error: teamError } = await supabase
        .from('project_team')
        .insert({
          project_id: projectId,
          role: inviteForm.role,
          trade: requiresTrade(inviteForm.role) ? inviteForm.trade : null,
          invited_email: inviteForm.contactEmail,
          invited_name: inviteForm.contactName,
          invited_org_name: inviteForm.companyName,
          invited_by_user_id: user.id,
          status: 'Invited',
        })
        .select('id')
        .single();

      if (teamError) throw teamError;

      // Create project invite
      await supabase.from('project_invites').insert({
        project_id: projectId,
        project_team_id: teamMember.id,
        role: inviteForm.role,
        trade: requiresTrade(inviteForm.role) ? inviteForm.trade : null,
        invited_email: inviteForm.contactEmail,
        invited_name: inviteForm.contactName,
        invited_org_name: inviteForm.companyName,
        invited_by_user_id: user.id,
      });

      // Create contract if applicable (not for Suppliers)
      // Use the same logic as handleAddExisting to determine contract direction
      if (inviteForm.role !== 'Supplier' && currentOrgId) {
        const creatorRoleLabel = currentOrgType === 'GC' ? 'General Contractor' 
          : currentOrgType === 'TC' ? 'Trade Contractor' : null;
        
        const isCreatorUpstream = 
          (currentOrgType === 'GC') ||
          (currentOrgType === 'TC' && inviteForm.role === 'Field Crew');

        const contractPayload = isCreatorUpstream ? {
          // Invitee is worker, creator is payer
          project_id: projectId,
          from_org_id: null, // Invitee org not known yet
          from_role: inviteForm.role,
          to_org_id: currentOrgId,
          to_role: creatorRoleLabel,
          trade: inviteForm.trade || null,
          to_project_team_id: teamMember.id,
          contract_sum: 0,
          retainage_percent: 0,
          created_by_user_id: user.id,
        } : {
          // Creator is worker, invitee is payer (e.g., TC inviting GC)
          project_id: projectId,
          from_org_id: currentOrgId,
          from_role: creatorRoleLabel,
          to_org_id: null,
          to_role: inviteForm.role,
          trade: inviteForm.trade || null,
          to_project_team_id: teamMember.id,
          contract_sum: 0,
          retainage_percent: 0,
          created_by_user_id: user.id,
        };

        await supabase.from('project_contracts').insert(contractPayload);
      }

      // Log activity
      await supabase.from('project_activity').insert({
        project_id: projectId,
        activity_type: 'team_member_invited',
        description: `Invited ${inviteForm.role} to project`,
        actor_user_id: user.id,
        actor_name: inviteForm.contactName || null,
        actor_company: inviteForm.companyName,
        metadata: { org_name: inviteForm.companyName, email: inviteForm.contactEmail },
      });

      toast.success('Invitation sent');
      onMemberAdded();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error inviting team member:', error);
      toast.error(error.message || 'Failed to send invitation');
    } finally {
      setSaving(false);
    }
  };

  const getOrgTypeLabel = (type: string): string => {
    return ORG_TYPE_LABELS[type as OrgType] || type;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Add Team Member
          </DialogTitle>
          <DialogDescription>
            Add an existing organization or invite a new team member by email.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'search' | 'invite')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="search">Search Existing</TabsTrigger>
            <TabsTrigger value="invite">Invite by Email</TabsTrigger>
          </TabsList>

          <TabsContent value="search" className="space-y-4 mt-4">
            {!selectedResult ? (
              // Search input
              <div ref={searchContainerRef} className="relative">
                <Label className="mb-2 block">Search for an organization or contact</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => searchQuery.length >= 2 && setShowResults(true)}
                    onKeyDown={handleSearchKeyDown}
                    placeholder="Search by company name, contact name, or email"
                    className="pl-10 pr-10"
                  />
                  {searchLoading && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
                  )}
                </div>

                {showResults && (
                  <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-64 overflow-auto">
                    {searchResults.length === 0 && searchQuery.length >= 2 && !searchLoading && (
                      <div className="p-3 text-sm text-muted-foreground">
                        No matching organizations found. Try the "Invite by Email" tab.
                      </div>
                    )}

                    {searchResults.map((result, index) => (
                      <button
                        key={result.org_id}
                        type="button"
                        className={cn(
                          'w-full px-3 py-2 text-left flex items-start gap-3 hover:bg-accent transition-colors',
                          highlightedIndex === index && 'bg-accent'
                        )}
                        onClick={() => handleSelectResult(result)}
                        onMouseEnter={() => setHighlightedIndex(index)}
                      >
                        <div className="mt-0.5">
                          <Building2 className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium truncate">{result.org_name}</span>
                            <Badge variant="outline" className="text-xs shrink-0">
                              {getOrgTypeLabel(result.org_type)}
                            </Badge>
                            {result.org_trade && (
                              <Badge variant="secondary" className="text-xs shrink-0">
                                {result.org_trade}
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {result.contact_name}
                            {result.contact_email && ` • ${result.contact_email}`}
                            {result.city_state && ` • ${result.city_state}`}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              // Selected result confirmation
              <div className="space-y-4">
                <div className="p-4 border rounded-lg bg-muted/30 space-y-2">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{selectedResult.org_name}</span>
                    <Badge variant="outline">{getOrgTypeLabel(selectedResult.org_type)}</Badge>
                  </div>
                  {selectedResult.contact_name && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <User className="h-3 w-3" />
                      {selectedResult.contact_name}
                    </div>
                  )}
                  {selectedResult.contact_email && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="h-3 w-3" />
                      {selectedResult.contact_email}
                    </div>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2"
                    onClick={() => setSelectedResult(null)}
                  >
                    Change selection
                  </Button>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Role on this project</Label>
                    <Select
                      value={selectedRole}
                      onValueChange={(v) => {
                        setSelectedRole(v as TeamRole);
                        if (!requiresTrade(v as TeamRole)) {
                          setSelectedTrade(undefined);
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
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

                  {requiresTrade(selectedRole) && (
                    <div className="space-y-2">
                      <Label>Trade</Label>
                      <Select
                        value={selectedTrade}
                        onValueChange={(v) => setSelectedTrade(v as Trade)}
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
                  )}

                  <Button
                    className="w-full"
                    onClick={handleAddExisting}
                    disabled={saving || (requiresTrade(selectedRole) && !selectedTrade)}
                  >
                    {saving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Adding...
                      </>
                    ) : (
                      'Add to Project'
                    )}
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="invite" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Company Name *</Label>
              <Input
                placeholder="ABC Construction LLC"
                value={inviteForm.companyName}
                onChange={(e) => setInviteForm({ ...inviteForm, companyName: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Contact Name</Label>
              <Input
                placeholder="John Smith"
                value={inviteForm.contactName}
                onChange={(e) => setInviteForm({ ...inviteForm, contactName: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Contact Email *</Label>
              <div className="relative">
                <Input
                  type="email"
                  placeholder="john@abcconstruction.com"
                  value={inviteForm.contactEmail}
                  onChange={(e) => setInviteForm({ ...inviteForm, contactEmail: e.target.value })}
                  className={emailExists ? 'border-destructive' : ''}
                />
                {checkingEmail && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
                )}
              </div>
              {emailExists && (
                <p className="text-sm text-destructive">
                  This user already exists. Use "Search Existing" instead.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Role *</Label>
              <Select
                value={inviteForm.role}
                onValueChange={(v) => {
                  setInviteForm({
                    ...inviteForm,
                    role: v as TeamRole,
                    trade: requiresTrade(v as TeamRole) ? inviteForm.trade : undefined,
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue />
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

            {requiresTrade(inviteForm.role) && (
              <div className="space-y-2">
                <Label>Trade *</Label>
                <Select
                  value={inviteForm.trade}
                  onValueChange={(v) => setInviteForm({ ...inviteForm, trade: v as Trade })}
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
            )}

            <Button
              className="w-full"
              onClick={handleInviteByEmail}
              disabled={
                saving ||
                !inviteForm.companyName ||
                !inviteForm.contactEmail ||
                emailExists ||
                (requiresTrade(inviteForm.role) && !inviteForm.trade)
              }
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending Invite...
                </>
              ) : (
                'Send Invitation'
              )}
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
