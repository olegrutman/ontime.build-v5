import { type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Skeleton } from '@/components/ui/skeleton';
import { ShieldAlert, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface RequirePlatformRoleProps {
  children: ReactNode;
}

export function RequirePlatformRole({ children }: RequirePlatformRoleProps) {
  const { user, loading, platformRole, twoFactorVerified } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Skeleton className="h-8 w-32" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  if (!platformRole || platformRole === 'NONE') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Card className="max-w-md w-full">
          <CardContent className="flex flex-col items-center gap-4 pt-8 pb-8 text-center">
            <ShieldAlert className="h-12 w-12 text-destructive" />
            <h1 className="text-xl font-semibold">Access Denied</h1>
            <p className="text-muted-foreground text-sm">
              You do not have platform admin privileges. This area is restricted to Ontime.Build staff only.
            </p>
            <Button variant="outline" onClick={() => window.location.href = '/dashboard'}>
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!twoFactorVerified) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Card className="max-w-md w-full">
          <CardContent className="flex flex-col items-center gap-4 pt-8 pb-8 text-center">
            <Lock className="h-12 w-12 text-primary" />
            <h1 className="text-xl font-semibold">Two-Factor Authentication Required</h1>
            <p className="text-muted-foreground text-sm">
              Platform admin access requires two-factor authentication. Please contact your Platform Owner to verify your 2FA setup.
            </p>
            <Button variant="outline" onClick={() => window.location.href = '/dashboard'}>
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
