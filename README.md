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

1) 安装依赖

```bash
npm install
```

2) 初始化数据库

```bash
npx prisma migrate dev --name init
npm run prisma:seed
```

3) 启动开发环境

```bash
npm run dev
```

打开 `http://localhost:5223`

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
- 示例：`npm run stress:test -- abcdef123456 30 http://localhost:5223`
- 用途：快速模拟多人并发下单，验证成功率与后台刷新表现。

## Docker 部署

### 本地打包运行

```bash
docker compose up -d --build
```

访问：`http://<服务器IP>:5223`

### 说明

- 生产模式下，数据库与上传目录通过宿主机挂载持久化：
  - `./prisma:/app/prisma`
  - `./public/uploads:/app/public/uploads`
- 这两个目录属于运行数据，不建议再通过 Git 传输与合并。
- 容器内数据库连接使用绝对路径：`file:/app/prisma/dev.db`，可避免某些环境下相对路径导致的“Unable to open the database file”。
- 后台登录 cookie 的 `Secure` 开关由 `ADMIN_SESSION_SECURE` 控制；HTTP 内网访问请设为 `false`，HTTPS 域名访问可设为 `true`。
- 公网部署建议使用独立反向代理（Nginx/Caddy）终止 HTTPS，并将 `ADMIN_SESSION_SECURE=true`。
- 健康检查接口：`/api/health`（建议配置到反代或容器探活）。

### 生产环境必设变量（公网）

```bash
ADMIN_SESSION_SECRET=请替换为至少24位随机串
ADMIN_SESSION_SECURE=true
DATABASE_URL=file:/app/prisma/dev.db
REQUIRE_NON_DEFAULT_ADMIN_PASSWORD=false
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
