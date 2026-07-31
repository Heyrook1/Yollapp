"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Mode = "login" | "signup";

const copy = {
  login: {
    title: "Giriş yap",
    submit: "Giriş",
    switchLabel: "Hesabın yok mu?",
    switchHref: "/signup",
    switchCta: "Kayıt ol",
  },
  signup: {
    title: "Kayıt ol",
    submit: "Kayıt ol",
    switchLabel: "Zaten hesabın var mı?",
    switchHref: "/login",
    switchCta: "Giriş yap",
  },
} as const;

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/sender";
  const text = copy[mode];

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setInfo(null);

    startTransition(async () => {
      try {
        const supabase = createClient();
        if (mode === "login") {
          const { error: authError } = await supabase.auth.signInWithPassword({
            email,
            password,
          });
          if (authError) {
            setError("Giriş başarısız. E-posta veya şifreyi kontrol edin.");
            return;
          }
        } else {
          const { error: authError } = await supabase.auth.signUp({
            email,
            password,
          });
          if (authError) {
            setError("Kayıt başarısız. Bilgileri kontrol edin.");
            return;
          }
          setInfo("Kayıt alındı. E-posta onayı açıksa kutunu kontrol et, sonra giriş yap.");
        }
        router.push(next);
        router.refresh();
      } catch {
        setError("Supabase yapılandırması eksik. .env dosyasını kontrol edin.");
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="max-w-sm space-y-4">
      <h1 className="text-2xl font-semibold text-brand-900">{text.title}</h1>
      <div className="space-y-1">
        <label htmlFor="email" className="block text-sm font-medium">
          E-posta
        </label>
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          className="w-full rounded-md border border-brand-200 bg-white px-3 py-2"
          value={email}
          disabled={pending}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div className="space-y-1">
        <label htmlFor="password" className="block text-sm font-medium">
          Şifre
        </label>
        <input
          id="password"
          type="password"
          required
          minLength={6}
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          className="w-full rounded-md border border-brand-200 bg-white px-3 py-2"
          value={password}
          disabled={pending}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-brand-600 px-4 py-2 text-white hover:bg-brand-700 disabled:opacity-60"
      >
        {pending ? "Bekleyin…" : text.submit}
      </button>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      {info ? <p className="text-sm text-brand-700">{info}</p> : null}
      <p className="text-sm text-brand-700">
        {text.switchLabel}{" "}
        <a href={text.switchHref} className="underline">
          {text.switchCta}
        </a>
      </p>
    </form>
  );
}
