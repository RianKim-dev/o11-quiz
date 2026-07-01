"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth";

export default function AuthBar() {
  const { configured, loading, name, userId, signOut } = useAuth();

  if (!configured) {
    return <span className="text-xs text-slate-400">게스트 모드</span>;
  }
  if (loading) {
    return <span className="text-xs text-slate-300">…</span>;
  }
  if (userId) {
    return (
      <div className="flex items-center gap-2 text-xs">
        <span className="text-slate-500">
          <b className="text-slate-700">{name ?? "사용자"}</b> 님
        </span>
        <button
          onClick={() => signOut()}
          className="rounded border border-slate-300 px-2 py-0.5 text-slate-500 hover:bg-slate-50"
        >
          로그아웃
        </button>
      </div>
    );
  }
  return (
    <Link
      href="/login"
      className="rounded-md bg-rose-600 px-3 py-1 text-xs font-medium text-white hover:bg-rose-700"
    >
      로그인
    </Link>
  );
}
