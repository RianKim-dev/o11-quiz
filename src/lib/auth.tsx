"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type { AuthError, User } from "@supabase/supabase-js";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";
import { setCurrentUserId } from "@/lib/authStore";
import { ALLOWED_EMAIL_DOMAIN } from "@/lib/config";

interface AuthState {
  userId: string | null;
  /** Display name (from signup) or email. */
  name: string | null;
  loading: boolean;
  configured: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (
    email: string,
    password: string,
    name?: string
  ) => Promise<{ error?: string; needsConfirm?: boolean }>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthState | null>(null);

function mapError(e: AuthError): string {
  const m = e.message.toLowerCase();
  if (m.includes("invalid login credentials"))
    return "이메일 또는 비밀번호가 올바르지 않아요.";
  if (m.includes("email not confirmed"))
    return "이메일 확인이 필요해요. 메일함의 확인 링크를 클릭한 뒤 다시 로그인하세요.";
  if (m.includes("already registered") || m.includes("already been registered"))
    return "이미 가입된 이메일이에요. 로그인해 주세요.";
  if (m.includes("password")) return "비밀번호는 6자 이상이어야 해요.";
  if (m.includes("valid email") || m.includes("invalid email"))
    return "올바른 이메일 형식이 아니에요.";
  return e.message;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [name, setName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const applyUser = useCallback((u: User | null) => {
    const id = u?.id ?? null;
    setUserId(id);
    setName(
      (u?.user_metadata?.display_name as string | undefined) ?? u?.email ?? null
    );
    setCurrentUserId(id);
  }, []);

  useEffect(() => {
    const sb = getSupabase();
    if (!sb) {
      setLoading(false);
      return;
    }
    sb.auth.getSession().then(({ data }) => {
      applyUser(data.session?.user ?? null);
      setLoading(false);
    });
    const { data: sub } = sb.auth.onAuthStateChange((_e, session) => {
      applyUser(session?.user ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, [applyUser]);

  const signIn = useCallback(async (email: string, password: string) => {
    const sb = getSupabase();
    if (!sb) return { error: "아직 Supabase가 설정되지 않았어요." };
    const { error } = await sb.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) return { error: mapError(error) };
    return {};
  }, []);

  const signUp = useCallback(
    async (email: string, password: string, name?: string) => {
      const sb = getSupabase();
      if (!sb) return { error: "아직 Supabase가 설정되지 않았어요." };
      if (!email.trim().toLowerCase().endsWith(`@${ALLOWED_EMAIL_DOMAIN}`)) {
        return { error: `@${ALLOWED_EMAIL_DOMAIN} 이메일만 가입할 수 있어요.` };
      }
      const { data, error } = await sb.auth.signUp({
        email: email.trim(),
        password,
        options: name?.trim()
          ? { data: { display_name: name.trim() } }
          : undefined,
      });
      if (error) return { error: mapError(error) };
      // No session means email confirmation is required before first login.
      return { needsConfirm: !data.session };
    },
    []
  );

  const signOut = useCallback(async () => {
    const sb = getSupabase();
    if (sb) await sb.auth.signOut();
    applyUser(null);
  }, [applyUser]);

  return (
    <Ctx.Provider
      value={{
        userId,
        name,
        loading,
        configured: isSupabaseConfigured,
        signIn,
        signUp,
        signOut,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
