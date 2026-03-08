import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export interface ProfileData {
  id: string;
  user_id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  full_name: string | null;
  phone: string | null;
  preferred_contact_method: string | null;
  timezone: string | null;
  language: string | null;
  job_title: string | null;
}

export interface OrganizationData {
  id: string;
  name: string;
  type: string;
  org_code: string;
  address: {
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
  } | null;
  phone: string | null;
  trade: string | null;
  trade_custom: string | null;
  license_number: string | null;
  insurance_expiration_date: string | null;
}

export interface OrgSettings {
  id?: string;
  organization_id: string;
  default_hourly_rate: number | null;
  labor_markup_percent: number | null;
  minimum_service_charge: number | null;
  default_crew_size: number | null;
  default_workday_hours: number | null;
}

export interface UserSettings {
  id?: string;
  user_id: string;
  notify_email: boolean;
  notify_sms: boolean;
  notify_change_orders: boolean;
  notify_invoices: boolean;
  notify_invites: boolean;
  // Granular preferences
  notify_wo_assigned: boolean;
  notify_wo_approved: boolean;
  notify_wo_rejected: boolean;
  notify_inv_submitted: boolean;
  notify_inv_approved: boolean;
  notify_inv_rejected: boolean;
  notify_project_invite: boolean;
  email_digest_frequency: string;
  // Onboarding
  onboarding_dismissed: boolean;
}

export function useProfile() {
  const { user, userOrgRoles } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [organization, setOrganization] = useState<OrganizationData | null>(null);
  const [orgSettings, setOrgSettings] = useState<OrgSettings | null>(null);
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null);
  const [hasActiveProjects, setHasActiveProjects] = useState(false);

  // Get current organization from user's org roles
  const currentOrg = userOrgRoles[0]?.organization;

  const fetchData = useCallback(async () => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      // Fetch profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (profileData) {
        setProfile(profileData as ProfileData);
      }

      // Fetch organization
      if (currentOrg?.id) {
        const { data: orgData } = await supabase
          .from('organizations')
          .select('*')
          .eq('id', currentOrg.id)
          .single();
        
        if (orgData) {
          setOrganization(orgData as unknown as OrganizationData);
        }

        // Fetch org settings
        const { data: orgSettingsData } = await supabase
          .from('org_settings')
          .select('*')
          .eq('organization_id', currentOrg.id)
          .single();
        
        if (orgSettingsData) {
          setOrgSettings(orgSettingsData as unknown as OrgSettings);
        } else {
          // Initialize with defaults
          setOrgSettings({
            organization_id: currentOrg.id,
            default_hourly_rate: null,
            labor_markup_percent: null,
            minimum_service_charge: null,
            default_crew_size: null,
            default_workday_hours: 8,
          });
        }
      }

      // Fetch user settings
      const { data: userSettingsData } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (userSettingsData) {
        setUserSettings(userSettingsData as unknown as UserSettings);
      } else {
      // Initialize with defaults
        setUserSettings({
          user_id: user.id,
          notify_email: true,
          notify_sms: false,
          notify_change_orders: true,
          notify_invoices: true,
          notify_invites: true,
          notify_wo_assigned: true,
          notify_wo_approved: true,
          notify_wo_rejected: true,
          notify_inv_submitted: true,
          notify_inv_approved: true,
          notify_inv_rejected: true,
          notify_project_invite: true,
          email_digest_frequency: 'instant',
          onboarding_dismissed: false,
        });
      }

      // Check if user has active projects
      const { data: activeProjects } = await supabase
        .rpc('user_has_active_projects', { _user_id: user.id });
      
      setHasActiveProjects(activeProjects || false);

    } catch (error) {
      console.error('Error fetching profile data:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id, currentOrg?.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const updateProfile = async (updates: Partial<ProfileData>) => {
    if (!profile?.id) return false;
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', profile.id);
      
      if (error) throw error;
      
      setProfile(prev => prev ? { ...prev, ...updates } : null);
      toast({ title: 'Profile updated' });
      return true;
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Update failed', description: error.message });
      return false;
    }
  };

  const updateOrganization = async (updates: Partial<Omit<OrganizationData, 'id' | 'type' | 'org_code'>>) => {
    if (!organization?.id) return false;
    
    try {
      const { error, data } = await supabase
        .from('organizations')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', organization.id)
        .select('id');
      
      if (error) throw error;
      
      if (count === 0) {
        toast({ variant: 'destructive', title: 'Update failed', description: 'You do not have permission to update this organization.' });
        return false;
      }
      
      setOrganization(prev => prev ? { ...prev, ...updates } : null);
      toast({ title: 'Organization updated' });
      return true;
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Update failed', description: error.message });
      return false;
    }
  };

  const updateOrgSettings = async (updates: Partial<OrgSettings>) => {
    if (!currentOrg?.id) return false;
    
    try {
      if (orgSettings?.id) {
        // Update existing
        const { error } = await supabase
          .from('org_settings')
          .update({
            ...updates,
            updated_at: new Date().toISOString(),
          })
          .eq('id', orgSettings.id);
        
        if (error) throw error;
      } else {
        // Insert new
        const { data, error } = await supabase
          .from('org_settings')
          .insert({
            organization_id: currentOrg.id,
            ...updates,
          })
          .select()
          .single();
        
        if (error) throw error;
        if (data) {
          setOrgSettings(data as unknown as OrgSettings);
          toast({ title: 'Pricing defaults saved' });
          return true;
        }
      }
      
      setOrgSettings(prev => prev ? { ...prev, ...updates } : null);
      toast({ title: 'Pricing defaults updated' });
      return true;
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Update failed', description: error.message });
      return false;
    }
  };

  const updateUserSettings = async (updates: Partial<UserSettings>) => {
    if (!user?.id) return false;
    
    try {
      if (userSettings?.id) {
        // Update existing
        const { error } = await supabase
          .from('user_settings')
          .update({
            ...updates,
            updated_at: new Date().toISOString(),
          })
          .eq('id', userSettings.id);
        
        if (error) throw error;
      } else {
        // Insert new
        const { data, error } = await supabase
          .from('user_settings')
          .insert({
            user_id: user.id,
            ...updates,
          })
          .select()
          .single();
        
        if (error) throw error;
        if (data) {
          setUserSettings(data as unknown as UserSettings);
          toast({ title: 'Notification settings saved' });
          return true;
        }
      }
      
      setUserSettings(prev => prev ? { ...prev, ...updates } : null);
      toast({ title: 'Notification settings updated' });
      return true;
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Update failed', description: error.message });
      return false;
    }
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    try {
      // First verify current password by attempting to sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: profile?.email || '',
        password: currentPassword,
      });
      
      if (signInError) {
        toast({ variant: 'destructive', title: 'Current password is incorrect' });
        return false;
      }

      // Update password
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      
      if (error) throw error;
      
      toast({ title: 'Password updated successfully' });
      return true;
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Password update failed', description: error.message });
      return false;
    }
  };

  return {
    loading,
    profile,
    organization,
    orgSettings,
    userSettings,
    hasActiveProjects,
    updateProfile,
    updateOrganization,
    updateOrgSettings,
    updateUserSettings,
    changePassword,
    refetch: fetchData,
  };
}
