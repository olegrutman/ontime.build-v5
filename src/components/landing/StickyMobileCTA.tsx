import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

export function StickyMobileCTA() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 600);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div
      className={`md:hidden fixed bottom-0 left-0 right-0 z-40 px-4 py-3 transition-transform duration-300 ${show ? 'translate-y-0' : 'translate-y-full'}`}
      style={{
        background: 'hsl(var(--navy) / 0.96)',
        borderTop: '1px solid hsl(var(--amber) / 0.25)',
        backdropFilter: 'blur(8px)',
      }}
    >
      <div className="flex items-center gap-2">
        <div className="flex-1 text-[0.78rem]" style={{ color: 'rgba(255,255,255,0.75)' }}>
          $89 / company · unlimited users
        </div>
        <Link
          to="/signup"
          className="px-5 py-2.5 rounded-[5px] text-[0.85rem] font-bold no-underline"
          style={{ background: 'hsl(var(--amber))', color: 'hsl(var(--navy-d))' }}
        >
          Create Account
        </Link>
      </div>
    </div>
  );
}
