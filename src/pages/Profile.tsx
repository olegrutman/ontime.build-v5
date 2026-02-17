import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { 
  User, Building2, DollarSign, Lock, Bell, BadgeCheck, AlertTriangle, 
  Loader2, Save, Eye, EyeOff, Phone, MapPin, Wrench, ShieldCheck
} from 'lucide-react';
import { useProfile } from '@/hooks/useProfile';
import { useAuth } from '@/hooks/useAuth';
import { ORG_TYPE_LABELS, ALLOWED_ROLES_BY_ORG_TYPE, ROLE_LABELS, ROLE_PERMISSIONS } from '@/types/organization';
import { TRADES, Trade } from '@/types/projectWizard';

import type { AppRole, OrgType } from '@/types/organization';


const TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Phoenix',
  'America/Los_Angeles',
  'America/Anchorage',
  'Pacific/Honolulu',
];

const CONTACT_METHODS = [
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'text', label: 'Text Message' },
];

const JOB_TITLES = [
  'Owner',
  'Project Manager',
  'Superintendent',
  'Estimator',
  'Office Manager',
  'Foreman',
  'Other',
];

export default function Profile() {
  const { signOut, userOrgRoles } = useAuth();
  const {
    loading,
    profile,
    organization,
    orgSettings,
    userSettings,
    hasActiveProjects,
    updateProfile,
    updateOrganization,
    updateOrgSettings,
    updateUserSettings,
    changePassword,
  } = useProfile();

  // Local form states
  const [personalForm, setPersonalForm] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    preferred_contact_method: 'email',
    timezone: 'America/Denver',
    job_title: '',
  });
  
  const [orgForm, setOrgForm] = useState({
    name: '',
    address: { street: '', city: '', state: '', zip: '' },
    phone: '',
    trade: '',
    trade_custom: '',
    license_number: '',
    insurance_expiration_date: '',
  });
  
  const [pricingForm, setPricingForm] = useState({
    default_hourly_rate: '',
    labor_markup_percent: '',
    minimum_service_charge: '',
    default_crew_size: '',
    default_workday_hours: '8',
  });
  
  const [passwordForm, setPasswordForm] = useState({
    current: '',
    new: '',
    confirm: '',
  });
  const [showPasswords, setShowPasswords] = useState(false);
  
  const [saving, setSaving] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState('');

  // Initialize forms when data loads
  useState(() => {
    if (profile) {
      setPersonalForm({
        first_name: profile.first_name || '',
        last_name: profile.last_name || '',
        phone: profile.phone || '',
        preferred_contact_method: profile.preferred_contact_method || 'email',
        timezone: profile.timezone || 'America/Denver',
        job_title: profile.job_title || '',
      });
    }
  });

  useState(() => {
    if (organization) {
      const addr = organization.address || {};
      setOrgForm({
        name: organization.name || '',
        address: {
          street: addr.street || '',
          city: addr.city || '',
          state: addr.state || '',
          zip: addr.zip || '',
        },
        phone: organization.phone || '',
        trade: organization.trade || '',
        trade_custom: organization.trade_custom || '',
        license_number: organization.license_number || '',
        insurance_expiration_date: organization.insurance_expiration_date || '',
      });
    }
  });

  useState(() => {
    if (orgSettings) {
      setPricingForm({
        default_hourly_rate: orgSettings.default_hourly_rate?.toString() || '',
        labor_markup_percent: orgSettings.labor_markup_percent?.toString() || '',
        minimum_service_charge: orgSettings.minimum_service_charge?.toString() || '',
        default_crew_size: orgSettings.default_crew_size?.toString() || '',
        default_workday_hours: orgSettings.default_workday_hours?.toString() || '8',
      });
    }
  });

  // Update forms when data changes
  if (!loading && profile && personalForm.first_name === '' && profile.first_name) {
    setPersonalForm({
      first_name: profile.first_name || '',
      last_name: profile.last_name || '',
      phone: profile.phone || '',
      preferred_contact_method: profile.preferred_contact_method || 'email',
      timezone: profile.timezone || 'America/Denver',
      job_title: profile.job_title || '',
    });
  }

  if (!loading && organization && orgForm.name === '' && organization.name) {
    const addr = organization.address || {};
    setOrgForm({
      name: organization.name || '',
      address: {
        street: addr.street || '',
        city: addr.city || '',
        state: addr.state || '',
        zip: addr.zip || '',
      },
      phone: organization.phone || '',
      trade: organization.trade || '',
      trade_custom: organization.trade_custom || '',
      license_number: organization.license_number || '',
      insurance_expiration_date: organization.insurance_expiration_date || '',
    });
  }

  if (!loading && orgSettings && pricingForm.default_hourly_rate === '' && orgSettings.default_hourly_rate) {
    setPricingForm({
      default_hourly_rate: orgSettings.default_hourly_rate?.toString() || '',
      labor_markup_percent: orgSettings.labor_markup_percent?.toString() || '',
      minimum_service_charge: orgSettings.minimum_service_charge?.toString() || '',
      default_crew_size: orgSettings.default_crew_size?.toString() || '',
      default_workday_hours: orgSettings.default_workday_hours?.toString() || '8',
    });
  }

  const handleSavePersonal = async () => {
    setSaving('personal');
    await updateProfile({
      first_name: personalForm.first_name,
      last_name: personalForm.last_name,
      full_name: `${personalForm.first_name} ${personalForm.last_name}`.trim(),
      phone: personalForm.phone || null,
      preferred_contact_method: personalForm.preferred_contact_method,
      timezone: personalForm.timezone,
      job_title: personalForm.job_title || null,
    });
    setSaving(null);
  };

  const handleSaveOrganization = async () => {
    setSaving('org');
    const updates: any = {
      address: orgForm.address,
      phone: orgForm.phone || null,
      trade: orgForm.trade || null,
      trade_custom: orgForm.trade === 'Other' ? orgForm.trade_custom : null,
      license_number: orgForm.license_number || null,
      insurance_expiration_date: orgForm.insurance_expiration_date || null,
    };
    
    // Only include name if user can edit it
    if (!hasActiveProjects) {
      updates.name = orgForm.name;
    }
    
    await updateOrganization(updates);
    setSaving(null);
  };

  const handleSavePricing = async () => {
    setSaving('pricing');
    await updateOrgSettings({
      default_hourly_rate: pricingForm.default_hourly_rate ? parseFloat(pricingForm.default_hourly_rate) : null,
      labor_markup_percent: pricingForm.labor_markup_percent ? parseFloat(pricingForm.labor_markup_percent) : null,
      minimum_service_charge: pricingForm.minimum_service_charge ? parseFloat(pricingForm.minimum_service_charge) : null,
      default_crew_size: pricingForm.default_crew_size ? parseInt(pricingForm.default_crew_size) : null,
      default_workday_hours: pricingForm.default_workday_hours ? parseFloat(pricingForm.default_workday_hours) : null,
    });
    setSaving(null);
  };

  const handleChangePassword = async () => {
    if (passwordForm.new !== passwordForm.confirm) {
      return;
    }
    setSaving('password');
    const success = await changePassword(passwordForm.current, passwordForm.new);
    if (success) {
      setPasswordForm({ current: '', new: '', confirm: '' });
    }
    setSaving(null);
  };

  const handleNotificationChange = async (key: string, value: boolean) => {
    await updateUserSettings({ [key]: value });
  };

  const requiresTrade = organization?.type === 'TC' || organization?.type === 'FC';

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            Profile & Settings
            {userOrgRoles[0]?.is_admin && (
              <Badge variant="default" className="text-xs">
                <ShieldCheck className="h-3 w-3 mr-1" />
                Admin
              </Badge>
            )}
          </h1>
          <p className="text-muted-foreground">Manage your personal info, organization, and preferences.</p>
        </div>

        {/* Section 1: Personal Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Personal Information
            </CardTitle>
            <CardDescription>Your contact details and preferences</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>First Name</Label>
                <Input
                  value={personalForm.first_name}
                  onChange={(e) => setPersonalForm(prev => ({ ...prev, first_name: e.target.value }))}
                  placeholder="John"
                />
              </div>
              <div className="space-y-2">
                <Label>Last Name</Label>
                <Input
                  value={personalForm.last_name}
                  onChange={(e) => setPersonalForm(prev => ({ ...prev, last_name: e.target.value }))}
                  placeholder="Smith"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={profile?.email || ''} disabled className="bg-muted" />
                <p className="text-xs text-muted-foreground">Email cannot be changed</p>
              </div>
              <div className="space-y-2">
                <Label>Phone Number</Label>
                <Input
                  value={personalForm.phone}
                  onChange={(e) => setPersonalForm(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="(555) 123-4567"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Preferred Contact</Label>
                <Select
                  value={personalForm.preferred_contact_method}
                  onValueChange={(v) => setPersonalForm(prev => ({ ...prev, preferred_contact_method: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CONTACT_METHODS.map(m => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Time Zone</Label>
                <Select
                  value={personalForm.timezone}
                  onValueChange={(v) => setPersonalForm(prev => ({ ...prev, timezone: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIMEZONES.map(tz => (
                      <SelectItem key={tz} value={tz}>{tz.replace('America/', '').replace('Pacific/', '')}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Job Title</Label>
                <Select
                  value={personalForm.job_title}
                  onValueChange={(v) => setPersonalForm(prev => ({ ...prev, job_title: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select title" />
                  </SelectTrigger>
                  <SelectContent>
                    {JOB_TITLES.map(t => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button onClick={handleSavePersonal} disabled={saving === 'personal'}>
                {saving === 'personal' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                Save Personal Info
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Section 2: Organization Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Organization Information
            </CardTitle>
            <CardDescription>Your company details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Organization Name</Label>
                <Input
                  value={orgForm.name}
                  onChange={(e) => setOrgForm(prev => ({ ...prev, name: e.target.value }))}
                  disabled={hasActiveProjects}
                  className={hasActiveProjects ? 'bg-muted' : ''}
                />
                {hasActiveProjects && (
                  <p className="text-xs text-muted-foreground">
                    Organization name is locked because you are active on projects. Contact support if it must be changed.
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Organization Type</Label>
                <Input 
                  value={organization?.type ? ORG_TYPE_LABELS[organization.type as keyof typeof ORG_TYPE_LABELS] : ''} 
                  disabled 
                  className="bg-muted" 
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Street Address</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={orgForm.address.street}
                  onChange={(e) => setOrgForm(prev => ({ 
                    ...prev, 
                    address: { ...prev.address, street: e.target.value } 
                  }))}
                  placeholder="123 Main St"
                  className="pl-10"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>City</Label>
                <Input
                  value={orgForm.address.city}
                  onChange={(e) => setOrgForm(prev => ({ 
                    ...prev, 
                    address: { ...prev.address, city: e.target.value } 
                  }))}
                  placeholder="Denver"
                />
              </div>
              <div className="space-y-2">
                <Label>State</Label>
                <Input
                  value={orgForm.address.state}
                  onChange={(e) => setOrgForm(prev => ({ 
                    ...prev, 
                    address: { ...prev.address, state: e.target.value } 
                  }))}
                  placeholder="CO"
                />
              </div>
              <div className="space-y-2">
                <Label>ZIP Code</Label>
                <Input
                  value={orgForm.address.zip}
                  onChange={(e) => setOrgForm(prev => ({ 
                    ...prev, 
                    address: { ...prev.address, zip: e.target.value } 
                  }))}
                  placeholder="80202"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Company Phone</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={orgForm.phone}
                    onChange={(e) => setOrgForm(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="(555) 123-4567"
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Organization Code</Label>
                <Input value={organization?.org_code || ''} disabled className="bg-muted font-mono" />
              </div>
            </div>

            {requiresTrade && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Trade {requiresTrade && '*'}</Label>
                  <Select
                    value={orgForm.trade}
                    onValueChange={(v) => setOrgForm(prev => ({ ...prev, trade: v as Trade }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select trade" />
                    </SelectTrigger>
                    <SelectContent>
                      {TRADES.map(t => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {orgForm.trade === 'Other' && (
                  <div className="space-y-2">
                    <Label>Trade Name</Label>
                    <div className="relative">
                      <Wrench className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        value={orgForm.trade_custom}
                        onChange={(e) => setOrgForm(prev => ({ ...prev, trade_custom: e.target.value }))}
                        placeholder="Custom trade"
                        className="pl-10"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            <Separator />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>License Number</Label>
                <Input
                  value={orgForm.license_number}
                  onChange={(e) => setOrgForm(prev => ({ ...prev, license_number: e.target.value }))}
                  placeholder="Optional"
                />
              </div>
              <div className="space-y-2">
                <Label>Insurance Expiration Date</Label>
                <Input
                  type="date"
                  value={orgForm.insurance_expiration_date}
                  onChange={(e) => setOrgForm(prev => ({ ...prev, insurance_expiration_date: e.target.value }))}
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button onClick={handleSaveOrganization} disabled={saving === 'org'}>
                {saving === 'org' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                Save Organization
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Section 3: Pricing Defaults (hidden for GC users) */}
        {organization?.type !== 'GC' && <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Pricing Defaults
            </CardTitle>
            <CardDescription>Pre-fill values for change orders and estimates</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Default Hourly Rate</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={pricingForm.default_hourly_rate}
                    onChange={(e) => setPricingForm(prev => ({ ...prev, default_hourly_rate: e.target.value }))}
                    placeholder="0.00"
                    className="pl-7"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Labor Markup %</Label>
                <div className="relative">
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={pricingForm.labor_markup_percent}
                    onChange={(e) => setPricingForm(prev => ({ ...prev, labor_markup_percent: e.target.value }))}
                    placeholder="0"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Minimum Service Charge</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={pricingForm.minimum_service_charge}
                    onChange={(e) => setPricingForm(prev => ({ ...prev, minimum_service_charge: e.target.value }))}
                    placeholder="0.00"
                    className="pl-7"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Default Crew Size</Label>
                <Input
                  type="number"
                  min="1"
                  value={pricingForm.default_crew_size}
                  onChange={(e) => setPricingForm(prev => ({ ...prev, default_crew_size: e.target.value }))}
                  placeholder="1"
                />
              </div>
              <div className="space-y-2">
                <Label>Work Day Hours</Label>
                <Input
                  type="number"
                  min="1"
                  max="24"
                  step="0.5"
                  value={pricingForm.default_workday_hours}
                  onChange={(e) => setPricingForm(prev => ({ ...prev, default_workday_hours: e.target.value }))}
                  placeholder="8"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button onClick={handleSavePricing} disabled={saving === 'pricing'}>
                {saving === 'pricing' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                Save Pricing Defaults
              </Button>
            </div>
          </CardContent>
        </Card>}

        {/* Section 4: Security */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Security
            </CardTitle>
            <CardDescription>Change your password</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Current Password</Label>
                <div className="relative">
                  <Input
                    type={showPasswords ? 'text' : 'password'}
                    value={passwordForm.current}
                    onChange={(e) => setPasswordForm(prev => ({ ...prev, current: e.target.value }))}
                    placeholder="••••••••"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>New Password</Label>
                <Input
                  type={showPasswords ? 'text' : 'password'}
                  value={passwordForm.new}
                  onChange={(e) => setPasswordForm(prev => ({ ...prev, new: e.target.value }))}
                  placeholder="••••••••"
                />
              </div>
              <div className="space-y-2">
                <Label>Confirm New Password</Label>
                <Input
                  type={showPasswords ? 'text' : 'password'}
                  value={passwordForm.confirm}
                  onChange={(e) => setPasswordForm(prev => ({ ...prev, confirm: e.target.value }))}
                  placeholder="••••••••"
                />
              </div>
            </div>
            
            {passwordForm.new && passwordForm.confirm && passwordForm.new !== passwordForm.confirm && (
              <p className="text-sm text-destructive">Passwords do not match</p>
            )}

            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowPasswords(!showPasswords)}
              >
                {showPasswords ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                {showPasswords ? 'Hide' : 'Show'} Passwords
              </Button>
              <Button
                onClick={handleChangePassword}
                disabled={
                  saving === 'password' ||
                  !passwordForm.current ||
                  !passwordForm.new ||
                  passwordForm.new !== passwordForm.confirm
                }
              >
                {saving === 'password' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Lock className="h-4 w-4 mr-2" />}
                Change Password
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Section 5: Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notifications
            </CardTitle>
            <CardDescription>Control how you receive updates per event type</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Global toggles */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Delivery Channels</p>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">Email Notifications</p>
                    <p className="text-xs text-muted-foreground">Master toggle for all email alerts</p>
                  </div>
                  <Switch
                    checked={userSettings?.notify_email ?? true}
                    onCheckedChange={(v) => handleNotificationChange('notify_email', v)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">Text Notifications</p>
                    <p className="text-xs text-muted-foreground">SMS updates (requires phone)</p>
                  </div>
                  <Switch
                    checked={userSettings?.notify_sms ?? false}
                    onCheckedChange={(v) => handleNotificationChange('notify_sms', v)}
                    disabled={!profile?.phone}
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Work Orders */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Work Orders</p>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm">Assigned to my org</p>
                  <Switch
                    checked={userSettings?.notify_wo_assigned ?? true}
                    onCheckedChange={(v) => handleNotificationChange('notify_wo_assigned', v)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-sm">Approved</p>
                  <Switch
                    checked={userSettings?.notify_wo_approved ?? true}
                    onCheckedChange={(v) => handleNotificationChange('notify_wo_approved', v)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-sm">Rejected</p>
                  <Switch
                    checked={userSettings?.notify_wo_rejected ?? true}
                    onCheckedChange={(v) => handleNotificationChange('notify_wo_rejected', v)}
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Invoices */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Invoices</p>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm">Submitted for approval</p>
                  <Switch
                    checked={userSettings?.notify_inv_submitted ?? true}
                    onCheckedChange={(v) => handleNotificationChange('notify_inv_submitted', v)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-sm">Approved</p>
                  <Switch
                    checked={userSettings?.notify_inv_approved ?? true}
                    onCheckedChange={(v) => handleNotificationChange('notify_inv_approved', v)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-sm">Rejected</p>
                  <Switch
                    checked={userSettings?.notify_inv_rejected ?? true}
                    onCheckedChange={(v) => handleNotificationChange('notify_inv_rejected', v)}
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Invitations */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Invitations</p>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm">Project invitations</p>
                  <Switch
                    checked={userSettings?.notify_project_invite ?? true}
                    onCheckedChange={(v) => handleNotificationChange('notify_project_invite', v)}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 6: Danger Zone */}
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Danger Zone
            </CardTitle>
            <CardDescription>Irreversible actions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Sign Out</p>
                <p className="text-sm text-muted-foreground">Sign out of your account</p>
              </div>
              <Button variant="outline" onClick={() => signOut()}>
                Sign Out
              </Button>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Delete Account</p>
                <p className="text-sm text-muted-foreground">
                  {hasActiveProjects 
                    ? 'You are active on projects. Contact support to delete your account.' 
                    : 'Permanently delete your account and all data'}
                </p>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" disabled={hasActiveProjects}>
                    Delete Account
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete your account and remove all your data.
                      <div className="mt-4 space-y-2">
                        <Label>Type DELETE to confirm</Label>
                        <Input
                          value={deleteConfirm}
                          onChange={(e) => setDeleteConfirm(e.target.value)}
                          placeholder="DELETE"
                        />
                      </div>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setDeleteConfirm('')}>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      disabled={deleteConfirm !== 'DELETE'}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Delete Account
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
