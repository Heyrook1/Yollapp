"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
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
        setError("Bağlantı kurulamadı. Lütfen tekrar deneyin.");
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
        <a href={text.switchHref} className="font-extrabold text-primary">
          {text.switchCta}
        </a>
      </p>
    </form>
  );
}
