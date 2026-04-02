import { useState, useEffect } from 'react';
import { PlatformLayout } from '@/components/platform/PlatformLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Globe, Palette, Settings2 } from 'lucide-react';
import { usePlatformSettings, useUpsertPlatformSetting } from '@/hooks/usePlatformSettings';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { PlatformDataManager } from '@/components/platform/PlatformDataManager';

function usePlans() {
  return useQuery({
    queryKey: ['platform-plans-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('id, name')
        .order('name');
      if (error) throw error;
      return data ?? [];
    },
  });
}

export default function PlatformSetup() {
  const { data: settings, isLoading } = usePlatformSettings();
  const { data: plans } = usePlans();
  const upsert = useUpsertPlatformSetting();

  // General
  const [platformName, setPlatformName] = useState('');
  const [supportEmail, setSupportEmail] = useState('');
  const [maintenanceMode, setMaintenanceMode] = useState(false);

  // Defaults
  const [defaultPlanId, setDefaultPlanId] = useState('');
  const [autoConfirm, setAutoConfirm] = useState(false);
  const [publicSignup, setPublicSignup] = useState(true);

  // Branding
  const [primaryColor, setPrimaryColor] = useState('#2563eb');
  const [logoUrl, setLogoUrl] = useState('');

  useEffect(() => {
    if (!settings) return;
    setPlatformName((settings.platform_name as string) ?? '');
    setSupportEmail((settings.support_email as string) ?? '');
    setMaintenanceMode((settings.maintenance_mode as boolean) ?? false);
    setDefaultPlanId((settings.default_plan_id as string) ?? '');
    setAutoConfirm((settings.auto_confirm_signups as boolean) ?? false);
    setPublicSignup((settings.allow_public_signup as boolean) ?? true);
    setPrimaryColor((settings.primary_color as string) ?? '#2563eb');
    setLogoUrl((settings.logo_url as string) ?? '');
  }, [settings]);

  if (isLoading) {
    return (
      <PlatformLayout title="Setup" breadcrumbs={[{ label: 'Setup' }]}>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </PlatformLayout>
    );
  }

  return (
    <PlatformLayout title="Setup" breadcrumbs={[{ label: 'Setup' }]}>
      <div className="space-y-6 max-w-3xl">
        {/* General */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">General</CardTitle>
            </div>
            <CardDescription>Core platform identity and operational toggles.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="platform-name">Platform Name</Label>
              <Input
                id="platform-name"
                value={platformName}
                onChange={(e) => setPlatformName(e.target.value)}
                placeholder="Ontime.Build"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="support-email">Support Email</Label>
              <Input
                id="support-email"
                type="email"
                value={supportEmail}
                onChange={(e) => setSupportEmail(e.target.value)}
                placeholder="support@ontime.build"
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Maintenance Mode</Label>
                <p className="text-xs text-muted-foreground">Shows a banner to all users when enabled.</p>
              </div>
              <Switch checked={maintenanceMode} onCheckedChange={setMaintenanceMode} />
            </div>
            <Button
              size="sm"
              disabled={upsert.isPending}
              onClick={() =>
                upsert.mutate({
                  platform_name: platformName,
                  support_email: supportEmail,
                  maintenance_mode: maintenanceMode,
                })
              }
            >
              {upsert.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Save General
            </Button>
          </CardContent>
        </Card>

        {/* Defaults */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Settings2 className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Defaults</CardTitle>
            </div>
            <CardDescription>Default behaviour for new organizations and signups.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Default Subscription Plan</Label>
              <Select value={defaultPlanId} onValueChange={setDefaultPlanId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a plan" />
                </SelectTrigger>
                <SelectContent>
                  {plans?.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Auto-confirm Email Signups</Label>
                <p className="text-xs text-muted-foreground">Skip email verification for new users.</p>
              </div>
              <Switch checked={autoConfirm} onCheckedChange={setAutoConfirm} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Allow Public Signup</Label>
                <p className="text-xs text-muted-foreground">When off, only invited users can register.</p>
              </div>
              <Switch checked={publicSignup} onCheckedChange={setPublicSignup} />
            </div>
            <Button
              size="sm"
              disabled={upsert.isPending}
              onClick={() =>
                upsert.mutate({
                  default_plan_id: defaultPlanId,
                  auto_confirm_signups: autoConfirm,
                  allow_public_signup: publicSignup,
                })
              }
            >
              {upsert.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Save Defaults
            </Button>
          </CardContent>
        </Card>

        {/* Branding */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Palette className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Branding</CardTitle>
            </div>
            <CardDescription>Visual identity applied across the platform.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="primary-color">Primary Color</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="h-10 w-10 rounded border border-input cursor-pointer"
                />
                <Input
                  id="primary-color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  placeholder="#2563eb"
                  className="flex-1"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="logo-url">Logo URL</Label>
              <Input
                id="logo-url"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="https://..."
              />
              {logoUrl && (
                <img src={logoUrl} alt="Logo preview" className="h-10 mt-2 object-contain" />
              )}
            </div>
            <Button
              size="sm"
              disabled={upsert.isPending}
              onClick={() =>
                upsert.mutate({
                  primary_color: primaryColor,
                  logo_url: logoUrl,
                })
              }
            >
              {upsert.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Save Branding
            </Button>
          </CardContent>
        </Card>

        {/* Data Manager */}
        <PlatformDataManager />
      </div>
    </PlatformLayout>
  );
}
