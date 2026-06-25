import { ChevronRight, Command, Search } from 'lucide-react';

interface Breadcrumb {
  label: string;
  onClick?: () => void;
}

interface ContextBarProps {
  breadcrumbs: Breadcrumb[];
  onCommandPalette: () => void;
  onBack?: () => void;
}

export function ContextBar({ breadcrumbs, onCommandPalette }: ContextBarProps) {
  return (
    <header className="fixed top-0 inset-x-0 z-50 h-[52px] flex items-center justify-between px-4 bg-[#0D1F3C]/80 backdrop-blur-xl border-b border-white/5">
      {/* Left — Logo */}
      <div className="flex items-center gap-2 min-w-[120px]">
        <div className="w-7 h-7 rounded-md bg-[#F5A623] flex items-center justify-center">
          <span className="text-[#0D1F3C] font-black text-xs">OT</span>
        </div>
        <span className="text-white/90 text-sm font-semibold hidden sm:block">
          ONTIME
        </span>
      </div>

      {/* Center — Breadcrumbs */}
      <nav className="flex items-center gap-1 text-sm">
        {breadcrumbs.map((crumb, i) => (
          <span key={i} className="flex items-center gap-1">
            {i > 0 && <ChevronRight className="w-3 h-3 text-white/30" />}
            <button
              onClick={crumb.onClick}
              className={`${i === breadcrumbs.length - 1 ? 'text-white font-medium' : 'text-white/50 hover:text-white/80'} transition-colors`}
              disabled={!crumb.onClick}
            >
              {crumb.label}
            </button>
          </span>
        ))}
      </nav>

      {/* Right — ⌘K + Avatar */}
      <div className="flex items-center gap-3 min-w-[120px] justify-end">
        <button
          onClick={onCommandPalette}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 text-xs transition-colors"
        >
          <Search className="w-3 h-3" />
          <span className="hidden sm:inline">Search</span>
          <kbd className="hidden sm:inline ml-1 px-1 py-0.5 rounded bg-white/5 text-[10px] font-mono">⌘K</kbd>
        </button>
        <div className="w-7 h-7 rounded-full bg-[#F5A623]/20 border border-[#F5A623]/40 flex items-center justify-center">
          <span className="text-[#F5A623] text-[10px] font-bold">JD</span>
        </div>
      </div>
    </header>
  );
}
