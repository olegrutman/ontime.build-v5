import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScopeSplitCard } from './ScopeSplitCard';

interface Props {
  projectId: string;
  tcOrgId: string;
  fcOrgs: { id: string; name: string }[];
}

export function DownstreamContractsCard({ projectId, tcOrgId, fcOrgs }: Props) {
  if (fcOrgs.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">
          Scope Assignments
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScopeSplitCard
          projectId={projectId}
          tcOrgId={tcOrgId}
          fcOrgs={fcOrgs}
          embedded
        />
      </CardContent>
    </Card>
  );
}
