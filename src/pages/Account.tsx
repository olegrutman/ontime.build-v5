import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppHeader from '@/components/AppHeader';
import { toast } from 'sonner';
import { 
  Building2, 
  User, 
  Mail, 
  Building, 
  Shield,
  LogOut,
  Save,
  HardHat,
  Wrench,
  Hammer,
  DollarSign,
  MapPin
} from 'lucide-react';

type AppRole = 'FIELD_CREW' | 'TRADE_CONTRACTOR' | 'GC';

const ROLE_OPTIONS: { value: AppRole; label: string; description: string; icon: React.ElementType }[] = [
  { value: 'GC', label: 'General Contractor', description: 'Manages the overall project', icon: HardHat },
  { value: 'TRADE_CONTRACTOR', label: 'Trade Contractor', description: 'Specializes in a specific trade', icon: Wrench },
  { value: 'FIELD_CREW', label: 'Field Crew', description: 'On-site workers', icon: Hammer },
];

export default function Account() {
  const navigate = useNavigate();
  const { user, signOut, loading } = useAuth();
  const [companyName, setCompanyName] = useState('');
  const [companyAddress, setCompanyAddress] = useState('');
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [currentRole, setCurrentRole] = useState<AppRole | null>(null);
  const [hourlyRate, setHourlyRate] = useState<string>('');
  const [loadingData, setLoadingData] = useState(true);
  const [saving, setSaving] = useState(false);

  const canSetHourlyRate = currentRole && ['FIELD_CREW', 'TRADE_CONTRACTOR'].includes(currentRole);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchUserData();
    }
  }, [user]);

  const fetchUserData = async () => {
    try {
      // Fetch profile with company info
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, hourly_rate, company_id, companies(name, address)')
        .eq('id', user!.id)
        .single();

      if (profile) {
        setCurrentRole(profile.role as AppRole);
        if (profile.hourly_rate) {
          setHourlyRate(profile.hourly_rate.toString());
        }
        if (profile.company_id) {
          setCompanyId(profile.company_id);
        }
        const company = profile.companies as { name: string; address: string } | null;
        if (company) {
          setCompanyName(company.name || '');
          setCompanyAddress(company.address || '');
        }
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoadingData(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    
    if (!companyAddress.trim()) {
      toast.error('Company address is required');
      return;
    }
    
    setSaving(true);
    try {
      // Update company address if we have a company
      if (companyId) {
        const { error: companyError } = await supabase
          .from('companies')
          .update({ address: companyAddress.trim() })
          .eq('id', companyId);
        
        if (companyError) throw companyError;
      }
      
      // Update profile
      const profileUpdate: { role: AppRole; hourly_rate?: number | null } = { 
        role: currentRole! 
      };
      
      if (canSetHourlyRate) {
        profileUpdate.hourly_rate = hourlyRate ? parseFloat(hourlyRate) : null;
      }
      
      const { error: profileError } = await supabase
        .from('profiles')
        .update(profileUpdate)
        .eq('id', user.id);

      if (profileError) throw profileError;
      
      toast.success('Profile updated successfully');
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  if (loading || loadingData) {
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
        title="Account" 
        showBack 
        onBack={() => navigate('/dashboard')} 
      />

      <main className="container px-4 py-6 max-w-lg mx-auto">
        <Card className="border-0 shadow-md mb-6 animate-slide-up">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-accent" />
              Profile
            </CardTitle>
            <CardDescription>
              Manage your account information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                Email
              </Label>
              <Input 
                value={user?.email || ''} 
                disabled 
                className="bg-muted"
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Building className="h-4 w-4 text-muted-foreground" />
                Company Name
              </Label>
              <Input 
                value={companyName}
                disabled
                className="bg-muted"
                placeholder="Set during signup"
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                Company Address <span className="text-destructive">*</span>
              </Label>
              <Input 
                value={companyAddress}
                onChange={(e) => setCompanyAddress(e.target.value)}
                placeholder="Enter company address"
                required
              />
            </div>

            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-muted-foreground" />
                Role
              </Label>
              <div className="grid gap-2">
                {ROLE_OPTIONS.map((option) => {
                  const Icon = option.icon;
                  const isSelected = currentRole === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setCurrentRole(option.value)}
                      className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${
                        isSelected
                          ? 'border-accent bg-accent/10 ring-1 ring-accent'
                          : 'border-border hover:border-accent/50 hover:bg-muted/50'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        isSelected ? 'bg-accent/20' : 'bg-muted'
                      }`}>
                        <Icon className={`h-4 w-4 ${isSelected ? 'text-accent' : 'text-muted-foreground'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium ${isSelected ? 'text-accent' : 'text-foreground'}`}>
                          {option.label}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {option.description}
                        </p>
                      </div>
                      {isSelected && (
                        <div className="w-2 h-2 rounded-full bg-accent" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {canSetHourlyRate && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  Hourly Rate for Change Orders
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input 
                    type="number"
                    value={hourlyRate}
                    onChange={(e) => setHourlyRate(e.target.value)}
                    placeholder="0.00"
                    className="pl-7"
                    min="0"
                    step="0.01"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">/hr</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {currentRole === 'FIELD_CREW' && 'This rate is visible to Trade Contractors'}
                  {currentRole === 'TRADE_CONTRACTOR' && 'This rate is visible to General Contractors'}
                </p>
              </div>
            )}

            <Button 
              onClick={handleSave}
              disabled={saving}
              className="w-full"
            >
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <CardContent className="p-4">
            <Button 
              variant="destructive" 
              onClick={handleSignOut}
              className="w-full"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}