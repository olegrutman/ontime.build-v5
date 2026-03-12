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
    <header className="fixed top-0 left-0 right-0 z-50 h-[68px] flex items-center" style={{ background: 'hsl(var(--navy))', borderBottom: '1px solid hsl(var(--amber) / 0.15)' }}>
      <div className="w-full px-[5%] flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 no-underline">
          <LogoSVG />
          <div>
            <span className="font-heading text-[1.35rem] font-extrabold tracking-[-0.3px] text-white leading-none">
              Ontime<span style={{ color: 'hsl(var(--amber))' }}>.build</span>
            </span>
            <div className="text-[0.62rem] text-white/30 tracking-[0.5px] mt-px">Built for real job sites</div>
          </div>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-7">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-[0.87rem] font-medium text-white/[0.42] hover:text-white transition-colors tracking-[0.2px]"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Actions */}
        <div className="hidden md:flex items-center gap-2.5">
          {user ? (
            <>
              <Button
                onClick={() => navigate('/dashboard')}
                className="bg-primary text-primary-foreground shadow-amber rounded-[5px] text-[0.85rem] font-bold hover:brightness-110"
              >
                Go to Dashboard
              </Button>
              <Button variant="ghost" onClick={() => signOut()} className="text-[0.85rem] text-white/45 hover:text-white">
                Sign out
              </Button>
            </>
          ) : (
            <>
              <Link
                to="/auth"
                className="px-[18px] py-2 border-[1.5px] border-white/[0.14] text-white/[0.45] rounded-[5px] text-[0.85rem] font-medium hover:border-primary/50 hover:text-white transition-all no-underline"
              >
                Sign In
              </Link>
              <Link
                to="/signup"
                className="px-5 py-[9px] bg-primary text-primary-foreground rounded-[5px] text-[0.85rem] font-bold shadow-amber hover:brightness-110 hover:-translate-y-px transition-all no-underline"
                style={{ background: 'hsl(var(--amber))' }}
              >
                Start Free Demo
              </Link>
            </>
          )}
        </div>

        {/* Mobile Menu */}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild className="md:hidden">
            <Button variant="ghost" size="icon" className="text-white">
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
                    className="w-full bg-primary text-primary-foreground"
                  >
                    Go to Dashboard
                  </Button>
                  <Button variant="ghost" className="w-full text-white/50" onClick={() => { signOut(); setOpen(false); }}>
                    Sign out
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="outline" asChild className="w-full border-white/15 text-white" onClick={() => setOpen(false)}>
                    <Link to="/auth">Sign in</Link>
                  </Button>
                  <Button asChild className="w-full bg-primary text-primary-foreground" onClick={() => setOpen(false)}>
                    <Link to="/signup">Start Free Demo</Link>
                  </Button>
                </>
              )}
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
