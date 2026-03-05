import { type ReactNode } from 'react';
import { PlatformSidebar } from './PlatformSidebar';

interface PlatformLayoutProps {
  children: ReactNode;
  title?: string;
  breadcrumbs?: { label: string; href?: string }[];
}

export function PlatformLayout({ children, title, breadcrumbs }: PlatformLayoutProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <PlatformSidebar />
      <main className="flex-1 overflow-y-auto">
        {(title || breadcrumbs) && (
          <div className="border-b border-border bg-card px-6 py-4">
            {breadcrumbs && breadcrumbs.length > 0 && (
              <nav className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                {breadcrumbs.map((crumb, i) => (
                  <span key={i} className="flex items-center gap-1.5">
                    {i > 0 && <span>/</span>}
                    {crumb.href ? (
                      <a href={crumb.href} className="hover:text-foreground transition-colors">
                        {crumb.label}
                      </a>
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
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
