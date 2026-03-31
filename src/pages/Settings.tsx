import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Lock, Bell, AlertTriangle, Loader2, Eye, EyeOff } from 'lucide-react';
import { useProfile } from '@/hooks/useProfile';
import { useAuth } from '@/hooks/useAuth';

export default function Settings() {
  const { signOut } = useAuth();
  const {
    loading,
    profile,
    userSettings,
    hasActiveProjects,
    updateUserSettings,
    changePassword,
  } = useProfile();

  const [passwordForm, setPasswordForm] = useState({
    current: '',
    new: '',
    confirm: '',
  });
  const [showPasswords, setShowPasswords] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState('');

  const handleChangePassword = async () => {
    if (passwordForm.new !== passwordForm.confirm) return;
    setSaving('password');
    const success = await changePassword(passwordForm.current, passwordForm.new);
    if (success) {
      setPasswordForm({ current: '', new: '', confirm: '' });
    }
    setSaving(null);
  };

  const handleNotificationChange = async (key: string, value: boolean) => {
    await updateUserSettings({ [key]: value });
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto space-y-5">
        <div>
          <h1 className="text-xl font-bold" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>Settings</h1>
          <p className="text-sm text-muted-foreground">Security, notifications, and account management.</p>
        </div>

        {/* Security */}
        <div className="bg-card border border-border rounded-lg px-3.5 py-3.5">
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-1">
              <Lock className="h-4 w-4 text-muted-foreground" />
              <p className="text-[0.7rem] uppercase tracking-[0.4px] text-muted-foreground font-medium">Security</p>
            </div>
            <p className="text-xs text-muted-foreground ml-6">Change your password</p>
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Current Password</Label>
                <Input
                  type={showPasswords ? 'text' : 'password'}
                  value={passwordForm.current}
                  onChange={(e) => setPasswordForm(prev => ({ ...prev, current: e.target.value }))}
                  placeholder="••••••••"
                />
              </div>
              <div className="space-y-2">
                <Label>New Password</Label>
                <Input
                  type={showPasswords ? 'text' : 'password'}
                  value={passwordForm.new}
                  onChange={(e) => setPasswordForm(prev => ({ ...prev, new: e.target.value }))}
                  placeholder="••••••••"
                />
              </div>
              <div className="space-y-2">
                <Label>Confirm New Password</Label>
                <Input
                  type={showPasswords ? 'text' : 'password'}
                  value={passwordForm.confirm}
                  onChange={(e) => setPasswordForm(prev => ({ ...prev, confirm: e.target.value }))}
                  placeholder="••••••••"
                />
              </div>
            </div>

            {passwordForm.new && passwordForm.confirm && passwordForm.new !== passwordForm.confirm && (
              <p className="text-sm text-destructive">Passwords do not match</p>
            )}

            <div className="flex items-center justify-between">
              <Button variant="ghost" size="sm" onClick={() => setShowPasswords(!showPasswords)}>
                {showPasswords ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                {showPasswords ? 'Hide' : 'Show'} Passwords
              </Button>
              <Button
                onClick={handleChangePassword}
                disabled={
                  saving === 'password' ||
                  !passwordForm.current ||
                  !passwordForm.new ||
                  passwordForm.new !== passwordForm.confirm
                }
              >
                {saving === 'password' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Lock className="h-4 w-4 mr-2" />}
                Change Password
              </Button>
            </div>
          </div>
        </div>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notifications
            </CardTitle>
            <CardDescription>Control how you receive updates per event type</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Delivery Channels</p>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">Email Notifications</p>
                    <p className="text-xs text-muted-foreground">Master toggle for all email alerts</p>
                  </div>
                  <Switch
                    checked={userSettings?.notify_email ?? true}
                    onCheckedChange={(v) => handleNotificationChange('notify_email', v)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">Text Notifications</p>
                    <p className="text-xs text-muted-foreground">SMS updates (requires phone)</p>
                  </div>
                  <Switch
                    checked={userSettings?.notify_sms ?? false}
                    onCheckedChange={(v) => handleNotificationChange('notify_sms', v)}
                    disabled={!profile?.phone}
                  />
                </div>
              </div>
            </div>

            <Separator />

            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Work Orders</p>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm">Assigned to my org</p>
                  <Switch
                    checked={userSettings?.notify_wo_assigned ?? true}
                    onCheckedChange={(v) => handleNotificationChange('notify_wo_assigned', v)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-sm">Approved</p>
                  <Switch
                    checked={userSettings?.notify_wo_approved ?? true}
                    onCheckedChange={(v) => handleNotificationChange('notify_wo_approved', v)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-sm">Rejected</p>
                  <Switch
                    checked={userSettings?.notify_wo_rejected ?? true}
                    onCheckedChange={(v) => handleNotificationChange('notify_wo_rejected', v)}
                  />
                </div>
              </div>
            </div>

            <Separator />

            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Invoices</p>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm">Submitted for approval</p>
                  <Switch
                    checked={userSettings?.notify_inv_submitted ?? true}
                    onCheckedChange={(v) => handleNotificationChange('notify_inv_submitted', v)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-sm">Approved</p>
                  <Switch
                    checked={userSettings?.notify_inv_approved ?? true}
                    onCheckedChange={(v) => handleNotificationChange('notify_inv_approved', v)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-sm">Rejected</p>
                  <Switch
                    checked={userSettings?.notify_inv_rejected ?? true}
                    onCheckedChange={(v) => handleNotificationChange('notify_inv_rejected', v)}
                  />
                </div>
              </div>
            </div>

            <Separator />

            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Invitations</p>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm">Project invitations</p>
                  <Switch
                    checked={userSettings?.notify_project_invite ?? true}
                    onCheckedChange={(v) => handleNotificationChange('notify_project_invite', v)}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Danger Zone
            </CardTitle>
            <CardDescription>Irreversible actions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Sign Out</p>
                <p className="text-sm text-muted-foreground">Sign out of your account</p>
              </div>
              <Button variant="outline" onClick={() => signOut()}>
                Sign Out
              </Button>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Delete Account</p>
                <p className="text-sm text-muted-foreground">
                  {hasActiveProjects
                    ? 'You are active on projects. Contact support to delete your account.'
                    : 'Permanently delete your account and all data'}
                </p>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" disabled={hasActiveProjects}>
                    Delete Account
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete your account and remove all your data.
                      <div className="mt-4 space-y-2">
                        <Label>Type DELETE to confirm</Label>
                        <Input
                          value={deleteConfirm}
                          onChange={(e) => setDeleteConfirm(e.target.value)}
                          placeholder="DELETE"
                        />
                      </div>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setDeleteConfirm('')}>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      disabled={deleteConfirm !== 'DELETE'}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Delete Account
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
