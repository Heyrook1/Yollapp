# Maps Architecture — YOLLA

Hybrid Google Maps stack for Northern Cyprus logistics.

## Client

- Maps JavaScript API (async script load, `geometry` library)
- Places Autocomplete (New) via **server proxy** + session tokens
- Browser Geolocation API for courier foreground sharing
- Components: `AddressAutocomplete`, `GoogleRouteMap`, `CourierLocationSharer`, `PublicLiveMap`

## Server

- Routes API `computeRoutes` — route polyline, distance, duration
- Places API (New) autocomplete + place details
- Keys: `GOOGLE_MAPS_SERVER_KEY` only (never returned to client)
- Zone enforcement: `packages/core/src/geo.ts` service bounds
- Pricing remains zone × size; route snapshot stored on `PriceQuote` for ETA/UI

## Live tracking

- `DeliveryTrackingSession` — active sharing window
- `DriverCurrentLocation` — fast read
- `DriverLocationHistory` — limited retention
- Ingest: `POST /api/v1/driver/location` (auth, ownership, trackable status, rate limit, sequence)
- Read: auth live endpoint + public `/t/[token]` with masked PII
- Realtime: **controlled polling** while tracking UI open (Supabase Realtime channel not introduced)

## Taxi cargo

- `VehicleType.TAXI`, `isTaxiCargo` on shipment
- Server blocks sharing when `carryingPassenger` or missing `taxiCargoEnabled`
