const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

function normalizeUrl(url) {
  const value = String(url || "");
  return value.includes("/api/uploads/") ? value.replaceAll("/api/uploads/", "/uploads/") : value;
}

async function main() {
  const images = await prisma.dishImage.findMany({
    select: { id: true, url: true },
  });
  let imageUpdated = 0;
  for (const item of images) {
    const nextUrl = normalizeUrl(item.url);
    if (nextUrl === item.url) continue;
    await prisma.dishImage.update({
      where: { id: item.id },
      data: { url: nextUrl },
    });
    imageUpdated += 1;
  }

  const settings = await prisma.systemSetting.findMany({
    select: { id: true, guestBannerUrl: true },
  });
  let bannerUpdated = 0;
  for (const item of settings) {
    const nextUrl = normalizeUrl(item.guestBannerUrl);
    if (nextUrl === item.guestBannerUrl) continue;
    await prisma.systemSetting.update({
      where: { id: item.id },
      data: { guestBannerUrl: nextUrl },
    });
    bannerUpdated += 1;
  }

  console.log(JSON.stringify({ ok: true, imageUpdated, bannerUpdated }, null, 2));
}

main()
  .catch((error) => {
    console.error(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : String(error) }));
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
