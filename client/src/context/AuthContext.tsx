import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

const AUTH_STORAGE_KEY = 'iiko_auth';

export type AuthState = {
  serverUrl: string;
  token: string;
} | null;

function loadStoredAuth(): AuthState {
  try {
    const s = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!s) return null;
    const data = JSON.parse(s) as { serverUrl?: string; token?: string };
    if (data?.serverUrl && data?.token) return { serverUrl: data.serverUrl, token: data.token };
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
  const [auth, setAuthState] = useState<AuthState>(() => loadStoredAuth());

  const setAuth = useCallback((value: AuthState) => {
    setAuthState(value);
    if (value) {
      try {
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ serverUrl: value.serverUrl, token: value.token }));
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
    try {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    } catch {
      // ignore
    }
  }, []);

  return (
    <AuthContext.Provider value={{ auth, setAuth, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
