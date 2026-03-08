import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Mail, Lock, User, Phone, Loader2, ArrowLeft } from 'lucide-react';
import { z } from 'zod';
import { getJobTitlesForOrgType } from '@/types/organization';
import type { SignupWizardData } from './types';
import { formatPhone } from '@/lib/formatPhone';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';

function getPasswordStrength(password: string): { score: number; label: string; color: string } {
  if (!password) return { score: 0, label: '', color: '' };
  let score = 0;
  if (password.length >= 6) score++;
  if (password.length >= 10) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 2) return { score, label: 'Weak', color: 'bg-destructive' };
  if (score <= 3) return { score, label: 'Fair', color: 'bg-yellow-500' };
  if (score <= 4) return { score, label: 'Good', color: 'bg-blue-500' };
  return { score, label: 'Strong', color: 'bg-green-500' };
}

const schema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine(d => d.password === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

interface Props {
  data: SignupWizardData;
  onChange: (fields: Partial<SignupWizardData>) => void;
  onNext: () => void;
  onBack?: () => void;
  loading: boolean;
  showJobTitle?: boolean;
  alreadyRegisteredError?: boolean;
}

export function AccountStep({ data, onChange, onNext, onBack, loading, showJobTitle, alreadyRegisteredError }: Props) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const strength = useMemo(() => getPasswordStrength(data.password), [data.password]);

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
        <h2 className="text-xl font-semibold">Create your account</h2>
        <p className="text-sm text-muted-foreground mt-1">Let's start with your personal information</p>
      </div>

      {alreadyRegisteredError && (
        <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
          <p className="text-sm font-medium text-destructive">An account with this email already exists.</p>
          <p className="text-sm text-muted-foreground mt-1">
            Try{' '}
            <Link to="/auth" className="text-primary hover:underline font-medium">signing in</Link>{' '}
            instead, or use a different email address.
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="firstName">First Name *</Label>
            <div className="relative mt-1">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="firstName"
                value={data.firstName}
                onChange={e => onChange({ firstName: e.target.value })}
                placeholder="John"
                className="pl-10"
              />
            </div>
            {errors.firstName && <p className="text-xs text-destructive mt-1">{errors.firstName}</p>}
          </div>
          <div>
            <Label htmlFor="lastName">Last Name *</Label>
            <Input
              id="lastName"
              value={data.lastName}
              onChange={e => onChange({ lastName: e.target.value })}
              placeholder="Smith"
              className="mt-1"
            />
            {errors.lastName && <p className="text-xs text-destructive mt-1">{errors.lastName}</p>}
          </div>
        </div>

        <div>
          <Label htmlFor="email">Email *</Label>
          <div className="relative mt-1">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              id="email"
              type="email"
              value={data.email}
              onChange={e => onChange({ email: e.target.value })}
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
              type="tel"
              value={data.phone}
              onChange={e => onChange({ phone: formatPhone(e.target.value) })}
              placeholder="(303)669-1130"
              className="pl-10"
            />
          </div>
        </div>

        {showJobTitle && (
          <div>
            <Label htmlFor="jobTitle">Job Title</Label>
            <Select value={data.jobTitle} onValueChange={v => onChange({ jobTitle: v })}>
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

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="password">Password *</Label>
            <div className="relative mt-1">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="password"
                type="password"
                value={data.password}
                onChange={e => onChange({ password: e.target.value })}
                placeholder="••••••••"
                className="pl-10"
              />
            </div>
            {errors.password && <p className="text-xs text-destructive mt-1">{errors.password}</p>}
          </div>
          <div>
            <Label htmlFor="confirmPassword">Confirm *</Label>
            <div className="relative mt-1">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="confirmPassword"
                type="password"
                value={data.confirmPassword}
                onChange={e => onChange({ confirmPassword: e.target.value })}
                placeholder="••••••••"
                className="pl-10"
              />
            </div>
            {errors.confirmPassword && <p className="text-xs text-destructive mt-1">{errors.confirmPassword}</p>}
          </div>
        </div>

        {/* Password strength indicator */}
        {data.password && (
          <div className="space-y-1">
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map(i => (
                <div
                  key={i}
                  className={cn(
                    'h-1.5 flex-1 rounded-full transition-colors',
                    i <= strength.score ? strength.color : 'bg-muted',
                  )}
                />
              ))}
            </div>
            <p className={cn(
              'text-xs',
              strength.score <= 2 ? 'text-destructive' : 'text-muted-foreground',
            )}>
              Password strength: {strength.label}
            </p>
          </div>
        )}

        {/* Terms acknowledgment */}
        <p className="text-xs text-muted-foreground text-center">
          By creating an account, you agree to our{' '}
          <span className="text-primary hover:underline cursor-pointer font-medium">Terms of Service</span>{' '}
          and{' '}
          <span className="text-primary hover:underline cursor-pointer font-medium">Privacy Policy</span>.
        </p>

        <div className={cn('flex gap-3', onBack ? '' : '')}>
          {onBack && (
            <Button type="button" variant="outline" onClick={onBack} className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
          )}
          <Button type="submit" className={cn('h-11', onBack ? 'flex-1' : 'w-full')} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Continue
          </Button>
        </div>
      </form>
    </Card>
  );
}
