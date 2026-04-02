import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface EditableCellProps {
  value: any;
  type: 'text' | 'number' | 'boolean' | 'select';
  options?: { value: string; label: string }[];
  onChange: (val: any) => void;
  className?: string;
}

export function EditableCell({ value, type, options, onChange, className }: EditableCellProps) {
  const [local, setLocal] = useState(value);

  useEffect(() => setLocal(value), [value]);

  if (type === 'boolean') {
    return <Switch checked={!!local} onCheckedChange={onChange} />;
  }

  if (type === 'select' && options) {
    return (
      <Select value={String(local ?? '')} onValueChange={onChange}>
        <SelectTrigger className={className ?? 'h-8 text-xs'}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  return (
    <Input
      className={className ?? 'h-8 text-xs'}
      type={type === 'number' ? 'number' : 'text'}
      value={local ?? ''}
      onChange={(e) => setLocal(type === 'number' ? Number(e.target.value) : e.target.value)}
      onBlur={() => {
        if (local !== value) onChange(local);
      }}
    />
  );
}
