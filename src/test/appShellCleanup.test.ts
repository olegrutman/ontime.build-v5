import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { describe, expect, it, vi } from 'vitest';

describe('old app-shell cache cleanup', () => {
  it('removes only matching Workbox caches and preserves messaging caches', async () => {
    const listeners: Record<string, (event: { waitUntil: (promise: Promise<void>) => void }) => void> = {};
    const scope = 'https://ontime.build/';
    const unregister = vi.fn();
    const remove = vi.fn();
    const navigate = vi.fn();
    runInNewContext(readFileSync('public/sw.js', 'utf8'), {
      self: {
        registration: { scope, unregister },
        addEventListener: (name: string, callback: typeof listeners[string]) => { listeners[name] = callback; },
        skipWaiting: vi.fn(),
        clients: { claim: vi.fn(), matchAll: async () => [{ url: scope + 'dashboard', navigate }] },
      },
      caches: { keys: async () => ['workbox-precache-v2-' + scope, 'push-messaging', 'workbox-runtime-https://ontime.build/push/'], delete: remove },
    });
    let completion: Promise<void> | undefined;
    listeners.activate({ waitUntil: (promise) => { completion = promise; } });
    await completion;
    expect(remove).toHaveBeenCalledTimes(1);
    expect(remove).toHaveBeenCalledWith('workbox-precache-v2-' + scope);
    expect(navigate).toHaveBeenCalledTimes(1);
    expect(unregister).toHaveBeenCalledTimes(1);
  });

  it('always unregisters even when cache discovery fails', async () => {
    let activate: ((event: { waitUntil: (promise: Promise<void>) => void }) => void) | undefined;
    const unregister = vi.fn();
    runInNewContext(readFileSync('public/sw.js', 'utf8'), {
      self: {
        registration: { scope: 'https://ontime.build/', unregister },
        addEventListener: (name: string, callback: typeof activate) => { if (name === 'activate') activate = callback; },
      },
      caches: { keys: async () => { throw new Error('Cache unavailable'); } },
    });
    let completion: Promise<void> | undefined;
    activate?.({ waitUntil: promise => { completion = promise; } });
    await expect(completion).rejects.toThrow('Cache unavailable');
    expect(unregister).toHaveBeenCalledTimes(1);
  });
});