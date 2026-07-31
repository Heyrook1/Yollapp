-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "AppRole" AS ENUM ('SENDER', 'COURIER', 'ADMIN');

-- CreateEnum
CREATE TYPE "CourierStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "VehicleType" AS ENUM ('WALK', 'BIKE', 'MOTORCYCLE', 'CAR');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "roles" "AppRole"[] DEFAULT ARRAY['SENDER']::"AppRole"[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "courier_profiles" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "status" "CourierStatus" NOT NULL DEFAULT 'PENDING',
    "vehicle_type" "VehicleType" NOT NULL,
    "active_zones" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "document_paths" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "rejection_reason" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "reviewed_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "courier_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_config" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "commission_bps" INTEGER NOT NULL DEFAULT 1500,
    "express_premium_bps" INTEGER NOT NULL DEFAULT 5000,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_config_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "courier_profiles_user_id_key" ON "courier_profiles"("user_id");

-- AddForeignKey
ALTER TABLE "courier_profiles" ADD CONSTRAINT "courier_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RLS (same migration — policy without RLS is not mergeable)
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "courier_profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "platform_config" ENABLE ROW LEVEL SECURITY;

-- Note: auth.uid() requires Supabase. Policies no-op harmlessly if role "authenticated" is absent until Supabase is wired.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    EXECUTE $p$
      CREATE POLICY "users_select_own"
        ON "users"
        FOR SELECT
        TO authenticated
        USING (id = auth.uid())
    $p$;
    EXECUTE $p$
      CREATE POLICY "courier_profiles_select_own"
        ON "courier_profiles"
        FOR SELECT
        TO authenticated
        USING (user_id = auth.uid())
    $p$;
    EXECUTE $p$
      CREATE POLICY "platform_config_select_authenticated"
        ON "platform_config"
        FOR SELECT
        TO authenticated
        USING (true)
    $p$;
  END IF;
END $$;
