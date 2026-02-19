import React, { useState, useEffect } from 'react';
import { formatPhone } from '@/lib/formatPhone';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Building2, Mail, Lock, User, Phone, MapPin, Loader2, 
  Wrench, Briefcase
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';
import { OrgType, ORG_TYPE_LABELS } from '@/types/organization';
import { TRADES, Trade } from '@/types/projectWizard';

// Role labels using full text (no abbreviations)
const ROLE_OPTIONS = [
  { value: 'GC', label: 'General Contractor' },
  { value: 'TC', label: 'Trade Contractor' },
  { value: 'FC', label: 'Field Crew' },
  { value: 'SUPPLIER', label: 'Supplier' },
] as const;

// Job title options for all org types
const JOB_TITLES = [
  'Owner',
  'Project Manager',
  'Superintendent',
  'Estimator',
  'Office Manager',
  'Foreman',
  'Other',
];

// Sign In schema
const signInSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

// Sign Up schema - comprehensive one-page form
const signUpSchema = z.object({
  // User info
  fullName: z.string().min(2, 'Full name is required'),
  email: z.string().email('Please enter a valid email'),
  phone: z.string().optional(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
  // Company info
  orgName: z.string().min(2, 'Organization name is required'),
  street: z.string().min(2, 'Street address is required'),
  city: z.string().min(2, 'City is required'),
  state: z.string().min(2, 'State is required'),
  zip: z.string().min(5, 'ZIP code is required'),
  // Role
  role: z.enum(['GC', 'TC', 'FC', 'SUPPLIER']),
  // Job title (for all users)
  jobTitle: z.string().optional(),
  // Trade (conditional for TC/FC)
  trade: z.string().optional(),
  tradeCustom: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
}).refine((data) => {
  // Trade is required for TC and FC
  if ((data.role === 'TC' || data.role === 'FC') && !data.trade) {
    return false;
  }
  return true;
}, {
  message: 'Trade is required for Trade Contractor and Field Crew',
  path: ['trade'],
}).refine((data) => {
  // If trade is "Other", tradeCustom is required
  if (data.trade === 'Other' && !data.tradeCustom) {
    return false;
  }
  return true;
}, {
  message: 'Please enter your trade name',
  path: ['tradeCustom'],
});

type SignUpForm = z.infer<typeof signUpSchema>;

export function AuthSection() {
  const navigate = useNavigate();
  const { signIn, user, userOrgRoles, loading: authLoading, refreshUserData } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('signin');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Sign In form
  const [signInForm, setSignInForm] = useState({
    email: '',
    password: '',
  });

  // Sign Up form
  const [signUpForm, setSignUpForm] = useState<SignUpForm>({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    orgName: '',
    street: '',
    city: '',
    state: '',
    zip: '',
    role: 'TC',
    jobTitle: '',
    trade: '',
    tradeCustom: '',
  });

  // Redirect if already signed in with org
  useEffect(() => {
    if (!authLoading && user && userOrgRoles.length > 0) {
      navigate('/dashboard');
    }
  }, [authLoading, user, userOrgRoles, navigate]);

  const updateSignUpField = (field: keyof SignUpForm, value: string | boolean) => {
    setSignUpForm((prev) => {
      const updated = { ...prev, [field]: value };
      // Clear trade when switching to org types that don't need it
      if (field === 'role' && (value === 'GC' || value === 'SUPPLIER')) {
        updated.trade = '';
        updated.tradeCustom = '';
      }
      return updated;
    });
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = signInSchema.safeParse(signInForm);
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

    setLoading(true);
    const { error } = await signIn(signInForm.email, signInForm.password);
    setLoading(false);

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Sign in failed',
        description: error.message,
      });
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = signUpSchema.safeParse(signUpForm);
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

    setLoading(true);

    // Step 1: Create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: signUpForm.email,
      password: signUpForm.password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { full_name: signUpForm.fullName },
      },
    });

    if (authError) {
      setLoading(false);
      toast({
        variant: 'destructive',
        title: 'Sign up failed',
        description: authError.message,
      });
      return;
    }

    // Wait for session to be fully established
    // The user must be confirmed and session active before calling RPC
    let session = authData.session;
    let retries = 0;
    const maxRetries = 10;
    
    while (!session && retries < maxRetries) {
      await new Promise(resolve => setTimeout(resolve, 300));
      const { data: sessionData } = await supabase.auth.getSession();
      session = sessionData.session;
      retries++;
    }

    if (!session) {
      setLoading(false);
      toast({
        variant: 'destructive',
        title: 'Sign up incomplete',
        description: 'Please check your email to confirm your account, then sign in.',
      });
      return;
    }

    // Step 2: Create organization with role
    const nameParts = signUpForm.fullName.trim().split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    const { data: orgData, error: orgError } = await supabase.rpc('create_organization_and_set_admin', {
      _org_type: signUpForm.role as OrgType,
      _org_name: signUpForm.orgName,
      _address: {
        street: signUpForm.street,
        city: signUpForm.city,
        state: signUpForm.state,
        zip: signUpForm.zip,
      },
      _org_phone: null,
      _user_first_name: firstName,
      _user_last_name: lastName,
      _user_phone: signUpForm.phone || null,
    });

    if (orgError) {
      setLoading(false);
      toast({
        variant: 'destructive',
        title: 'Organization setup failed',
        description: orgError.message,
      });
      return;
    }

    // Step 3: Update organization with trade if applicable
    if ((signUpForm.role === 'TC' || signUpForm.role === 'FC') && signUpForm.trade) {
      const orgId = (orgData as { organization_id: string }).organization_id;
      await supabase
        .from('organizations')
        .update({
          trade: signUpForm.trade,
          trade_custom: signUpForm.trade === 'Other' ? signUpForm.tradeCustom : null,
        })
        .eq('id', orgId);
    }

    // Step 4: Update profile with job title if provided
    if (signUpForm.jobTitle && session?.user) {
      await supabase
        .from('profiles')
        .update({ job_title: signUpForm.jobTitle })
        .eq('user_id', session.user.id);
    }

    // Pricing defaults are now configured on the Profile page

    setLoading(false);

    toast({
      title: 'Account created!',
      description: `Your organization code is ${(orgData as { org_code: string }).org_code}`,
    });

    await refreshUserData();
    navigate('/dashboard');
  };

  const showTradeField = signUpForm.role === 'TC' || signUpForm.role === 'FC';
  return (
    <section id="auth" className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="max-w-xl mx-auto">
          <Card className="p-6 md:p-8">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="signin" className="text-base">Sign In</TabsTrigger>
                <TabsTrigger value="signup" className="text-base">Sign Up</TabsTrigger>
              </TabsList>

              {/* SIGN IN TAB */}
              <TabsContent value="signin" className="space-y-4">
                <div className="text-center mb-6">
                  <h2 className="text-xl font-semibold">Welcome back</h2>
                  <p className="text-sm text-muted-foreground">Sign in to your account</p>
                </div>
                
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div>
                    <Label htmlFor="signin-email">Email</Label>
                    <div className="relative mt-1">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="signin-email"
                        type="email"
                        placeholder="you@company.com"
                        value={signInForm.email}
                        onChange={(e) => setSignInForm({ ...signInForm, email: e.target.value })}
                        className="pl-10"
                      />
                    </div>
                    {errors.email && <p className="text-xs text-destructive mt-1">{errors.email}</p>}
                  </div>

                  <div>
                    <Label htmlFor="signin-password">Password</Label>
                    <div className="relative mt-1">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="signin-password"
                        type="password"
                        placeholder="••••••••"
                        value={signInForm.password}
                        onChange={(e) => setSignInForm({ ...signInForm, password: e.target.value })}
                        className="pl-10"
                      />
                    </div>
                    {errors.password && <p className="text-xs text-destructive mt-1">{errors.password}</p>}
                  </div>

                  <div className="text-right">
                    <Button variant="link" className="px-0 text-sm h-auto" type="button">
                      Forgot Password?
                    </Button>
                  </div>

                  <Button type="submit" className="w-full h-11" disabled={loading}>
                    {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Sign In
                  </Button>
                </form>
              </TabsContent>

              {/* SIGN UP TAB */}
              <TabsContent value="signup" className="space-y-6">
                <div className="text-center mb-4">
                  <h2 className="text-xl font-semibold">Create your account</h2>
                  <p className="text-sm text-muted-foreground">Set up your company and your role</p>
                </div>

                <form onSubmit={handleSignUp} className="space-y-6">
                  {/* SECTION A: Your Information */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-medium flex items-center gap-2 text-muted-foreground uppercase tracking-wide">
                      <User className="w-4 h-4" />
                      Your Information
                    </h3>

                    <div>
                      <Label htmlFor="fullName">Full Name *</Label>
                      <div className="relative mt-1">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="fullName"
                          value={signUpForm.fullName}
                          onChange={(e) => updateSignUpField('fullName', e.target.value)}
                          placeholder="John Smith"
                          className="pl-10"
                        />
                      </div>
                      {errors.fullName && <p className="text-xs text-destructive mt-1">{errors.fullName}</p>}
                    </div>

                    <div>
                      <Label htmlFor="email">Email *</Label>
                      <div className="relative mt-1">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="email"
                          type="email"
                          value={signUpForm.email}
                          onChange={(e) => updateSignUpField('email', e.target.value)}
                          placeholder="you@company.com"
                          className="pl-10"
                        />
                      </div>
                      {errors.email && <p className="text-xs text-destructive mt-1">{errors.email}</p>}
                    </div>

                    <div>
                      <Label htmlFor="phone">Phone Number</Label>
                      <div className="relative mt-1">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="phone"
                          value={signUpForm.phone}
                          onChange={(e) => updateSignUpField('phone', formatPhone(e.target.value))}
                          placeholder="(303)669-1130"
                          className="pl-10"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="password">Password *</Label>
                        <div className="relative mt-1">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            id="password"
                            type="password"
                            value={signUpForm.password}
                            onChange={(e) => updateSignUpField('password', e.target.value)}
                            placeholder="••••••••"
                            className="pl-10"
                          />
                        </div>
                        {errors.password && <p className="text-xs text-destructive mt-1">{errors.password}</p>}
                      </div>
                      <div>
                        <Label htmlFor="confirmPassword">Confirm Password *</Label>
                        <div className="relative mt-1">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            id="confirmPassword"
                            type="password"
                            value={signUpForm.confirmPassword}
                            onChange={(e) => updateSignUpField('confirmPassword', e.target.value)}
                            placeholder="••••••••"
                            className="pl-10"
                          />
                        </div>
                        {errors.confirmPassword && <p className="text-xs text-destructive mt-1">{errors.confirmPassword}</p>}
                      </div>
                    </div>
                  </div>

                  {/* SECTION B: Company Information */}
                  <div className="space-y-4 pt-4 border-t">
                    <h3 className="text-sm font-medium flex items-center gap-2 text-muted-foreground uppercase tracking-wide">
                      <Building2 className="w-4 h-4" />
                      Company Information
                    </h3>

                    <div>
                      <Label htmlFor="orgName">Organization Name *</Label>
                      <div className="relative mt-1">
                        <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="orgName"
                          value={signUpForm.orgName}
                          onChange={(e) => updateSignUpField('orgName', e.target.value)}
                          placeholder="Acme Construction"
                          className="pl-10"
                        />
                      </div>
                      {errors.orgName && <p className="text-xs text-destructive mt-1">{errors.orgName}</p>}
                    </div>

                    <div>
                      <Label htmlFor="street">Street Address *</Label>
                      <div className="relative mt-1">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="street"
                          value={signUpForm.street}
                          onChange={(e) => updateSignUpField('street', e.target.value)}
                          placeholder="123 Main St"
                          className="pl-10"
                        />
                      </div>
                      {errors.street && <p className="text-xs text-destructive mt-1">{errors.street}</p>}
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <Label htmlFor="city">City *</Label>
                        <Input
                          id="city"
                          value={signUpForm.city}
                          onChange={(e) => updateSignUpField('city', e.target.value)}
                          placeholder="Denver"
                          className="mt-1"
                        />
                        {errors.city && <p className="text-xs text-destructive mt-1">{errors.city}</p>}
                      </div>
                      <div>
                        <Label htmlFor="state">State *</Label>
                        <Input
                          id="state"
                          value={signUpForm.state}
                          onChange={(e) => updateSignUpField('state', e.target.value)}
                          placeholder="CO"
                          className="mt-1"
                        />
                        {errors.state && <p className="text-xs text-destructive mt-1">{errors.state}</p>}
                      </div>
                      <div>
                        <Label htmlFor="zip">ZIP *</Label>
                        <Input
                          id="zip"
                          value={signUpForm.zip}
                          onChange={(e) => updateSignUpField('zip', e.target.value)}
                          placeholder="80202"
                          className="mt-1"
                        />
                        {errors.zip && <p className="text-xs text-destructive mt-1">{errors.zip}</p>}
                      </div>
                    </div>
                  </div>

                  {/* SECTION C: Choose Your Role */}
                  <div className="space-y-4 pt-4 border-t">
                    <h3 className="text-sm font-medium flex items-center gap-2 text-muted-foreground uppercase tracking-wide">
                      <Wrench className="w-4 h-4" />
                      Choose Your Role
                    </h3>

                    <div>
                      <Label htmlFor="role">Your Role *</Label>
                      <Select
                        value={signUpForm.role}
                        onValueChange={(v) => updateSignUpField('role', v)}
                      >
                        <SelectTrigger id="role" className="mt-1">
                          <SelectValue placeholder="Select your role" />
                        </SelectTrigger>
                        <SelectContent>
                          {ROLE_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.role && <p className="text-xs text-destructive mt-1">{errors.role}</p>}
                    </div>

                    {/* Job Title field for all users */}
                    <div>
                      <Label htmlFor="jobTitle">Your Role in the Company</Label>
                      <Select
                        value={signUpForm.jobTitle}
                        onValueChange={(v) => updateSignUpField('jobTitle', v)}
                      >
                        <SelectTrigger id="jobTitle" className="mt-1">
                          <SelectValue placeholder="Select your role" />
                        </SelectTrigger>
                        <SelectContent>
                          {JOB_TITLES.map((title) => (
                            <SelectItem key={title} value={title}>
                              {title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* SECTION D: Trade (conditional) */}
                  {showTradeField && (
                    <div className="space-y-4 pt-4 border-t">
                      <h3 className="text-sm font-medium flex items-center gap-2 text-muted-foreground uppercase tracking-wide">
                        <Wrench className="w-4 h-4" />
                        Your Trade
                      </h3>

                      <div className="grid grid-cols-2 gap-4">
                        <div className={signUpForm.trade === 'Other' ? '' : 'col-span-2'}>
                          <Label htmlFor="trade">Trade *</Label>
                          <Select
                            value={signUpForm.trade}
                            onValueChange={(v) => updateSignUpField('trade', v)}
                          >
                            <SelectTrigger id="trade" className="mt-1">
                              <SelectValue placeholder="Select your trade" />
                            </SelectTrigger>
                            <SelectContent>
                              {TRADES.map((trade) => (
                                <SelectItem key={trade} value={trade}>
                                  {trade}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {errors.trade && <p className="text-xs text-destructive mt-1">{errors.trade}</p>}
                        </div>
                        
                        {signUpForm.trade === 'Other' && (
                          <div>
                            <Label htmlFor="tradeCustom">Trade Name *</Label>
                            <Input
                              id="tradeCustom"
                              value={signUpForm.tradeCustom}
                              onChange={(e) => updateSignUpField('tradeCustom', e.target.value)}
                              placeholder="Enter your trade"
                              className="mt-1"
                            />
                            {errors.tradeCustom && <p className="text-xs text-destructive mt-1">{errors.tradeCustom}</p>}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <Button type="submit" className="w-full h-12 text-base shadow-purple" disabled={loading}>
                    {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Create Account
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </Card>
        </div>
      </div>
    </section>
  );
}
