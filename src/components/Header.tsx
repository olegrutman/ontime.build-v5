import { Building2, Plus, Search, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function Header() {
  return (
    <header className="sticky top-0 z-50 bg-primary text-primary-foreground">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 bg-primary-foreground/10 rounded-lg">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-lg tracking-tight">Ontime.Build</h1>
              <p className="text-[10px] text-primary-foreground/60 uppercase tracking-widest">V1</p>
            </div>
          </div>

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
            <Button 
              variant="ghost" 
              size="icon"
              className="text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10"
            >
              <Bell className="w-5 h-5" />
            </Button>
            <Button 
              size="sm"
              className="bg-primary-foreground text-primary hover:bg-primary-foreground/90 gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">New Work Item</span>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
