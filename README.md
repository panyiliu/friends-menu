# 朋友聚餐点餐系统（Web + SQLite）

本项目已从原 `food_ordering` 移植为 Web 形态，支持：

- 访客端（手机浏览器）：菜单浏览、购物车、提交订单、查看本人订单
- 管理员后台：登录、分类/菜品管理、实时订单、历史订单、点餐链接管理、密码修改
- 本地化存储：`SQLite` 数据库 + 本地图片目录 `public/uploads`

新增增强能力：

- 菜品管理：编辑、上下架、售罄切换、删除、图片替换/删除
- 分类管理：编辑名称、排序、启用/禁用
- 订单管理：按姓名/时间/状态筛选，状态流转（待备餐/备餐中/已完成）
- 链接管理：设置有效期、重置链接
- 访客端：分类吸顶导航、图片大图预览、购物车抽屉、清空单项/全部
- 第三阶段：邮件提醒、刷新频率配置、新订单高亮、一键恢复脚本、压测脚本

## 技术栈

- Next.js App Router
- Prisma + SQLite
- Tailwind CSS

## 本地启动

**重要：日常开发请始终用 `npm run dev`。不要直接 `npm run start`——`start` 是生产服务器，必须先 `npm run build`，否则会报错 `production-start-no-build-id`。**

1) 安装依赖

```bash
npm install
```

2) 初始化数据库

```bash
npx prisma migrate dev --name init
npm run prisma:seed
```

3) 启动开发环境（推荐）

```bash
npm run dev
```

默认监听 **`http://localhost:3000`**。若需与 Docker 宿主机端口一致（5223），可执行：

```bash
npm run dev:5223
```

（等价于 `npx next dev -p 5223`。）

4) 生产模式本地验证（可选）

先构建再启动（两条命令）：

```bash
npm run build
npm run start
```

或一条命令：

```bash
npm run start:prod
```

设计与部署说明见 [`docs/product-auth.md`](docs/product-auth.md)、[`docs/tech-auth.md`](docs/tech-auth.md)。

## 默认账号

- 后台地址：`/admin/login`
- 默认账号：`admin`
- 默认密码：`admin123456`

## 点餐链接

- 登录后台后进入 `settings` 标签
- 可复制当前点餐链接给朋友
- 可重置链接（旧链接失效）
- 可设置有效期（过期后访客端会提示链接已过期）

## 邮件提醒配置（后台 settings）

- sender: 发件邮箱（示例：`315201212@qq.com`）
- password: 邮箱授权码（不是登录密码）
- receiver: 收件邮箱
- smtp server: 默认 `smtp.qq.com`
- smtp port: 默认 `587`
- 可在 settings 中开关“启用邮件提醒”
- 可点击“发送测试邮件”按钮验证 SMTP 配置是否有效

说明：邮件发送失败不会阻断下单主流程。
常见失败原因：
- 授权码错误：请确认使用邮箱授权码，而不是邮箱登录密码
- SMTP 不通：检查 server/port（QQ邮箱默认 `smtp.qq.com:587`）
- 收件地址错误：确认 receiver 邮箱格式正确

## 目录说明

- `src/app/menu/[token]`：访客端点餐页
- `src/app/menu/[token]/my`：访客个人历史订单
- `src/app/admin`：后台页
- `src/app/api`：后端 API
- `prisma/schema.prisma`：数据模型
- `public/uploads`：本地图片

## 备份与恢复

- 数据库文件：`prisma/dev.db`
- 图片目录：`public/uploads`
- 备份时同时保存以上两者即可。
- 一键恢复命令：`npm run restore -- <备份目录>`
- 备份目录需包含：`dev.db` 和 `uploads/`
- 恢复前会自动保存当前快照到 `backup-before-restore/时间戳`

## 压测脚本（10-30人）

- 命令：`npm run stress:test -- <token> [count] [baseUrl]`
- 示例：`npm run stress:test -- abcdef123456 30 http://localhost:3000`（端口按你本地实际为准）
- 用途：快速模拟多人并发下单，验证成功率与后台刷新表现。

## Docker 部署

### 数据与配置分别放在哪（改 .env / git pull 会不会坏数据）

| 位置 | 内容 | `git pull` 后 |
|------|------|----------------|
| 宿主机目录 **`./prisma/`**（挂载到容器） | SQLite `dev.db`、迁移文件 | **不会**被 `git pull` 覆盖；只要不删该目录，重建容器数据仍在。 |
| 宿主机目录 **`./public/uploads/`** | 菜品等上传图片 | 同上。 |
| 仓库里的 **`docker-compose.yml`** | 服务定义；端口等用 **`HOST_PORT`** 等变量引用 | 建议**不要**在服务器上手工改 compose，避免与远程冲突；改端口只改 **`.env`**。 |
| **`/.env`**（自己创建，Git 不跟踪） | `HOST_PORT`、`ADMIN_SESSION_SECRET`、`ADMIN_SESSION_SECURE` 等 | 拉代码**不会**覆盖你的 `.env`。 |

**改环境变量会怎样（数据是否损坏）**

- 只改 **`HOST_PORT`**：仅访问端口变化，**数据库与图片不变**。
- 改 **`ADMIN_SESSION_SECRET`**：旧 Cookie 全部失效，需**重新登录**，**不损坏**库里的数据。
- 改 **`ADMIN_SESSION_SECURE`**：若与当前访问协议（HTTP/HTTPS）不一致，可能表现为登不进，**不损坏**数据。

**与 Git 协作**

- 推荐：服务器上 **`cp .env.example .env`**，只编辑 `.env`；**不要**把密钥提交进仓库。
- 若 `git pull` 提示会覆盖你改过的 `docker-compose.yml`，可用 `git stash` 暂存后拉取再合并，或放弃本地对 compose 的修改、改用 `.env` 满足需求。
- **切勿**对宿主机上的 `prisma/dev.db` 或 `public/uploads/` 执行 `git restore` / 强制覆盖，以免清空运行数据。

变量说明见仓库根目录 **[`.env.example`](.env.example)**。

### 全新服务器（已安装 Git、Docker、Docker Compose）

在服务器上选目录（示例 `/opt/friends-menu`），克隆并配置：

```bash
cd /opt
git clone https://github.com/<你的用户名>/<仓库名>.git friends-menu
cd friends-menu
cp .env.example .env
```

编辑 **`.env`**：至少设置 **`ADMIN_SESSION_SECRET`**（≥24 位随机串）；若用浏览器 **HTTP** 访问 `http://IP:端口`，将 **`ADMIN_SESSION_SECURE=false`**；需要改对外端口时改 **`HOST_PORT`**（默认 5223）。

```bash
docker compose up -d --build
```

首次启动会在容器入口自动执行：
- `prisma migrate deploy`（保证表结构就绪）
- 当数据库为空时自动执行一次 seed（创建默认管理员等初始数据）

普通用户默认不需要手动再执行 migrate/seed。若想禁用自动 seed，可在 `.env` 里设置 `AUTO_SEED_IF_EMPTY=false`。

浏览器访问 **`http://<服务器IP>:<HOST_PORT>`**（默认 5223），后台 **`/admin/login`**，默认账号见上文「默认账号」。

升级新版本：在同一目录 **`git pull`** 后执行 **`docker compose up -d --build`**。数据仍在挂载目录中。

### 本地打包运行

```bash
docker compose up -d --build
```

访问：`http://<服务器IP>:<HOST_PORT>`（默认 5223，见 `.env` / `.env.example`）

### 说明

- 生产模式下，数据库与上传目录通过宿主机挂载持久化：
  - `./prisma:/app/prisma`
  - `./public/uploads:/app/public/uploads`
- 这两个目录属于运行数据，不建议再通过 Git 传输与合并。
- 容器内数据库连接使用绝对路径：`file:/app/prisma/dev.db`，可避免某些环境下相对路径导致的“Unable to open the database file”。
- 后台登录 cookie 的 `Secure` 开关由 `ADMIN_SESSION_SECURE` 控制；HTTP 内网访问请设为 `false`，HTTPS 域名访问可设为 `true`。
- 默认 compose 为新手场景内置 `ADMIN_SESSION_SECURE=false`（便于 HTTP 直连）。若上生产 HTTPS，请改成 `true`。
- 启动入口会自动执行 `migrate deploy`；空库时自动 seed，一般无需再手工执行初始化命令。
- 公网部署建议使用独立反向代理（Nginx/Caddy）终止 HTTPS，并将 `ADMIN_SESSION_SECURE=true`。
- 健康检查接口：`/api/health`（建议配置到反代或容器探活）。
- **ZIP 备份/恢复** 经 Nginx 时，请增大请求体上限，例如：`client_max_body_size 64m;`（或更大），否则大 ZIP 上传会失败；Next 侧已配置 `experimental.proxyClientMaxBodySize` 为 50mb。
- 若容器内恢复 ZIP 时需从**公网 URL** 拉取原图，可配置 `PUBLIC_SITE_URL`（对外站点根 URL）与 `INTERNAL_BASE_URL`（容器内可访问的站点根 URL，如 `http://127.0.0.1:3000`），详见 [`docs/tech-auth.md`](docs/tech-auth.md)。

### 生产环境必设变量（公网）

```bash
ADMIN_SESSION_SECRET=请替换为至少24位随机串
ADMIN_SESSION_SECURE=true
DATABASE_URL=file:/app/prisma/dev.db
REQUIRE_NON_DEFAULT_ADMIN_PASSWORD=false
AUTO_SEED_IF_EMPTY=true
# 可选：ZIP 恢复时容器内拉取图片
# PUBLIC_SITE_URL=https://你的域名
# INTERNAL_BASE_URL=http://127.0.0.1:3000
```

说明：
- 生产模式下若 `ADMIN_SESSION_SECRET` 过短/默认值，服务会拒绝启动。
- 生产模式下要求 `ADMIN_SESSION_SECURE=true`，避免后台 Cookie 在 HTTP 明文传输。

### 常用命令

```bash
# 查看日志
docker compose logs -f

# 停止
docker compose down

# 仅重启服务
docker compose restart
```

## 生产可用模式（推荐）

### 原则

- Git 仅存放代码与配置
- 运行数据（`prisma/dev.db`、`public/uploads`）不进 Git
- 通过备份脚本保障可恢复

### 升级与发布

```bash
bash scripts/deploy-update.sh /home/ethan/docker/friends-menu main
```

发布脚本会输出回滚指令（含前一版本 SHA），如：

```bash
bash scripts/rollback-release.sh /home/ethan/docker/friends-menu <prev_sha>
```

### 数据备份

```bash
bash scripts/backup-data.sh /home/ethan/docker/friends-menu /home/ethan/docker/friends-menu/backups
```

### 数据恢复

```bash
bash scripts/restore-data.sh /home/ethan/docker/friends-menu /home/ethan/docker/friends-menu/backups/20260324-120000
docker compose up -d
```

后台“设置 -> 系统设置”中也提供 ZIP 备份/恢复：
- 一键备份 ZIP
- 预检恢复 ZIP（dry-run，不落库）
- 一键恢复 ZIP（实际写入）

## 服务器迁移与冲突恢复指南

如果服务器历史上把 `prisma/dev.db` 也纳入了 Git，遇到 `needs merge` 时，先执行：

```bash
git merge --abort 2>/dev/null || true
git reset --hard HEAD
git pull
```

若仍提示 `prisma/dev.db: needs merge`，可先用本地版本解冲突：

```bash
git checkout --ours prisma/dev.db
git add prisma/dev.db
git commit -m "resolve sqlite merge conflict"
git pull
```

之后改为本 README 的生产模式，避免再次发生二进制冲突。

## 安全基线（公网）

- 可选禁用默认后台密码：设置 `REQUIRE_NON_DEFAULT_ADMIN_PASSWORD=true` 后，生产环境会阻止 `admin/admin123456` 登录。
- 登录防爆破：登录接口启用 IP + 账号维度限流。
- 管理端 API 限流：`/api/admin/*` 在网关层和应用层均建议开启限流。
- 日志落盘：应用运行日志写入 `logs/app.log`（JSON 行格式）。
