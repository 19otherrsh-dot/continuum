import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { UserDTO } from '@continuum/shared';
import { api, getToken, setToken } from './api';

export interface Workspace {
  id: string;
  name: string;
  motion: 'SALES' | 'AGENCY' | 'HYBRID';
  /** Sales-only workspaces never see the Project object (FR-PROJ-05). */
  showProjectsUi: boolean;
  stallingThresholdDays?: number;
  agentHighThreshold?: number;
  agentMediumThreshold?: number;
  planName?: string;
  seatCount?: number;
  pricePerSeatCents?: number;
}

interface SessionValue {
  user: UserDTO | null;
  workspace: Workspace | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (input: {
    email: string;
    password: string;
    name: string;
    organizationName: string;
    motion: 'SALES' | 'AGENCY' | 'HYBRID';
  }) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
}

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserDTO | null>(null);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!getToken()) {
      setUser(null);
      setWorkspace(null);
      setLoading(false);
      return;
    }
    try {
      const me = await api.get<{ user: UserDTO | null; organization: Workspace }>('/auth/me');
      setUser(me.user);
      setWorkspace(me.organization);
    } catch {
      setToken(null);
      setUser(null);
      setWorkspace(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const login = useCallback(
    async (email: string, password: string) => {
      const result = await api.post<{ token: string; user: UserDTO; organization: Workspace }>(
        '/auth/login',
        { email, password },
      );
      setToken(result.token);
      setUser(result.user);
      setWorkspace(result.organization);
    },
    [],
  );

  const signup = useCallback<SessionValue['signup']>(async (input) => {
    const result = await api.post<{ token: string; user: UserDTO; organization: Workspace }>(
      '/auth/signup',
      input,
    );
    setToken(result.token);
    setUser(result.user);
    setWorkspace(result.organization);
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    setWorkspace(null);
  }, []);

  const value = useMemo<SessionValue>(
    () => ({ user, workspace, loading, login, signup, logout, refresh }),
    [user, workspace, loading, login, signup, logout, refresh],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error('useSession must be used inside SessionProvider');
  return value;
}
