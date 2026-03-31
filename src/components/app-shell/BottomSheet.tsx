import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface MetaTile {
  label: string;
  value: string;
}

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  amount?: string;
  meta?: MetaTile[];
  actions?: { label: string; variant: 'primary' | 'secondary' | 'ghost'; onClick: () => void }[];
}

export function BottomSheet({ open, onClose, title, amount, meta = [], actions = [] }: BottomSheetProps) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-[90] bg-black/30"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed inset-x-0 bottom-0 z-[91] bg-card rounded-t-2xl border-t border-border p-5 pb-8 max-w-lg mx-auto"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300, mass: 0.8 }}
          >
            {/* Handle */}
            <div className="w-10 h-1 rounded-full bg-border mx-auto mb-4" />

            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-foreground font-semibold text-lg" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                  {title}
                </h3>
                {amount && (
                  <p className="text-primary text-2xl font-bold mt-1" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                    {amount}
                  </p>
                )}
              </div>
              <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            {meta.length > 0 && (
              <div className="grid grid-cols-2 gap-2 mb-5">
                {meta.map((m, i) => (
                  <div key={i} className="bg-accent/50 rounded-lg px-3 py-2.5">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{m.label}</p>
                    <p className="text-foreground text-sm font-medium mt-0.5">{m.value}</p>
                  </div>
                ))}
              </div>
            )}

            {actions.length > 0 && (
              <div className="flex gap-2">
                {actions.map((action, i) => (
                  <button
                    key={i}
                    onClick={action.onClick}
                    className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      action.variant === 'primary'
                        ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                        : action.variant === 'secondary'
                        ? 'bg-accent text-foreground hover:bg-accent/80'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
