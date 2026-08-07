import { useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LandingHeader, Footer } from '@/components/landing';
import { rolePages, getRolePage } from '@/content/rolePages';
import NotFound from '@/pages/NotFound';

export default function RolePage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const role = getRolePage(slug);

  useEffect(() => {
    if (!role) return;
    document.title = role.metaTitle;
    const desc = document.querySelector('meta[name="description"]');
    if (desc) desc.setAttribute('content', role.metaDescription);
    window.scrollTo(0, 0);
  }, [role]);

  if (!role) return <NotFound />;

  const others = rolePages.filter((r) => r.slug !== role.slug);

  return (
    <div className="min-h-screen bg-white">
      <LandingHeader />
      <main>
        {/* Hero */}
        <section
          className="pt-28 sm:pt-36 pb-16 sm:pb-20 px-[5%]"
          style={{ background: 'linear-gradient(168deg, #FFF9EC, #FDF3E0 38%, #F4F6FB 78%, #EEF1F8)' }}
        >
          <div className="max-w-6xl mx-auto">
            <Link
              to="/#roles"
              className="inline-flex items-center gap-1.5 text-[0.75rem] font-semibold uppercase tracking-[1.5px] text-muted-foreground hover:text-foreground transition-colors mb-6"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> All roles
            </Link>

            <div className="flex items-center gap-2 text-[0.7rem] font-bold tracking-[2px] uppercase mb-4" style={{ color: 'hsl(var(--amber-d))' }}>
              <span aria-hidden="true">{role.icon}</span>
              {role.eyebrow}
            </div>

            <h1 className="font-heading text-[clamp(2.4rem,6vw,4.4rem)] font-black leading-[0.94] tracking-[-1.6px] uppercase text-foreground max-w-[900px]">
              {role.headline}<br />
              <em className="not-italic" style={{ color: 'hsl(var(--amber-d))' }}>{role.headlineAccent}</em>
            </h1>

            <p className="mt-5 text-base sm:text-lg leading-[1.75] text-muted-foreground max-w-[620px]">{role.sub}</p>

            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Button
                onClick={() => navigate('/signup')}
                className="rounded-full h-12 px-7 text-[0.9rem] font-bold bg-primary text-primary-foreground shadow-amber hover:brightness-110"
              >
                {role.ctaLabel} <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate('/#pricing')}
                className="rounded-full h-12 px-7 text-[0.9rem] font-bold border-foreground/15"
              >
                See pricing
              </Button>
            </div>

            <div className="mt-10 grid grid-cols-3 gap-px rounded-xl overflow-hidden max-w-[560px]" style={{ background: 'hsl(var(--foreground) / 0.08)' }}>
              {role.proof.map((p) => (
                <div key={p.label} className="bg-white/80 px-4 py-4">
                  <div className="font-mono text-[0.95rem] sm:text-[1.1rem] font-bold text-foreground">{p.value}</div>
                  <div className="text-[0.62rem] uppercase tracking-[1.2px] text-muted-foreground mt-1">{p.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Problem → Solution */}
        <section className="py-20 px-[5%] bg-white">
          <div className="max-w-6xl mx-auto">
            <div className="text-[0.7rem] font-bold tracking-[2px] uppercase text-muted-foreground mb-3">The problem today</div>
            <h2 className="font-heading text-[clamp(1.9rem,4vw,2.9rem)] font-black uppercase leading-[1] tracking-[-1px] text-foreground max-w-[760px]">
              What breaks without a shared system
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-10">
              {role.problems.map((p) => (
                <div key={p.title} className="rounded-2xl border border-border p-6 bg-muted/30">
                  <div className="font-heading text-[1.05rem] font-extrabold uppercase text-foreground mb-2">{p.title}</div>
                  <p className="text-[0.85rem] leading-[1.72] text-muted-foreground">{p.body}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-6">
              {role.solution.map((s) => (
                <div
                  key={s.title}
                  className="rounded-2xl p-6"
                  style={{ background: 'hsl(var(--amber) / 0.07)', border: '1px solid hsl(var(--amber) / 0.25)' }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Check className="w-4 h-4" style={{ color: 'hsl(var(--amber-d))' }} />
                    <div className="font-heading text-[1.05rem] font-extrabold uppercase text-foreground">{s.title}</div>
                  </div>
                  <p className="text-[0.85rem] leading-[1.72] text-muted-foreground">{s.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Workflow */}
        <section className="py-20 px-[5%]" style={{ background: 'hsl(var(--navy))' }}>
          <div className="max-w-6xl mx-auto">
            <div className="text-[0.7rem] font-bold tracking-[2px] uppercase mb-3" style={{ color: 'hsl(var(--amber) / 0.6)' }}>
              How it works for you
            </div>
            <h2 className="font-heading text-[clamp(1.9rem,4vw,2.9rem)] font-black uppercase leading-[1] tracking-[-1px] text-white max-w-[760px]">
              Four steps, start to paid
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-px rounded-xl overflow-hidden mt-10"
              style={{ background: 'hsl(var(--amber) / 0.1)', border: '1px solid hsl(var(--amber) / 0.12)' }}
            >
              {role.workflow.map((w) => (
                <div key={w.step} className="p-7" style={{ background: 'rgba(255,255,255,0.02)' }}>
                  <div className="font-mono text-[0.8rem] font-bold mb-3" style={{ color: 'hsl(var(--amber))' }}>{w.step}</div>
                  <div className="font-heading text-[1.05rem] font-extrabold uppercase text-white mb-2">{w.title}</div>
                  <p className="text-[0.83rem] leading-[1.72] text-white/65">{w.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="py-20 px-[5%] bg-white">
          <div className="max-w-6xl mx-auto">
            <div className="text-[0.7rem] font-bold tracking-[2px] uppercase text-muted-foreground mb-3">What you get</div>
            <h2 className="font-heading text-[clamp(1.9rem,4vw,2.9rem)] font-black uppercase leading-[1] tracking-[-1px] text-foreground max-w-[760px]">
              Features built for {role.name.toLowerCase()}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mt-10">
              {role.features.map((f) => (
                <div key={f.title} className="rounded-2xl border border-border p-6 hover:border-primary/40 transition-colors">
                  <div className="font-heading text-[1rem] font-extrabold uppercase text-foreground mb-2">{f.title}</div>
                  <p className="text-[0.85rem] leading-[1.72] text-muted-foreground">{f.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-20 px-[5%] bg-muted/30">
          <div className="max-w-3xl mx-auto">
            <h2 className="font-heading text-[clamp(1.7rem,3.5vw,2.4rem)] font-black uppercase leading-[1] tracking-[-1px] text-foreground mb-8">
              Questions
            </h2>
            <div className="space-y-4">
              {role.faq.map((f) => (
                <div key={f.q} className="rounded-2xl bg-white border border-border p-6">
                  <div className="font-semibold text-foreground mb-1.5">{f.q}</div>
                  <p className="text-[0.88rem] leading-[1.72] text-muted-foreground">{f.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA + other roles */}
        <section className="py-20 px-[5%]" style={{ background: 'hsl(var(--navy))' }}>
          <div className="max-w-6xl mx-auto text-center">
            <h2 className="font-heading text-[clamp(1.9rem,4.5vw,3.2rem)] font-black uppercase leading-[0.98] tracking-[-1.2px] text-white">
              Ready to run it this way?
            </h2>
            <p className="text-white/70 mt-4 max-w-[520px] mx-auto text-[0.95rem] leading-[1.75]">
              $89 per company. Unlimited users. All four roles included — no per-seat tax.
            </p>
            <Button
              onClick={() => navigate('/signup')}
              className="mt-8 rounded-full h-12 px-8 text-[0.9rem] font-bold bg-primary text-primary-foreground shadow-amber hover:brightness-110"
            >
              {role.ctaLabel} <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>

            <div className="mt-14 pt-10 border-t border-white/10">
              <div className="text-[0.68rem] uppercase tracking-[2px] text-white/40 mb-5">Other roles on the project</div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {others.map((o) => (
                  <Link
                    key={o.slug}
                    to={`/for/${o.slug}`}
                    className="rounded-2xl p-5 text-left transition-colors hover:bg-white/[0.06]"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid hsl(var(--amber) / 0.14)' }}
                  >
                    <div className="text-[1.1rem] mb-2" aria-hidden="true">{o.icon}</div>
                    <div className="font-heading text-[0.95rem] font-extrabold uppercase text-white">{o.name}</div>
                    <div className="text-[0.75rem] text-white/55 mt-1 inline-flex items-center gap-1">
                      Explore <ArrowRight className="w-3 h-3" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
