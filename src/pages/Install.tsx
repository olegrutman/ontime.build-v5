import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Smartphone, Share, Plus, MoreVertical, CheckCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function Install() {
  const navigate = useNavigate();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(isIOSDevice);

    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);

    window.addEventListener("appinstalled", () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    });

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  if (isInstalled) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-background text-foreground">
        <CheckCircle2 className="h-16 w-16 text-green-500 mb-4" />
        <h1 className="text-2xl font-bold mb-2">App Installed!</h1>
        <p className="text-muted-foreground text-center mb-6">
          OnTime.Build is installed on your device. You can launch it from your home screen.
        </p>
        <Button onClick={() => navigate("/dashboard")}>Go to Dashboard</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-6">
      <div className="max-w-lg mx-auto space-y-6">
        <div className="text-center space-y-2 pt-8">
          <Smartphone className="h-12 w-12 mx-auto text-primary" />
          <h1 className="text-3xl font-bold tracking-tight">Install OnTime.Build</h1>
          <p className="text-muted-foreground">
            Add to your home screen for quick access — works offline, feels like a native app.
          </p>
        </div>

        {deferredPrompt && (
          <Button onClick={handleInstall} className="w-full" size="lg">
            <Download className="mr-2 h-5 w-5" />
            Install App
          </Button>
        )}

        {isIOS && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Install on iPhone / iPad</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Step icon={<Share className="h-5 w-5" />} step={1} text='Tap the Share button in Safari' />
              <Step icon={<Plus className="h-5 w-5" />} step={2} text='Scroll down and tap "Add to Home Screen"' />
              <Step icon={<CheckCircle2 className="h-5 w-5" />} step={3} text='Tap "Add" to confirm' />
            </CardContent>
          </Card>
        )}

        {!isIOS && !deferredPrompt && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Install on Android</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Step icon={<MoreVertical className="h-5 w-5" />} step={1} text="Open browser menu (⋮)" />
              <Step icon={<Download className="h-5 w-5" />} step={2} text='"Install app" or "Add to Home Screen"' />
              <Step icon={<CheckCircle2 className="h-5 w-5" />} step={3} text="Tap Install to confirm" />
            </CardContent>
          </Card>
        )}

        <Button variant="ghost" className="w-full" onClick={() => navigate("/dashboard")}>
          Skip for now
        </Button>
      </div>
    </div>
  );
}

function Step({ icon, step, text }: { icon: React.ReactNode; step: number; text: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center justify-center h-9 w-9 rounded-full bg-muted shrink-0">
        {icon}
      </div>
      <p className="text-sm">
        <span className="font-semibold">Step {step}:</span> {text}
      </p>
    </div>
  );
}
