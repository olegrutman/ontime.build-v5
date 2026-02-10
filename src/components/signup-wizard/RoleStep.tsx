import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { z } from 'zod';
import { TRADES } from '@/types/projectWizard';
import type { SignupWizardData } from './types';

const JOB_TITLES = [
  'Owner', 'Project Manager', 'Superintendent', 'Estimator',
  'Office Manager', 'Foreman', 'Other',
];

interface Props {
  data: SignupWizardData;
  onChange: (fields: Partial<SignupWizardData>) => void;
  onSubmit: () => void;
  onBack: () => void;
  loading: boolean;
}

export function RoleStep({ data, onChange, onSubmit, onBack, loading }: Props) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const showTrade = data.orgType === 'TC' || data.orgType === 'FC';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Validate trade for TC/FC
    if (showTrade && !data.trade) {
      setErrors({ trade: 'Trade is required' });
      return;
    }
    if (showTrade && data.trade === 'Other' && !data.tradeCustom) {
      setErrors({ tradeCustom: 'Please enter your trade name' });
      return;
    }

    onSubmit();
  };

  return (
    <Card className="p-6 md:p-8">
      <div className="mb-6">
        <h2 className="text-xl font-semibold">Your Role</h2>
        <p className="text-sm text-muted-foreground mt-1">Tell us about what you do</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Job Title - GC only per memory */}
        {data.orgType === 'GC' && (
          <div>
            <Label htmlFor="jobTitle">Job Title</Label>
            <Select
              value={data.jobTitle}
              onValueChange={v => onChange({ jobTitle: v })}
            >
              <SelectTrigger id="jobTitle" className="mt-1">
                <SelectValue placeholder="Select your job title" />
              </SelectTrigger>
              <SelectContent>
                {JOB_TITLES.map(t => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Trade - TC/FC only */}
        {showTrade && (
          <>
            <div>
              <Label htmlFor="trade">Trade *</Label>
              <Select
                value={data.trade}
                onValueChange={v => onChange({ trade: v, tradeCustom: '' })}
              >
                <SelectTrigger id="trade" className="mt-1">
                  <SelectValue placeholder="Select your trade" />
                </SelectTrigger>
                <SelectContent>
                  {TRADES.map(t => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.trade && <p className="text-xs text-destructive mt-1">{errors.trade}</p>}
            </div>

            {data.trade === 'Other' && (
              <div>
                <Label htmlFor="tradeCustom">Trade Name *</Label>
                <Input
                  id="tradeCustom"
                  value={data.tradeCustom}
                  onChange={e => onChange({ tradeCustom: e.target.value })}
                  placeholder="Enter your trade"
                  className="mt-1"
                />
                {errors.tradeCustom && <p className="text-xs text-destructive mt-1">{errors.tradeCustom}</p>}
              </div>
            )}
          </>
        )}

        {/* Summary for non-GC, non-trade roles */}
        {!showTrade && data.orgType !== 'GC' && (
          <div className="rounded-lg border p-4 bg-muted/30">
            <p className="text-sm text-muted-foreground">
              You're all set! Click "Create Account" below to finish setting up your{' '}
              <span className="font-medium text-foreground">
                {data.orgType === 'SUPPLIER' ? 'Supplier' : data.orgType}
              </span>{' '}
              account.
            </p>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="outline" className="flex-1" onClick={onBack}>
            Back
          </Button>
          <Button type="submit" className="flex-1" disabled={loading}>
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Create Account
          </Button>
        </div>
      </form>
    </Card>
  );
}
