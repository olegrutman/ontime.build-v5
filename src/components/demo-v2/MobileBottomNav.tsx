import { Home, Truck, FileText, Users, Search } from 'lucide-react';

interface MobileBottomNavProps {
  active: string;
  onNavigate: (id: string) => void;
  onSearch: () => void;
}

const ITEMS = [
  { id: 'home', icon: Home, label: 'Home' },
  { id: 'orders', icon: Truck, label: 'Orders' },
  { id: 'invoices', icon: FileText, label: 'Invoices' },
  { id: 'crew', icon: Users, label: 'Crew' },
  { id: 'search', icon: Search, label: 'Search' },
];

export function MobileBottomNav({ active, onNavigate, onSearch }: MobileBottomNavProps) {
  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 bg-[#0D1F3C] border-t border-white/10 flex items-center justify-around py-2 pb-[env(safe-area-inset-bottom,8px)] min-[900px]:hidden">
      {ITEMS.map(item => {
        const isActive = item.id === active;
        return (
          <button
            key={item.id}
            onClick={() => item.id === 'search' ? onSearch() : onNavigate(item.id)}
            className={`flex flex-col items-center gap-0.5 px-3 py-1 ${isActive ? 'text-[#F5A623]' : 'text-white/40'}`}
          >
            <item.icon className="w-5 h-5" />
            <span className="text-[9px] font-medium">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
