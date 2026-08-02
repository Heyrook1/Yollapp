/**
 * Platform seed + isteğe bağlı demo sahte veri (SEED_DEMO=1).
 *
 * Demo hesaplar (service role varsa Auth’ta da oluşur):
 *   demo.admin@yolla.test / demo.sender@yolla.test / demo.courier@yolla.test …
 *   şifre: DEMO_PASSWORD veya YollaDemo123!
 *
 * Çalıştırma (repo kökü):
 *   pnpm db:seed
 *   pnpm db:seed:demo
 */
import { createHash, randomUUID } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  PrismaClient,
  AppRole,
  CourierStatus,
  VehicleType,
  ShipmentStatus,
  LedgerEntryType,
  LedgerEntryStatus,
  type Prisma,
} from "@prisma/client";

const prisma = new PrismaClient();
const __dirname = dirname(fileURLToPath(import.meta.url));

const DEMO_PASSWORD = process.env.DEMO_PASSWORD?.trim() || "YollaDemo123!";
const SEED_DEMO =
  process.env.SEED_DEMO === "1" ||
  process.env.SEED_DEMO === "true" ||
  process.argv.includes("--demo");

const DEMO_TRACK_TOKEN = "yolla-demo-track-in-transit-v1";

type DemoAccount = {
  email: string;
  roles: AppRole[];
  courier?: {
    status: CourierStatus;
    vehicleType: VehicleType;
    taxiCargoEnabled?: boolean;
    carryingPassenger?: boolean;
  };
};

const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    email: "demo.admin@yolla.test",
    roles: [AppRole.SENDER, AppRole.ADMIN],
  },
  {
    email: "demo.sender@yolla.test",
    roles: [AppRole.SENDER],
  },
  {
    email: "demo.dual@yolla.test",
    roles: [AppRole.SENDER, AppRole.COURIER],
    courier: {
      status: CourierStatus.APPROVED,
      vehicleType: VehicleType.MOTORCYCLE,
    },
  },
  {
    email: "demo.courier@yolla.test",
    roles: [AppRole.COURIER],
    courier: {
      status: CourierStatus.APPROVED,
      vehicleType: VehicleType.MOTORCYCLE,
    },
  },
  {
    email: "demo.courier2@yolla.test",
    roles: [AppRole.COURIER],
    courier: {
      status: CourierStatus.APPROVED,
      vehicleType: VehicleType.BIKE,
    },
  },
  {
    email: "demo.courier3@yolla.test",
    roles: [AppRole.COURIER],
    courier: {
      status: CourierStatus.APPROVED,
      vehicleType: VehicleType.CAR,
    },
  },
  {
    email: "demo.taxi@yolla.test",
    roles: [AppRole.COURIER],
    courier: {
      status: CourierStatus.APPROVED,
      vehicleType: VehicleType.TAXI,
      taxiCargoEnabled: true,
      carryingPassenger: true,
    },
  },
  {
    email: "demo.pending@yolla.test",
    roles: [AppRole.SENDER],
    courier: {
      status: CourierStatus.PENDING,
      vehicleType: VehicleType.CAR,
    },
  },
];

/** apps/web/.env.local ve packages/db/.env değerlerini process.env’e yükle (üzerine yazma). */
function loadEnvFiles() {
  const roots = [
    resolve(__dirname, "../../../apps/web/.env.local"),
    resolve(__dirname, "../../../.env.local"),
    resolve(__dirname, "../../../.env"),
    resolve(__dirname, "../.env"),
  ];
  for (const path of roots) {
    if (!existsSync(path)) continue;
    const text = readFileSync(path, "utf8");
    for (const line of text.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq < 1) continue;
      const key = trimmed.slice(0, eq).trim();
      let val = trimmed.slice(eq + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (process.env[key] === undefined) process.env[key] = val;
    }
  }
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

async function ensureAuthUser(email: string, password: string): Promise<string | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) return null;

  const headers = {
    Authorization: `Bearer ${key}`,
    apikey: key,
    "Content-Type": "application/json",
  };

  const createRes = await fetch(`${url}/auth/v1/admin/users`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      email,
      password,
      email_confirm: true,
      user_metadata: { demo: true, source: "yolla-seed" },
    }),
  });

  if (createRes.ok) {
    const body = (await createRes.json()) as { id?: string };
    if (body.id) return body.id;
  }

  // Zaten varsa listeden bul (ilk sayfalar yeterli demo için).
  for (let page = 1; page <= 5; page++) {
    const listRes = await fetch(
      `${url}/auth/v1/admin/users?page=${page}&per_page=200`,
      { headers: { Authorization: `Bearer ${key}`, apikey: key } },
    );
    if (!listRes.ok) break;
    const body = (await listRes.json()) as {
      users?: Array<{ id: string; email?: string }>;
    };
    const found = body.users?.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase(),
    );
    if (found) return found.id;
    if (!body.users?.length) break;
  }
  console.warn(`Auth user bulunamadı/oluşturulamadı: ${email}`);
  return null;
}

async function seedFlags() {
  const flags: Array<{ id: string; enabled: boolean; description: string }> = [
    { id: "shipment_creation", enabled: true, description: "Yeni gönderi oluşturma" },
    { id: "courier_matching", enabled: true, description: "Kurye eşleştirme" },
    { id: "payments", enabled: true, description: "Ödeme (mock dahil)" },
    { id: "payouts", enabled: false, description: "Para çekme" },
    { id: "notifications", enabled: false, description: "Bildirim" },
    { id: "business_bulk_import", enabled: false, description: "Toplu import" },
    { id: "phone_auth", enabled: false, description: "Telefon auth" },
    { id: "maps", enabled: true, description: "Harita / Places / Routes" },
    { id: "live_tracking", enabled: true, description: "İş canlı takibi" },
    { id: "courier_presence", enabled: true, description: "Canlı kurye varlık haritası" },
  ];
  for (const f of flags) {
    await prisma.featureFlag.upsert({
      where: { id: f.id },
      create: f,
      update: { enabled: f.enabled, description: f.description },
    });
  }
}

async function seedCatalog() {
  await prisma.platformConfig.upsert({
    where: { id: "default" },
    create: {
      id: "default",
      commissionBps: 1500,
      expressPremiumBps: 5000,
    },
    update: {},
  });

  const zones = [
    { code: "LEFKOSA", name: "Lefkoşa", baseFeeMinor: 5000 },
    { code: "GIRNE", name: "Girne", baseFeeMinor: 6000 },
    { code: "GAZIMAGUSA", name: "Gazimağusa", baseFeeMinor: 6500 },
  ];
  for (const zone of zones) {
    await prisma.zone.upsert({
      where: { code: zone.code },
      create: zone,
      update: {
        name: zone.name,
        baseFeeMinor: zone.baseFeeMinor,
        isActive: true,
      },
    });
  }

  const sizes = [
    { code: "S", name: "Küçük", multiplier: 1 },
    { code: "M", name: "Orta", multiplier: 1.5 },
    { code: "L", name: "Büyük", multiplier: 2 },
    { code: "XL", name: "Çok büyük", multiplier: 2.5 },
  ];
  for (const size of sizes) {
    await prisma.sizeClass.upsert({
      where: { code: size.code },
      create: size,
      update: {
        name: size.name,
        multiplier: size.multiplier,
        isActive: true,
      },
    });
  }
}

async function promoteBootstrapAdmin() {
  const adminEmail = process.env.ADMIN_BOOTSTRAP_EMAIL?.trim().toLowerCase();
  if (!adminEmail) {
    console.log("ADMIN_BOOTSTRAP_EMAIL yok — atlandı.");
    return;
  }
  const user = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!user) {
    console.log(
      `ADMIN_BOOTSTRAP_EMAIL=${adminEmail} henüz yok. Kayıt ol, sonra seed tekrarla.`,
    );
    return;
  }
  const roles = new Set(user.roles);
  roles.add(AppRole.ADMIN);
  await prisma.user.update({
    where: { id: user.id },
    data: { roles: Array.from(roles) },
  });
  console.log(`Promoted ${adminEmail} to ADMIN`);
}

async function upsertDemoUser(account: DemoAccount): Promise<string | null> {
  const email = account.email.toLowerCase();
  let authId = await ensureAuthUser(email, DEMO_PASSWORD);

  if (!authId) {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      authId = existing.id;
    } else {
      // Auth yoksa sabit UUID ile yalnızca DB satırı — giriş yapılamaz.
      authId = randomUUID();
      console.warn(
        `  ⚠ ${email}: Supabase Auth oluşturulamadı (SERVICE_ROLE yok?). DB-only user.`,
      );
    }
  }

  await prisma.user.upsert({
    where: { id: authId },
    create: {
      id: authId,
      email,
      roles: account.roles,
    },
    update: {
      email,
      roles: account.roles,
    },
  });

  if (account.courier) {
    const existingProfile = await prisma.courierProfile.findUnique({
      where: { userId: authId },
    });
    const displayName = account.email.split("@")[0]?.replace("demo.", "Kurye ") ?? "Yolla Kurye";
    if (existingProfile) {
      await prisma.courierProfile.update({
        where: { userId: authId },
        data: {
          status: account.courier.status,
          vehicleType: account.courier.vehicleType,
          taxiCargoEnabled: account.courier.taxiCargoEnabled ?? false,
          carryingPassenger: account.courier.carryingPassenger ?? false,
          activeZones: ["LEFKOSA", "GIRNE"],
          displayName,
          reviewedAt:
            account.courier.status === CourierStatus.APPROVED
              ? new Date()
              : null,
        },
      });
    } else {
      await prisma.courierProfile.create({
        data: {
          userId: authId,
          status: account.courier.status,
          vehicleType: account.courier.vehicleType,
          taxiCargoEnabled: account.courier.taxiCargoEnabled ?? false,
          carryingPassenger: account.courier.carryingPassenger ?? false,
          activeZones: ["LEFKOSA", "GIRNE"],
          displayName,
          documentPaths: ["demo/id.pdf"],
          reviewedAt:
            account.courier.status === CourierStatus.APPROVED
              ? new Date()
              : null,
        },
      });
    }

    await prisma.wallet.upsert({
      where: { userId: authId },
      create: { userId: authId },
      update: {},
    });
  }

  return authId;
}

async function wipeDemoShipments(senderId: string) {
  const old = await prisma.shipment.findMany({
    where: {
      senderId,
      OR: [
        { notes: { startsWith: "[DEMO]" } },
        { recipientName: { startsWith: "Demo " } },
      ],
    },
    select: { id: true },
  });
  if (old.length === 0) return;
  const ids = old.map((s) => s.id);
  await prisma.ledgerEntry.deleteMany({ where: { shipmentId: { in: ids } } });
  await prisma.shipment.deleteMany({ where: { id: { in: ids } } });
}

async function createShipment(params: {
  senderId: string;
  courierId?: string | null;
  status: ShipmentStatus;
  zoneId: string;
  sizeClassId: string;
  pickupAddress: string;
  dropoffAddress: string;
  pickupLat: number;
  pickupLng: number;
  dropoffLat: number;
  dropoffLng: number;
  recipientName: string;
  isExpress?: boolean;
  isTaxiCargo?: boolean;
  amountMinor: number;
  withQuote?: boolean;
  withWindow?: boolean;
  withTrackingToken?: boolean;
  withLiveSession?: boolean;
  events?: ShipmentStatus[];
}): Promise<{ id: string; trackToken?: string }> {
  const shipment = await prisma.shipment.create({
    data: {
      senderId: params.senderId,
      courierId: params.courierId ?? null,
      status: params.status,
      zoneId: params.zoneId,
      sizeClassId: params.sizeClassId,
      isExpress: params.isExpress ?? false,
      isTaxiCargo: params.isTaxiCargo ?? false,
      pickupAddress: params.pickupAddress,
      dropoffAddress: params.dropoffAddress,
      pickupLat: params.pickupLat,
      pickupLng: params.pickupLng,
      dropoffLat: params.dropoffLat,
      dropoffLng: params.dropoffLng,
      recipientName: params.recipientName,
      recipientPhone: "+905338000000",
      notes: `[DEMO] ${params.status} örnek gönderi`,
    },
  });

  if (params.withQuote !== false) {
    const zoneBase = 5000;
    const expressPremium = params.isExpress ? 2500 : 0;
    await prisma.priceQuote.create({
      data: {
        shipmentId: shipment.id,
        amountMinor: params.amountMinor,
        zoneBaseMinor: zoneBase,
        sizeMultiplier: 1.5,
        expressPremiumMinor: expressPremium,
        commissionBps: 1500,
        routeDistanceMeters: 4200,
        routeDurationSeconds: 720,
        routeExpiresAt: new Date(Date.now() + 3600_000),
      },
    });
  }

  if (params.withWindow !== false) {
    const starts = new Date();
    starts.setHours(starts.getHours() + 2);
    const ends = new Date(starts.getTime() + 2 * 3600_000);
    await prisma.deliveryWindow.create({
      data: {
        shipmentId: shipment.id,
        startsAt: starts,
        endsAt: ends,
      },
    });
  }

  const eventStatuses = params.events ?? [params.status];
  let prev: ShipmentStatus | null = null;
  for (const to of eventStatuses) {
    await prisma.shipmentEvent.create({
      data: {
        shipmentId: shipment.id,
        fromStatus: prev,
        toStatus: to,
        actorUserId: params.courierId ?? params.senderId,
      },
    });
    prev = to;
  }

  let trackToken: string | undefined;
  if (params.withTrackingToken) {
    trackToken = DEMO_TRACK_TOKEN;
    await prisma.trackingToken.create({
      data: {
        shipmentId: shipment.id,
        tokenHash: hashToken(trackToken),
        expiresAt: new Date(Date.now() + 14 * 24 * 3600_000),
      },
    });
  }

  if (params.withLiveSession && params.courierId) {
    const session = await prisma.deliveryTrackingSession.create({
      data: {
        shipmentId: shipment.id,
        driverId: params.courierId,
        status: "ACTIVE",
        expiresAt: new Date(Date.now() + 24 * 3600_000),
        lastLocationAt: new Date(),
      },
    });
    void session;
    await prisma.driverCurrentLocation.create({
      data: {
        driverId: params.courierId,
        shipmentId: shipment.id,
        latitude: 35.195,
        longitude: 33.36,
        heading: 90,
        accuracyMeters: 12,
        sequenceNumber: 1,
        recordedAt: new Date(),
        receivedAt: new Date(),
      },
    });
  }

  return { id: shipment.id, trackToken };
}

async function seedDemoData() {
  console.log("\n=== DEMO veri yükleniyor ===");
  const hasServiceRole = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim());
  if (!hasServiceRole) {
    console.log(
      "SUPABASE_SERVICE_ROLE_KEY yok → Auth kullanıcıları oluşmaz; giriş için key ekleyip tekrar çalıştır.",
    );
  } else {
    console.log("Supabase Auth demo kullanıcıları oluşturuluyor/doğrulanıyor…");
  }

  const ids: Record<string, string> = {};
  for (const account of DEMO_ACCOUNTS) {
    const id = await upsertDemoUser(account);
    if (id) ids[account.email] = id;
    console.log(`  ✓ ${account.email}`);
  }

  const senderId = ids["demo.sender@yolla.test"];
  const courierId = ids["demo.courier@yolla.test"];
  const courier2Id = ids["demo.courier2@yolla.test"];
  const courier3Id = ids["demo.courier3@yolla.test"];
  const taxiId = ids["demo.taxi@yolla.test"];

  if (!senderId) {
    console.error("Demo sender oluşmadı — demo gönderiler atlandı.");
    return;
  }

  await wipeDemoShipments(senderId);

  // Eski demo presence temizliği
  const courierIds = [courierId, courier2Id, courier3Id, taxiId].filter(
    Boolean,
  ) as string[];
  if (courierIds.length) {
    await prisma.courierPresence.deleteMany({
      where: { courierUserId: { in: courierIds } },
    });
  }

  const zone = await prisma.zone.findUniqueOrThrow({ where: { code: "LEFKOSA" } });
  const sizeM = await prisma.sizeClass.findUniqueOrThrow({ where: { code: "M" } });
  const sizeS = await prisma.sizeClass.findUniqueOrThrow({ where: { code: "S" } });

  // 1) Açık iş — kurye paneli listesi
  await createShipment({
    senderId,
    status: ShipmentStatus.PAID,
    zoneId: zone.id,
    sizeClassId: sizeM.id,
    pickupAddress: "Demo Alım — Girne Caddesi 12, Lefkoşa",
    dropoffAddress: "Demo Teslim — Metropol AVM, Lefkoşa",
    pickupLat: 35.1856,
    pickupLng: 33.3823,
    dropoffLat: 35.198,
    dropoffLng: 33.355,
    recipientName: "Demo Ayşe",
    amountMinor: 7500,
    events: [
      ShipmentStatus.DRAFT,
      ShipmentStatus.QUOTED,
      ShipmentStatus.PAID,
    ],
  });

  // 2) Ekspres açık iş
  await createShipment({
    senderId,
    status: ShipmentStatus.PAID,
    zoneId: zone.id,
    sizeClassId: sizeS.id,
    isExpress: true,
    pickupAddress: "Demo Ekspres Alım — Arabahmet",
    dropoffAddress: "Demo Ekspres Teslim — Gönyeli",
    pickupLat: 35.175,
    pickupLng: 33.36,
    dropoffLat: 35.21,
    dropoffLng: 33.34,
    recipientName: "Demo Mehmet",
    amountMinor: 10000,
    events: [
      ShipmentStatus.DRAFT,
      ShipmentStatus.QUOTED,
      ShipmentStatus.PAID,
    ],
  });

  // 3) Yolda + takip linki + canlı oturum
  let trackPath: string | undefined;
  if (courierId) {
    const live = await createShipment({
      senderId,
      courierId,
      status: ShipmentStatus.IN_TRANSIT,
      zoneId: zone.id,
      sizeClassId: sizeM.id,
      pickupAddress: "Demo Canlı Alım — Dereboyu",
      dropoffAddress: "Demo Canlı Teslim — Küçük Kaymaklı",
      pickupLat: 35.19,
      pickupLng: 33.37,
      dropoffLat: 35.205,
      dropoffLng: 33.35,
      recipientName: "Demo Zeynep",
      amountMinor: 8000,
      withTrackingToken: true,
      withLiveSession: true,
      events: [
        ShipmentStatus.DRAFT,
        ShipmentStatus.QUOTED,
        ShipmentStatus.PAID,
        ShipmentStatus.MATCHED,
        ShipmentStatus.PICKED_UP,
        ShipmentStatus.IN_TRANSIT,
      ],
    });
    trackPath = `/t/${live.trackToken}`;

    await prisma.courierPresence.create({
      data: {
        courierUserId: courierId,
        latitude: 35.195,
        longitude: 33.36,
        heading: 45,
        accuracyMeters: 10,
        activity: "ON_JOB",
        sharingEnabled: true,
        vehicleType: VehicleType.MOTORCYCLE,
        sequenceNumber: 5,
        lastSeenAt: new Date(),
      },
    });
  }

  // 4) Teslim edilmiş + cüzdan ledger
  if (courierId) {
    const delivered = await createShipment({
      senderId,
      courierId,
      status: ShipmentStatus.DELIVERED,
      zoneId: zone.id,
      sizeClassId: sizeM.id,
      pickupAddress: "Demo Teslim Alım — Ortaköy",
      dropoffAddress: "Demo Teslim Bitiş — Hamitköy",
      pickupLat: 35.2,
      pickupLng: 33.39,
      dropoffLat: 35.22,
      dropoffLng: 33.37,
      recipientName: "Demo Can",
      amountMinor: 9000,
      events: [
        ShipmentStatus.DRAFT,
        ShipmentStatus.QUOTED,
        ShipmentStatus.PAID,
        ShipmentStatus.MATCHED,
        ShipmentStatus.PICKED_UP,
        ShipmentStatus.IN_TRANSIT,
        ShipmentStatus.DELIVERED,
      ],
    });

    const wallet = await prisma.wallet.findUniqueOrThrow({
      where: { userId: courierId },
    });
    const earning = 7650; // %15 komisyon sonrası
    const commission = -1350;
    await prisma.ledgerEntry.deleteMany({
      where: {
        idempotencyKey: {
          in: [
            `demo:earning:${delivered.id}`,
            `demo:commission:${delivered.id}`,
          ],
        },
      },
    });
    const ledgerRows: Prisma.LedgerEntryCreateManyInput[] = [
      {
        walletId: wallet.id,
        type: LedgerEntryType.DELIVERY_EARNING,
        status: LedgerEntryStatus.AVAILABLE,
        amountMinor: earning,
        shipmentId: delivered.id,
        idempotencyKey: `demo:earning:${delivered.id}`,
        description: "Demo teslimat kazancı",
        availableAt: new Date(),
      },
      {
        walletId: wallet.id,
        type: LedgerEntryType.PLATFORM_COMMISSION,
        status: LedgerEntryStatus.AVAILABLE,
        amountMinor: commission,
        shipmentId: delivered.id,
        idempotencyKey: `demo:commission:${delivered.id}`,
        description: "Demo platform komisyonu",
        availableAt: new Date(),
      },
    ];
    await prisma.ledgerEntry.createMany({ data: ledgerRows });
  }

  // 5) MATCHED — aktif işlerim
  if (courier3Id) {
    await createShipment({
      senderId,
      courierId: courier3Id,
      status: ShipmentStatus.MATCHED,
      zoneId: zone.id,
      sizeClassId: sizeS.id,
      pickupAddress: "Demo Eşleşmiş Alım — Gönyeli",
      dropoffAddress: "Demo Eşleşmiş Teslim — Alayköy",
      pickupLat: 35.215,
      pickupLng: 33.33,
      dropoffLat: 35.225,
      dropoffLng: 33.32,
      recipientName: "Demo Elif",
      amountMinor: 6000,
      events: [
        ShipmentStatus.DRAFT,
        ShipmentStatus.QUOTED,
        ShipmentStatus.PAID,
        ShipmentStatus.MATCHED,
      ],
    });

    await prisma.courierPresence.create({
      data: {
        courierUserId: courier3Id,
        latitude: 35.214,
        longitude: 33.335,
        heading: 180,
        activity: "ON_JOB",
        sharingEnabled: true,
        vehicleType: VehicleType.CAR,
        sequenceNumber: 2,
        lastSeenAt: new Date(),
      },
    });
  }

  // Müsait kurye (bisiklet) — harita yeşil pin
  if (courier2Id) {
    await prisma.courierPresence.create({
      data: {
        courierUserId: courier2Id,
        latitude: 35.178,
        longitude: 33.365,
        heading: 270,
        activity: "AVAILABLE",
        sharingEnabled: true,
        vehicleType: VehicleType.BIKE,
        sequenceNumber: 1,
        lastSeenAt: new Date(),
      },
    });
  }

  // Meşgul taksi — gri pin
  if (taxiId) {
    await prisma.courierPresence.create({
      data: {
        courierUserId: taxiId,
        latitude: 35.188,
        longitude: 33.39,
        activity: "BUSY",
        sharingEnabled: true,
        vehicleType: VehicleType.TAXI,
        sequenceNumber: 1,
        lastSeenAt: new Date(),
      },
    });
  }

  console.log("\n--- Demo giriş bilgileri ---");
  console.log(`Şifre (hepsi): ${DEMO_PASSWORD}`);
  for (const a of DEMO_ACCOUNTS) {
    console.log(`  ${a.email.padEnd(28)} roles=${a.roles.join(",")}`);
  }
  console.log("\n--- Denenecek ekranlar ---");
  console.log("  Gönderici:  demo.sender@yolla.test → /sender (müsait kurye şeridi)");
  console.log("  Kurye:      demo.courier@yolla.test → /courier/jobs (gönderim talepleri)");
  console.log("  Çift rol:   demo.dual@yolla.test → profilde Mod değiştir");
  console.log("  Admin:      demo.admin@yolla.test → /admin /admin/map");
  if (trackPath) {
    console.log(`  Takip linki: ${trackPath}`);
  }
  console.log(
    "  Harita pinleri: Müsait (bike), Teslimatta (motor/araba), Meşgul (taksi) — /sender/map veya /admin/map",
  );
  console.log(
    "  Demo presence: paylaşım açık. Dev’de /couriers/nearby poll’u lastSeenAt’i taze tutar.",
  );
  console.log(
    "  Presence bayatsa: pnpm exec tsx scripts/enable-demo-presence.mts (packages/db)",
  );
  console.log("=== DEMO tamam ===\n");
}

async function main() {
  loadEnvFiles();
  await seedCatalog();
  await seedFlags();
  await promoteBootstrapAdmin();
  console.log("Seeded platform config, zones, size classes, feature flags.");

  if (SEED_DEMO) {
    await seedDemoData();
  } else {
    console.log("Demo veri için: SEED_DEMO=1 pnpm db:seed   veya   pnpm db:seed:demo");
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
