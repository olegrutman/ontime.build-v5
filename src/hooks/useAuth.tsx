import { useState, useEffect, useRef, createContext, useContext, type ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';
import { Profile, UserOrgRole, AppRole, MemberPermissions, RolePermissions, getEffectivePermissions } from '@/types/organization';
import type { PlatformRole } from '@/types/platform';
import { authCallbackUrl } from '@/lib/authRedirects';

type SignUpResult = {
  data: { user: User | null; session: Session | null };
  error: Error | null;
};

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
  connectionError: boolean;
  needsOrgSetup: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<SignUpResult>;
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
  const [connectionError, setConnectionError] = useState(false);
  const activeUserId = useRef<string | null>(null);
  const dataVersion = useRef(0);

  const fetchUserData = async (userId: string) => {
    const version = ++dataVersion.current;
    // Fetch all data in parallel to avoid race conditions
    const [profileResult, rolesResult, platformResult] = await Promise.all([
      supabase.from('profiles').select('id, user_id, email, full_name, first_name, last_name, phone, preferred_contact_method, timezone, language, job_title, view_preference, address, created_at, updated_at').eq('user_id', userId).maybeSingle(),
      supabase.from('user_org_roles').select('*, organization:organizations(*)').eq('user_id', userId),
      supabase.from('platform_users').select('platform_role, two_factor_verified').eq('user_id', userId).maybeSingle(),
    ]);
    if (activeUserId.current !== userId || version !== dataVersion.current) return;
    if (profileResult.error) throw profileResult.error;
    if (rolesResult.error) throw rolesResult.error;
    if (platformResult.error) throw platformResult.error;

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
          .eq('user_org_role_id', sortedRoles[0].id)
          .maybeSingle();
        if (activeUserId.current !== userId || version !== dataVersion.current) return;
        setMemberPermissions(permsData as MemberPermissions | null);
      } else {
        setMemberPermissions(null);
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
    let hydratedUserId: string | null = null;
    let pending: { userId: string; promise: Promise<void> } | null = null;
    let startupTimeout: ReturnType<typeof setTimeout> | undefined;

    const applySession = async (nextSession: Session | null, refreshProfile = false) => {
      if (!isMounted) return;
      const userId = nextSession?.user.id ?? null;
      const identityChanged = activeUserId.current !== userId;
      activeUserId.current = userId;
      setSession(nextSession);
      // Token refreshes must not replace the user object: many query effects
      // depend on it, and their screen state must survive background refreshes.
      if (identityChanged || refreshProfile) setUser(nextSession?.user ?? null);

      if (!userId) {
        ++dataVersion.current;
        hydratedUserId = null;
        pending = null;
        setProfile(null);
        setUserOrgRoles([]);
        setMemberPermissions(null);
        setPlatformRole(null);
        setTwoFactorVerified(false);
        setLoading(false);
        setConnectionError(false);
        clearTimeout(startupTimeout);
        return;
      }
      if (identityChanged) {
        hydratedUserId = null;
        setProfile(null);
        setUserOrgRoles([]);
        setMemberPermissions(null);
        setPlatformRole(null);
        setTwoFactorVerified(false);
        setLoading(true);
      }
      if (hydratedUserId === userId && !refreshProfile) return;
      if (!pending || pending.userId !== userId) {
        pending = { userId, promise: fetchUserData(userId) };
      }
      const request = pending;
      try {
        await request.promise;
        if (isMounted && activeUserId.current === userId) {
          hydratedUserId = userId;
          setConnectionError(false);
        }
      } catch {
        if (isMounted && activeUserId.current === userId) setConnectionError(true);
      } finally {
        if (pending === request) pending = null;
        if (isMounted && activeUserId.current === userId) {
          clearTimeout(startupTimeout);
          setLoading(false);
        }
      }
    };

    // Subscribe first; never await data calls inside the auth callback lock.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, nextSession) => {
        setTimeout(() => { void applySession(nextSession, event === 'USER_UPDATED'); }, 0);
      }
    );

    // THEN check initial session. If the backend host is unreachable (corporate
    // firewall, offline, DNS filtering) this must fail loudly instead of leaving
    // the app in a permanent loading state.
    startupTimeout = setTimeout(() => {
      if (isMounted) {
        setConnectionError(true);
        setLoading(false);
      }
    }, 12000);

    supabase.auth
      .getSession()
      .then(({ data: { session } }) => applySession(session))
      .catch(() => {
        if (isMounted) setConnectionError(true);
      });

    return () => {
      isMounted = false;
      activeUserId.current = null;
      ++dataVersion.current;
      clearTimeout(startupTimeout);
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string, fullName: string): Promise<SignUpResult> => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: authCallbackUrl(),
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
        connectionError,
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
