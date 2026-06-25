import { Link } from 'react-router-dom';
import { OntimeLogo } from '@/components/ui/OntimeLogo';

const footerCols: Record<string, { label: string; href: string }[]> = {
  Product: [
    { label: 'Features', href: '#features' },
    { label: 'How It Works', href: '#how' },
    { label: 'Roles', href: '#roles' },
    { label: 'Pricing', href: '#pricing' },
    { label: 'T&M / Remodel Mode', href: '#how' },
  ],
  Company: [
    { label: 'Contact', href: 'mailto:hello@ontime.build' },
    { label: 'Talk to Sales', href: 'mailto:hello@ontime.build?subject=Sales%20inquiry' },
  ],
  Resources: [
    { label: 'Sign In', href: '/auth' },
    { label: 'Create Account', href: '/signup' },
    { label: 'FAQ', href: '#proof' },
  ],
  Legal: [
    { label: 'Privacy Policy', href: '/privacy' },
    { label: 'Terms of Service', href: '/terms' },
    { label: 'Security', href: '/security' },
  ],
};

export function Footer() {
  return (
    <footer className="text-white/70 pt-16 pb-9 px-[5%]" style={{ background: 'hsl(var(--navy-d))' }}>
      <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-[52px] mb-[52px]">
        {/* Brand */}
        <div>
          <div className="flex items-center gap-2.5 mb-3">
            <OntimeLogo />
            <span className="font-heading text-[1.35rem] font-extrabold text-white">
              Ontime<span style={{ color: 'hsl(var(--amber))' }}>.build</span>
            </span>
          </div>
          <p className="text-[0.85rem] leading-[1.75] max-w-[270px] text-white/60">
            Construction operations software that connects General Contractors, Trade Contractors, Field Crews, and Suppliers in one real-time platform.
          </p>
        </div>

        {/* Link columns */}
        {Object.entries(footerCols).map(([title, links]) => (
          <div key={title}>
            <h4 className="text-[0.65rem] font-bold tracking-[1.8px] uppercase text-white/50 mb-[18px]">{title}</h4>
            <ul className="flex flex-col gap-2.5">
              {links.map((l) => (
                <li key={l.label}>
                  {l.href.startsWith('/') ? (
                    <Link to={l.href} className="text-white/70 text-[0.84rem] no-underline hover:text-white transition-colors">
                      {l.label}
                    </Link>
                  ) : (
                    <a href={l.href} className="text-white/70 text-[0.84rem] no-underline hover:text-white transition-colors">
                      {l.label}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="flex flex-col md:flex-row justify-between items-center pt-7 gap-3" style={{ borderTop: '1px solid rgba(255,255,255,.08)' }}>
        <div className="text-[0.78rem] text-white/50">© {new Date().getFullYear()} Ontime.Build — All rights reserved.</div>
      </div>
    </footer>
  );
}
