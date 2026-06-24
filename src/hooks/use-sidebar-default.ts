export function useDefaultSidebarOpen(): boolean {
  if (typeof window === 'undefined') return true;
  return window.innerWidth >= 1280;
}
