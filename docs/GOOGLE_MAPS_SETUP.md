# Google Cloud Setup — YOLLA Maps

## 0. Hızlı prototip: Maps Demo Key (ücretsiz, billing yok)

Yerel deneme için Google’ın [Maps Demo Key](https://developers.google.com/maps/demo-key) özelliğini kullanabilirsin.

- Maps JavaScript, Places API (New), Compute Routes gibi desteklenen özellikler için geçerli
- Günlük kota var; **production için değil**
- Demo Key aldıktan sonra `apps/web/.env.local` içine koy:

```
MAPS_PROVIDER=google
NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY=<demo-or-real-key>
GOOGLE_MAPS_SERVER_KEY=<same-or-separate-server-key>
GOOGLE_MAPS_ROUTES_ENABLED=true
GOOGLE_MAPS_PLACES_ENABLED=true
```

Sonra `pnpm dev`’i **yeniden başlat** (`NEXT_PUBLIC_*` build/start anında okunur).

## 1. Enable APIs (ücretli / production hesap)

In Google Cloud Console, enable:

1. Maps JavaScript API
2. Places API (New)
3. Routes API

## 2. Create separate keys

| Key | Env var | Restrictions |
|---|---|---|
| Browser | `NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY` | HTTP referrers: `http://localhost:3000/*`, `http://localhost:3001/*`, production domain. APIs: Maps JavaScript only. |
| Server | `GOOGLE_MAPS_SERVER_KEY` | IP restrict when possible. APIs: Routes API, Places API (New). Never expose to client. |

Do **not** commit keys. Rotate any key that was pasted into chat or tickets.

## 3. Local `.env.local` (apps/web)

```
MAPS_PROVIDER=google
NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY=...
GOOGLE_MAPS_SERVER_KEY=...
GOOGLE_MAPS_ROUTES_ENABLED=true
GOOGLE_MAPS_PLACES_ENABLED=true
GOOGLE_MAPS_DEFAULT_LAT=35.1856
GOOGLE_MAPS_DEFAULT_LNG=33.3823
```

## 4. Quotas & budget

- Set budget alerts in Google Cloud Billing
- Autocomplete debounced (350ms) + min 3 chars + session tokens
- Routes not recalculated on every GPS ping
- Feature flags `maps` / `live_tracking` can kill switches

## 5. Verify

1. `pnpm db:migrate` (maps migration applied)
2. `pnpm --filter @yolla/web dev`
3. Sender create flow: address autocomplete → map pins
4. Courier active job: start location share
5. Public `/t/{token}`: freshness labels + map
