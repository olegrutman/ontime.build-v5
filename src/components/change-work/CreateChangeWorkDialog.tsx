import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

interface CreateChangeWorkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (data: {
    title: string;
    description?: string;
    location_ref?: string;
  }) => void;
  isCreating: boolean;
}

export function CreateChangeWorkDialog({
  open,
  onOpenChange,
  onCreate,
  isCreating,
}: CreateChangeWorkDialogProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [locationRef, setLocationRef] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreate({
      title,
      description: description || undefined,
      location_ref: locationRef || undefined,
    });
    setTitle('');
    setDescription('');
    setLocationRef('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create Change Order</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Additional elevator shaft"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the scope of work..."
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="location">Location Reference</Label>
            <Input
              id="location"
              value={locationRef}
              onChange={(e) => setLocationRef(e.target.value)}
              placeholder="e.g., Tower A, Floor 15"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!title || isCreating}>
              {isCreating ? 'Creating...' : 'Create Change Order'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
