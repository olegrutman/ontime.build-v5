import { useState, useEffect, createContext, useContext, type ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';
import { Profile, UserOrgRole, AppRole, MemberPermissions, RolePermissions, getEffectivePermissions } from '@/types/organization';
import type { PlatformRole } from '@/types/platform';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  userOrgRoles: UserOrgRole[];
  currentRole: AppRole | null;
  permissions: RolePermissions | null;
  memberPermissions: MemberPermissions | null;
  isAdmin: boolean;
  platformRole: PlatformRole | null;
  isPlatformUser: boolean;
  twoFactorVerified: boolean;
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
  const [platformRole, setPlatformRole] = useState<PlatformRole | null>(null);
  const [twoFactorVerified, setTwoFactorVerified] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchUserData = async (userId: string) => {
    // Fetch all data in parallel to avoid race conditions
    const [profileResult, rolesResult, platformResult] = await Promise.all([
      supabase.from('profiles').select('*').eq('user_id', userId).maybeSingle(),
      supabase.from('user_org_roles').select('*, organization:organizations(*)').eq('user_id', userId),
      supabase.from('platform_users').select('platform_role, two_factor_verified').eq('user_id', userId).maybeSingle(),
    ]);

    // Set platform role FIRST so isPlatformUser is accurate before userOrgRoles triggers re-render
    if (platformResult.data) {
      setPlatformRole(platformResult.data.platform_role as PlatformRole);
      setTwoFactorVerified(platformResult.data.two_factor_verified ?? false);
    } else {
      setPlatformRole(null);
      setTwoFactorVerified(false);
    }

    if (profileResult.data) {
      setProfile(profileResult.data as Profile);
    }

    if (rolesResult.data) {
      // Sort deterministically by created_at ASC so multi-org users get consistent first org
      const sortedRoles = [...rolesResult.data].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
      setUserOrgRoles(sortedRoles as UserOrgRole[]);

      if (sortedRoles.length > 0) {
        const { data: permsData } = await supabase
          .from('member_permissions')
          .select('*')
          .eq('user_org_role_id', rolesResult.data[0].id)
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
    let isMounted = true;

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          // Set loading true so consumers wait for user data before redirecting
          setLoading(true);
          const userId = session.user.id;
          setTimeout(async () => {
            await fetchUserData(userId);
            if (isMounted) setLoading(false);
          }, 0);
        } else {
          setProfile(null);
          setUserOrgRoles([]);
          setMemberPermissions(null);
          setPlatformRole(null);
          setTwoFactorVerified(false);
          setLoading(false);
        }
      }
    );

    // THEN check initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await fetchUserData(session.user.id);
      }
      if (isMounted) setLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string, fullName: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin + '/auth/callback',
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
    try {
      await supabase.auth.signOut({ scope: 'local' });
    } catch (_) {
      // Force-clear even if server rejects
    }
    setUser(null);
    setSession(null);
    setProfile(null);
    setUserOrgRoles([]);
    setMemberPermissions(null);
    setPlatformRole(null);
    setTwoFactorVerified(false);
    window.location.href = '/';
  };

  // Get current role (first role for now, can be enhanced to allow switching)
  const currentRole = userOrgRoles.length > 0 ? userOrgRoles[0].role : null;
  const isAdmin = userOrgRoles.length > 0 ? (userOrgRoles[0].is_admin ?? false) : false;
  const permissions = getEffectivePermissions(currentRole, memberPermissions, isAdmin);
  const isPlatformUser = !!platformRole && platformRole !== 'NONE';
  const needsOrgSetup = !loading && !!user && userOrgRoles.length === 0 && !isPlatformUser;

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
        platformRole,
        isPlatformUser,
        twoFactorVerified,
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
