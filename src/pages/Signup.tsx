import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Check, User, Briefcase, Loader2, Building2 } from 'lucide-react';
import { OntimeLogo } from '@/components/ui/OntimeLogo';
import { cn } from '@/lib/utils';
import { AccountStep } from '@/components/signup-wizard/AccountStep';
import { CompanyStep } from '@/components/signup-wizard/CompanyStep';
import { RoleStep } from '@/components/signup-wizard/RoleStep';
import { InviteDetectedStep } from '@/components/signup-wizard/InviteDetectedStep';
import { ChoiceStep } from '@/components/signup-wizard/ChoiceStep';
import { JoinSearchStep } from '@/components/signup-wizard/JoinSearchStep';
import type { SignupWizardData } from '@/components/signup-wizard/types';
import { OrgType } from '@/types/organization';

const STEPS_NEW = [
  { id: 'account', label: 'Your Account', description: 'Name, email & password', icon: User },
  { id: 'company', label: 'Your Company', description: 'Organization details', icon: Building2 },
  { id: 'role', label: 'Your Role', description: 'Role & trade info', icon: Briefcase },
];

const STEPS_JOIN = [
  { id: 'search', label: 'Find Company', description: 'Search organizations', icon: Building2 },
  { id: 'account', label: 'Your Account', description: 'Name, email & password', icon: User },
];

export default function Signup() {
  const navigate = useNavigate();
  const { user, userOrgRoles, loading: authLoading, refreshUserData } = useAuth();
  const { toast } = useToast();
  const [signupPath, setSignupPath] = useState<'new' | 'join' | null>(null);
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [inviteDetected, setInviteDetected] = useState(false);
  const [inviteOrgName, setInviteOrgName] = useState('');

  const [data, setData] = useState<SignupWizardData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    orgName: '',
    orgType: 'TC',
    street: '',
    city: '',
    state: '',
    zip: '',
    jobTitle: '',
    trade: '',
    tradeCustom: '',
  });

  // Redirect if already fully set up
  useEffect(() => {
    if (!authLoading && user && userOrgRoles.length > 0) {
      navigate('/dashboard');
    }
  }, [authLoading, user, userOrgRoles, navigate]);

  const updateData = (fields: Partial<SignupWizardData>) => {
    setData(prev => ({ ...prev, ...fields }));
  };

  const handleChoice = (path: 'new' | 'join') => {
    setSignupPath(path);
    setStep(0);
  };

  const handleJoinOrgSelect = (org: any) => {
    if (!org.allow_join_requests) {
      toast({
        variant: 'destructive',
        title: 'Invitation required',
        description: 'This company requires invitation approval. Ask the admin to invite you.',
      });
      return;
    }
    updateData({
      signupPath: 'join',
      joinOrgId: org.org_id,
      joinOrgName: org.org_name,
    });
    setStep(1); // Go to account creation
  };

  const handleAccountNext = async () => {
    setLoading(true);

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { full_name: `${data.firstName} ${data.lastName}`.trim() },
      },
    });

    if (authError) {
      setLoading(false);
      toast({ variant: 'destructive', title: 'Sign up failed', description: authError.message });
      return;
    }

    // Poll for session
    let session = authData.session;
    let retries = 0;
    while (!session && retries < 10) {
      await new Promise(r => setTimeout(r, 300));
      const { data: sd } = await supabase.auth.getSession();
      session = sd.session;
      retries++;
    }

    if (!session) {
      setLoading(false);
      toast({
        title: 'Check your email',
        description: 'Please confirm your email address, then sign in.',
      });
      return;
    }

    // If join path, submit join request now
    if (signupPath === 'join' && data.joinOrgId) {
      // Create profile first
      await supabase.from('profiles').update({
        first_name: data.firstName,
        last_name: data.lastName,
        phone: data.phone || null,
        full_name: `${data.firstName} ${data.lastName}`.trim(),
        job_title: data.jobTitle || null,
      }).eq('user_id', session.user.id);

      // Submit join request
      const { error: joinError } = await supabase.from('org_join_requests').insert({
        organization_id: data.joinOrgId,
        user_id: session.user.id,
        job_title: data.jobTitle || null,
      });

      setLoading(false);
      if (joinError) {
        toast({ variant: 'destructive', title: 'Error', description: joinError.message });
      } else {
        toast({
          title: 'Join request sent!',
          description: `Your request to join ${data.joinOrgName} has been submitted. You'll be notified when approved.`,
        });
        navigate('/auth');
      }
      return;
    }

    // Check for pending org invitations
    const { data: invites } = await supabase
      .from('org_invitations')
      .select('id, organization:organizations(name)')
      .eq('email', data.email.toLowerCase())
      .eq('status', 'pending');

    if (invites && invites.length > 0) {
      const orgName = (invites[0].organization as any)?.name || 'an organization';
      setInviteOrgName(orgName);
      setInviteDetected(true);
      setLoading(false);
      return;
    }

    setLoading(false);
    setStep(signupPath === 'new' ? 1 : 0);
  };

  const handleInviteAccept = async () => {
    setLoading(true);
    const { error } = await supabase.rpc('complete_signup', {
      _first_name: data.firstName,
      _last_name: data.lastName,
      _user_phone: data.phone || null,
      _job_title: data.jobTitle || null,
    });

    if (error) {
      setLoading(false);
      toast({ variant: 'destructive', title: 'Setup failed', description: error.message });
      return;
    }

    await refreshUserData();
    setLoading(false);
    toast({ title: 'Welcome!', description: `You've joined ${inviteOrgName}` });
    navigate('/dashboard');
  };

  const handleInviteDecline = () => {
    setInviteDetected(false);
    setStep(1);
  };

  const handleFinalSubmit = async () => {
    setLoading(true);

    const { data: result, error } = await supabase.rpc('complete_signup', {
      _first_name: data.firstName,
      _last_name: data.lastName,
      _user_phone: data.phone || null,
      _org_name: data.orgName,
      _org_type: data.orgType as OrgType,
      _org_address: {
        street: data.street,
        city: data.city,
        state: data.state,
        zip: data.zip,
      },
      _trade: data.trade || null,
      _trade_custom: data.tradeCustom || null,
      _job_title: data.jobTitle || null,
    });

    if (error) {
      setLoading(false);
      toast({ variant: 'destructive', title: 'Setup failed', description: error.message });
      return;
    }

    await refreshUserData();
    setLoading(false);

    const res = result as { org_code?: string };
    toast({
      title: 'Account created!',
      description: res.org_code ? `Your organization code is ${res.org_code}` : 'Welcome aboard!',
    });
    navigate('/dashboard');
  };

  // Choice screen (before path is selected)
  if (!signupPath) {
    return (
      <SignupShell steps={[]} step={-1} signupPath={null}>
        <ChoiceStep onChoice={handleChoice} />
      </SignupShell>
    );
  }

  // Show invite-detected screen
  if (inviteDetected) {
    return (
      <SignupShell steps={signupPath === 'new' ? STEPS_NEW : STEPS_JOIN} step={step} signupPath={signupPath}>
        <InviteDetectedStep
          orgName={inviteOrgName}
          loading={loading}
          onAccept={handleInviteAccept}
          onDecline={handleInviteDecline}
        />
      </SignupShell>
    );
  }

  // JOIN path
  if (signupPath === 'join') {
    return (
      <SignupShell steps={STEPS_JOIN} step={step} signupPath={signupPath}>
        {step === 0 && (
          <JoinSearchStep
            onSelectOrg={handleJoinOrgSelect}
            onBack={() => setSignupPath(null)}
          />
        )}
        {step === 1 && (
          <AccountStep
            data={data}
            onChange={updateData}
            onNext={handleAccountNext}
            loading={loading}
            showJobTitle
          />
        )}
      </SignupShell>
    );
  }

  // NEW path
  return (
    <SignupShell steps={STEPS_NEW} step={step} signupPath={signupPath}>
      {step === 0 && (
        <AccountStep
          data={data}
          onChange={updateData}
          onNext={handleAccountNext}
          loading={loading}
        />
      )}
      {step === 1 && (
        <CompanyStep
          data={data}
          onChange={updateData}
          onNext={() => setStep(2)}
          onBack={() => setSignupPath(null)}
        />
      )}
      {step === 2 && (
        <RoleStep
          data={data}
          onChange={updateData}
          onSubmit={handleFinalSubmit}
          onBack={() => setStep(1)}
          loading={loading}
        />
      )}
    </SignupShell>
  );
}

interface SignupShellProps {
  steps: readonly { id: string; label: string; description: string; icon: any }[];
  step: number;
  signupPath: 'new' | 'join' | null;
  children: React.ReactNode;
}

function SignupShell({ steps, step, signupPath, children }: SignupShellProps) {
  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar stepper */}
      <div className="hidden md:flex w-80 bg-card border-r p-8 flex-col">
        <div className="flex items-center gap-3 mb-12">
          <OntimeLogo className="w-10 h-10" />
          <div>
            <h1 className="font-bold text-lg tracking-tight">Ontime.Build</h1>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest">V1</p>
          </div>
        </div>

        {steps.length > 0 && (
          <div className="space-y-2 flex-1">
            {steps.map((s, i) => {
              const isComplete = i < step;
              const isCurrent = i === step;
              const Icon = s.icon;
              return (
                <div
                  key={s.id}
                  className={cn(
                    'flex items-start gap-4 rounded-lg p-3 transition-colors',
                    isCurrent && 'bg-primary/5',
                  )}
                >
                  <div
                    className={cn(
                      'flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 text-sm font-medium transition-colors',
                      isComplete && 'border-primary bg-primary text-primary-foreground',
                      isCurrent && 'border-primary text-primary',
                      !isComplete && !isCurrent && 'border-muted text-muted-foreground',
                    )}
                  >
                    {isComplete ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                  </div>
                  <div className="pt-1">
                    <p className={cn(
                      'text-sm font-medium',
                      (isComplete || isCurrent) ? 'text-foreground' : 'text-muted-foreground',
                    )}>
                      {s.label}
                    </p>
                    <p className="text-xs text-muted-foreground">{s.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {steps.length === 0 && <div className="flex-1" />}

        <p className="text-xs text-muted-foreground">
          Already have an account?{' '}
          <Link to="/auth" className="text-primary hover:underline font-medium">Sign in</Link>
        </p>
      </div>

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-lg">
          <div className="flex md:hidden items-center justify-center gap-3 mb-8">
            <OntimeLogo className="w-10 h-10" />
            <h1 className="font-bold text-lg tracking-tight">Ontime.Build</h1>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
