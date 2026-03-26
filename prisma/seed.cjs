const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  const { customAlphabet } = await import("nanoid");
  const nanoid = customAlphabet("1234567890abcdefghijklmnopqrstuvwxyz", 12);

  const passwordHash = await bcrypt.hash("admin123456", 10);
  await prisma.adminUser.upsert({
    where: { username: "admin" },
    update: { passwordHash },
    create: { username: "admin", passwordHash },
  });

  const categories = [
    { name: "凉菜", sortOrder: 1 },
    { name: "热菜", sortOrder: 2 },
    { name: "汤品", sortOrder: 3 },
  ];

  for (const c of categories) {
    await prisma.category.upsert({
      where: { id: `seed-${c.name}` },
      update: { ...c },
      create: { id: `seed-${c.name}`, ...c },
    });
  }

  const firstLink = await prisma.inviteLink.findFirst({ where: { isActive: true } });
  if (!firstLink) {
    const invite = await prisma.inviteLink.create({
      data: { token: nanoid(), isActive: true },
    });
    await prisma.systemSetting.create({ data: { activeInviteId: invite.id } });
  } else {
    const setting = await prisma.systemSetting.findFirst();
    if (!setting) {
      await prisma.systemSetting.create({ data: { activeInviteId: firstLink.id } });
    }
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
