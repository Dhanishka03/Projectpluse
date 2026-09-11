import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

export const DEMO_EMAIL = "admin@projectpulse.ai";
export const DEMO_PASSWORD = "admin123";

type User = { name: string; email: string };

type AuthValue = {
  user: User | null;
  login: (email: string, password: string) => boolean;
  signup: (name: string, email: string) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  const login = useCallback((email: string, password: string) => {
    if (email.trim().toLowerCase() === DEMO_EMAIL && password === DEMO_PASSWORD) {
      setUser({ name: "Admin", email: DEMO_EMAIL });
      return true;
    }
    return false;
  }, []);

  const signup = useCallback((name: string, email: string) => {
    setUser({ name, email });
  }, []);

  const logout = useCallback(() => setUser(null), []);

  const value = useMemo(() => ({ user, login, signup, logout }), [user, login, signup, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
