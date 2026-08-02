"use client";

import { useEffect, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  getPreferredModeClient,
  resolvePostAuthPath,
  setPreferredModeClient,
} from "@/lib/mode";
import { Button } from "@/components/ui/Button";
import { Field, TextInput } from "@/components/ui/Field";
import { LockIcon } from "@/components/ui/icons";

type Mode = "login" | "signup";

const copy = {
  login: {
    title: "Tekrar\nhoş geldin",
    subtitle: "Hesabına giriş yap, kaldığın yerden devam et.",
    submit: "Giriş yap",
    switchLabel: "Hesabın yok mu?",
    switchHref: "/signup",
    switchCta: "Kayıt ol",
  },
  signup: {
    title: "Hesabını\noluştur",
    subtitle: "Dakikalar içinde ilk paketini gönder.",
    submit: "Kayıt ol",
    switchLabel: "Zaten hesabın var mı?",
    switchHref: "/login",
    switchCta: "Giriş yap",
  },
} as const;

/** Supabase hata kodlarını kullanıcıya Türkçe, eyleme dönük mesaja çevir. */
function authErrorMessage(message: string, code?: string): string {
  const m = `${code ?? ""} ${message}`.toLowerCase();
  if (m.includes("invalid login") || m.includes("invalid_credentials")) {
    return "E-posta veya şifre hatalı.";
  }
  if (m.includes("email not confirmed") || m.includes("email_not_confirmed")) {
    return "E-posta henüz onaylanmamış. Kutunu kontrol et veya Supabase Auth’ta onay zorunluluğunu kapat.";
  }
  if (m.includes("user already registered") || m.includes("already_registered")) {
    return "Bu e-posta zaten kayıtlı. Giriş yapmayı dene.";
  }
  if (m.includes("rate limit") || m.includes("over_request")) {
    return "Çok fazla deneme. Birkaç dakika sonra tekrar dene.";
  }
  if (m.includes("fetch") || m.includes("network") || m.includes("failed to fetch")) {
    return "Supabase’e bağlanılamadı. Ağ veya CSP/connect-src ayarını kontrol et.";
  }
  // Teknik detayı gizlemeden kısa tut — teşhis için gerekli.
  return message || "İşlem başarısız. Lütfen tekrar dene.";
}

export function AuthForm({ mode }: { mode: Mode }) {
  const searchParams = useSearchParams();
  const nextParam = searchParams.get("next");
  const next = resolvePostAuthPath(nextParam, getPreferredModeClient());
  useEffect(() => {
    if (next.startsWith("/courier")) setPreferredModeClient("courier");
    else if (next.startsWith("/sender")) setPreferredModeClient("sender");
  }, [next]);
  const switchHref =
    mode === "login"
      ? `/signup${nextParam ? `?next=${encodeURIComponent(nextParam)}` : ""}`
      : `/login${nextParam ? `?next=${encodeURIComponent(nextParam)}` : ""}`;
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
          const { data, error: authError } = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password,
          });
          if (authError) {
            setError(authErrorMessage(authError.message, authError.code));
            return;
          }
          if (!data.session) {
            setError("Oturum oluşturulamadı. E-posta onayını kontrol et.");
            return;
          }
          // Tam sayfa navigasyon: cookie'ler middleware'e kesin ulaşır
          // (router.push + refresh bazen oturumsuz /sender'a düşürür).
          window.location.assign(next);
          return;
        }

        const { data, error: authError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        });
        if (authError) {
          setError(authErrorMessage(authError.message, authError.code));
          return;
        }
        if (!data.session) {
          setInfo(
            "Kayıt alındı. E-posta onayı açıksa kutunu kontrol et, onaydan sonra giriş yap.",
          );
          return;
        }
        window.location.assign(next);
      } catch (err) {
        const message = err instanceof Error ? err.message : "";
        if (message.includes("Supabase env")) {
          setError("Supabase yapılandırması eksik (NEXT_PUBLIC_SUPABASE_URL / ANON_KEY).");
          return;
        }
        setError(authErrorMessage(message || "Bağlantı kurulamadı."));
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto flex w-full max-w-sm flex-col gap-6">
      <div className="space-y-2">
        <h1 className="whitespace-pre-line text-[34px] font-extrabold leading-[1.15] tracking-[-0.035em] text-ink">
          {text.title}
        </h1>
        <p className="text-[15px] font-semibold text-ink-secondary">{text.subtitle}</p>
      </div>

      <div className="space-y-4">
        <Field id="email" label="E-posta" error={undefined}>
          <TextInput
            id="email"
            type="email"
            required
            autoComplete="email"
            placeholder="ornek@eposta.com"
            value={email}
            disabled={pending}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>
        <Field id="password" label="Şifre">
          <TextInput
            id="password"
            type="password"
            required
            minLength={6}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            placeholder="••••••••"
            value={password}
            disabled={pending}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>
      </div>

      <div className="space-y-3">
        <Button type="submit" size="lg" loading={pending} className="w-full">
          {text.submit}
        </Button>
        <p className="flex items-center justify-center gap-1.5 text-xs font-bold text-ink-faint">
          <LockIcon size={13} /> Bilgilerin şifreli olarak saklanır
        </p>
      </div>

      {error ? (
        <p role="alert" className="rounded-2xl bg-danger-soft px-4 py-3 text-sm font-bold text-danger">
          {error}
        </p>
      ) : null}
      {info ? (
        <p className="rounded-2xl bg-success-soft px-4 py-3 text-sm font-bold text-success-deep">
          {info}
        </p>
      ) : null}

      <p className="text-center text-sm font-semibold text-ink-secondary">
        {text.switchLabel}{" "}
        <a href={switchHref} className="font-extrabold text-primary">
          {text.switchCta}
        </a>
      </p>
    </form>
  );
}
