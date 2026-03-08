import { type ReactNode, useState } from 'react';
import { PlatformSidebar, PlatformSidebarContent } from './PlatformSidebar';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { Menu } from 'lucide-react';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';

interface PlatformLayoutProps {
  children: ReactNode;
  title?: string;
  breadcrumbs?: { label: string; href?: string }[];
}

export function PlatformLayout({ children, title, breadcrumbs }: PlatformLayoutProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <PlatformSidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile header */}
        <header className="lg:hidden sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-card px-4 py-3">
          <button onClick={() => setDrawerOpen(true)} className="p-1 -ml-1 text-muted-foreground hover:text-foreground">
            <Menu className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            {breadcrumbs && breadcrumbs.length > 0 && (
              <nav className="flex items-center gap-1.5 text-xs text-muted-foreground">
                {breadcrumbs.map((crumb, i) => (
                  <span key={i} className="flex items-center gap-1.5">
                    {i > 0 && <span>/</span>}
                    {crumb.href ? (
                      <a href={crumb.href} className="hover:text-foreground transition-colors">{crumb.label}</a>
                    ) : (
                      <span className="text-foreground">{crumb.label}</span>
                    )}
                  </span>
                ))}
              </nav>
            )}
            {title && <h1 className="text-base font-semibold text-foreground truncate">{title}</h1>}
          </div>
        </header>

        {/* Desktop header */}
        <main className="flex-1 overflow-y-auto">
          {(title || breadcrumbs) && (
            <div className="hidden lg:block border-b border-border bg-card px-6 py-4">
              {breadcrumbs && breadcrumbs.length > 0 && (
                <nav className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                  {breadcrumbs.map((crumb, i) => (
                    <span key={i} className="flex items-center gap-1.5">
                      {i > 0 && <span>/</span>}
                      {crumb.href ? (
                        <a href={crumb.href} className="hover:text-foreground transition-colors">{crumb.label}</a>
                      ) : (
                        <span className="text-foreground">{crumb.label}</span>
                      )}
                    </span>
                  ))}
                </nav>
              )}
              {title && <h1 className="text-lg font-semibold text-foreground">{title}</h1>}
            </div>
          )}
          <div className="px-4 py-4 lg:p-6 pb-20">{children}</div>
        </main>
      </div>

      {/* Mobile drawer */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent side="left" className="w-64 p-0">
          <VisuallyHidden><SheetTitle>Navigation</SheetTitle></VisuallyHidden>
          <PlatformSidebarContent onNavigate={() => setDrawerOpen(false)} />
        </SheetContent>
      </Sheet>
    </div>
  );
}
