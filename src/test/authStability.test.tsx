import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider, useAuth } from '@/hooks/useAuth';

const mock = vi.hoisted(() => ({
  listener: undefined as undefined | ((event: string, session: unknown) => void),
  from: vi.fn(),
  session: { user: { id: 'user-a' }, access_token: 'test' },
}));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: mock.from,
    auth: {
      onAuthStateChange: vi.fn((cb) => {
        mock.listener = cb;
        cb('INITIAL_SESSION', mock.session);
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      }),
      getSession: vi.fn(async () => ({ data: { session: mock.session } })),
    },
  },
}));

describe('background authentication stability', () => {
  beforeEach(() => {
    mock.from.mockReset();
    mock.from.mockImplementation((table: string) => {
      const data = table === 'user_org_roles'
        ? [{ id: 'role-a', organization_id: 'org-a', created_at: '2026-01-01', role: 'TC', is_admin: true }]
        : table === 'profiles' ? { user_id: 'user-a', full_name: 'Test' } : null;
      const result = Promise.resolve({ data, error: null });
      const chain = { select: () => chain, eq: () => chain, maybeSingle: () => result, then: result.then.bind(result) };
      return chain;
    });
  });
  afterEach(cleanup);

  it('deduplicates startup and preserves identity/loading on token refresh and focus sign-in', async () => {
    const states: boolean[] = [];
    const hook = renderHook(() => { const auth = useAuth(); states.push(auth.loading); return auth; }, { wrapper: AuthProvider });
    await waitFor(() => expect(hook.result.current.loading).toBe(false));
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 5)); });
    expect(mock.from).toHaveBeenCalledTimes(4);
    const user = hook.result.current.user;
    const roles = hook.result.current.userOrgRoles;
    states.length = 0;
    await act(async () => {
      mock.listener?.('TOKEN_REFRESHED', { ...mock.session, user: { id: 'user-a' }, access_token: 'renewed' });
      mock.listener?.('SIGNED_IN', { ...mock.session, user: { id: 'user-a' } });
      await new Promise(resolve => setTimeout(resolve, 5));
    });
    expect(hook.result.current.user).toBe(user);
    expect(hook.result.current.userOrgRoles).toBe(roles);
    expect(states).not.toContain(true);
    expect(mock.from).toHaveBeenCalledTimes(4);
  });

  it('clears organization data on sign-out', async () => {
    const hook = renderHook(() => useAuth(), { wrapper: AuthProvider });
    await waitFor(() => expect(hook.result.current.loading).toBe(false));
    await act(async () => {
      mock.listener?.('SIGNED_OUT', null);
      await new Promise(resolve => setTimeout(resolve, 5));
    });
    expect(hook.result.current.user).toBeNull();
    expect(hook.result.current.userOrgRoles).toEqual([]);
    expect(hook.result.current.profile).toBeNull();
  });
});