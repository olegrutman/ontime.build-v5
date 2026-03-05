import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { PlatformLayout } from '@/components/platform/PlatformLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { ROLE_LABELS, ORG_TYPE_LABELS, type AppRole, type OrgType } from '@/types/organization';
import { format } from 'date-fns';

interface ProfileData {
  user_id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  created_at: string;
}

interface OrgMembership {
  id: string;
  role: AppRole;
  is_admin: boolean;
  organization: { id: string; name: string; type: OrgType };
}

export default function PlatformUserDetail() {
  const { userId } = useParams<{ userId: string }>();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [memberships, setMemberships] = useState<OrgMembership[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    async function fetch() {
      const [profileRes, rolesRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('user_id', userId).single(),
        supabase
          .from('user_org_roles')
          .select('id, role, is_admin, organization:organizations(id, name, type)')
          .eq('user_id', userId),
      ]);
      setProfile(profileRes.data as unknown as ProfileData);
      setMemberships((rolesRes.data || []) as unknown as OrgMembership[]);
      setLoading(false);
    }
    fetch();
  }, [userId]);

  if (loading) {
    return (
      <PlatformLayout title="User Detail">
        <Skeleton className="h-40 w-full" />
      </PlatformLayout>
    );
  }

  if (!profile) {
    return (
      <PlatformLayout title="Not Found">
        <p className="text-muted-foreground">User not found.</p>
      </PlatformLayout>
    );
  }

  return (
    <PlatformLayout
      title={profile.full_name || profile.email}
      breadcrumbs={[
        { label: 'Platform', href: '/platform' },
        { label: 'Users', href: '/platform/users' },
        { label: profile.full_name || profile.email },
      ]}
    >
      <Card className="mb-6">
        <CardContent className="pt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Email</p>
            <p className="font-medium text-sm">{profile.email}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Full Name</p>
            <p className="font-medium text-sm">{profile.full_name || '—'}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Phone</p>
            <p className="font-medium text-sm">{profile.phone || '—'}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Joined</p>
            <p className="font-medium text-sm">{format(new Date(profile.created_at), 'MMM d, yyyy')}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Organization Memberships</CardTitle>
        </CardHeader>
        <CardContent>
          {memberships.length === 0 ? (
            <p className="text-sm text-muted-foreground">No organization memberships</p>
          ) : (
            <div className="space-y-3">
              {memberships.map((m) => (
                <div key={m.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div>
                    <p className="font-medium text-sm">{m.organization?.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {ORG_TYPE_LABELS[m.organization?.type]}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {ROLE_LABELS[m.role] || m.role}
                    </Badge>
                    {m.is_admin && (
                      <Badge className="text-xs bg-primary/10 text-primary border-0">Admin</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </PlatformLayout>
  );
}
