# ADR 0001 — Monorepo ve Prisma + Supabase ayrımı

## Durum

Kabul edildi.

## Bağlam

Auth Supabase'te, domain verisi Postgres'te. Server actions Prisma ile yazar; client doğrudan tablo yazmaz.

## Karar

- `packages/db`: Prisma schema + migrations (RLS aynı migration'da).
- `apps/web`: Supabase SSR auth; Prisma service role/DB URL ile trusted server yazımı.
- `packages/core`: React/Next'siz saf domain.

## Sonuç

RLS client erişimini korur; iş mantığı server'da test edilebilir kalır.
