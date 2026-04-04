import { Link } from 'react-router-dom';
import { OntimeLogo } from '@/components/ui/OntimeLogo';

const footerCols = {
  Product: ['Purchase Orders', 'Work Orders', 'Change Orders', 'Invoicing', 'Returns', 'Project Budget', 'Sasha AI'],
  Company: ['About Us', 'Customers', 'Blog', 'Careers', 'Contact'],
  Resources: ['Help Center', 'API Reference', 'Integrations', 'Case Studies', 'Community'],
};

export function Footer() {
  return (
    <footer className="text-white/[0.45] pt-16 pb-9 px-[5%]" style={{ background: 'hsl(var(--navy-d))' }}>
      <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_1fr] gap-[52px] mb-[52px]">
        {/* Brand */}
        <div>
          <div className="flex items-center gap-2.5 mb-3">
            <OntimeLogo />
            <span className="font-heading text-[1.35rem] font-extrabold text-white">
              Ontime<span style={{ color: 'hsl(var(--amber))' }}>.build</span>
            </span>
          </div>
          <p className="text-[0.85rem] leading-[1.75] max-w-[270px]">
            Construction operations software that connects General Contractors, Trade Contractors, Field Crews, and Suppliers in one real-time platform.
          </p>
          <div className="flex gap-2.5 mt-[22px]">
            {['LinkedIn', 'Twitter/X', 'YouTube'].map((s) => (
              <a key={s} href="#" className="px-3.5 py-[7px] border border-white/[0.08] text-white/30 text-[0.78rem] rounded no-underline transition-all" onMouseOver={e => { (e.target as HTMLElement).style.borderColor = 'hsl(var(--amber))'; (e.target as HTMLElement).style.color = 'hsl(var(--amber))'; }} onMouseOut={e => { (e.target as HTMLElement).style.borderColor = 'rgba(255,255,255,.08)'; (e.target as HTMLElement).style.color = 'rgba(255,255,255,.3)'; }}>
                {s}
              </a>
            ))}
          </div>
        </div>

        {/* Link columns */}
        {Object.entries(footerCols).map(([title, links]) => (
          <div key={title}>
            <h4 className="text-[0.65rem] font-bold tracking-[1.8px] uppercase text-white/[0.18] mb-[18px]">{title}</h4>
            <ul className="flex flex-col gap-2.5">
              {links.map((l) => (
                <li key={l}>
                  <a href="#" className="text-white/[0.38] text-[0.84rem] no-underline hover:text-white transition-colors">{l}</a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="flex flex-col md:flex-row justify-between items-center pt-7 gap-3" style={{ borderTop: '1px solid rgba(255,255,255,.05)' }}>
        <div className="text-[0.78rem] text-white/[0.18]">© {new Date().getFullYear()} Ontime.Build — All rights reserved.</div>
        <div className="flex gap-5">
          {['Privacy Policy', 'Terms of Service', 'Security', 'Status'].map((l) => (
            <a key={l} href="#" className="text-[0.78rem] text-white/[0.18] no-underline hover:text-white/60 transition-colors">{l}</a>
          ))}
        </div>
      </div>
    </footer>
  );
}
