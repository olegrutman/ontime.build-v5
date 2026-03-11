import { Link } from 'react-router-dom';

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
            <LogoSVG />
            <span className="font-heading text-[1.35rem] font-extrabold text-white">
              Ontime<span style={{ color: 'hsl(var(--amber))' }}>.build</span>
            </span>
          </div>
          <p className="text-[0.85rem] leading-[1.75] max-w-[270px]">
            Construction operations software that connects General Contractors, Trade Contractors, Field Crews, and Suppliers in one real-time platform.
          </p>
          <div className="flex gap-2.5 mt-[22px]">
            {['LinkedIn', 'Twitter/X', 'YouTube'].map((s) => (
              <a key={s} href="#" className="px-3.5 py-[7px] border border-white/[0.08] text-white/30 text-[0.78rem] rounded no-underline transition-all" style={{ }} onMouseOver={e => { (e.target as HTMLElement).style.borderColor = 'hsl(var(--amber))'; (e.target as HTMLElement).style.color = 'hsl(var(--amber))'; }} onMouseOut={e => { (e.target as HTMLElement).style.borderColor = 'rgba(255,255,255,.08)'; (e.target as HTMLElement).style.color = 'rgba(255,255,255,.3)'; }}>
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
