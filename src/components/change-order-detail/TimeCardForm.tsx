import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { format } from 'date-fns';

interface TimeCardFormProps {
  onSubmit: (data: {
    entry_date: string;
    fc_men_count: number;
    fc_hours_per_man: number;
    fc_description: string;
    submit: boolean;
    selfPerforming?: boolean;
    tc_own_hours?: number;
  }) => void;
  onCancel: () => void;
  isSubmitting: boolean;
  selfPerforming?: boolean;
}

export function TimeCardForm({ onSubmit, onCancel, isSubmitting, selfPerforming = false }: TimeCardFormProps) {
  const [entryDate, setEntryDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [menCount, setMenCount] = useState('');
  const [hoursPerMan, setHoursPerMan] = useState('');
  const [ownHours, setOwnHours] = useState('');
  const [description, setDescription] = useState('');

  const men = parseInt(menCount) || 0;
  const hours = parseFloat(hoursPerMan) || 0;
  const manHours = men * hours;
  const tcHours = parseFloat(ownHours) || 0;

  const isValid = selfPerforming
    ? tcHours > 0 && entryDate
    : men > 0 && hours > 0 && entryDate;

  const handleSubmit = (submit: boolean) => {
    if (!isValid) return;
    if (selfPerforming) {
      onSubmit({
        entry_date: entryDate,
        fc_men_count: 0,
        fc_hours_per_man: 0,
        fc_description: description,
        submit,
        selfPerforming: true,
        tc_own_hours: tcHours,
      });
    } else {
      onSubmit({
        entry_date: entryDate,
        fc_men_count: men,
        fc_hours_per_man: hours,
        fc_description: description,
        submit,
      });
    }
  };

  return (
    <Card className="p-4 border-primary/30 bg-primary/5 space-y-4">
      <h4 className="font-medium text-sm">New Time Card</h4>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="text-xs text-muted-foreground">Date</label>
          <Input
            type="date"
            value={entryDate}
            onChange={(e) => setEntryDate(e.target.value)}
            className="h-9"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Number of Men</label>
          <Input
            type="number"
            min="1"
            placeholder="5"
            value={menCount}
            onChange={(e) => setMenCount(e.target.value)}
            className="h-9"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Hours per Man</label>
          <Input
            type="number"
            min="0.5"
            step="0.5"
            placeholder="8"
            value={hoursPerMan}
            onChange={(e) => setHoursPerMan(e.target.value)}
            className="h-9"
          />
        </div>
      </div>

      {manHours > 0 && (
        <div className="bg-muted rounded-md px-3 py-2 text-sm font-medium">
          Total: {men} men × {hours} hrs = <strong>{manHours} man-hours</strong>
        </div>
      )}

      <div>
        <label className="text-xs text-muted-foreground">Description</label>
        <Textarea
          placeholder="Work performed..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className="resize-none"
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleSubmit(false)}
          disabled={!isValid || isSubmitting}
        >
          Save Draft
        </Button>
        <Button size="sm" onClick={() => handleSubmit(true)} disabled={!isValid || isSubmitting}>
          Submit
        </Button>
      </div>
    </Card>
  );
}
