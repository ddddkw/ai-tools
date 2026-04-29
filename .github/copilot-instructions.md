# GitHub Copilot — AI 开发平台项目指南

## 前端 API 调用规范

### 唯一 API 入口
所有前端 API 调用必须通过 `frontend/src/utils/api.ts` 导出的 `api` 对象。

```typescript
import { api } from '@/utils/api';

// ✅ 正确
const { data } = await api.projects.list({ page: 1, limit: 9 });

// ❌ 禁止在组件内直接 fetch
fetch(`${API_BASE_URL}/api/...`)
```

### URL 拼接规则

| 文件 | BASE_URL fallback | endpoint 写法 | 完整路径 |
|------|-------------------|---------------|---------|
| `api.ts` | `/api` | `/projects` | `/api/projects` |

```typescript
// ✅ 正确
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api';
fetch(`${API_BASE_URL}${endpoint}`); // endpoint = '/projects' → '/api/projects'

// ❌ 错误：双 /api
fetch(`${API_BASE_URL}/api/projects`); // → '/api//api/projects'
```

### 修改后必查

```bash
grep -rn "fetch.*api/\|/api/auth\|/api/projects" frontend/src/ --include="*.ts" --include="*.tsx"
```

## 技术栈
- 前端：Next.js + TypeScript
- 后端：Node.js + Express + TypeScript
- 数据库：PostgreSQL
- 部署：Docker（前端 3001，后端 3000，Nginx 8080）
