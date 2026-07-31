"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";

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
    <form onSubmit={onSubmit} className="mx-auto max-w-sm space-y-5">
      <div className="space-y-1">
        <p className="text-sm font-semibold tracking-widest text-yolla-blue">YOLLA</p>
        <h1 className="text-2xl font-semibold text-ink">{text.title}</h1>
      </div>
      <div className="space-y-1">
        <label htmlFor="email" className="block text-sm font-medium text-ink">
          E-posta
        </label>
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          className="min-h-12 w-full rounded-[12px] border border-border bg-surface-elevated px-3 py-2"
          value={email}
          disabled={pending}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div className="space-y-1">
        <label htmlFor="password" className="block text-sm font-medium text-ink">
          Şifre
        </label>
        <input
          id="password"
          type="password"
          required
          minLength={6}
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          className="min-h-12 w-full rounded-[12px] border border-border bg-surface-elevated px-3 py-2"
          value={password}
          disabled={pending}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Bekleyin…" : text.submit}
      </Button>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      {info ? <p className="text-sm text-ink-secondary">{info}</p> : null}
      <p className="text-sm text-ink-secondary">
        {text.switchLabel}{" "}
        <a href={text.switchHref} className="font-semibold text-yolla-blue underline">
          {text.switchCta}
        </a>
      </p>
    </form>
  );
}
