"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { ALLOWED_EMAIL_DOMAIN } from "@/lib/config";

type Mode = "login" | "signup";

export default function LoginPage() {
  const { signIn, signUp, configured } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setInfo("");
    setBusy(true);
    if (mode === "login") {
      const { error } = await signIn(email, password);
      setBusy(false);
      if (error) setError(error);
      else router.push("/");
    } else {
      const { error, needsConfirm } = await signUp(email, password, name);
      setBusy(false);
      if (error) setError(error);
      else if (needsConfirm)
        setInfo(
          "확인 메일을 보냈어요. 메일함의 링크를 클릭한 뒤, '로그인' 탭에서 로그인하세요."
        );
      else router.push("/");
    }
  };

  const tabCls = (m: Mode) =>
    `flex-1 rounded-lg py-2 text-sm font-medium ${
      mode === m ? "bg-rose-600 text-white" : "bg-slate-100 text-slate-600"
    }`;

  return (
    <div className="mx-auto max-w-sm py-10">
      <h1 className="text-lg font-semibold">계정</h1>

      {!configured ? (
        <div className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-700">
          아직 Supabase가 연결되지 않아 로그인 없이 <b>게스트 모드</b>로 이용 중이에요.
          (진도는 이 브라우저에만 저장됩니다.)
          <div className="mt-2">
            <Link href="/" className="underline">
              홈으로
            </Link>
          </div>
        </div>
      ) : (
        <>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setError("");
                setInfo("");
              }}
              className={tabCls("login")}
            >
              로그인
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("signup");
                setError("");
                setInfo("");
              }}
              className={tabCls("signup")}
            >
              회원가입
            </button>
          </div>

          <form onSubmit={submit} className="mt-4 space-y-3">
            {mode === "signup" ? (
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">
                  이름 <span className="text-slate-400">(표시용, 선택)</span>
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-rose-500"
                  placeholder="예: 홍길동"
                />
              </div>
            ) : null}
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">
                이메일
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-rose-500"
                placeholder={`you@${ALLOWED_EMAIL_DOMAIN}`}
              />
              {mode === "signup" ? (
                <p className="mt-1 text-xs text-slate-400">
                  @{ALLOWED_EMAIL_DOMAIN} 이메일만 가입할 수 있어요.
                </p>
              ) : null}
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">
                비밀번호
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-rose-500"
                placeholder="6자 이상"
              />
            </div>

            {error ? <p className="text-sm text-rose-600">{error}</p> : null}
            {info ? (
              <p className="rounded-lg bg-emerald-50 p-2 text-sm text-emerald-700">
                {info}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-lg bg-rose-600 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {busy ? "처리 중…" : mode === "login" ? "로그인" : "회원가입"}
            </button>
          </form>
        </>
      )}
    </div>
  );
}
