# 00 — Production Readiness Baseline

Ölçüm anı: 2026-08-01 · Baz commit: `c0c6a54` · Dal: `release/yolla-production-ready-v1`

## Stack (doğrulanmış, varsayım değil)

| Alan | Gerçek durum |
|---|---|
| Framework | Next.js 15.5.22, App Router, React 19 |
| Dil | TypeScript strict, `noUncheckedIndexedAccess` açık |
| Paket yöneticisi | pnpm 10.28.0, workspace monorepo |
| DB / ORM | Supabase Postgres + Prisma 6.19.3 |
| Auth | Supabase Auth — **e-posta + şifre** (telefon/OTP YOK) |
| Stil | Tailwind CSS v4 (`@theme` token'ları) |
| Test | Vitest (birim). Playwright/E2E **yok** |
| Deploy | Netlify (ADR 0002) |

## Baz komut sonuçları (değişiklik ÖNCESİ)

| Komut | Sonuç |
|---|---|
| `pnpm install` | ✅ (ancak `apps/web/node_modules/@yolla/db` bayat fiziksel kopyaydı → `--force` gerekti) |
| `pnpm typecheck` | ✅ temiz |
| `pnpm test` | ✅ 21/21 |
| `pnpm build` | ✅ 20 route |
| `pnpm lint` | ❌ **ESLint hiç kurulmamış** — `next lint` interaktif kurulum istiyor |
| E2E | ❌ yapılandırma yok |
| CI | ❌ `.github/` yok |

## Baz durumda tespit edilen production blocker'ları

| # | Blocker | Ciddiyet |
|---|---|---|
| B1 | İş kabulünde **yarış koşulu** — iki kurye aynı işi alabilirdi | Kritik |
| B2 | **Ledger yok** — kazanç değişebilir gönderi kayıtlarından hesaplanıyordu (CLAUDE.md §5.2 ihlali) | Kritik |
| B3 | **Hız sınırı yok** (auth/quote/tracking) — CLAUDE.md §6.7 ihlali | Yüksek |
| B4 | **Denetim kaydı yok** — admin kararları izlenemiyor | Yüksek |
| B5 | **TrackingToken yok** — MVP #6 hiç yapılmamış | Yüksek |
| B6 | **Güvenlik başlığı yok** (CSP, HSTS, frame koruması) | Yüksek |
| B7 | Rol kontrolleri **dağınık** `roles.includes()` çağrıları | Yüksek |
| B8 | Kurye **kendi gönderisini** kabul edebiliyordu | Orta |
| B9 | **Ortam doğrulaması yok** — eksik sır sessizce geçiyordu | Orta |
| B10 | **Kill switch yok** — sorun anında özellik kapatılamıyordu | Orta |
| B11 | Ödeme mock, sağlayıcı soyutlaması yok | Kritik (dış bağımlılık) |
| B12 | Bildirim altyapısı yok | Kritik (dış bağımlılık) |
| B13 | CI/kalite kapısı yok | Yüksek |
| B14 | `Incident` / destek akışı yok | Orta |

B1–B10, B13 bu dalda **kapatıldı**. B11, B12 dış hesap gerektiriyor (bkz. `EXTERNAL-DEPENDENCIES.md`).
B14 şeması eklendi, UI akışı P1'e bırakıldı.
