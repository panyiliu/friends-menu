---
name: Refactor-hard-gate
overview: 将重构执行清单落到仓库 `docs/refactor-execution-checklist.md`，并按阶段1→阶段2推进：先做 schema 硬门控（启动失败即退出、加版本接口、恢复自检与 smoke test），通过后再做 DB 重建与迁移对齐，最后闭环验收。
todos:
  - id: docs-checklist
    content: 把当前“重构执行清单”写入 `docs/refactor-execution-checklist.md`，仅写文档内容不动代码
    status: pending
  - id: stage1-verify-schema
    content: 新增 `scripts/verify-schema.js`，校验 SystemSetting/InviteLink/Order 必备字段；缺失时打印缺列清单+当前列全量+建议命令，并 exit 1
    status: pending
  - id: stage1-entrypoint
    content: 修改 `scripts/docker-entrypoint.sh`：migrate deploy -> verify-schema ->（默认跳过 schema-self-heal）-> seed-if-empty -> start
    status: pending
  - id: stage1-version-api-ui
    content: 新增 `GET /api/version` 并在后台 `src/app/admin/page.tsx` 显示后端版本
    status: pending
  - id: stage1-smoke-test
    content: 新增 stage1 smoke test 脚本，验证 /api/health、/api/admin/invite、/api/admin/settings 均 200
    status: pending
  - id: stage2-db-rebuild
    content: 执行 DB 对齐：备份 dev.db -> rm prisma/migrations -> prisma migrate dev init ->（可选）导入备份数据 -> prisma generate
    status: pending
  - id: stage2-verify
    content: 用 stage1 smoke test + 轻量写操作验证新 DB 下 invite/settings 正常，形成闭环
    status: pending
isProject: false
---

# Refactor Hard-Gate → DB Align

## Inputs / Constraints
- Docs 文件路径：`docs/refactor-execution-checklist.md`
- 执行顺序：阶段1 → 阶段2
- 阶段内验收不通过则停止并要求你介入；通过则继续下一阶段。
- 你选择的硬门控策略：**schema 校验失败容器直接退出（exit 1）**。

## Stage 0 (No-op)
- 仅把现有“重构执行清单”写入 `docs/refactor-execution-checklist.md`。
- 验收：该 MD 存在且内容与约定一致。

## Stage 1：系统硬门控（止血）
目标：启动时强制保证 schema/关键字段可用，避免运行时再出现 `invite/settings` 的 500。

### 1.1 新建 `scripts/verify-schema.js`
- 基于当前 Prisma 模型名与字段名进行校验（必须用 SQLite introspection：`sqlite_master` / `PRAGMA table_info`）。
- 必备校验字段：
  - `SystemSetting`：`debugUiEnabled`、`guestTitle`、`guestSubtitle`、`guestBannerUrl`、`welcomeAlwaysShow`
  - `InviteLink`：`label`、`inviteGuestName`、`showPrice`、`welcomeEnabled`、`welcomeTitle`、`welcomeSubtitle`、`welcomeButtonText`、`welcomeFontSize`、`welcomeFontWeight`、`welcomeTextAlign`、`welcomeButtonColor`、`welcomeBackdropOpacity`
  - （可选）`Order`：`inviteId`、`eta`
- 验收标准（必须）：
  - 缺列/缺表时打印缺失清单 + 当前列全量 + suggested commands，然后 `process.exit(1)`。

### 1.2 修改 Docker entrypoint（硬门控顺序）
- 入口脚本：`scripts/docker-entrypoint.sh`
- 改为：
  1) `npx prisma migrate deploy` 失败即退出
  2) `node scripts/verify-schema.js` 失败即退出
  3) `seed-if-empty`（可选）
  4) start
- 同时：默认禁用 `scripts/schema-self-heal.cjs`（灾难恢复模式才允许）。
- 验收：
  - schema 错误时容器无法进入 Ready 状态。

### 1.3 增加版本接口与前端显示
- 后端新增：`GET /api/version`
- 返回：`gitSha` + `buildTime`
- 后台界面显示：
  - 放在 `src/app/admin/page.tsx` 头部或 settings 区显眼位置
- 验收：在页面可见版本字符串。

### 1.4 自动验收 smoke test（阶段1结束闭环）
- 编写一个脚本（例如 `scripts/smoke-test-stage1.sh` 或 cjs）在容器启动后依次验证：
  - `GET /api/health` 返回 200
  - `GET /api/admin/invite` 返回 200
  - `GET /api/admin/settings` 返回 200
- 验收标准：全都 200/非 500。

## Stage 2：数据库彻底对齐（去补丁）
目标：消灭“migrate up-to-date 但运行时不一致”的根因，使 DB 与 migrations 永远一致。

### 2.1 备份当前 DB（灾难恢复演练）
- 备份 `prisma/dev.db` 到带时间戳文件。

### 2.2 重建迁移历史（你已接受 destroy/migration reset）
- `rm -rf prisma/migrations`
- `npx prisma migrate dev --name init`

### 2.3（可选）恢复数据
- 若你希望保留测试数据：将备份导入到新库。

### 2.4 生成 Prisma client 并验证
- `npx prisma generate`
- `npx prisma migrate status` 必须 no pending

### 2.5 阶段2验收闭环
- 跑与阶段1相同的 smoke test + 额外写链路（轻量）：
  - POST create invite 或 PUT test settings（以不破坏数据为原则）

## Completion Definition
- 阶段1通过：继续进入阶段2。
- 阶段2通过：完成最终 smoke + 结束。

## Rollback Plan
- 代码：可用 `git tag` 回退
- DB：保留阶段2前备份 dev.db，必要时恢复并重跑 migrate deploy。

