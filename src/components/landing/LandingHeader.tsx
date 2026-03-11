import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useState } from 'react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

const LogoSVG = () => (
  <svg width="28" height="28" viewBox="0 0 1024 1024" className="rounded-[7px] shrink-0">
    <rect width="1024" height="1024" rx="230" fill="#323C47"/>
    <g fill="#FCA429" transform="translate(144.402107,144.402107)">
      <path d="M385.227916,328.818849 L385.227916,177.463626 L350.676626,177.463626 L350.676626,328.46677 C340.701712,332.546039 332.618858,340.130898 328.088261,349.613968 L221.03254,349.613969 L221.03254,384.126178 L327.811377,384.126178 C334.563343,398.855577 349.827681,409.158835 367.534167,409.158835 C391.479253,409.158835 410.95812,390.316159 410.95812,367.165853 C410.95812,350.104435 400.378246,335.38269 385.227918,328.818857 Z"/>
      <path d="M733.657335,342.20156 C720.936619,151.366333 561.455354,0 367.237689,0 C164.737751,0 0,164.551415 0,366.822303 C0,569.09319 164.737751,733.644605 367.237689,733.644605 C392.484819,733.644605 417.144959,731.08675 440.972024,726.216846 L438.367575,726.216846 L438.367575,657.621665 C415.469874,663.251256 391.542875,666.23795 366.930765,666.23795 C202.107618,666.23795 68.0100123,532.292024 68.0100123,367.655309 C68.0100123,203.018595 202.107618,69.0726687 366.930765,69.0726687 C523.171551,69.0726687 651.803255,189.432601 664.775377,342.20156 Z"/>
    </g>
    <path d="M676.231594,623.426999 L724.15404,623.426999 L724.15404,878.697709 L776.327637,878.697709 L776.327637,623.426999 L861.802274,623.426999 C861.802274,593.941984 838.863284,576.172016 809.371107,576.172016 L676.231594,576.172016 L676.231594,569.815695 C676.231594,568.450987 674.96287,567.339371 673.405284,567.339371 L624.36116,567.339371 C622.79791,567.339371 621.53485,568.450987 621.53485,569.815695 L621.53485,631.053832 C621.53485,632.423502 622.79791,633.530156 624.36116,633.530156 L673.405284,633.530156 C674.96287,633.530156 676.231594,632.423502 676.231594,631.053832 Z" fill="#FFFFFF"/>
  </svg>
);

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
