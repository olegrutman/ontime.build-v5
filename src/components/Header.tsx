import { Building2, Plus, Search, LogOut, Users, Settings, Package, FileText, ShoppingCart, Briefcase, Receipt, Home, Handshake } from 'lucide-react';
import { NotificationSheet } from '@/components/notifications/NotificationSheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate, Link } from 'react-router-dom';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ROLE_LABELS } from '@/types/organization';

export function Header() {
  const { user, profile, userOrgRoles, currentRole, signOut } = useAuth();
  const navigate = useNavigate();

  const currentOrg = userOrgRoles.length > 0 ? userOrgRoles[0].organization : null;

  const getInitials = (name?: string | null) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <header className="sticky top-0 z-50 bg-primary text-primary-foreground">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo - clickable to dashboard */}
          <Link to="/dashboard" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div className="flex items-center justify-center w-9 h-9 bg-primary-foreground/10 rounded-lg">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-lg tracking-tight">Ontime.Build</h1>
              {currentOrg && (
                <p className="text-[10px] text-primary-foreground/60 uppercase tracking-widest">
                  {currentOrg.org_code}
                </p>
              )}
            </div>
          </Link>

          {/* Search */}
          <div className="hidden md:flex items-center flex-1 max-w-md mx-8">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-foreground/40" />
              <Input
                placeholder="Search work items..."
                className="w-full pl-10 bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground placeholder:text-primary-foreground/40 focus:bg-primary-foreground/20"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {user ? (
              <>
                <div className="[&_button]:text-primary-foreground/70 [&_button:hover]:text-primary-foreground [&_button:hover]:bg-primary-foreground/10">
                  <NotificationSheet />
                </div>
                <Button
                  size="sm"
                  className="bg-primary-foreground text-primary hover:bg-primary-foreground/90 gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">New Work Item</span>
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className="relative h-9 w-9 rounded-full hover:bg-primary-foreground/10"
                    >
                      <Avatar className="h-9 w-9">
                        <AvatarFallback className="bg-primary-foreground/20 text-primary-foreground text-sm">
                          {getInitials(profile?.full_name)}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium">{profile?.full_name || 'User'}</p>
                        <p className="text-xs text-muted-foreground">{profile?.email}</p>
                        {currentRole && (
                          <p className="text-xs text-muted-foreground">
                            {ROLE_LABELS[currentRole]}
                          </p>
                        )}
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate('/dashboard')}>
                      <Home className="mr-2 h-4 w-4" />
                      Dashboard
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/partners')}>
                      <Handshake className="mr-2 h-4 w-4" />
                      Partner Directory
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate('/catalog')}>
                      <Package className="mr-2 h-4 w-4" />
                      Product Catalog
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/estimates')}>
                      <FileText className="mr-2 h-4 w-4" />
                      Project Estimates
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/orders')}>
                      <ShoppingCart className="mr-2 h-4 w-4" />
                      Material Orders
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/purchase-orders')}>
                      <FileText className="mr-2 h-4 w-4" />
                      Purchase Orders
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate('/work-items')}>
                      <Briefcase className="mr-2 h-4 w-4" />
                      All Work Items
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/sov')}>
                      <Receipt className="mr-2 h-4 w-4" />
                      SOV Dashboard
                    </DropdownMenuItem>
                    {currentOrg && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuLabel className="text-xs text-muted-foreground">
                          Organization: {currentOrg.name}
                        </DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => navigate('/org-settings')}>
                          <Users className="mr-2 h-4 w-4" />
                          Manage Organization
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                      </>
                    )}
                    {!currentOrg && (
                      <DropdownMenuItem onClick={() => navigate('/join-org')}>
                        <Building2 className="mr-2 h-4 w-4" />
                        Join Organization
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={() => navigate('/settings')}>
                      <Settings className="mr-2 h-4 w-4" />
                      Settings
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSignOut}>
                      <LogOut className="mr-2 h-4 w-4" />
                      Sign out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <Button
                size="sm"
                className="bg-primary-foreground text-primary hover:bg-primary-foreground/90"
                onClick={() => navigate('/auth')}
              >
                Sign In
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
