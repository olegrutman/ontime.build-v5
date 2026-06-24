import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { User, Settings, ArrowLeft } from 'lucide-react';
import NotificationBell from '@/components/notifications/NotificationBell';
import logo from '@/assets/logo.png';

interface AppHeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  rightContent?: React.ReactNode;
  showNotifications?: boolean;
}

export default function AppHeader({ 
  title, 
  subtitle, 
  showBack = false, 
  onBack,
  rightContent,
  showNotifications = true
}: AppHeaderProps) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(-1);
    }
  };

  const handleLogoClick = () => {
    navigate('/dashboard');
  };

  return (
    <header className="sticky top-0 z-50 bg-primary text-primary-foreground">
      <div className="container flex items-center justify-between h-16 px-4">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {showBack && (
            <Button 
              variant="ghost" 
              size="icon"
              className="text-primary-foreground hover:bg-primary-foreground/10 shrink-0"
              onClick={handleBack}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          {/* Logo - always shown, clickable to dashboard */}
          <button
            onClick={handleLogoClick}
            className="w-9 h-9 rounded-lg bg-accent/20 flex items-center justify-center shrink-0 hover:bg-accent/30 transition-colors cursor-pointer"
            aria-label="Go to Dashboard"
          >
            <img src={logo} alt="Ontime.Build" className="h-6 w-6 object-contain" />
          </button>
          <div className="min-w-0">
            <span className="text-lg font-bold truncate block">{title}</span>
            {subtitle && (
              <p className="text-xs text-primary-foreground/70 truncate">{subtitle}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {rightContent}
          {showNotifications && <NotificationBell />}
          <Button 
            variant="ghost" 
            size="icon"
            className="text-primary-foreground hover:bg-primary-foreground/10"
            onClick={() => navigate('/account')}
          >
            <User className="h-5 w-5" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon"
            className="text-primary-foreground hover:bg-primary-foreground/10"
            onClick={() => navigate('/settings')}
          >
            <Settings className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  );
}