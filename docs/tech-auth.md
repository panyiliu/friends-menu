# 技术设计：会话 Cookie、中间件与部署

## 会话 Cookie 契约

| 项 | 说明 |
|----|------|
| 名称 | `admin_session` |
| 值格式 | `{payload}.{signatureHex}`，其中 `payload` 为 `{username}|{timestampMs}`，`signatureHex` 为 HMAC-SHA256(secret, payload) 的十六进制字符串。 |
| 签名算法 | HMAC-SHA256，密钥为 `ADMIN_SESSION_SECRET`。 |
| 属性 | `HttpOnly`、`SameSite=Lax`、`Path=/`、`Max-Age` 约 7 天；`Secure` 固定为 `false`。 |

## 校验位置

- **API Route**：`ensureAdmin(req)`（[`src/lib/api-auth.ts`](../src/lib/api-auth.ts)）使用 Node `crypto` 做常量时间比较。
- **Edge Middleware**：使用与上述等价的 **Web Crypto HMAC-SHA256**（[`src/lib/admin-session-edge.ts`](../src/lib/admin-session-edge.ts)），避免在 Edge 中无法使用 `node:crypto`。
- **策略**：中间件对 `/admin`（除登录页）与 `/api/admin/*`（除登录接口）要求 **签名有效** 的 Cookie；仅「有 Cookie 字符串」不足以通过。

## 环境变量

| 变量 | 说明 |
|------|------|
| `ADMIN_SESSION_SECRET` | 生产环境必填，长度 ≥ 24，且不能为默认占位值。 |
| `DATABASE_URL` | SQLite 连接串等。 |
| `INTERNAL_BASE_URL` | （可选）容器内访问自身站点时的基址，例如 `http://127.0.0.1:3000`，与 `PUBLIC_SITE_URL` 配合在恢复 ZIP 时回退拉取图片。 |
| `PUBLIC_SITE_URL` | （可选）对外访问的根 URL（无尾斜杠），例如 `https://menu.example.com`；与 `INTERNAL_BASE_URL` 成对配置时，恢复会将公网图片 URL 改写为内网再 `fetch`。 |
| `REQUIRE_NON_DEFAULT_ADMIN_PASSWORD` | 生产是否禁止默认 `admin` 密码。 |

## 反向代理

- 终止 TLS 时，应设置 `X-Forwarded-Proto: https`，以便应用与浏览器对「安全上下文」一致。
- 若部署在子路径或特殊域名，需保证 `Host`/`Origin` 与 Cookie 域一致。

## 网关（Proxy）

- Next.js 16 使用 [`src/proxy.ts`](../src/proxy.ts)（见官方 `middleware-to-proxy` 迁移说明），导出 `proxy` 与 `config.matcher`。
- **非生产环境**（`NODE_ENV !== "production"`）：若 Edge 与 Node 对 `ADMIN_SESSION_SECRET` 读取不一致，Proxy 在 Cookie 形态合法时会放行，由 API 的 `ensureAdmin` 做最终校验；**生产环境**仍为严格 HMAC 验签。

## 可观测性

- 业务日志写入 `logs/app.log`（JSON 行），并在内存中保留最近若干条供 `/api/admin/debug-logs` 拉取（仅管理员）。
