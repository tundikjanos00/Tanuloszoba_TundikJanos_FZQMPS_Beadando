import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api } from "../api";
import type { User } from "../types";

type LoginResponse = {
  token: string;
  user: User;
};

type AuthContextValue = {
  token: string | null;
  user: User | null;
  isAdmin: boolean;
  isTeacher: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshMe: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);
const TOKEN_KEY = "tanuloszoba.jwt";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState<User | null>(null);

  const refreshMe = async () => {
    if (!token) {
      setUser(null);
      return;
    }
    try {
      setUser(await api<User>("/api/auth/me", {}, token));
    } catch {
      localStorage.removeItem(TOKEN_KEY);
      setToken(null);
      setUser(null);
    }
  };

  useEffect(() => {
    refreshMe();
    // token változáskor szándékosan fut újra.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const login = async (email: string, password: string) => {
    const result = await api<LoginResponse>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password })
    });
    localStorage.setItem(TOKEN_KEY, result.token);
    setToken(result.token);
    setUser(result.user);
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  };

  const value = useMemo<AuthContextValue>(() => ({
    token,
    user,
    isAdmin: Boolean(user?.roles.includes("ADMIN")),
    isTeacher: Boolean(user?.roles.includes("TEACHER") || user?.roles.includes("ADMIN")),
    login,
    logout,
    refreshMe
  }), [token, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return value;
}

