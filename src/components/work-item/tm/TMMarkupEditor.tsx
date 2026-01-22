import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Percent, Save } from 'lucide-react';
import { toast } from 'sonner';
import { TMPeriod } from './types';

interface TMMarkupEditorProps {
  period: TMPeriod;
  isEditable: boolean;
  onUpdate: () => void;
}

export function TMMarkupEditor({ period, isEditable, onUpdate }: TMMarkupEditorProps) {
  const [markup, setMarkup] = useState(period.markup_percent || 0);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('tm_periods')
      .update({ markup_percent: markup })
      .eq('id', period.id);

    if (error) {
      toast.error('Failed to update markup');
    } else {
      toast.success('Markup updated');
      onUpdate();
    }
    setSaving(false);
  };

  const hasChanged = markup !== (period.markup_percent || 0);

  return (
    <div className="flex items-end gap-2">
      <div className="flex-1">
        <Label className="text-xs flex items-center gap-1 mb-1">
          <Percent className="w-3 h-3" />
          Markup
        </Label>
        <Input
          type="number"
          step="0.5"
          min="0"
          max="100"
          value={markup}
          onChange={(e) => setMarkup(parseFloat(e.target.value) || 0)}
          disabled={!isEditable}
          className="h-8 text-sm"
          placeholder="0%"
        />
      </div>
      {isEditable && hasChanged && (
        <Button size="sm" onClick={handleSave} disabled={saving} className="h-8">
          <Save className="w-3 h-3" />
        </Button>
      )}
    </div>
  );
}
