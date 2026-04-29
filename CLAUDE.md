# AI 开发平台 — 项目规范

## 前端 API 调用规范

### 强制：所有 API 调用必须通过 `api.ts`

文件：`frontend/src/utils/api.ts` 是唯一的 API 请求入口。

```typescript
import { api } from '@/utils/api';

// ✅ 正确
const { data } = await api.projects.list({ page: 1, limit: 9 });
await api.auth.login({ email, password });

// ❌ 禁止：禁止在组件内直接 fetch
fetch(`${API_BASE_URL}/api/...`)
```

### API_BASE_URL 配置规则

- `NEXT_PUBLIC_API_URL` 环境变量（部署时由 Vercel/服务器设置）
- 本地 fallback：**`/api`**（相对路径，走 Nginx 代理）
- `API_BASE_URL` 值**不带尾部 `/api`**，endpoint 参数以 `/` 开头

```typescript
// ✅ 正确：BASE_URL = '/api'，endpoint = '/projects'
fetch(`${API_BASE_URL}${endpoint}`) → '/api/projects'

// ❌ 错误：重复 /api
fetch(`${API_BASE_URL}/api/projects`) → '/api//api/projects'
```

### 检查清单

修改 API 相关代码后，执行：
```bash
grep -rn "fetch.*api/\|/api/auth\|/api/projects" frontend/src/ --include="*.ts" --include="*.tsx"
```
确保没有遗漏的硬编码 `/api` 路径。

## 环境变量

| 变量 | 值 | 说明 |
|------|-----|------|
| `NEXT_PUBLIC_API_URL` | `/api`（生产） | Vercel 部署时由 Vercel 设置 |
| `NEXT_PUBLIC_API_URL` | `/api`（本地开发） | Nginx 反向代理 |
| 后端地址 | `http://47.100.186.167:3000` | 仅 .env.local 使用 |

## 技术栈

- **前端**：Next.js + TypeScript + React
- **后端**：Node.js + Express + TypeScript
- **数据库**：PostgreSQL
- **部署**：Docker（Nginx 代理到前端 3001 和后端 3000）

## 常见错误

### API 地址变成 localhost:3000

原因：`NEXT_PUBLIC_API_URL` 未设置，且 fallback 配置不一致。

检查：
1. `frontend/src/utils/api.ts` 第 1 行
2. `frontend/src/app/page.tsx` 第 17 行
3. 确保 fallback 都是 `/api` 或都是 `http://47.100.186.167:3000`

### /api//api/projects（双斜杠）

原因：BASE_URL 和 endpoint 都带了 `/api` 前缀。

修复：BASE_URL = `/api`，endpoint = `/projects`
