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
