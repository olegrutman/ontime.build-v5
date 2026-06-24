import { useState, useEffect, useRef } from 'react';
import { Switch } from '@/components/ui/switch';
import { HourlyRateSetting } from '@/components/change-orders/HourlyRateSetting';
import { formatPhone } from '@/lib/formatPhone';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  User, Building2, DollarSign, ShieldCheck, 
  Loader2, Save, Phone, MapPin, Wrench, Upload, Trash2, ImageIcon
} from 'lucide-react';
import { useProfile } from '@/hooks/useProfile';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { ORG_TYPE_LABELS, getJobTitlesForOrgType } from '@/types/organization';
import { TRADES, Trade } from '@/types/projectWizard';
import { toast } from 'sonner';

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


function CompanyLogoCard({ organizationId, logoUrl, onUpdated }: { organizationId?: string; logoUrl?: string | null; onUpdated: () => Promise<void> | void }) {
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [currentUrl, setCurrentUrl] = useState<string | null>(logoUrl || null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setCurrentUrl(logoUrl || null); }, [logoUrl]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !organizationId) return;
    if (!['image/png', 'image/jpeg', 'image/svg+xml'].includes(file.type)) {
      toast.error('Only PNG, JPEG, or SVG files are allowed'); return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('File must be under 2 MB'); return;
    }
    setUploading(true);
    try {
      const ext = file.name.split('.').pop() || 'png';
      const path = `${organizationId}/logo.${ext}`;
      const { error: upErr } = await supabase.storage.from('org-logos').upload(path, file, { upsert: true });
      if (upErr) throw upErr;

      const { data: { publicUrl } } = supabase.storage.from('org-logos').getPublicUrl(path);
      const timestampedUrl = `${publicUrl}?t=${Date.now()}`;
      const { data: updatedOrg, error: updateErr } = await supabase
        .from('organizations')
        .update({ logo_url: timestampedUrl } as any)
        .eq('id', organizationId)
        .select('id, logo_url')
        .maybeSingle();

      if (updateErr) throw updateErr;
      if (!updatedOrg) {
        throw new Error('Logo uploaded, but your organization record could not be updated.');
      }

      setCurrentUrl(updatedOrg.logo_url || timestampedUrl);
      await onUpdated();
      toast.success('Logo uploaded');
    } catch (err: any) {
      toast.error(err.message || 'Upload failed');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleDelete = async () => {
    if (!organizationId) return;
    setDeleting(true);
    try {
      const { data: files } = await supabase.storage.from('org-logos').list(organizationId);
      if (files?.length) {
        await supabase.storage.from('org-logos').remove(files.map(f => `${organizationId}/${f.name}`));
      }

      const { data: updatedOrg, error: updateErr } = await supabase
        .from('organizations')
        .update({ logo_url: null } as any)
        .eq('id', organizationId)
        .select('id, logo_url')
        .maybeSingle();

      if (updateErr) throw updateErr;
      if (!updatedOrg) {
        throw new Error('Logo removed from storage, but your organization record could not be updated.');
      }

      setCurrentUrl(null);
      await onUpdated();
      toast.success('Logo removed');
    } catch (err: any) {
      toast.error(err.message || 'Delete failed');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="bg-card border border-border rounded-lg px-3.5 py-3.5">
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-1">
          <ImageIcon className="h-4 w-4 text-muted-foreground" />
          <p className="text-[0.7rem] uppercase tracking-[0.4px] text-muted-foreground font-medium">Company Logo</p>
        </div>
        <p className="text-xs text-muted-foreground ml-6">Appears on invoices, purchase orders, and other downloadable documents</p>
      </div>
      <div className="flex items-center gap-4">
        {currentUrl ? (
          <img src={currentUrl} alt="Company logo" className="h-14 max-w-[200px] object-contain rounded border border-border bg-muted p-1" />
        ) : (
          <div className="h-14 w-[120px] rounded border border-dashed border-border flex items-center justify-center text-muted-foreground text-xs">
            No logo
          </div>
        )}
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={uploading} onClick={() => fileRef.current?.click()}>
            {uploading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Upload className="h-4 w-4 mr-1" />}
            {currentUrl ? 'Replace' : 'Upload'}
          </Button>
          {currentUrl && (
            <Button variant="ghost" size="sm" disabled={deleting} onClick={handleDelete}>
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            </Button>
          )}
        </div>
        <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/svg+xml" className="hidden" onChange={handleUpload} />
      </div>
      <p className="text-xs text-muted-foreground mt-2">PNG, JPEG, or SVG · Max 2 MB</p>
    </div>
  );
}

export default function Profile() {
  const { userOrgRoles, refreshUserData } = useAuth();
  const {
    loading,
    profile,
    organization,
    orgSettings,
    hasActiveProjects,
    updateProfile,
    updateOrganization,
    updateOrgSettings,
  } = useProfile();

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
  
  const [saving, setSaving] = useState<string | null>(null);

  // Sync forms when data loads or changes
  useEffect(() => {
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
  }, [profile]);

  useEffect(() => {
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
  }, [organization]);

  useEffect(() => {
    if (orgSettings) {
      setPricingForm({
        default_hourly_rate: orgSettings.default_hourly_rate?.toString() || '',
        labor_markup_percent: orgSettings.labor_markup_percent?.toString() || '',
        minimum_service_charge: orgSettings.minimum_service_charge?.toString() || '',
        default_crew_size: orgSettings.default_crew_size?.toString() || '',
        default_workday_hours: orgSettings.default_workday_hours?.toString() || '8',
      });
    }
  }, [orgSettings]);

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
    await refreshUserData();
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
      <div className="max-w-3xl mx-auto space-y-5">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            Profile
            {userOrgRoles[0]?.is_admin && (
              <Badge variant="default" className="text-xs">
                <ShieldCheck className="h-3 w-3 mr-1" />
                Admin
              </Badge>
            )}
          </h1>
          <p className="text-sm text-muted-foreground">Manage your personal info, organization, and pricing defaults.</p>
        </div>

        {/* Section 1: Personal Information */}
        <div className="bg-card border border-border rounded-lg px-3.5 py-3.5">
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-1">
              <User className="h-4 w-4 text-muted-foreground" />
              <p className="text-[0.7rem] uppercase tracking-[0.4px] text-muted-foreground font-medium">Personal Information</p>
            </div>
            <p className="text-xs text-muted-foreground ml-6">Your contact details and preferences</p>
          </div>
          <div className="space-y-4">
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
                  type="tel"
                  value={personalForm.phone}
                  onChange={(e) => setPersonalForm(prev => ({ ...prev, phone: formatPhone(e.target.value) }))}
                  placeholder="(303)669-1130"
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
                    {getJobTitlesForOrgType(organization?.type).map(t => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button onClick={handleSavePersonal} disabled={saving === 'personal'} className="w-full sm:w-auto">
                {saving === 'personal' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                Save Personal Info
              </Button>
            </div>
          </div>
        </div>

        {/* Personal Hourly Rate */}
        <HourlyRateSetting />

        {/* Section 2: Organization Information */}
        <div className="bg-card border border-border rounded-lg px-3.5 py-3.5">
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-1">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <p className="text-[0.7rem] uppercase tracking-[0.4px] text-muted-foreground font-medium">Organization Information</p>
            </div>
            <p className="text-xs text-muted-foreground ml-6">Your company details</p>
          </div>
          <div className="space-y-4">
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
                    type="tel"
                    value={orgForm.phone}
                    onChange={(e) => setOrgForm(prev => ({ ...prev, phone: formatPhone(e.target.value) }))}
                    placeholder="(303)669-1130"
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
              <Button onClick={handleSaveOrganization} disabled={saving === 'org'} className="w-full sm:w-auto">
                {saving === 'org' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                Save Organization
              </Button>
            </div>
          </div>
        </div>

        {/* Company Logo */}
        <CompanyLogoCard
          organizationId={organization?.id}
          logoUrl={organization?.logo_url || userOrgRoles[0]?.organization?.logo_url || null}
          onUpdated={async () => {
            await refreshUserData();
          }}
        />

        {/* Section 3: Pricing Defaults (hidden for GC users) */}
        {organization?.type !== 'GC' && <div className="bg-card border border-border rounded-lg px-3.5 py-3.5">
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <p className="text-[0.7rem] uppercase tracking-[0.4px] text-muted-foreground font-medium">Pricing Defaults</p>
            </div>
            <p className="text-xs text-muted-foreground ml-6">Pre-fill values for change orders and estimates</p>
          </div>
          <div className="space-y-4">
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

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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

            {organization?.type === 'TC' && (
              <>
                <Separator />
                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <Label className="font-medium">Use FC input as pricing base by default</Label>
                    <p className="text-xs text-muted-foreground">
                      When ON, new COs with FC involvement will auto-calculate TC pricing from FC submissions using your rate/markup above.
                    </p>
                  </div>
                  <Switch
                    checked={orgSettings?.use_fc_input_as_base ?? false}
                    onCheckedChange={async (checked) => {
                      await updateOrgSettings({ use_fc_input_as_base: checked });
                    }}
                  />
                </div>
              </>
            )}

            <div className="flex justify-end pt-2">
              <Button onClick={handleSavePricing} disabled={saving === 'pricing'} className="w-full sm:w-auto">
                {saving === 'pricing' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                Save Pricing Defaults
              </Button>
            </div>
          </div>
        </div>}
      </div>
    </AppLayout>
  );
}
