import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useState } from 'react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { OntimeLogo } from '@/components/ui/OntimeLogo';

export function LandingHeader() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const navLinks = [
    { label: 'Features', href: '#features' },
    { label: 'How It Works', href: '#how' },
    { label: 'Roles', href: '#roles' },
    { label: 'Pricing', href: '#pricing' },
  ];

  return (
    <header className="fixed top-2.5 sm:top-4 left-0 right-0 z-50 px-3 sm:px-[5%] pointer-events-none">
      <div
        className="pointer-events-auto mx-auto w-full max-w-6xl h-[60px] sm:h-[64px] flex items-center rounded-full pl-4 pr-2 sm:pl-6 sm:pr-2.5"
        style={{
          background: 'hsl(var(--navy))',
          boxShadow: '0 8px 30px hsl(var(--navy) / 0.22), 0 0 0 1px hsl(var(--amber) / 0.12)',
        }}
      >
        <div className="w-full flex items-center justify-between gap-4">
          {/* Logo */}
          <Link to={user ? '/dashboard' : '/'} className="flex items-center gap-2.5 no-underline flex-shrink-0">
            <OntimeLogo />
            <span className="font-heading text-[1.3rem] sm:text-[1.35rem] font-extrabold tracking-[-0.3px] text-white leading-none">
              Ontime<span style={{ color: 'hsl(var(--amber))' }}>.build</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-7">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-[0.87rem] font-medium text-white/50 hover:text-white transition-colors tracking-[0.2px]"
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* Actions */}
          <div className="hidden md:flex items-center gap-2">
            {user ? (
              <>
                <Button
                  onClick={() => navigate('/dashboard')}
                  className="bg-primary text-primary-foreground shadow-amber rounded-full px-5 text-[0.85rem] font-bold hover:brightness-110"
                >
                  Go to Dashboard
                </Button>
                <Button variant="ghost" onClick={() => signOut()} className="rounded-full text-[0.85rem] text-white/50 hover:text-white">
                  Sign out
                </Button>
              </>
            ) : (
              <>
                <Link
                  to="/auth"
                  className="px-5 py-2 border-[1.5px] border-white/[0.16] text-white/60 rounded-full text-[0.85rem] font-medium hover:border-primary/50 hover:text-white transition-all no-underline"
                >
                  Sign In
                </Link>
                <Link
                  to="/signup"
                  className="px-5 py-[10px] rounded-full text-[0.85rem] font-bold shadow-amber hover:brightness-110 transition-all no-underline"
                  style={{ background: 'hsl(var(--amber))', color: 'hsl(var(--navy-d))' }}
                >
                  Create an Account
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu */}
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon" className="rounded-full text-white hover:bg-white/10">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[280px]" style={{ background: 'hsl(var(--navy))' }}>
              <nav className="flex flex-col gap-4 mt-8">
                {navLinks.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className="text-lg font-medium text-white/50 hover:text-white transition-colors"
                  >
                    {link.label}
                  </a>
                ))}
                <hr className="my-4 border-white/10" />
                {user ? (
                  <>
                    <Button
                      onClick={() => { navigate('/dashboard'); setOpen(false); }}
                      className="w-full rounded-full bg-primary text-primary-foreground"
                    >
                      Go to Dashboard
                    </Button>
                    <Button variant="ghost" className="w-full rounded-full text-white/50" onClick={() => { signOut(); setOpen(false); }}>
                      Sign out
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="outline" asChild className="w-full rounded-full border-white/15 text-white" onClick={() => setOpen(false)}>
                      <Link to="/auth">Sign in</Link>
                    </Button>
                    <Button asChild className="w-full rounded-full bg-primary text-primary-foreground" onClick={() => setOpen(false)}>
                      <Link to="/signup">Create an Account</Link>
                    </Button>
                  </>
                )}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
