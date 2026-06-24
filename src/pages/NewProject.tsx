import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { UserSearchSelect } from '@/components/projects/UserSearchSelect';
import { 
  FramingScope, 
  getDefaultFramingScope, 
  framingScopeToFlags 
} from '@/components/projects/FramingScopePicker';
import SovItemsBuilder from '@/components/projects/SovItemsBuilder';
import { SovLineItem } from '@/lib/generateSovItemsFromScope';
import ScopeLocationPicker, {
  ScopeLocation,
  getDefaultScopeLocation,
  scopeLocationToFlags,
  getScopeLocationSummary
} from '@/components/projects/ScopeLocationPicker';
import { 
  Building2, 
  ArrowLeft, 
  ArrowRight, 
  MapPin, 
  Home,
  Hotel,
  Layers,
  Check,
  Users,
  DollarSign,
  FileText,
  Settings,
  Package
} from 'lucide-react';
import { toast } from 'sonner';

type Step = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
type StructureType = 'SINGLE_FAMILY' | 'TOWNHOME' | 'APARTMENT' | 'HOTEL';
type ContractMode = 'TWO_PARTY' | 'THREE_PARTY';

// Legacy LocationFlags kept for backwards compatibility but now generated from ScopeLocation
interface LocationFlags {
  basement: boolean;
  garage: boolean;
  attached_garage: boolean;
  detached_garage: boolean;
  decks: boolean;
  roof_decks: boolean;
  porches: boolean;
  roof: boolean;
  attic: boolean;
  staircases: boolean;
  common_areas: boolean;
}

interface UserWithCompany {
  id: string;
  email: string;
  companyId: string;
  companyName: string;
}

interface ProjectData {
  name: string;
  address: string;
  structureType: StructureType;
  floors: number;
  contractMode: ContractMode;
  locationFlags: LocationFlags;
  scopeLocation: ScopeLocation;
  tcProvidesMaterials: boolean;
  framingScope: FramingScope;
  sovItems: SovLineItem[];
  fieldCrewUserId: string;
  fieldCrewCompanyId: string;
  gcUserId: string;
  gcCompanyId: string;
  fieldCrewHourlyRate: string;
  tcHourlyRate: string;
  retainagePercent: string;
  allowArchiving: boolean;
}

const STRUCTURE_TYPES: { value: StructureType; label: string; icon: React.ElementType }[] = [
  { value: 'APARTMENT', label: 'Apartment', icon: Building2 },
  { value: 'TOWNHOME', label: 'Townhome', icon: Layers },
  { value: 'SINGLE_FAMILY', label: 'Single Family', icon: Home },
  { value: 'HOTEL', label: 'Hotel', icon: Hotel },
];

const LOCATION_OPTIONS: { key: keyof LocationFlags; label: string; showFor?: StructureType[] }[] = [
  { key: 'basement', label: 'Basement' },
  { key: 'garage', label: 'Garage', showFor: ['SINGLE_FAMILY', 'TOWNHOME', 'HOTEL'] },
  { key: 'attached_garage', label: 'Attached Garage', showFor: ['APARTMENT'] },
  { key: 'detached_garage', label: 'Detached Garage', showFor: ['APARTMENT'] },
  { key: 'decks', label: 'Decks', showFor: ['SINGLE_FAMILY', 'APARTMENT', 'HOTEL'] },
  { key: 'roof_decks', label: 'Roof Decks', showFor: ['TOWNHOME'] },
  { key: 'porches', label: 'Porches' },
  { key: 'roof', label: 'Roof' },
  { key: 'attic', label: 'Attic' },
  { key: 'staircases', label: 'Staircases' },
  { key: 'common_areas', label: 'Common Areas', showFor: ['APARTMENT', 'HOTEL'] },
];

const STORAGE_KEY = 'lovable_new_project_draft';

const getDefaultProjectData = (): ProjectData => ({
  name: '',
  address: '',
  structureType: 'APARTMENT',
  floors: 1,
  contractMode: 'THREE_PARTY',
  locationFlags: {
    basement: false,
    garage: false,
    attached_garage: false,
    detached_garage: false,
    decks: false,
    roof_decks: false,
    porches: false,
    roof: false,
    attic: false,
    staircases: false,
    common_areas: false,
  },
  scopeLocation: getDefaultScopeLocation(),
  tcProvidesMaterials: false,
  framingScope: getDefaultFramingScope(),
  sovItems: [],
  fieldCrewUserId: '',
  fieldCrewCompanyId: '',
  gcUserId: '',
  gcCompanyId: '',
  fieldCrewHourlyRate: '',
  tcHourlyRate: '',
  retainagePercent: '',
  allowArchiving: true,
});

const loadSavedProgress = (): { step: Step; data: ProjectData } | null => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        step: parsed.step || 1,
        data: { ...getDefaultProjectData(), ...parsed.data }
      };
    }
  } catch (e) {
    console.error('Failed to load saved progress:', e);
  }
  return null;
};

export default function NewProject() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const savedProgress = loadSavedProgress();
  const [step, setStep] = useState<Step>(savedProgress?.step || 1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userCompanyName, setUserCompanyName] = useState<string>('');
  const [userCompanyId, setUserCompanyId] = useState<string>('');
  const [availableUsers, setAvailableUsers] = useState<UserWithCompany[]>([]);
  const [showRestoredToast, setShowRestoredToast] = useState(!!savedProgress);
  
  const [projectData, setProjectData] = useState<ProjectData>(
    savedProgress?.data || getDefaultProjectData()
  );

  // Save progress to localStorage whenever step or projectData changes
  useEffect(() => {
    const saveProgress = () => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
          step,
          data: projectData,
          savedAt: new Date().toISOString()
        }));
      } catch (e) {
        console.error('Failed to save progress:', e);
      }
    };
    saveProgress();
  }, [step, projectData]);

  // Show toast when progress is restored
  useEffect(() => {
    if (showRestoredToast && savedProgress) {
      toast.success('Draft restored', {
        description: 'Your previous progress has been loaded.',
        action: {
          label: 'Start Fresh',
          onClick: clearSavedProgress
        }
      });
      setShowRestoredToast(false);
    }
  }, [showRestoredToast]);

  const clearSavedProgress = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      setStep(1);
      setProjectData(getDefaultProjectData());
      toast.success('Draft cleared');
    } catch (e) {
      console.error('Failed to clear saved progress:', e);
    }
  };

  // Fetch user's company and available users
  useEffect(() => {
    async function fetchData() {
      if (!user) return;
      
      // Get user's company
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id, companies(name)')
        .eq('id', user.id)
        .single();
      
      if (profile?.company_id) {
        setUserCompanyId(profile.company_id);
        const company = profile.companies as { name: string } | null;
        if (company?.name) {
          setUserCompanyName(company.name);
        }
      }
      
      // Get all available users with their companies using RPC
      const { data: users, error } = await supabase
        .rpc('get_available_users_for_project');
      
      if (users && !error) {
        const usersWithCompanies: UserWithCompany[] = users
          .filter(u => u.user_id !== user.id) // Exclude current user
          .map(u => ({
            id: u.user_id,
            email: u.email,
            companyId: u.company_id,
            companyName: u.company_name || 'Unknown Company',
          }));
        setAvailableUsers(usersWithCompanies);
      }
    }
    
    fetchData();
  }, [user]);

  // Auth guard: redirect if not logged in
  if (!user) {
    toast.error('Please sign in to create a project');
    navigate('/auth');
    return null;
  }

  const updateData = <K extends keyof ProjectData>(key: K, value: ProjectData[K]) => {
    setProjectData(prev => ({ ...prev, [key]: value }));
  };

  const toggleLocationFlag = (flag: keyof LocationFlags) => {
    setProjectData(prev => ({
      ...prev,
      locationFlags: {
        ...prev.locationFlags,
        [flag]: !prev.locationFlags[flag]
      }
    }));
  };

  const updateFramingScope = (scope: FramingScope) => {
    setProjectData(prev => ({ ...prev, framingScope: scope }));
  };

  const updateScopeLocation = (scopeLocation: ScopeLocation) => {
    setProjectData(prev => ({ ...prev, scopeLocation }));
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return projectData.name.trim() !== '' && projectData.address.trim() !== '';
      case 2:
        return true; // Contract structure always has a default
      case 3:
        return projectData.floors > 0; // Must have floors set
      case 4:
        return true; // Framing Scope is optional
      case 5:
        // For THREE_PARTY mode, require both users; for TWO_PARTY, only GC
        if (projectData.contractMode === 'THREE_PARTY') {
          return projectData.fieldCrewUserId !== '' && projectData.gcUserId !== '';
        }
        return projectData.gcUserId !== '';
      case 6:
        return true; // Rates are optional
      case 7:
        return true; // Control settings have defaults
      case 8:
        return true; // Review step
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (step < 8) {
      setStep((step + 1) as Step);
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep((step - 1) as Step);
    } else {
      navigate('/dashboard');
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    
    try {
      // Convert scopes to flat flags and combine
      const framingFlags = framingScopeToFlags(projectData.framingScope);
      const locationFlags = scopeLocationToFlags(projectData.scopeLocation);
      const scopeFlags = {
        ...projectData.locationFlags,  // Legacy flags for backwards compat
        ...framingFlags,
        ...locationFlags,
        tc_provides_materials: projectData.tcProvidesMaterials,
      };

      // Use RPC to create project with user IDs for invitations
      // Pass SOV items from frontend to ensure 100% distribution
      const sovItemNames = projectData.sovItems.map(item => item.name);
      
      const { data: projectId, error } = await supabase.rpc('create_project', {
        _name: projectData.name,
        _address: projectData.address,
        _structure_type: projectData.structureType,
        _floors: projectData.floors,
        _scope_flags: scopeFlags as unknown as Record<string, boolean>,
        _contract_mode: projectData.contractMode,
        _fc_user_id: projectData.fieldCrewUserId || null,
        _gc_user_id: projectData.gcUserId || null,
        _sov_items: sovItemNames,
      });

      if (error) throw error;

      // Update retainage if set (RPC doesn't support this field yet)
      if (projectData.retainagePercent && projectId) {
        await supabase
          .from('projects')
          .update({ retainage_percent: parseFloat(projectData.retainagePercent) })
          .eq('id', projectId);
      }

      // Clear saved draft on successful creation
      localStorage.removeItem(STORAGE_KEY);

      toast.success('Project created successfully!');
      navigate(`/projects/${projectId}`);
    } catch (error: any) {
      console.error('Error creating project:', error);
      toast.error(error.message || 'Failed to create project. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStepTitle = () => {
    switch (step) {
      case 1: return 'Project Basics';
      case 2: return 'Contract Structure';
      case 3: return 'Scope & Locations';
      case 4: return 'SOV Items';
      case 5: return 'Contract Relationships';
      case 6: return 'Internal Rates';
      case 7: return 'Project Control';
      case 8: return 'Review & Create';
    }
  };

  const getSelectedLocations = () => {
    // Use new structured scope location summary
    return getScopeLocationSummary(projectData.scopeLocation);
  };

  const getSovItemsSummary = () => {
    const count = projectData.sovItems.length;
    if (count === 0) return 'No items';
    if (count <= 3) return projectData.sovItems.map(i => i.name).join(', ');
    return `${projectData.sovItems.slice(0, 2).map(i => i.name).join(', ')} +${count - 2} more`;
  };

  const getCompanyName = (userId: string) => {
    const user = availableUsers.find(u => u.id === userId);
    return user?.companyName || 'Not selected';
  };

  const STEPS: { step: Step; title: string; icon: React.ElementType }[] = [
    { step: 1, title: 'Basics', icon: Building2 },
    { step: 2, title: 'Contract', icon: Users },
    { step: 3, title: 'Locations', icon: MapPin },
    { step: 4, title: 'SOV', icon: Layers },
    { step: 5, title: 'Relationships', icon: Users },
    { step: 6, title: 'Rates', icon: DollarSign },
    { step: 7, title: 'Control', icon: Settings },
    { step: 8, title: 'Review', icon: FileText },
  ];

  const canNavigateToStep = (targetStep: Step): boolean => {
    // Can always go back to completed steps
    if (targetStep < step) return true;
    // Can only go forward if current step is valid
    if (targetStep === step) return true;
    // Check if all previous steps are complete
    for (let s = 1; s < targetStep; s++) {
      if (s === 1 && (projectData.name.trim() === '' || projectData.address.trim() === '')) {
        return false;
      }
      if (s === 3 && projectData.floors <= 0) {
        return false;
      }
      if (s === 5 && projectData.contractMode === 'THREE_PARTY' && (projectData.fieldCrewUserId === '' || projectData.gcUserId === '')) {
        return false;
      }
      if (s === 5 && projectData.contractMode === 'TWO_PARTY' && projectData.gcUserId === '') {
        return false;
      }
    }
    return true;
  };

  const handleStepClick = (targetStep: Step) => {
    if (canNavigateToStep(targetStep)) {
      setStep(targetStep);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-safe-bottom">
      <header className="sticky top-0 z-50 bg-background border-b border-border">
        <div className="container flex items-center h-14 px-4">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={handleBack}
            className="mr-2"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="font-semibold text-foreground">Create New Project</h1>
            <p className="text-xs text-muted-foreground">Step {step} of 8 — {getStepTitle()}</p>
          </div>
        </div>
        
        {/* Step Progress Indicator */}
        <div className="container px-4 py-3 overflow-x-auto">
          <div className="flex items-center justify-between min-w-max gap-1">
            {STEPS.map((s, index) => {
              const Icon = s.icon;
              const isCompleted = s.step < step;
              const isCurrent = s.step === step;
              const isClickable = canNavigateToStep(s.step);
              
              return (
                <div key={s.step} className="flex items-center">
                  <button
                    type="button"
                    onClick={() => handleStepClick(s.step)}
                    disabled={!isClickable}
                    className={`flex flex-col items-center gap-1 px-2 py-1 rounded-lg transition-all ${
                      isClickable ? 'cursor-pointer hover:bg-muted/50' : 'cursor-not-allowed opacity-50'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                      isCurrent 
                        ? 'bg-accent text-accent-foreground ring-2 ring-accent ring-offset-2 ring-offset-background' 
                        : isCompleted 
                          ? 'bg-accent/20 text-accent' 
                          : 'bg-muted text-muted-foreground'
                    }`}>
                      {isCompleted ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Icon className="h-4 w-4" />
                      )}
                    </div>
                    <span className={`text-[10px] font-medium whitespace-nowrap ${
                      isCurrent ? 'text-accent' : isCompleted ? 'text-foreground' : 'text-muted-foreground'
                    }`}>
                      {s.title}
                    </span>
                  </button>
                  
                  {index < STEPS.length - 1 && (
                    <div className={`w-4 h-0.5 mx-0.5 ${
                      isCompleted ? 'bg-accent' : 'bg-muted'
                    }`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </header>

      <main className="container px-4 py-6">
        <div className="max-w-lg mx-auto">
          {/* Step 1: Project Basics */}
          {step === 1 && (
            <div className="animate-slide-up space-y-6">
              <div className="text-center mb-8">
                <div className="w-16 h-16 rounded-2xl gradient-hero flex items-center justify-center mx-auto mb-4">
                  <Building2 className="h-8 w-8 text-accent" />
                </div>
                <h2 className="text-2xl font-bold text-foreground mb-2">Project Basics</h2>
                <p className="text-muted-foreground">Let's start with the essentials</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-base">Project Name</Label>
                  <Input
                    id="name"
                    placeholder="e.g., Sunset Villas – Building A"
                    className="h-14 text-lg"
                    value={projectData.name}
                    onChange={(e) => updateData('name', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address" className="text-base">Project Address</Label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                      id="address"
                      placeholder="e.g., 1234 W Main St, Denver, CO"
                      className="h-14 text-lg pl-12"
                      value={projectData.address}
                      onChange={(e) => updateData('address', e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-base">Project Type</Label>
                  <div className="grid grid-cols-2 gap-3">
                    {STRUCTURE_TYPES.map((type) => {
                      const Icon = type.icon;
                      const isSelected = projectData.structureType === type.value;
                      return (
                        <button
                          key={type.value}
                          type="button"
                          onClick={() => updateData('structureType', type.value)}
                          className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                            isSelected
                              ? 'border-accent bg-accent/10'
                              : 'border-border hover:border-accent/50'
                          }`}
                        >
                          <Icon className={`h-5 w-5 ${isSelected ? 'text-accent' : 'text-muted-foreground'}`} />
                          <span className={`font-medium text-sm ${isSelected ? 'text-accent' : 'text-foreground'}`}>
                            {type.label}
                          </span>
                          {isSelected && <Check className="h-4 w-4 text-accent ml-auto" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* Step 2: Contract Structure */}
          {step === 2 && (
            <div className="animate-slide-up space-y-6">
              <div className="text-center mb-8">
                <div className="w-16 h-16 rounded-2xl gradient-hero flex items-center justify-center mx-auto mb-4">
                  <Users className="h-8 w-8 text-accent" />
                </div>
                <h2 className="text-2xl font-bold text-foreground mb-2">Contract Structure</h2>
                <p className="text-muted-foreground">How many parties are involved in this project?</p>
              </div>

              <div className="space-y-4">
                <button
                  type="button"
                  onClick={() => updateData('contractMode', 'TWO_PARTY')}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                    projectData.contractMode === 'TWO_PARTY'
                      ? 'border-accent bg-accent/10'
                      : 'border-border hover:border-accent/50'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      projectData.contractMode === 'TWO_PARTY' ? 'bg-accent text-accent-foreground' : 'bg-muted text-muted-foreground'
                    }`}>
                      <Users className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className={`font-semibold ${projectData.contractMode === 'TWO_PARTY' ? 'text-accent' : 'text-foreground'}`}>
                          Two Parties
                        </span>
                        {projectData.contractMode === 'TWO_PARTY' && <Check className="h-5 w-5 text-accent" />}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Direct contract between you and a GC/Client. Single SOV, no profit margin tracking.
                      </p>
                      <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
                        <Badge variant="secondary">You</Badge>
                        <ArrowRight className="h-3 w-3" />
                        <Badge variant="secondary">GC / Client</Badge>
                      </div>
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => updateData('contractMode', 'THREE_PARTY')}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                    projectData.contractMode === 'THREE_PARTY'
                      ? 'border-accent bg-accent/10'
                      : 'border-border hover:border-accent/50'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      projectData.contractMode === 'THREE_PARTY' ? 'bg-accent text-accent-foreground' : 'bg-muted text-muted-foreground'
                    }`}>
                      <Layers className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className={`font-semibold ${projectData.contractMode === 'THREE_PARTY' ? 'text-accent' : 'text-foreground'}`}>
                          Three Parties
                        </span>
                        {projectData.contractMode === 'THREE_PARTY' && <Check className="h-5 w-5 text-accent" />}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        You're in the middle — hire Field Crew and bill to GC. Dual SOVs with profit margin tracking.
                      </p>
                      <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
                        <Badge variant="secondary">Field Crew</Badge>
                        <ArrowRight className="h-3 w-3" />
                        <Badge variant="outline">You (TC)</Badge>
                        <ArrowRight className="h-3 w-3" />
                        <Badge variant="secondary">GC</Badge>
                      </div>
                    </div>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Scope & Locations */}
          {step === 3 && (
            <div className="animate-slide-up space-y-6">
              <div className="text-center mb-8">
                <div className="w-16 h-16 rounded-2xl gradient-hero flex items-center justify-center mx-auto mb-4">
                  <MapPin className="h-8 w-8 text-accent" />
                </div>
                <h2 className="text-2xl font-bold text-foreground mb-2">Scope & Location</h2>
                <p className="text-muted-foreground">Define project structure and material responsibility</p>
              </div>

              <div className="space-y-6">
                {/* Number of Floors - Moved from Step 1 */}
                <div className="space-y-2">
                  <Label htmlFor="floors" className="text-base font-semibold">Number of Floors</Label>
                  <Input
                    id="floors"
                    type="number"
                    min={1}
                    max={100}
                    className="h-14 text-lg"
                    value={projectData.floors === 0 ? '' : projectData.floors}
                    onChange={(e) => updateData('floors', parseInt(e.target.value) || 0)}
                  />
                  <p className="text-xs text-muted-foreground">Used for location options and SOV generation</p>
                </div>

                {/* Material Responsibility */}
                <div className="space-y-3">
                  <Label className="text-base font-semibold flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Material Responsibility
                  </Label>
                  <p className="text-sm text-muted-foreground">Does the Trade Contractor (TC) provide materials?</p>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => updateData('tcProvidesMaterials', true)}
                      className={`p-4 rounded-xl border-2 transition-all text-left ${
                        projectData.tcProvidesMaterials
                          ? 'border-accent bg-accent/10'
                          : 'border-border hover:border-accent/50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                          projectData.tcProvidesMaterials ? 'border-accent' : 'border-muted-foreground'
                        }`}>
                          {projectData.tcProvidesMaterials && <div className="w-2 h-2 rounded-full bg-accent" />}
                        </div>
                        <span className={`font-semibold ${projectData.tcProvidesMaterials ? 'text-accent' : 'text-foreground'}`}>Yes</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">Materials included in SOV & billing</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => updateData('tcProvidesMaterials', false)}
                      className={`p-4 rounded-xl border-2 transition-all text-left ${
                        !projectData.tcProvidesMaterials
                          ? 'border-accent bg-accent/10'
                          : 'border-border hover:border-accent/50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                          !projectData.tcProvidesMaterials ? 'border-accent' : 'border-muted-foreground'
                        }`}>
                          {!projectData.tcProvidesMaterials && <div className="w-2 h-2 rounded-full bg-accent" />}
                        </div>
                        <span className={`font-semibold ${!projectData.tcProvidesMaterials ? 'text-accent' : 'text-foreground'}`}>No</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">Labor-only SOV; add materials via CO</p>
                    </button>
                  </div>
                </div>

                {/* Areas / Locations - New Structured Picker */}
                <div className="space-y-3">
                  <Label className="text-base font-semibold">Project Scope & Areas</Label>
                  <p className="text-sm text-muted-foreground">
                    Configure foundation, basement, garage, exterior spaces, and more
                  </p>
                  <ScopeLocationPicker
                    value={projectData.scopeLocation}
                    onChange={updateScopeLocation}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 4: SOV Items Builder */}
          {step === 4 && (
            <div className="animate-slide-up space-y-6">
              <div className="text-center mb-8">
                <div className="w-16 h-16 rounded-2xl gradient-hero flex items-center justify-center mx-auto mb-4">
                  <Layers className="h-8 w-8 text-accent" />
                </div>
                <h2 className="text-2xl font-bold text-foreground mb-2">Schedule of Values</h2>
                <p className="text-muted-foreground">Build your SOV line items — auto-generated from scope</p>
              </div>

              <SovItemsBuilder
                structureType={projectData.structureType}
                floors={projectData.floors}
                tcProvidesMaterials={projectData.tcProvidesMaterials}
                framingScope={projectData.framingScope}
                scopeLocation={projectData.scopeLocation}
                items={projectData.sovItems}
                onChange={(items) => updateData('sovItems', items)}
              />
            </div>
          )}

          {/* Step 5: Contract Relationships */}
          {step === 5 && (
            <div className="animate-slide-up space-y-6">
              <div className="text-center mb-8">
                <div className="w-16 h-16 rounded-2xl gradient-hero flex items-center justify-center mx-auto mb-4">
                  <Users className="h-8 w-8 text-accent" />
                </div>
                <h2 className="text-2xl font-bold text-foreground mb-2">Contract Relationships</h2>
                <p className="text-muted-foreground">
                  {projectData.contractMode === 'THREE_PARTY' ? 'Defines the pricing firewall' : 'Select your client/GC'}
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-base">Trade Contractor</Label>
                  <div className="h-14 px-4 rounded-md border border-input bg-muted/50 flex items-center">
                    <span className="text-foreground font-medium">{userCompanyName || 'Your Company'}</span>
                    <span className="ml-auto text-xs text-muted-foreground">Auto-assigned</span>
                  </div>
                </div>

                {projectData.contractMode === 'THREE_PARTY' && (
                  <div className="space-y-2">
                    <Label className="text-base">Field Crew Company</Label>
                    <UserSearchSelect
                      users={availableUsers}
                      value={projectData.fieldCrewUserId}
                      onValueChange={(userId, companyId) => {
                        updateData('fieldCrewUserId', userId);
                        updateData('fieldCrewCompanyId', companyId);
                      }}
                      placeholder="Search by email or company..."
                    />
                    <p className="text-xs text-muted-foreground">For DOWNSTREAM contract (TC ↔ Field Crew)</p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label className="text-base">
                    {projectData.contractMode === 'THREE_PARTY' ? 'General Contractor Company' : 'Client / GC Company'}
                  </Label>
                  <UserSearchSelect
                    users={availableUsers}
                    value={projectData.gcUserId}
                    onValueChange={(userId, companyId) => {
                      updateData('gcUserId', userId);
                      updateData('gcCompanyId', companyId);
                    }}
                    placeholder="Search by email or company..."
                  />
                  <p className="text-xs text-muted-foreground">
                    {projectData.contractMode === 'THREE_PARTY' ? 'For UPSTREAM contract (TC ↔ GC)' : 'Your direct client for this project'}
                  </p>
                </div>

                <Card className="bg-accent/5 border-accent/20">
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">
                      <strong>System creates automatically:</strong>
                    </p>
                    <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                      {projectData.contractMode === 'THREE_PARTY' ? (
                        <>
                          <li>• DOWNSTREAM context (Trade Contractor ↔ Field Crew)</li>
                          <li>• UPSTREAM context (Trade Contractor ↔ GC)</li>
                          <li>• Dual SOVs for profit margin tracking</li>
                        </>
                      ) : (
                        <>
                          <li>• Single contract context (You ↔ Client/GC)</li>
                          <li>• Single SOV for billing</li>
                        </>
                      )}
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Step 6: Internal Rates */}
          {step === 6 && (
            <div className="animate-slide-up space-y-6">
              <div className="text-center mb-8">
                <div className="w-16 h-16 rounded-2xl gradient-hero flex items-center justify-center mx-auto mb-4">
                  <DollarSign className="h-8 w-8 text-accent" />
                </div>
                <h2 className="text-2xl font-bold text-foreground mb-2">Internal Rates</h2>
                <p className="text-muted-foreground">Optional — never visible outside each context</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fieldCrewRate" className="text-base">
                    Default Hourly Rate for Field Crew (Downstream)
                  </Label>
                  <div className="relative">
                    <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                      id="fieldCrewRate"
                      type="number"
                      min={0}
                      step={0.01}
                      placeholder="e.g., 35"
                      className="h-14 text-lg pl-12"
                      value={projectData.fieldCrewHourlyRate}
                      onChange={(e) => updateData('fieldCrewHourlyRate', e.target.value)}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Can be overridden per Change Order</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tcRate" className="text-base">
                    Default Hourly Rate for Trade Contractor (Upstream)
                  </Label>
                  <div className="relative">
                    <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                      id="tcRate"
                      type="number"
                      min={0}
                      step={0.01}
                      placeholder="e.g., 65"
                      className="h-14 text-lg pl-12"
                      value={projectData.tcHourlyRate}
                      onChange={(e) => updateData('tcHourlyRate', e.target.value)}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Can be overridden per Change Order</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="retainage" className="text-base">
                    Retainage Percentage
                  </Label>
                  <div className="relative">
                    <Input
                      id="retainage"
                      type="number"
                      min={0}
                      max={100}
                      step={0.5}
                      placeholder="e.g., 10"
                      className="h-14 text-lg pr-12"
                      value={projectData.retainagePercent}
                      onChange={(e) => updateData('retainagePercent', e.target.value)}
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">%</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Percentage withheld from each payment until project completion</p>
                </div>

                <Card className="bg-muted/50 border-border">
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">
                      These are defaults only. You can set or change rates later per project or per Change Order.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Step 7: Project Control */}
          {step === 7 && (
            <div className="animate-slide-up space-y-6">
              <div className="text-center mb-8">
                <div className="w-16 h-16 rounded-2xl gradient-hero flex items-center justify-center mx-auto mb-4">
                  <Settings className="h-8 w-8 text-accent" />
                </div>
                <h2 className="text-2xl font-bold text-foreground mb-2">Project Control</h2>
                <p className="text-muted-foreground">Manage project settings</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-base">Project Creator</Label>
                  <div className="h-14 px-4 rounded-md border border-input bg-muted/50 flex items-center">
                    <span className="text-foreground font-medium">{user?.email}</span>
                    <span className="ml-auto text-xs text-muted-foreground bg-accent/10 text-accent px-2 py-1 rounded">Creator</span>
                  </div>
                </div>

                <Card 
                  className={`border-2 cursor-pointer transition-all ${
                    projectData.allowArchiving 
                      ? 'border-accent bg-accent/5' 
                      : 'border-border hover:border-accent/30'
                  }`}
                  onClick={() => updateData('allowArchiving', !projectData.allowArchiving)}
                >
                  <CardContent className="p-4 flex items-center gap-3">
                    <Checkbox 
                      checked={projectData.allowArchiving}
                      onCheckedChange={() => updateData('allowArchiving', !projectData.allowArchiving)}
                    />
                    <div>
                      <span className="font-medium">Allow archiving this project later</span>
                      <p className="text-xs text-muted-foreground mt-1">
                        Archiving is blocked if there's active work
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Step 8: Review & Create */}
          {step === 8 && (
            <div className="animate-slide-up space-y-6">
              <div className="text-center mb-8">
                <div className="w-16 h-16 rounded-2xl gradient-hero flex items-center justify-center mx-auto mb-4">
                  <FileText className="h-8 w-8 text-accent" />
                </div>
                <h2 className="text-2xl font-bold text-foreground mb-2">Review & Create</h2>
                <p className="text-muted-foreground">Confirm your project details</p>
              </div>

              <div className="space-y-4">
                <Card className="border-border">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Project Name</span>
                      <span className="font-medium text-foreground">{projectData.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Address</span>
                      <span className="font-medium text-foreground text-right max-w-[200px]">{projectData.address}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Project Type</span>
                      <span className="font-medium text-foreground">
                        {STRUCTURE_TYPES.find(t => t.value === projectData.structureType)?.label}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Floors</span>
                      <span className="font-medium text-foreground">{projectData.floors}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Contract Mode</span>
                      <Badge variant={projectData.contractMode === 'THREE_PARTY' ? 'default' : 'secondary'}>
                        {projectData.contractMode === 'THREE_PARTY' ? 'Three Parties' : 'Two Parties'}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-border">
                  <CardContent className="p-4 space-y-3">
                    <div>
                      <span className="text-muted-foreground text-sm">Selected Locations</span>
                      <p className="font-medium text-foreground">
                        {getSelectedLocations().length > 0 ? getSelectedLocations().join(', ') : 'None'}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-sm">SOV Line Items</span>
                      <p className="font-medium text-foreground">
                        {projectData.sovItems.length > 0 ? getSovItemsSummary() : 'None'}
                      </p>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">TC Provides Materials</span>
                      <Badge variant={projectData.tcProvidesMaterials ? 'default' : 'secondary'}>
                        {projectData.tcProvidesMaterials ? 'Yes' : 'No'}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-border">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Trade Contractor</span>
                      <span className="font-medium text-foreground">{userCompanyName || 'Your Company'}</span>
                    </div>
                    {projectData.contractMode === 'THREE_PARTY' && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Field Crew</span>
                        <span className="font-medium text-foreground">{getCompanyName(projectData.fieldCrewUserId)}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        {projectData.contractMode === 'THREE_PARTY' ? 'General Contractor' : 'Client / GC'}
                      </span>
                      <span className="font-medium text-foreground">{getCompanyName(projectData.gcUserId)}</span>
                    </div>
                  </CardContent>
                </Card>

                {(projectData.fieldCrewHourlyRate || projectData.tcHourlyRate || projectData.retainagePercent) && (
                  <Card className="border-border">
                    <CardContent className="p-4 space-y-3">
                      {projectData.contractMode === 'THREE_PARTY' && projectData.fieldCrewHourlyRate && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Field Crew Rate</span>
                          <span className="font-medium text-foreground">${projectData.fieldCrewHourlyRate}/hr</span>
                        </div>
                      )}
                      {projectData.tcHourlyRate && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">TC Rate (Upstream)</span>
                          <span className="font-medium text-foreground">${projectData.tcHourlyRate}/hr</span>
                        </div>
                      )}
                      {projectData.retainagePercent && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Retainage</span>
                          <span className="font-medium text-foreground">{projectData.retainagePercent}%</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                <Card className="bg-accent/5 border-accent/20">
                  <CardContent className="p-4">
                    <p className="text-sm font-medium text-foreground mb-2">System will automatically:</p>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      {projectData.contractMode === 'THREE_PARTY' ? (
                        <>
                          <li>✓ Create DOWNSTREAM contract context</li>
                          <li>✓ Create UPSTREAM contract context</li>
                          <li>✓ Generate dual draft SOVs based on scope</li>
                          <li>✓ Enable profit margin tracking</li>
                        </>
                      ) : (
                        <>
                          <li>✓ Create single contract context</li>
                          <li>✓ Generate draft SOV based on scope</li>
                        </>
                      )}
                      <li>✓ Add you as Project Creator</li>
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex gap-3 mt-8">
            <Button 
              variant="outline" 
              size="lg" 
              className="flex-1"
              onClick={handleBack}
            >
              Back
            </Button>
            <Button 
              variant="accent" 
              size="lg" 
              className="flex-1"
              onClick={handleNext}
              disabled={!canProceed() || isSubmitting}
            >
              {step === 8 ? (isSubmitting ? 'Creating...' : 'Create Project') : 'Next'}
              <ArrowRight className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
