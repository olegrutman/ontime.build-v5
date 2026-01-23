import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Building2, User, Phone, MapPin, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';
import { OrgType, ORG_TYPE_LABELS } from '@/types/organization';

const orgSetupSchema = z.object({
  orgType: z.enum(['GC', 'TC', 'FC', 'SUPPLIER']),
  orgName: z.string().min(2, 'Organization name is required'),
  street: z.string().min(2, 'Street address is required'),
  city: z.string().min(2, 'City is required'),
  state: z.string().min(2, 'State is required'),
  zip: z.string().min(5, 'ZIP code is required'),
  orgPhone: z.string().optional(),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  userPhone: z.string().optional(),
});

type OrgSetupForm = z.infer<typeof orgSetupSchema>;

export default function OrgSetup() {
  const navigate = useNavigate();
  const { user, refreshUserData } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [form, setForm] = useState<OrgSetupForm>({
    orgType: 'TC',
    orgName: '',
    street: '',
    city: '',
    state: '',
    zip: '',
    orgPhone: '',
    firstName: '',
    lastName: '',
    userPhone: '',
  });

  const updateField = (field: keyof OrgSetupForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = orgSetupSchema.safeParse(form);
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

    const { data, error } = await supabase.rpc('create_organization_and_set_admin', {
      _org_type: form.orgType as OrgType,
      _org_name: form.orgName,
      _address: {
        street: form.street,
        city: form.city,
        state: form.state,
        zip: form.zip,
      },
      _org_phone: form.orgPhone || null,
      _user_first_name: form.firstName,
      _user_last_name: form.lastName,
      _user_phone: form.userPhone || null,
    });

    setLoading(false);

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Setup failed',
        description: error.message,
      });
      return;
    }

    toast({
      title: 'Organization created!',
      description: `Your organization code is ${(data as { org_code: string }).org_code}`,
    });

    await refreshUserData();
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="flex items-center justify-center w-12 h-12 bg-primary rounded-xl">
            <Building2 className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-bold text-2xl tracking-tight">Ontime.Build</h1>
            <p className="text-xs text-muted-foreground uppercase tracking-widest">
              Organization Setup
            </p>
          </div>
        </div>

        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-1">Create Your Organization</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Set up your company to start managing projects.
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Organization Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                Organization Details
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 sm:col-span-1">
                  <Label htmlFor="orgType">Organization Type</Label>
                  <Select
                    value={form.orgType}
                    onValueChange={(v) => updateField('orgType', v)}
                  >
                    <SelectTrigger id="orgType" className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(ORG_TYPE_LABELS) as OrgType[]).map((type) => (
                        <SelectItem key={type} value={type}>
                          {ORG_TYPE_LABELS[type]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.orgType && (
                    <p className="text-xs text-destructive mt-1">{errors.orgType}</p>
                  )}
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <Label htmlFor="orgName">Company Name</Label>
                  <Input
                    id="orgName"
                    value={form.orgName}
                    onChange={(e) => updateField('orgName', e.target.value)}
                    placeholder="Acme Construction"
                    className="mt-1"
                  />
                  {errors.orgName && (
                    <p className="text-xs text-destructive mt-1">{errors.orgName}</p>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="street">Street Address</Label>
                <div className="relative mt-1">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="street"
                    value={form.street}
                    onChange={(e) => updateField('street', e.target.value)}
                    placeholder="123 Main St"
                    className="pl-10"
                  />
                </div>
                {errors.street && (
                  <p className="text-xs text-destructive mt-1">{errors.street}</p>
                )}
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={form.city}
                    onChange={(e) => updateField('city', e.target.value)}
                    placeholder="Denver"
                    className="mt-1"
                  />
                  {errors.city && (
                    <p className="text-xs text-destructive mt-1">{errors.city}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    value={form.state}
                    onChange={(e) => updateField('state', e.target.value)}
                    placeholder="CO"
                    className="mt-1"
                  />
                  {errors.state && (
                    <p className="text-xs text-destructive mt-1">{errors.state}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="zip">ZIP</Label>
                  <Input
                    id="zip"
                    value={form.zip}
                    onChange={(e) => updateField('zip', e.target.value)}
                    placeholder="80202"
                    className="mt-1"
                  />
                  {errors.zip && (
                    <p className="text-xs text-destructive mt-1">{errors.zip}</p>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="orgPhone">Company Phone (optional)</Label>
                <div className="relative mt-1">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="orgPhone"
                    value={form.orgPhone}
                    onChange={(e) => updateField('orgPhone', e.target.value)}
                    placeholder="(555) 123-4567"
                    className="pl-10"
                  />
                </div>
              </div>
            </div>

            {/* User Section */}
            <div className="space-y-4 pt-4 border-t">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <User className="w-4 h-4" />
                Your Information
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    value={form.firstName}
                    onChange={(e) => updateField('firstName', e.target.value)}
                    placeholder="John"
                    className="mt-1"
                  />
                  {errors.firstName && (
                    <p className="text-xs text-destructive mt-1">{errors.firstName}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    value={form.lastName}
                    onChange={(e) => updateField('lastName', e.target.value)}
                    placeholder="Smith"
                    className="mt-1"
                  />
                  {errors.lastName && (
                    <p className="text-xs text-destructive mt-1">{errors.lastName}</p>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="userPhone">Your Phone (optional)</Label>
                <div className="relative mt-1">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="userPhone"
                    value={form.userPhone}
                    onChange={(e) => updateField('userPhone', e.target.value)}
                    placeholder="(555) 987-6543"
                    className="pl-10"
                  />
                </div>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Create Organization
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
