import { useParams, Navigate } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
import { QuickCaptureFlow } from '@/components/quick-capture/QuickCaptureFlow';
import { Monitor, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export default function QuickCapture() {
  const { projectId } = useParams<{ projectId: string }>();
  const isMobile = useIsMobile();
  const navigate = useNavigate();

  if (!projectId) return <Navigate to="/dashboard" replace />;

  if (!isMobile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-6 p-8 text-center bg-background">
        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
          <Smartphone className="h-10 w-10 text-primary" />
        </div>
        <h1 className="text-2xl font-bold font-heading text-foreground">Mobile Quick Capture</h1>
        <p className="text-muted-foreground max-w-md">
          This flow is designed for field workers on mobile devices. Open this page on your phone to quickly document issues with photos and voice notes.
        </p>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => navigate(`/project/${projectId}/change-orders/new`)}>
            Use Desktop Flow Instead
          </Button>
          <Button variant="ghost" onClick={() => navigate(-1)}>
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return <QuickCaptureFlow projectId={projectId} />;
}
