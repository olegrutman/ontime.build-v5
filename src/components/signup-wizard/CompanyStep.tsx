import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2, MapPin } from 'lucide-react';
import { z } from 'zod';
import type { SignupWizardData } from './types';
import { US_STATES } from '@/types/projectWizard';

const ORG_TYPE_OPTIONS = [
  { value: 'GC', label: 'General Contractor' },
  { value: 'TC', label: 'Trade Contractor' },
  { value: 'FC', label: 'Field Crew' },
  { value: 'SUPPLIER', label: 'Supplier' },
] as const;

const schema = z.object({
  orgName: z.string().min(2, 'Organization name is required'),
  orgType: z.enum(['GC', 'TC', 'FC', 'SUPPLIER']),
  street: z.string().min(2, 'Street address is required'),
  city: z.string().min(2, 'City is required'),
  state: z.string().min(2, 'State is required'),
  zip: z.string().min(5, 'ZIP code is required'),
});

interface Props {
  data: SignupWizardData;
  onChange: (fields: Partial<SignupWizardData>) => void;
  onNext: () => void;
  onBack: () => void;
}

export function CompanyStep({ data, onChange, onNext, onBack }: Props) {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = schema.safeParse(data);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach(err => {
        if (err.path[0]) fieldErrors[err.path[0] as string] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }
    onNext();
  };

  return (
    <Card className="p-6 md:p-8">
      <div className="mb-6">
        <h2 className="text-xl font-semibold">Company Information</h2>
        <p className="text-sm text-muted-foreground mt-1">Tell us about your organization</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="orgName">Organization Name *</Label>
          <div className="relative mt-1">
            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              id="orgName"
              value={data.orgName}
              onChange={e => onChange({ orgName: e.target.value })}
              placeholder="Acme Construction"
              className="pl-10"
            />
          </div>
          {errors.orgName && <p className="text-xs text-destructive mt-1">{errors.orgName}</p>}
        </div>

        <div>
          <Label htmlFor="orgType">Organization Type *</Label>
          <Select
            value={data.orgType}
            onValueChange={v => onChange({ orgType: v, trade: '', tradeCustom: '' })}
          >
            <SelectTrigger id="orgType" className="mt-1">
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              {ORG_TYPE_OPTIONS.map(o => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.orgType && <p className="text-xs text-destructive mt-1">{errors.orgType}</p>}
        </div>

        <div>
          <Label>Address *</Label>
          <div className="relative mt-1">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={data.street}
              onChange={e => onChange({ street: e.target.value })}
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
              value={data.city}
              onChange={e => onChange({ city: e.target.value })}
              placeholder="Denver"
              className="mt-1"
            />
            {errors.city && <p className="text-xs text-destructive mt-1">{errors.city}</p>}
          </div>
          <div>
            <Label htmlFor="state">State *</Label>
            <Select value={data.state} onValueChange={v => onChange({ state: v })}>
              <SelectTrigger id="state" className="mt-1">
                <SelectValue placeholder="CO" />
              </SelectTrigger>
              <SelectContent>
                {US_STATES.map(s => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.state && <p className="text-xs text-destructive mt-1">{errors.state}</p>}
          </div>
          <div>
            <Label htmlFor="zip">ZIP *</Label>
            <Input
              id="zip"
              value={data.zip}
              onChange={e => onChange({ zip: e.target.value })}
              placeholder="80202"
              className="mt-1"
            />
            {errors.zip && <p className="text-xs text-destructive mt-1">{errors.zip}</p>}
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="outline" className="flex-1" onClick={onBack}>
            Back
          </Button>
          <Button type="submit" className="flex-1">
            Continue
          </Button>
        </div>
      </form>
    </Card>
  );
}
