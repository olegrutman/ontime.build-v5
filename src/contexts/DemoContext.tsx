import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { type DemoRole } from '@/data/demoData';

interface DemoState {
  isDemoMode: boolean;
  demoRole: DemoRole | null;
  demoProjectId: string | null;
}

interface DemoContextValue extends DemoState {
  enterDemo: (role: DemoRole, projectId: string) => void;
  exitDemo: () => void;
}

const DemoContext = createContext<DemoContextValue | undefined>(undefined);

export function DemoProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DemoState>({
    isDemoMode: false,
    demoRole: null,
    demoProjectId: null,
  });

  const enterDemo = useCallback((role: DemoRole, projectId: string) => {
    setState({ isDemoMode: true, demoRole: role, demoProjectId: projectId });
  }, []);

  const exitDemo = useCallback(() => {
    setState({ isDemoMode: false, demoRole: null, demoProjectId: null });
  }, []);

  return (
    <DemoContext.Provider value={{ ...state, enterDemo, exitDemo }}>
      {children}
    </DemoContext.Provider>
  );
}

export function useDemo() {
  const ctx = useContext(DemoContext);
  if (!ctx) throw new Error('useDemo must be used within DemoProvider');
  return ctx;
}
