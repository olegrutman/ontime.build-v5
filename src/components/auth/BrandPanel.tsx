import { OntimeLogo } from '@/components/ui/OntimeLogo';

export function BrandPanel() {
  return (
    <div className="auth-brand-panel">
      {/* Logo */}
      <div className="bp-logo">
        <div className="bp-logo-icon">
          <OntimeLogo className="w-[60px] h-[60px]" />
        </div>
        <div>
          <div className="bp-wordmark">
            Ontime<em>.Build</em>
          </div>
          <div className="bp-tag">CONSTRUCTION INTELLIGENCE</div>
        </div>
      </div>

      {/* Hero text */}
      <div className="bp-hero">
        <div className="bp-eyebrow">Built for the jobsite</div>
        <div className="bp-headline">
          Build Smarter.<br />
          Deliver <em>On Time.</em>
        </div>
        <div className="bp-desc">
          Real-time change orders, billing, and project intelligence — from field to office.
        </div>

        <div className="bp-features">
          <div className="bp-feat">
            <div className="bp-feat-dot">⚡</div>
            Real-time change order tracking
          </div>
          <div className="bp-feat">
            <div className="bp-feat-dot">📊</div>
            AIA-style billing & SOV management
          </div>
          <div className="bp-feat">
            <div className="bp-feat-dot">🤝</div>
            Multi-party collaboration (GC ↔ TC ↔ FC)
          </div>
        </div>
      </div>

      {/* Trust strip */}
      <div className="bp-trust">
        <div className="bp-trust-logos">
          <div className="bp-trust-av">DK</div>
          <div className="bp-trust-av">SP</div>
          <div className="bp-trust-av">JM</div>
        </div>
        <div className="bp-trust-txt">Trusted by 200+ construction teams</div>
      </div>
    </div>
  );
}
