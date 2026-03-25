# 产品设计：后台登录、会话与备份访问

## 角色

- **管理员**：通过 `/admin/login` 登录后，管理菜单、订单、链接与系统设置。

## 登录与登出

1. 用户输入账号、密码，提交后前端调用 `POST /api/admin/login`。
2. 校验通过后服务端下发 **仅 HTTP(S) 可携带、HttpOnly** 的会话 Cookie，浏览器再进入 `/admin`。
3. 后台各页与 `GET /api/admin/session` 校验会话；未通过则跳转回登录页。
4. 登出（若使用登出接口）清除会话 Cookie。

## 会话有效期

- 会话 Cookie 带有 **maxAge**（当前实现约 7 天），过期后需重新登录。

## 部署访问方式（重要）

| 场景 | 建议 |
|------|------|
| **公网 HTTPS**（域名 + 证书） | 设置 `ADMIN_SESSION_SECURE=true`，用户始终通过 `https://` 访问。 |
| **内网 HTTP 调试**（如 `http://IP:5223`） | 必须设置 `ADMIN_SESSION_SECURE=false`，否则浏览器可能拒绝保存或发送 Secure Cookie，表现为「登录后仍回到登录页」。 |
| **HTTPS 终止在 Nginx/Caddy** | 反向代理需转发 `X-Forwarded-Proto: https`（及 `Host`），并保证 Next 能识别真实协议（见技术设计文档）。 |

## 备份与恢复（ZIP）

1. 管理员在 **设置** 中导出 ZIP（含 `manifest.json` 与各菜品目录 `dish.json` + 图片）。
2. 恢复时上传 ZIP，可先 **dry-run** 再正式应用。
3. **大文件** 或 **经 Nginx** 时，若上传失败，需检查 Nginx `client_max_body_size` 与 Next 请求体限制（见 `README.md`）。

## 调试日志面板（可选）

- 在 **设置 → 系统** 中可开启「调试日志面板」开关（保存在浏览器本地）。
- 开启后可在登录页与后台查看 **客户端请求摘要**；登录后台后还可拉取 **服务端近期结构化日志**（需管理员会话）。
