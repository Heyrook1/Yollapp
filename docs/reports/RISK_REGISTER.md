# Risk Register

| ID | Risk | Severity | Evidence | Mitigation | Owner | Status |
|---|---|---|---|---|---|---|
| R-001 | Gerçek tahsilat yok (mock pay) | Critical | `markShipmentPaid` provider çağırmaz | PSP + webhook; `payments` flag | CTO | Open |
| R-002 | SMS / kurye bildirimi yok | Critical | `notifications` provider `delivered:false` | SMS hesabı + flag | CTO | Open |
| R-003 | Canlı harita yok | High | Map placeholder | Maps provider | CTO | Open |
| R-004 | Rating yok | Medium | Prisma’da model yok | Rating feature | CPO | Open |
| R-005 | Payout rayı kapalı | High | `payouts` flag false | Banka/havale + mock admin | CTO | Open |
| R-006 | Ledger runtime eksikliği | Critical | Eski: quote bakiyesi | DELIVER settle + SUM — kapatıldı 2026-08-01 | CTO | Mitigated |
| R-007 | ESLint / E2E yok | Medium | Lint kurulmamış; Playwright yok | Paket onayı + e2e | EM | Open |
