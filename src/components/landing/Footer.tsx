import { Link } from 'react-router-dom';

const footerCols = {
  Product: ['Features', 'Scheduling', 'RFI Management', 'Cost Control', 'Field Tools', 'Document Control', 'Integrations'],
  Company: ['About Us', 'Customers', 'Blog', 'Careers', 'Press', 'Contact'],
  Resources: ['Documentation', 'Help Center', 'API Reference', 'Webinars', 'Case Studies', 'Community'],
};

export function Footer() {
  return (
    <footer className="bg-[hsl(220,22%,15%)] text-white/60 pt-16 pb-9 px-[5%]">
      <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_1fr] gap-[52px] mb-[52px]">
        {/* Brand */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div
              className="w-8 h-8 bg-[#E85A00] flex items-center justify-center text-[0.75rem] font-black text-white"
              style={{ clipPath: 'polygon(0 0,100% 0,100% 75%,75% 100%,0 100%)' }}
            >
              OT
            </div>
            <span className="font-heading text-[1.4rem] font-extrabold text-white">
              OnTime<span className="text-[#E85A00]">.build</span>
            </span>
          </div>
          <p className="text-[0.85rem] leading-[1.75] max-w-[270px]">
            Construction project management built for the people who actually build — connecting field crews, office teams, and owners from groundbreak to closeout.
          </p>
          <div className="flex gap-2.5 mt-[22px]">
            {['LinkedIn', 'Twitter/X', 'YouTube'].map((s) => (
              <a key={s} href="#" className="px-3.5 py-[7px] border border-white/10 text-white/35 text-[0.78rem] rounded no-underline hover:border-[#E85A00] hover:text-[#E85A00] transition-all">
                {s}
              </a>
            ))}
          </div>
        </div>

        {/* Link columns */}
        {Object.entries(footerCols).map(([title, links]) => (
          <div key={title}>
            <h4 className="text-[0.68rem] font-bold tracking-[1.8px] uppercase text-white/25 mb-[18px]">{title}</h4>
            <ul className="flex flex-col gap-2.5">
              {links.map((l) => (
                <li key={l}>
                  <a href="#" className="text-white/50 text-[0.85rem] no-underline hover:text-white transition-colors">{l}</a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="flex flex-col md:flex-row justify-between items-center pt-7 border-t border-white/[0.06] gap-3">
        <div className="text-[0.78rem] text-white/25">© {new Date().getFullYear()} OnTime.build — All rights reserved.</div>
        <div className="flex gap-5">
          {['Privacy Policy', 'Terms of Service', 'Security', 'Status'].map((l) => (
            <a key={l} href="#" className="text-[0.78rem] text-white/25 no-underline hover:text-white/60 transition-colors">{l}</a>
          ))}
        </div>
      </div>
    </footer>
  );
}
