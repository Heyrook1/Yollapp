/**
 * Demo kuryeleri haritada görünür yap: sharing açık + lastSeenAt taze.
 * Yalnızca *@yolla.test hesapları.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const now = new Date();
  const result = await prisma.courierPresence.updateMany({
    where: { courier: { email: { endsWith: "@yolla.test" } } },
    data: { sharingEnabled: true, lastSeenAt: now },
  });
  const rows = await prisma.courierPresence.findMany({
    where: { courier: { email: { endsWith: "@yolla.test" } } },
    include: { courier: { select: { email: true } } },
  });
  console.log(`updated ${result.count}`);
  for (const row of rows) {
    console.log(
      `  ${row.courier.email}  ${row.activity}  sharing=${row.sharingEnabled}`,
    );
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
