"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";

/**
 * Requires login to use the app (when Supabase is configured).
 * The /login route is always allowed through. If Supabase is NOT configured
 * (e.g. local dev without keys), falls back to open/guest access.
 */
export default function AuthGate({ children }: { children: ReactNode }) {
  const { configured, loading, userId } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const isLoginRoute = pathname === "/login";
  const needsAuth = configured && !loading && !userId && !isLoginRoute;

  useEffect(() => {
    if (needsAuth) router.replace("/login");
  }, [needsAuth, router]);

  if (!configured || isLoginRoute) return <>{children}</>;

  if (loading) {
    return <p className="py-20 text-center text-sm text-slate-400">불러오는 중…</p>;
  }

  if (!userId) {
    return (
      <div className="py-20 text-center">
        <p className="text-sm text-slate-500">로그인이 필요합니다.</p>
        <Link
          href="/login"
          className="mt-3 inline-block rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white"
        >
          로그인하러 가기
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}
