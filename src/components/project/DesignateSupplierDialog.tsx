import { useState } from 'react';
import { Search, Mail, UserPlus, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Profile {
  user_id: string;
  full_name: string | null;
  email: string | null;
}

interface DesignateSupplierDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  onDesignated: () => void;
}

export function DesignateSupplierDialog({
  open,
  onOpenChange,
  projectId,
  onDesignated,
}: DesignateSupplierDialogProps) {
  const { user } = useAuth();
  const [tab, setTab] = useState<string>('search');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Profile[]>([]);
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [poEmail, setPoEmail] = useState('');

  const handleSearch = async () => {
    if (query.trim().length < 2) return;
    setSearching(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, full_name, email')
        .or(`full_name.ilike.%${query}%,email.ilike.%${query}%`)
        .limit(10);

      if (error) throw error;
      setResults((data || []).filter(p => p.user_id !== user?.id));
      setHasSearched(true);
    } catch {
      toast.error('Failed to search users');
    } finally {
      setSearching(false);
    }
  };

  const handleDesignateUser = async (userId: string, name: string | null) => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('project_designated_suppliers')
        .upsert({
          project_id: projectId,
          user_id: userId,
          invited_email: null,
          invited_name: name,
          status: 'active',
          designated_by: user.id,
        }, { onConflict: 'project_id' });

      if (error) throw error;
      toast.success(`${name || 'User'} designated as supplier contact`);
      onDesignated();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to designate supplier');
    } finally {
      setSaving(false);
    }
  };

  const handleInviteByEmail = async () => {
    if (!inviteEmail.trim() || !user) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('project_designated_suppliers')
        .upsert({
          project_id: projectId,
          user_id: null,
          invited_email: inviteEmail.trim(),
          invited_name: inviteName.trim() || null,
          status: 'invited',
          designated_by: user.id,
        }, { onConflict: 'project_id' });

      if (error) throw error;
      toast.success(`Invitation sent to ${inviteEmail}`);
      onDesignated();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to invite supplier');
    } finally {
      setSaving(false);
    }
  };

  const resetState = () => {
    setQuery('');
    setResults([]);
    setSelectedUser(null);
    setInviteEmail('');
    setInviteName('');
    setHasSearched(false);
    setTab('search');
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetState(); onOpenChange(v); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            Designate Supplier Contact
          </DialogTitle>
          <DialogDescription>
            Assign someone to act as the supplier for this project. They'll get supplier-level access but can't edit the product catalog.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="search">
              <Search className="h-4 w-4 mr-1.5" />
              Find User
            </TabsTrigger>
            <TabsTrigger value="invite">
              <Mail className="h-4 w-4 mr-1.5" />
              Invite by Email
            </TabsTrigger>
          </TabsList>

          <TabsContent value="search" className="space-y-3 mt-3">
            <div className="flex gap-2">
              <Input
                placeholder="Search by name or email..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
              <Button variant="outline" onClick={handleSearch} disabled={searching || query.trim().length < 2}>
                {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              </Button>
            </div>

            {results.length > 0 && (
              <div className="border rounded-md divide-y max-h-48 overflow-y-auto">
                {results.map((profile) => (
                  <button
                    key={profile.user_id}
                    className="w-full text-left px-3 py-2 hover:bg-muted/50 transition-colors"
                    onClick={() => setSelectedUser(profile)}
                    disabled={saving}
                  >
                    <p className="text-sm font-medium">{profile.full_name || 'Unknown'}</p>
                    <p className="text-xs text-muted-foreground">{profile.email}</p>
                  </button>
                ))}
              </div>
            )}

            {hasSearched && results.length === 0 && !searching && (
              <p className="text-sm text-muted-foreground">
                No users found.{' '}
                <button type="button" className="text-primary hover:underline" onClick={() => setTab('invite')}>
                  Invite by email instead
                </button>
              </p>
            )}

            {selectedUser && (
              <div className="border rounded-md p-3 bg-muted/30 space-y-2">
                <p className="text-sm">
                  Designate <strong>{selectedUser.full_name || selectedUser.email}</strong> as supplier contact?
                </p>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => handleDesignateUser(selectedUser.user_id, selectedUser.full_name)} disabled={saving}>
                    {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                    Confirm
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setSelectedUser(null)}>Cancel</Button>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="invite" className="space-y-3 mt-3">
            <div className="space-y-2">
              <Label>Email Address</Label>
              <Input
                type="email"
                placeholder="supplier@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Name (optional)</Label>
              <Input
                placeholder="Contact name"
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button onClick={handleInviteByEmail} disabled={saving || !inviteEmail.trim()}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Mail className="h-4 w-4 mr-1" />}
                Send Invitation
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
