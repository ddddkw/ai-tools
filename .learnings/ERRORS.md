# Errors Log

---

## [ERR-20260429-001] API_BASE_URL 配置分散导致路径冲突

**Logged**: 2026-04-29T12:00:00Z
**Priority**: high
**Status**: resolved
**Area**: frontend

### Summary
前端 API 地址配置分散在两个文件中，fallback 值不一致，导致同一接口出现 `localhost:3000/api/...` 和 `http://47.100.186.167:3000/api/...` 两种地址。

### Error
```
GET http://localhost:3000/api/projects?page=1&limit=9&search=
# 正确应为相对路径或正确的服务器地址
```

### Root Cause
1. `frontend/src/utils/api.ts` 定义 `API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api'`
2. `frontend/src/app/page.tsx` 独立定义 `API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://47.100.186.167:3000"`
3. `page.tsx` 中的 fetch 调用使用 `${API_BASE_URL}auth/me`（无 `/api` 前缀）
4. 但 `api.ts` 中的 fetch 调用使用 `${API_BASE_URL}${endpoint}`（假设 endpoint 以 `/` 开头）
5. 当 `NEXT_PUBLIC_API_URL` 未设置时，两个文件的行为不一致

### Suggested Fix
- 统一使用 `api.ts` 作为唯一的 API 配置和请求入口
- `page.tsx` 中所有 fetch 调用应改为调用 `api.ts` 中导出的函数，而非直接 fetch
- 或将 `API_BASE_URL` 统一为 `/api`，确保 Nginx 代理路径一致

### Resolution
- **Resolved**: 2026-04-29
- **Commit**: 424e9af
- **Fix**: `page.tsx` 中 fetch 路径去掉 `/api` 前缀，`api.ts` fallback 改为 `/api`

### Metadata
- Reproducible: yes
- Related Files:
  - `frontend/src/utils/api.ts`
  - `frontend/src/app/page.tsx`
- Tags: api-url, configuration, frontend
- See Also: LRN-20260429-001

---

## [ERR-20260429-002] 同一错误反复出现 — API 路径重复 /api 前缀

**Logged**: 2026-04-29T12:05:00Z
**Priority**: high
**Status**: resolved
**Area**: frontend

### Summary
同一个 API 路径问题（多加 `/api` 前缀）至少修改了 3 次，每次都修完又出现。

### Error
```typescript
// 错误写法（修复后又出现）
fetch(`${API_BASE_URL}/api/auth/login/email`, ...)
//                     ↑ 多余的 /api

// 正确写法
fetch(`${API_BASE_URL}auth/login/email`, ...)
//                      ↑ 无 /api，BASE_URL 本身已含 /api
```

### Root Cause
- `API_BASE_URL` 的 fallback 值已包含 `/api`
- 部分代码在拼接时又加了一次 `/api`
- 修完后新代码又重复同样的错误

### Suggested Fix
- 制定规范：`API_BASE_URL` 永远以 `/` 结尾（`/api/`）或不以 `/` 结尾（`/api`），全员遵守
- `api.ts` 中 `endpoint` 参数全部以 `/` 开头，拼出来是 `/api/projects`
- 不要再在 fetch 调用处手动加 `/api`

### Resolution
- **Resolved**: 2026-04-29
- **Commit**: 424e9af
- **Notes**: 统一后 `api.ts` 内部拼接规则：BASE_URL（不含 `/api`） + `/` + endpoint（以 `/` 开头）

### Metadata
- Reproducible: yes
- Related Files: `frontend/src/utils/api.ts`, `frontend/src/app/page.tsx`
- Tags: api-url, duplicate-prefix
- Recurrence-Count: 3
- First-Seen: 2026-04-24
- Last-Seen: 2026-04-29

---
