# ADR 0002 — Deploy hedefi Vercel yerine Netlify

## Durum

Kabul edildi (2026-08-01). ADR ile §2'deki "Deploy: Vercel" kaydı değiştirildi.

## Bağlam

CLAUDE.md §2 stack'i "SABİT — DEĞİŞTİRME" olarak işaretliyor ve deploy hedefini Vercel
olarak tanımlıyordu. Proje sahibi demo dağıtımı için Netlify'ı tercih etti.

## Karar

- Deploy hedefi **Netlify**; `@netlify/plugin-nextjs` kök devDependency olarak eklendi.
- Yapılandırma repo kökündeki `netlify.toml` dosyasında.
- Build komutu `pnpm db:generate && pnpm --filter @yolla/web build` — pnpm, Prisma'nın
  postinstall script'ini engellediği için `prisma generate` açıkça çağrılmalı.
- Publish dizini `apps/web/.next`.

## Sonuç

- Next.js App Router, middleware ve server actions plugin üzerinden çalışır; Vercel'e göre
  ikinci sınıf destek, davranış farkı çıkarsa plugin sürümü ilk şüpheli.
- Demo dağıtımı canlı Supabase'e bağlandığı için `netlify.toml` `X-Robots-Tag: noindex`
  gönderir. Halka açık gerçek kullanım öncesi ayrı bir demo veritabanı gerekir.
- Sunucu tarafı sırlar (`DATABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`) yalnızca Netlify
  ortam değişkenlerinde tutulur; repoya girmez.
