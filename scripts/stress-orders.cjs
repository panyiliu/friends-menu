const fs = require("fs");
const path = require("path");

async function main() {
  const token = process.argv[2];
  const count = Number(process.argv[3] || 20);
  const base = process.argv[4] || "http://localhost:3000";
  if (!token) {
    console.log("Usage: npm run stress:test -- <token> [count] [baseUrl]");
    process.exit(1);
  }

  const dbPath = path.join(process.cwd(), "prisma", "dev.db");
  if (!fs.existsSync(dbPath)) {
    console.log("Database not found.");
    process.exit(1);
  }

  const menuRes = await fetch(`${base}/api/guest/menu/${token}`);
  const menu = await menuRes.json();
  const dish = menu?.categories?.flatMap((c) => c.dishes || [])[0];
  if (!dish) {
    console.log("No dish available for stress test.");
    process.exit(1);
  }

  const jobs = Array.from({ length: count }).map((_, i) =>
    fetch(`${base}/api/guest/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token,
        guestName: `stress-user-${i + 1}`,
        note: "stress test",
        items: [{ dishId: dish.id, quantity: 1 }],
      }),
    }).then((r) => r.json()),
  );

  const all = await Promise.allSettled(jobs);
  const ok = all.filter((x) => x.status === "fulfilled" && x.value?.ok).length;
  console.log(`stress done: ${ok}/${count} success`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
