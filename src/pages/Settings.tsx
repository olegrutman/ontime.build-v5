import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import AppHeader from '@/components/AppHeader';
import { 
  Building2, 
  HardHat, 
  Wrench, 
  Hammer,
  Check,
  Save,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';

type AppRole = 'FIELD_CREW' | 'TRADE_CONTRACTOR' | 'GC';

const ROLE_OPTIONS: { value: AppRole; label: string; description: string; icon: React.ReactNode }[] = [
  { value: 'GC', label: 'General Contractor', description: 'Managing the overall project', icon: <HardHat className="h-5 w-5" /> },
  { value: 'TRADE_CONTRACTOR', label: 'Trade Contractor', description: 'Specializing in a specific trade', icon: <Wrench className="h-5 w-5" /> },
  { value: 'FIELD_CREW', label: 'Field Crew', description: 'On-site work and labor', icon: <Hammer className="h-5 w-5" /> },
];

export default function Settings() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [currentRole, setCurrentRole] = useState<AppRole | null>(null);
  const [selectedRole, setSelectedRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [companyName, setCompanyName] = useState('');

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchUserData();
    }
  }, [user]);

  const fetchUserData = async () => {
    try {
      // Fetch profile with company info
      const { data: profileData } = await supabase
        .from('profiles')
        .select('role, companies(name)')
        .eq('id', user!.id)
        .single();

      if (profileData) {
        setCurrentRole(profileData.role as AppRole);
        setSelectedRole(profileData.role as AppRole);
        const company = profileData.companies as { name: string } | null;
        if (company?.name) {
          setCompanyName(company.name);
        }
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveRole = async () => {
    if (!selectedRole || !user) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: selectedRole })
        .eq('id', user.id);

      if (error) throw error;

      setCurrentRole(selectedRole);
      toast.success('Role updated successfully!');
    } catch (error: any) {
      console.error('Error saving role:', error);
      toast.error('Failed to update role');
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = selectedRole !== currentRole;

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse flex items-center gap-2">
          <Building2 className="h-8 w-8 text-accent" />
          <span className="text-xl font-semibold">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-safe-bottom">
      <AppHeader 
        title="Settings" 
        showBack 
        onBack={() => navigate('/dashboard')} 
      />

      <main className="container px-4 py-6 max-w-2xl mx-auto">
        <Card className="mb-6 animate-slide-up">
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>Your account information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Email</label>
              <p className="text-foreground">{user?.email}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Company</label>
              <p className="text-foreground">{companyName || 'Not set'}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <CardHeader>
            <CardTitle>Your Role</CardTitle>
            <CardDescription>
              Select your role in the construction industry. This affects how change orders and approvals work.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3">
              {ROLE_OPTIONS.map((role) => (
                <button
                  key={role.value}
                  type="button"
                  onClick={() => setSelectedRole(role.value)}
                  className={`flex items-center gap-3 p-4 rounded-lg border text-left transition-all ${
                    selectedRole === role.value
                      ? 'border-accent bg-accent/10 ring-2 ring-accent'
                      : 'border-border hover:border-accent/50 hover:bg-muted/50'
                  }`}
                >
                  <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${
                    selectedRole === role.value ? 'bg-accent text-accent-foreground' : 'bg-muted text-muted-foreground'
                  }`}>
                    {role.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium ${selectedRole === role.value ? 'text-accent' : 'text-foreground'}`}>
                      {role.label}
                    </p>
                    <p className="text-sm text-muted-foreground">{role.description}</p>
                  </div>
                  {selectedRole === role.value && (
                    <Check className="h-5 w-5 text-accent flex-shrink-0" />
                  )}
                  {currentRole === role.value && selectedRole !== role.value && (
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">Current</span>
                  )}
                </button>
              ))}
            </div>

            {hasChanges && (
              <Button 
                variant="accent" 
                size="lg" 
                className="w-full mt-4"
                onClick={handleSaveRole}
                disabled={saving}
              >
                {saving ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-5 w-5" />
                    Save Changes
                  </>
                )}
              </Button>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}