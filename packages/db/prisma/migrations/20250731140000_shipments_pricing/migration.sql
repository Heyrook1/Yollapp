-- CreateEnum
CREATE TYPE "ShipmentStatus" AS ENUM (
  'DRAFT',
  'QUOTED',
  'PAID',
  'MATCHED',
  'PICKED_UP',
  'IN_TRANSIT',
  'DELIVERED',
  'FAILED_DELIVERY',
  'RETURNED',
  'CANCELLED'
);

-- CreateTable
CREATE TABLE "zones" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "base_fee_minor" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "zones_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "size_classes" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "multiplier" DOUBLE PRECISION NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "size_classes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "shipments" (
    "id" UUID NOT NULL,
    "sender_id" UUID NOT NULL,
    "courier_id" UUID,
    "status" "ShipmentStatus" NOT NULL DEFAULT 'DRAFT',
    "zone_id" UUID NOT NULL,
    "size_class_id" UUID NOT NULL,
    "is_express" BOOLEAN NOT NULL DEFAULT false,
    "pickup_address" TEXT NOT NULL,
    "dropoff_address" TEXT NOT NULL,
    "recipient_name" TEXT NOT NULL,
    "recipient_phone" TEXT NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "shipments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "delivery_windows" (
    "id" UUID NOT NULL,
    "shipment_id" UUID NOT NULL,
    "starts_at" TIMESTAMP(3) NOT NULL,
    "ends_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "delivery_windows_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "price_quotes" (
    "id" UUID NOT NULL,
    "shipment_id" UUID NOT NULL,
    "amount_minor" INTEGER NOT NULL,
    "zone_base_minor" INTEGER NOT NULL,
    "size_multiplier" DOUBLE PRECISION NOT NULL,
    "express_premium_minor" INTEGER NOT NULL,
    "commission_bps" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "price_quotes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "shipment_events" (
    "id" UUID NOT NULL,
    "shipment_id" UUID NOT NULL,
    "from_status" "ShipmentStatus",
    "to_status" "ShipmentStatus" NOT NULL,
    "actor_user_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "shipment_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "zones_code_key" ON "zones"("code");
CREATE UNIQUE INDEX "size_classes_code_key" ON "size_classes"("code");
CREATE UNIQUE INDEX "delivery_windows_shipment_id_key" ON "delivery_windows"("shipment_id");
CREATE UNIQUE INDEX "price_quotes_shipment_id_key" ON "price_quotes"("shipment_id");
CREATE INDEX "shipments_sender_id_idx" ON "shipments"("sender_id");
CREATE INDEX "shipments_courier_id_idx" ON "shipments"("courier_id");
CREATE INDEX "shipments_status_idx" ON "shipments"("status");
CREATE INDEX "shipment_events_shipment_id_created_at_idx" ON "shipment_events"("shipment_id", "created_at");

ALTER TABLE "shipments" ADD CONSTRAINT "shipments_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_courier_id_fkey" FOREIGN KEY ("courier_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_zone_id_fkey" FOREIGN KEY ("zone_id") REFERENCES "zones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_size_class_id_fkey" FOREIGN KEY ("size_class_id") REFERENCES "size_classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "delivery_windows" ADD CONSTRAINT "delivery_windows_shipment_id_fkey" FOREIGN KEY ("shipment_id") REFERENCES "shipments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "price_quotes" ADD CONSTRAINT "price_quotes_shipment_id_fkey" FOREIGN KEY ("shipment_id") REFERENCES "shipments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "shipment_events" ADD CONSTRAINT "shipment_events_shipment_id_fkey" FOREIGN KEY ("shipment_id") REFERENCES "shipments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "shipment_events" ADD CONSTRAINT "shipment_events_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "zones" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "size_classes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "shipments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "delivery_windows" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "price_quotes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "shipment_events" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    EXECUTE $p$ CREATE POLICY "zones_select_authenticated" ON "zones" FOR SELECT TO authenticated USING (true) $p$;
    EXECUTE $p$ CREATE POLICY "size_classes_select_authenticated" ON "size_classes" FOR SELECT TO authenticated USING (true) $p$;
    EXECUTE $p$ CREATE POLICY "shipments_select_own" ON "shipments" FOR SELECT TO authenticated USING (sender_id = auth.uid() OR courier_id = auth.uid()) $p$;
    EXECUTE $p$ CREATE POLICY "delivery_windows_select_via_shipment" ON "delivery_windows" FOR SELECT TO authenticated USING (
      EXISTS (SELECT 1 FROM shipments s WHERE s.id = shipment_id AND (s.sender_id = auth.uid() OR s.courier_id = auth.uid()))
    ) $p$;
    EXECUTE $p$ CREATE POLICY "price_quotes_select_via_shipment" ON "price_quotes" FOR SELECT TO authenticated USING (
      EXISTS (SELECT 1 FROM shipments s WHERE s.id = shipment_id AND (s.sender_id = auth.uid() OR s.courier_id = auth.uid()))
    ) $p$;
    EXECUTE $p$ CREATE POLICY "shipment_events_select_via_shipment" ON "shipment_events" FOR SELECT TO authenticated USING (
      EXISTS (SELECT 1 FROM shipments s WHERE s.id = shipment_id AND (s.sender_id = auth.uid() OR s.courier_id = auth.uid()))
    ) $p$;
  END IF;
END $$;
