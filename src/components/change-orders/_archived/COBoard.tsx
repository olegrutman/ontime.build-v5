import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BOARD_COLUMNS, type BoardColumnKey, type BoardColumns, type ChangeOrderWithMembers } from '@/hooks/useChangeOrders';
import { COBoardCard } from './COBoardCard';

interface COBoardProps {
  columns: BoardColumns;
  activeCOId: string | null;
  onCardClick: (id: string) => void;
  onNewCO: () => void;
}

export function COBoard({ columns, activeCOId, onCardClick, onNewCO }: COBoardProps) {
  return (
    <div className="flex gap-3 overflow-x-auto pb-4 min-h-[calc(100vh-300px)]">
      {BOARD_COLUMNS.map(col => (
        <BoardColumn
          key={col.key}
          label={col.label}
          color={col.color}
          items={columns[col.key]}
          activeCOId={activeCOId}
          onCardClick={onCardClick}
          onNewCO={col.key === 'wip' ? onNewCO : undefined}
          highlight={col.key === 'gc_review'}
        />
      ))}
    </div>
  );
}

interface BoardColumnProps {
  label: string;
  color: string;
  items: ChangeOrderWithMembers[];
  activeCOId: string | null;
  onCardClick: (id: string) => void;
  onNewCO?: () => void;
  highlight?: boolean;
}

function BoardColumn({ label, color, items, activeCOId, onCardClick, onNewCO, highlight }: BoardColumnProps) {
  return (
    <div className={cn(
      'flex flex-col min-w-[260px] w-[260px] bg-muted/20 rounded-lg shrink-0',
      highlight && 'bg-primary/5',
    )}>
      {/* Column header */}
      <div className="flex items-center gap-2 px-3 py-2.5" style={{ borderTop: `3px solid ${color}` }}>
        <span
          className="w-2.5 h-2.5 rounded-full shrink-0"
          style={{ backgroundColor: color }}
        />
        <span className="text-xs font-semibold text-foreground flex-1 truncate">{label}</span>
        <span
          className="text-[11px] font-bold px-1.5 py-0.5 rounded-full text-white min-w-[20px] text-center"
          style={{ backgroundColor: color }}
        >
          {items.length}
        </span>
      </div>

      {/* Cards */}
      <div className="flex-1 p-2 space-y-2 overflow-y-auto">
        {items.map(co => (
          <COBoardCard
            key={co.id}
            co={co}
            isActive={co.id === activeCOId}
            onClick={onCardClick}
          />
        ))}

        {/* Add CO button at bottom of first column */}
        {onNewCO && (
          <button
            onClick={onNewCO}
            className="w-full flex items-center justify-center gap-1.5 py-3 border-2 border-dashed border-border/60 rounded-lg text-xs text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Add CO
          </button>
        )}
      </div>
    </div>
  );
}
