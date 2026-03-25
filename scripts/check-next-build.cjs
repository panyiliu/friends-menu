/**
 * npm prestart：避免在未 build 时运行 next start 只看到晦涩报错。
 */
const fs = require("fs");
const path = require("path");

const buildIdPath = path.join(process.cwd(), ".next", "BUILD_ID");
if (!fs.existsSync(buildIdPath)) {
  console.error("");
  console.error("  当前没有可用的生产构建（缺少 .next/BUILD_ID）。");
  console.error("");
  console.error("  日常本地开发请用：  npm run dev");
  console.error("  若要跑生产模式：  npm run build   然后   npm run start");
  console.error("  或一条命令：       npm run start:prod");
  console.error("");
  process.exit(1);
}
