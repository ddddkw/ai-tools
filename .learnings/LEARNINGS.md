# Learnings Log

---

## [LRN-20260429-001] API 路径配置规范

**Logged**: 2026-04-29T12:10:00Z
**Priority**: high
**Status**: promoted
**Area**: frontend

### Summary
前端 API 配置应统一管理，避免分散定义导致的路径冲突和重复前缀问题。

### Details
项目中有两个地方定义 `API_BASE_URL`：
1. `frontend/src/utils/api.ts` — 统一导出 `api` 对象供全项目调用
2. `frontend/src/app/page.tsx` — 独立定义并直接 fetch

这两个地方的 fallback 值不一致：
- `api.ts`: `/api`（相对路径）
- `page.tsx`: `http://47.100.186.167:3000`（绝对路径）

加上 `page.tsx` 中调用 fetch 时路径写法不统一（有的是 `${API_BASE_URL}/api/...`，有的是 `${API_BASE_URL}auth/...`），导致同一接口出现多种 URL 形式。

### Suggested Action
**强制规范**：
1. 所有前端 API 调用必须通过 `frontend/src/utils/api.ts` 导出的 `api` 对象
2. `page.tsx` 中禁止直接使用 `fetch`，必须用 `api.auth.*` 等方法
3. `API_BASE_URL` fallback 统一为 `/api`（相对路径，由 Nginx 代理到后端）
4. `api.ts` 中 endpoint 参数全部以 `/` 开头（如 `/projects`）

### Metadata
- Source: user_feedback
- Related Files:
  - `frontend/src/utils/api.ts`
  - `frontend/src/app/page.tsx`
  - `frontend/.env.local`
  - `frontend/next.config.js`
- Tags: api-url, configuration, frontend, architecture
- Promoted: CLAUDE.md, .github/copilot-instructions.md
- Pattern-Key: frontend.api，统一配置

---

## [LRN-20260429-002] 修完错误后要确认是否还有其他同类问题

**Logged**: 2026-04-29T12:15:00Z
**Priority**: medium
**Status**: pending
**Area**: frontend

### Summary
修复 `page.tsx` 中的 API 路径时，只修了看到的几处，没有全局搜索检查是否还有其他地方有同样问题，导致要反复修。

### Details
搜索 `frontend/src` 目录下所有包含 `fetch.*api/` 或 `API_BASE_URL` 的文件，发现 `page.tsx` 中有多处直接 fetch 调用，而 `api.ts` 中反而是正确的。

### Suggested Action
1. 修复配置类问题时，**先全局搜索**相关代码模式，确认影响范围
2. 修完后**再次全局搜索**，确保没有遗漏
3. 搜索关键词：`API_BASE_URL`、`fetch.*api/`、`/api/auth`、`/api/projects`

### Metadata
- Source: error
- Tags: workflow, debugging, thoroughness
- See Also: ERR-20260429-002

---
