import { createContext, useContext, useState, useCallback, type ReactNode, useEffect } from 'react';
import { setApiAuthToken, useMeQuery } from '../api/rtkApi';

const AUTH_STORAGE_KEY = 'app_auth';

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: string;
  companyId: string;
  companyName?: string;
  scheduleAccessRole?: string;
  includeInSchedule?: boolean;
};

export type AuthState = {
  token: string;
  user: AuthUser;
} | null;

function loadStoredAuth(): AuthState {
  try {
    const s = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!s) return null;
    const data = JSON.parse(s) as { token?: string; user?: AuthUser };
    if (data?.token && data.user) {
      return { token: data.token, user: data.user };
    }
  } catch {
    // ignore
  }
  return null;
}

type AuthContextValue = {
  auth: AuthState;
  setAuth: (auth: AuthState) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuthState] = useState<AuthState>(() => {
    const initial = loadStoredAuth();
    // Синхронно прокидываем токен в RTK Query до первого рендера детей
    setApiAuthToken(initial ? initial.token : null);
    return initial;
  });

  useEffect(() => {
    setApiAuthToken(auth ? auth.token : null);
  }, [auth]);

  const setAuth = useCallback((value: AuthState) => {
    setAuthState(value);
    setApiAuthToken(value ? value.token : null);
    if (value) {
      try {
        localStorage.setItem(
          AUTH_STORAGE_KEY,
          JSON.stringify({ token: value.token, user: value.user })
        );
      } catch {
        // ignore
      }
    } else {
      try {
        localStorage.removeItem(AUTH_STORAGE_KEY);
      } catch {
        // ignore
      }
    }
  }, []);

  const logout = useCallback(() => {
    setAuthState(null);
    setApiAuthToken(null);
    try {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    } catch {
      // ignore
    }
  }, []);

  return (
    <AuthContext.Provider value={{ auth, setAuth, logout }}>
      {children}
      {auth && <AuthUserSync setAuth={setAuth} auth={auth} />}
    </AuthContext.Provider>
  );
}

/** Синхронизирует scheduleAccessRole/includeInSchedule из /me при F5 (если в localStorage старые данные) */
function AuthUserSync({ setAuth, auth }: { setAuth: (a: AuthState) => void; auth: AuthState }) {
  const { data: meData } = useMeQuery(undefined, { skip: !auth });
  useEffect(() => {
    if (!auth || !meData) return;
    const needUpdate =
      auth.user.scheduleAccessRole !== meData.scheduleAccessRole ||
      auth.user.includeInSchedule !== meData.includeInSchedule;
    if (needUpdate) {
      setAuth({
        ...auth,
        user: {
          ...auth.user,
          scheduleAccessRole: meData.scheduleAccessRole,
          includeInSchedule: meData.includeInSchedule,
        },
      });
    }
  }, [meData, auth, setAuth]);
  return null;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
