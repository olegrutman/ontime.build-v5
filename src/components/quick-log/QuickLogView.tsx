import { Card, CardContent } from '@/components/ui/card';

interface QuickLogViewProps {
  projectId: string;
  orgId: string;
}

export function QuickLogView({ projectId, orgId }: QuickLogViewProps) {
  return (
    <Card>
      <CardContent className="py-12 text-center">
        <p className="text-muted-foreground">Quick Log is being rebuilt.</p>
      </CardContent>
    </Card>
  );
}
