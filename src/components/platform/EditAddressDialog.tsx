import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface Address {
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
}

interface EditAddressDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  currentAddress: Address | null;
  onSaved: (address: Address) => void;
}

export function EditAddressDialog({ open, onOpenChange, userId, currentAddress, onSaved }: EditAddressDialogProps) {
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zip, setZip] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setStreet(currentAddress?.street || '');
      setCity(currentAddress?.city || '');
      setState(currentAddress?.state || '');
      setZip(currentAddress?.zip || '');
    }
  }, [open, currentAddress]);

  const handleSave = async () => {
    setSaving(true);
    const address = { street, city, state, zip };
    const { error } = await supabase
      .from('profiles')
      .update({ address } as any)
      .eq('user_id', userId);
    setSaving(false);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Address updated' });
      onSaved(address);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Address</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div>
            <Label>Street</Label>
            <Input value={street} onChange={(e) => setStreet(e.target.value)} placeholder="123 Main St" />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label>City</Label>
              <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="City" />
            </div>
            <div>
              <Label>State</Label>
              <Input value={state} onChange={(e) => setState(e.target.value)} placeholder="CA" />
            </div>
            <div>
              <Label>Zip</Label>
              <Input value={zip} onChange={(e) => setZip(e.target.value)} placeholder="90210" />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
