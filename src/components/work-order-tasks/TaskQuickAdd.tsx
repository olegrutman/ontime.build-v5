import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Plus } from 'lucide-react';

interface TaskQuickAddProps {
  onSubmit: (task: { title: string; description?: string }) => Promise<void>;
  isSubmitting: boolean;
}

export function TaskQuickAdd({ onSubmit, isSubmitting }: TaskQuickAddProps) {
  const [title, setTitle] = useState('');

  const handleSubmit = async () => {
    if (!title.trim()) return;
    await onSubmit({ title: title.trim() });
    setTitle('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && title.trim()) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="flex gap-2">
      <Input
        placeholder="Quick add task…"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={handleKeyDown}
        className="flex-1"
      />
      <Button
        size="icon"
        onClick={handleSubmit}
        disabled={!title.trim() || isSubmitting}
      >
        {isSubmitting ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Plus className="w-4 h-4" />
        )}
      </Button>
    </div>
  );
}
