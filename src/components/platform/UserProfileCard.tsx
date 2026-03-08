import { Card, CardContent } from '@/components/ui/card';
import { format } from 'date-fns';

interface ProfileData {
  user_id: string;
  email: string;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  job_title: string | null;
  timezone: string | null;
  language: string | null;
  preferred_contact_method: string | null;
  address: { street?: string; city?: string; state?: string; zip?: string } | null;
  created_at: string;
}

interface UserProfileCardProps {
  profile: ProfileData;
}

export function UserProfileCard({ profile }: UserProfileCardProps) {
  const addr = profile.address;
  const addressStr = addr
    ? [addr.street, addr.city, addr.state, addr.zip].filter(Boolean).join(', ')
    : null;

  const fields = [
    { label: 'Email', value: profile.email },
    { label: 'Full Name', value: profile.full_name },
    { label: 'First Name', value: profile.first_name },
    { label: 'Last Name', value: profile.last_name },
    { label: 'Phone', value: profile.phone },
    { label: 'Job Title', value: profile.job_title },
    { label: 'Timezone', value: profile.timezone },
    { label: 'Language', value: profile.language },
    { label: 'Preferred Contact', value: profile.preferred_contact_method },
    { label: 'Address', value: addressStr },
    { label: 'Joined', value: format(new Date(profile.created_at), 'MMM d, yyyy') },
  ];

  return (
    <Card className="mb-6">
      <CardContent className="pt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
        {fields.map((f) => (
          <div key={f.label}>
            <p className="text-xs text-muted-foreground">{f.label}</p>
            <p className="font-medium text-sm">{f.value || '—'}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
