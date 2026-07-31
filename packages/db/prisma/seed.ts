import { PrismaClient, AppRole } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
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

  const adminEmail = process.env.ADMIN_BOOTSTRAP_EMAIL?.trim().toLowerCase();
  if (adminEmail) {
    const user = await prisma.user.findUnique({ where: { email: adminEmail } });
    if (user) {
      const roles = new Set(user.roles);
      roles.add(AppRole.ADMIN);
      await prisma.user.update({
        where: { id: user.id },
        data: { roles: Array.from(roles) },
      });
      console.log(`Promoted ${adminEmail} to ADMIN`);
    } else {
      console.log(
        `ADMIN_BOOTSTRAP_EMAIL=${adminEmail} not found yet. Sign up that email, then re-run seed.`,
      );
    }
  } else {
    console.log("Set ADMIN_BOOTSTRAP_EMAIL to promote first admin after signup.");
  }

  console.log("Seeded platform config, zones, and size classes.");
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
