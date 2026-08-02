# Maps Implementation Progress

- [x] Phase 1 — Audit + provider abstraction (`lib/providers/maps.ts`, `core/geo.ts`)
- [x] Phase 2 — Env validation + key split docs
- [x] Phase 3 — `GoogleRouteMap` + fallback `MapCanvas`
- [x] Phase 4 — Places autocomplete proxy + session tokens
- [x] Phase 5 — Wizard pin/address selection (verified place required)
- [x] Phase 6 — Routes API compute + quote snapshot fields
- [x] Phase 7 — Service-zone server validation
- [x] Phase 8 — Courier `watchPosition` sharer
- [x] Phase 9 — `POST /api/v1/driver/location`
- [x] Phase 10 — Polling-oriented live reads (auth + public token)
- [x] Phase 11 — Marker updates + freshness (interpolation lite)
- [x] Phase 12 — Secure public tracking map fields
- [x] Phase 13 — Taxi cargo flags + vehicle TAXI
- [x] Phase 14 — Privacy/retention docs
- [x] Phase 15 — Unit tests + docs

## Remaining external blockers

- Google Cloud key restrictions / billing must be configured by operator
- History retention cron job not scheduled yet
- Supabase Realtime channel optional upgrade (polling is default)
- Full Playwright e2e map flows not added
