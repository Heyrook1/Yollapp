# Project Status

_Last reviewed: 2026-08-01 · Branch: `release/yolla-production-ready-v1`_

## Executive Summary

Yolla’nın create → mock pay → accept → deliver → track döngüsü çalışıyor.
**Kontrollü pilot BLOCKED:** gerçek PSP/SMS yok. Kod tarafında kritik boşluk kapatıldı:
DELIVER artık aynı TX içinde `LedgerEntry` yazar; cüzdan available bakiyesi defter SUM’ından gelir.

Interactive rapor: Cursor Canvas `yolla-orchestrator-report.canvas.tsx`.

## Platform Status

| Area | Status | Evidence | Blockers |
|---|---|---|---|
| Web | Mostly complete | Sender/courier/admin shells | Mock pay, no live map |
| Mobile (Expo) | In progress | `apps/mobile` 10 screens | Store / live APIs |
| Backend loop | Mostly complete | shipments + tracking services | RETURN/incident UX |
| Auth (email) | Ready | Supabase | Phone OTP external |
| Payments | Early | Provider interface; mock markPaid + flag | Real PSP |
| Wallet/ledger | In progress | `features/wallet` settle on DELIVER | Payout rail |
| Notifications | Early | Honest `delivered:false` | SMS provider |
| Ratings | Not started | No Prisma model | Schema + feature |
| CI | Ready | `.github/workflows/ci.yml` | ESLint package |
| E2E | Not started | — | Playwright |

## Critical Risks

1. Gerçek tahsilat yok — mock pay (flag’li).
2. SMS yok — kurye bildirim alamıyor.
3. Rating / payout / maps hâlâ eksik.

## Recommended Next Actions

1. `pnpm test` + `pnpm typecheck` yeşil tut.
2. PSP + SMS hesaplarını aç; webhook → PAID bağla.
3. Rating modeli + RETURN/incident admin akışı.
