import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useState } from 'react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

export function LandingHeader() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const navLinks = [
    { label: 'Features', href: '#features' },
    { label: 'How It Works', href: '#how' },
    { label: 'Customers', href: '#proof' },
    { label: 'Pricing', href: '#pricing' },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-[68px] flex items-center bg-white/92 backdrop-blur-[20px] border-b border-[hsl(220,13%,91%)] shadow-[0_1px_0_rgba(0,0,0,.04)]">
      <div className="w-full px-[5%] flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 no-underline">
          <div
            className="w-8 h-8 bg-[#E85A00] flex items-center justify-center text-[0.75rem] font-black text-white"
            style={{ clipPath: 'polygon(0 0,100% 0,100% 75%,75% 100%,0 100%)' }}
          >
            OT
          </div>
          <span className="font-heading text-2xl font-extrabold tracking-[-0.5px] text-[hsl(220,22%,15%)]">
            OnTime<span className="text-[#E85A00]">.build</span>
          </span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-7">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-[0.88rem] font-medium text-[hsl(220,5%,42%)] hover:text-[hsl(220,22%,15%)] transition-colors tracking-[0.2px]"
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
                className="bg-[#E85A00] hover:bg-[#FF6F1A] text-white shadow-orange rounded-[5px] text-[0.85rem] font-semibold"
              >
                Go to Dashboard
              </Button>
              <Button variant="ghost" onClick={() => signOut()} className="text-[0.85rem]">
                Sign out
              </Button>
            </>
          ) : (
            <>
              <Link
                to="/auth"
                className="px-[18px] py-2 border-[1.5px] border-[hsl(220,13%,82%)] text-[hsl(220,15%,26%)] rounded-[5px] text-[0.85rem] font-medium hover:border-[#E85A00] hover:text-[#E85A00] transition-all no-underline"
              >
                Sign In
              </Link>
              <Link
                to="/signup"
                className="px-5 py-[9px] bg-[#E85A00] text-white rounded-[5px] text-[0.85rem] font-semibold shadow-orange hover:bg-[#FF6F1A] hover:-translate-y-px transition-all no-underline"
              >
                Start Free Trial
              </Link>
            </>
          )}
        </div>

        {/* Mobile Menu */}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild className="md:hidden">
            <Button variant="ghost" size="icon">
              <Menu className="w-5 h-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[280px]">
            <nav className="flex flex-col gap-4 mt-8">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="text-lg font-medium text-[hsl(220,5%,42%)] hover:text-[hsl(220,22%,15%)] transition-colors"
                >
                  {link.label}
                </a>
              ))}
              <hr className="my-4" />
              {user ? (
                <>
                  <Button
                    onClick={() => { navigate('/dashboard'); setOpen(false); }}
                    className="w-full bg-[#E85A00] hover:bg-[#FF6F1A]"
                  >
                    Go to Dashboard
                  </Button>
                  <Button variant="ghost" className="w-full" onClick={() => { signOut(); setOpen(false); }}>
                    Sign out
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="outline" asChild className="w-full" onClick={() => setOpen(false)}>
                    <Link to="/auth">Sign in</Link>
                  </Button>
                  <Button asChild className="w-full bg-[#E85A00] hover:bg-[#FF6F1A]" onClick={() => setOpen(false)}>
                    <Link to="/signup">Start Free Trial</Link>
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
