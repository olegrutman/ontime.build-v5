import { useState, useEffect, createContext, useContext, type ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';
import { Profile, UserOrgRole, AppRole, MemberPermissions, RolePermissions, getEffectivePermissions } from '@/types/organization';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  userOrgRoles: UserOrgRole[];
  currentRole: AppRole | null;
  permissions: RolePermissions | null;
  memberPermissions: MemberPermissions | null;
  isAdmin: boolean;
  loading: boolean;
  needsOrgSetup: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userOrgRoles, setUserOrgRoles] = useState<UserOrgRole[]>([]);
  const [memberPermissions, setMemberPermissions] = useState<MemberPermissions | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserData = async (userId: string) => {
    // Fetch profile
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (profileData) {
      setProfile(profileData as Profile);
    }

    // Fetch user org roles with organization details
    const { data: rolesData } = await supabase
      .from('user_org_roles')
      .select(`
        *,
        organization:organizations(*)
      `)
      .eq('user_id', userId);

    if (rolesData) {
      setUserOrgRoles(rolesData as UserOrgRole[]);

      // Fetch member_permissions for the primary role
      if (rolesData.length > 0) {
        const { data: permsData } = await supabase
          .from('member_permissions')
          .select('*')
          .eq('user_org_role_id', rolesData[0].id)
          .maybeSingle();

        setMemberPermissions(permsData as MemberPermissions | null);
      }
    }
  };

  const refreshUserData = async () => {
    if (user) {
      await fetchUserData(user.id);
    }
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          // Defer data fetching to avoid blocking
          setTimeout(() => fetchUserData(session.user.id), 0);
        } else {
        setProfile(null);
        setUserOrgRoles([]);
        setMemberPermissions(null);
      }
        setLoading(false);
      }
    );

    // THEN check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserData(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, fullName: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { full_name: fullName },
      },
    });
    return { data, error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setUserOrgRoles([]);
    setMemberPermissions(null);
    // Redirect to landing page
    window.location.href = '/';
  };

  // Get current role (first role for now, can be enhanced to allow switching)
  const currentRole = userOrgRoles.length > 0 ? userOrgRoles[0].role : null;
  const isAdmin = userOrgRoles.length > 0 ? (userOrgRoles[0].is_admin ?? false) : false;
  const permissions = getEffectivePermissions(currentRole, memberPermissions, isAdmin);
  const needsOrgSetup = !loading && !!user && userOrgRoles.length === 0;

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        userOrgRoles,
        currentRole,
        permissions,
        memberPermissions,
        isAdmin,
        loading,
        needsOrgSetup,
        signUp,
        signIn,
        signOut,
        refreshUserData,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
