import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Building2, Hash, Loader2, Plus, ArrowRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { OrgType, AppRole, ORG_TYPE_LABELS, ALLOWED_ROLES_BY_ORG_TYPE } from '@/types/organization';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { z } from 'zod';

const joinOrgSchema = z.object({
  orgCode: z.string().min(3, 'Org code must be at least 3 characters').max(20, 'Org code too long'),
});

const createOrgSchema = z.object({
  orgCode: z.string()
    .min(3, 'Org code must be at least 3 characters')
    .max(20, 'Org code too long')
    .regex(/^[A-Z0-9-]+$/, 'Only uppercase letters, numbers, and hyphens allowed'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  type: z.enum(['GC', 'TC', 'SUPPLIER']),
});

export default function JoinOrg() {
  const navigate = useNavigate();
  const { user, refreshUserData } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [joinForm, setJoinForm] = useState({ orgCode: '' });
  const [createForm, setCreateForm] = useState({
    orgCode: '',
    name: '',
    type: 'GC' as OrgType,
  });

  const handleJoinOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = joinOrgSchema.safeParse(joinForm);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as string] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    if (!user) {
      toast({
        variant: 'destructive',
        title: 'Not authenticated',
        description: 'Please sign in first.',
      });
      navigate('/auth');
      return;
    }

    setLoading(true);

    // Look up organization by org_code
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('*')
      .eq('org_code', joinForm.orgCode.toUpperCase())
      .maybeSingle();

    if (orgError || !org) {
      setLoading(false);
      toast({
        variant: 'destructive',
        title: 'Organization not found',
        description: 'Please check the org code and try again.',
      });
      return;
    }

    // Check if user already belongs to this org
    const { data: existingRole } = await supabase
      .from('user_org_roles')
      .select('*')
      .eq('user_id', user.id)
      .eq('organization_id', org.id)
      .maybeSingle();

    if (existingRole) {
      setLoading(false);
      toast({
        variant: 'destructive',
        title: 'Already a member',
        description: 'You are already a member of this organization.',
      });
      return;
    }

    // Determine default role based on org type
    const defaultRole = ALLOWED_ROLES_BY_ORG_TYPE[org.type as OrgType][0];

    // Add user to organization with default role
    const { error: roleError } = await supabase
      .from('user_org_roles')
      .insert({
        user_id: user.id,
        organization_id: org.id,
        role: defaultRole,
      });

    setLoading(false);

    if (roleError) {
      toast({
        variant: 'destructive',
        title: 'Failed to join',
        description: roleError.message,
      });
      return;
    }

    await refreshUserData();
    toast({
      title: 'Welcome!',
      description: `You've joined ${org.name} as ${defaultRole.replace('_', ' ')}.`,
    });
    navigate('/');
  };

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = createOrgSchema.safeParse(createForm);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as string] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    if (!user) {
      toast({
        variant: 'destructive',
        title: 'Not authenticated',
        description: 'Please sign in first.',
      });
      navigate('/auth');
      return;
    }

    setLoading(true);

    // Create the organization
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .insert({
        org_code: createForm.orgCode.toUpperCase(),
        name: createForm.name,
        type: createForm.type,
      })
      .select()
      .single();

    if (orgError) {
      setLoading(false);
      if (orgError.message.includes('unique')) {
        toast({
          variant: 'destructive',
          title: 'Org code taken',
          description: 'This org code is already in use. Please choose another.',
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Failed to create',
          description: orgError.message,
        });
      }
      return;
    }

    // Add creator as first member with PM role
    const creatorRole = createForm.type === 'GC' ? 'GC_PM' : createForm.type === 'TC' ? 'TC_PM' : 'SUPPLIER';

    const { error: roleError } = await supabase
      .from('user_org_roles')
      .insert({
        user_id: user.id,
        organization_id: org.id,
        role: creatorRole as AppRole,
      });

    setLoading(false);

    if (roleError) {
      toast({
        variant: 'destructive',
        title: 'Organization created but failed to add you',
        description: roleError.message,
      });
      return;
    }

    await refreshUserData();
    toast({
      title: 'Organization created!',
      description: `Your org code is: ${org.org_code}`,
    });
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="flex items-center justify-center w-12 h-12 bg-primary rounded-xl">
            <Building2 className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-bold text-2xl tracking-tight">Ontime.Build</h1>
            <p className="text-xs text-muted-foreground uppercase tracking-widest">Join or Create Org</p>
          </div>
        </div>

        <Card className="p-6">
          <Tabs defaultValue="join">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="join">
                <ArrowRight className="w-4 h-4 mr-2" />
                Join
              </TabsTrigger>
              <TabsTrigger value="create">
                <Plus className="w-4 h-4 mr-2" />
                Create
              </TabsTrigger>
            </TabsList>

            <TabsContent value="join">
              <div className="mb-4">
                <h2 className="font-semibold text-lg">Join an Organization</h2>
                <p className="text-sm text-muted-foreground">
                  Enter the org code provided by your organization.
                </p>
              </div>

              <form onSubmit={handleJoinOrg} className="space-y-4">
                <div>
                  <div className="relative">
                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="ORG-CODE"
                      value={joinForm.orgCode}
                      onChange={(e) => setJoinForm({ orgCode: e.target.value.toUpperCase() })}
                      className="pl-10 uppercase font-mono"
                    />
                  </div>
                  {errors.orgCode && <p className="text-xs text-destructive mt-1">{errors.orgCode}</p>}
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Join Organization
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="create">
              <div className="mb-4">
                <h2 className="font-semibold text-lg">Create an Organization</h2>
                <p className="text-sm text-muted-foreground">
                  Set up a new org with a unique code.
                </p>
              </div>

              <form onSubmit={handleCreateOrg} className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Org Code</label>
                  <div className="relative">
                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="METRO-GC"
                      value={createForm.orgCode}
                      onChange={(e) => setCreateForm({ ...createForm, orgCode: e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '') })}
                      className="pl-10 uppercase font-mono"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Uppercase letters, numbers, hyphens only. Cannot be changed.</p>
                  {errors.orgCode && <p className="text-xs text-destructive mt-1">{errors.orgCode}</p>}
                </div>

                <div>
                  <label className="text-sm font-medium mb-1.5 block">Company Name</label>
                  <Input
                    type="text"
                    placeholder="Metro Construction LLC"
                    value={createForm.name}
                    onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  />
                  {errors.name && <p className="text-xs text-destructive mt-1">{errors.name}</p>}
                </div>

                <div>
                  <label className="text-sm font-medium mb-1.5 block">Organization Type</label>
                  <Select
                    value={createForm.type}
                    onValueChange={(value) => setCreateForm({ ...createForm, type: value as OrgType })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(ORG_TYPE_LABELS).map(([key, label]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.type && <p className="text-xs text-destructive mt-1">{errors.type}</p>}
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Create Organization
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </Card>

        <Button
          variant="ghost"
          className="w-full mt-4"
          onClick={() => navigate('/')}
        >
          Skip for now
        </Button>
      </div>
    </div>
  );
}
