# Live Tracking Security

## Controls

- Auth required for location ingest and private live reads
- Courier must own the active job and be APPROVED
- Trackable statuses only: MATCHED, PICKED_UP, IN_TRANSIT
- Sequence number monotonicity (rejects stale/duplicate)
- Rate limit bucket `location` (120/min)
- Tracking sessions expire (24h) and end on DELIVER / FAIL_DELIVERY server-side
- Public links: hashed tokens, expiry, revoke, rate limit, masked addresses, no phones
- Precise GPS not written to general application logs

## Privacy (requires legal review)

Collected: lat/lng, accuracy, heading, speed, timestamps, shipment/driver ids during active jobs.
Retention: history intended ≤14 days (`LOCATION_POLICY.MAX_HISTORY_RETENTION_DAYS`); cleanup job TBD.
Public viewers see freshness labels; stale is never labeled “live”.

Legal conclusions for KKTC transport/KVKK are **out of scope for engineering** — mark for counsel.

## Courier presence (nearby map)

Feature flag: `courier_presence`.

- **Opt-in only:** courier must enable “Çevrimiçi / İş arıyorum”; no row / `sharingEnabled=false` → invisible.
- **Who can read:** authenticated `SENDER` or `ADMIN` via `GET /api/v1/couriers/nearby` (`courier:view_presence`). Couriers cannot list peers. Public tracking tokens cannot call this endpoint.
- **Who can write:** approved courier via `POST /api/v1/driver/presence` (`courier:share_presence`), rate-limited (`location` bucket).
- **DTO (no PII):** presence `id`, lat/lng, heading, `vehicleType`, `activity` (`AVAILABLE` | `ON_JOB` | `BUSY`), `freshness`. No name, phone, email, or courier user id.
- **Stale drop:** `lastSeenAt` older than `LOCATION_POLICY.OFFLINE_AFTER_SECONDS` (120s) excluded from nearby.
- **Job sync:** active-job location ingest updates presence to `ON_JOB` only if sharing already enabled.
- **Retention (MVP):** single current row per courier; no presence history table. Stale rows are simply not listed.
- Logs: courier/presence id + activity only — never lat/lng.

## Shipment docket + delivery proof

- `publicCode` (YLA-XXXX) is public-safe; UUID not required on UI.
- `deliveryCodeHash` only — plaintext shown once to sender after pay (UI) / given to recipient out-of-band (SMS later).
- `DELIVER` requires matching code when flag `delivery_proof` is on and hash exists.
- Public track DTO: code, masked areas/names, size, item description/color, courier displayName + rating — **never** phone or delivery code.
