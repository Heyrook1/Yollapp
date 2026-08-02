-- Maps / live tracking foundations (additive)

ALTER TYPE "VehicleType" ADD VALUE IF NOT EXISTS 'TAXI';

CREATE TYPE "TrackingSessionStatus" AS ENUM ('ACTIVE', 'ENDED', 'REVOKED');

ALTER TABLE "courier_profiles"
  ADD COLUMN IF NOT EXISTS "taxi_cargo_enabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "carrying_passenger" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "shipments"
  ADD COLUMN IF NOT EXISTS "is_taxi_cargo" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "pickup_place_id" TEXT,
  ADD COLUMN IF NOT EXISTS "dropoff_place_id" TEXT,
  ADD COLUMN IF NOT EXISTS "pickup_lat" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "pickup_lng" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "dropoff_lat" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "dropoff_lng" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "pickup_entrance_note" TEXT,
  ADD COLUMN IF NOT EXISTS "dropoff_entrance_note" TEXT;

ALTER TABLE "price_quotes"
  ADD COLUMN IF NOT EXISTS "route_distance_meters" INTEGER,
  ADD COLUMN IF NOT EXISTS "route_duration_seconds" INTEGER,
  ADD COLUMN IF NOT EXISTS "route_polyline" TEXT,
  ADD COLUMN IF NOT EXISTS "route_expires_at" TIMESTAMP(3);

CREATE TABLE IF NOT EXISTS "delivery_tracking_sessions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "shipment_id" UUID NOT NULL,
  "driver_id" UUID NOT NULL,
  "status" "TrackingSessionStatus" NOT NULL DEFAULT 'ACTIVE',
  "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "ended_at" TIMESTAMP(3),
  "last_location_at" TIMESTAMP(3),
  "expires_at" TIMESTAMP(3) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "delivery_tracking_sessions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "driver_current_locations" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "driver_id" UUID NOT NULL,
  "shipment_id" UUID NOT NULL,
  "latitude" DOUBLE PRECISION NOT NULL,
  "longitude" DOUBLE PRECISION NOT NULL,
  "accuracy_meters" DOUBLE PRECISION,
  "heading" DOUBLE PRECISION,
  "speed_mps" DOUBLE PRECISION,
  "sequence_number" INTEGER NOT NULL,
  "device_timestamp" TIMESTAMP(3),
  "recorded_at" TIMESTAMP(3) NOT NULL,
  "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "driver_current_locations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "driver_location_history" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "shipment_id" UUID NOT NULL,
  "driver_id" UUID NOT NULL,
  "latitude" DOUBLE PRECISION NOT NULL,
  "longitude" DOUBLE PRECISION NOT NULL,
  "accuracy_meters" DOUBLE PRECISION,
  "heading" DOUBLE PRECISION,
  "speed_mps" DOUBLE PRECISION,
  "sequence_number" INTEGER NOT NULL,
  "recorded_at" TIMESTAMP(3) NOT NULL,
  "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "driver_location_history_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "delivery_tracking_sessions_shipment_id_status_idx"
  ON "delivery_tracking_sessions"("shipment_id", "status");
CREATE INDEX IF NOT EXISTS "delivery_tracking_sessions_driver_id_status_idx"
  ON "delivery_tracking_sessions"("driver_id", "status");
CREATE UNIQUE INDEX IF NOT EXISTS "driver_current_locations_shipment_id_key"
  ON "driver_current_locations"("shipment_id");
CREATE INDEX IF NOT EXISTS "driver_current_locations_driver_id_idx"
  ON "driver_current_locations"("driver_id");
CREATE INDEX IF NOT EXISTS "driver_location_history_shipment_id_received_at_idx"
  ON "driver_location_history"("shipment_id", "received_at");
CREATE INDEX IF NOT EXISTS "driver_location_history_received_at_idx"
  ON "driver_location_history"("received_at");

DO $$ BEGIN
  ALTER TABLE "delivery_tracking_sessions"
    ADD CONSTRAINT "delivery_tracking_sessions_shipment_id_fkey"
    FOREIGN KEY ("shipment_id") REFERENCES "shipments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "delivery_tracking_sessions"
    ADD CONSTRAINT "delivery_tracking_sessions_driver_id_fkey"
    FOREIGN KEY ("driver_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "driver_current_locations"
    ADD CONSTRAINT "driver_current_locations_driver_id_fkey"
    FOREIGN KEY ("driver_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "driver_current_locations"
    ADD CONSTRAINT "driver_current_locations_shipment_id_fkey"
    FOREIGN KEY ("shipment_id") REFERENCES "shipments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "driver_location_history"
    ADD CONSTRAINT "driver_location_history_driver_id_fkey"
    FOREIGN KEY ("driver_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "driver_location_history"
    ADD CONSTRAINT "driver_location_history_shipment_id_fkey"
    FOREIGN KEY ("shipment_id") REFERENCES "shipments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE "delivery_tracking_sessions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "driver_current_locations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "driver_location_history" ENABLE ROW LEVEL SECURITY;

INSERT INTO "feature_flags" ("id", "enabled", "description", "updated_at") VALUES
  ('maps', true, 'Google Maps / Places / Routes', NOW()),
  ('live_tracking', true, 'Kurye canlı konum paylaşımı', NOW())
ON CONFLICT ("id") DO NOTHING;
