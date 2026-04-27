# M1 用户认证系统 PRD

## 1. 概述与目标

**目标**：为 AI Tools 项目构建完整的用户认证系统，包括用户注册、登录、JWT 令牌认证、数据库持久化。

**技术栈**：
- 前端：Next.js (App Router)
- 后端：Node.js / Express + TypeScript
- 数据库：PostgreSQL (Docker)
- 认证：JWT (Access Token + Refresh Token)
- 部署：Docker Compose (Nginx 反向代理)

---

## 2. 功能清单

### 2.1 用户注册
- [ ] `POST /api/auth/register` 接口
- [ ] 字段：email, password, name
- [ ] 密码加密存储 (bcrypt)
- [ ] 重复邮箱检测

### 2.2 用户登录
- [ ] `POST /api/auth/login` 接口
- [ ] 返回 JWT Access Token (15min) + Refresh Token (7d)
- [ ] 登录失败锁定 (5次失败后锁定5分钟)

### 2.3 Token 刷新
- [ ] `POST /api/auth/refresh` 接口
- [ ] 使用 Refresh Token 换取新 Access Token

### 2.4 密码重置
- [ ] `POST /api/auth/forgot-password` (发送邮件)
- [ ] `POST /api/auth/reset-password` (重置密码)

### 2.5 前端页面
- [ ] `/login` 登录页 (Linear 风格)
- [ ] `/register` 注册页
- [ ] `/forgot-password` 忘记密码页

### 2.6 前端组件
- [ ] `LoginForm.tsx` 登录表单组件
- [ ] `RegisterForm.tsx` 注册表单组件
- [ ] Auth 状态管理 (Context/Hook)

---

## 3. 数据库 Schema

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(100) NOT NULL,
  avatar_url VARCHAR(500),
  is_active BOOLEAN DEFAULT true,
  is_email_verified BOOLEAN DEFAULT false,
  failed_login_attempts INT DEFAULT 0,
  locked_until TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(500) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(255) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 4. API 响应格式

**成功响应**：
```json
{
  "success": true,
  "data": { ... },
  "message": "操作成功"
}
```

**错误响应**：
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "错误描述"
  }
}
```

---

## 5. 前端 Linear 风格设计

### 5.1 登录页布局
- 居中卡片式设计
- 深色背景 (#0D0D0D)
- 圆角输入框 (#1A1A1A 背景, #333 边框)
- 主色调：紫色渐变 (#7C3AED → #A855F7)
- 字体：Inter

### 5.2 组件状态
- Default / Hover / Active / Disabled / Loading
- 输入框 focus 态：紫色边框 (#7C3AED)
- 错误态：红色边框 + 错误提示

---

## 6. 安全要求

- [ ] 密码最小 8 位，包含大小写字母+数字
- [ ] JWT 密钥环境变量存储
- [ ] CORS 配置
- [ ] Rate Limiting (100 req/15min)
- [ ] SQL 注入防护 (参数化查询)
- [ ] XSS 防护 (输入校验)

---

## 7. 开发任务拆分

| 任务 | 描述 | 分支 |
|------|------|------|
| M1.1 | 数据库 Schema + 初始化脚本 | feature/m1-auth-db |
| M1.2 | 后端 Auth Controller + Routes | feature/m1-auth-backend |
| M1.3 | 前端登录/注册页面 + 表单组件 | feature/m1-auth-frontend |
| M1.4 | 集成测试 + 部署配置 | feature/m1-auth-deploy |

---

## 8. 验收标准

- [ ] 用户可以注册并收到确认邮件
- [ ] 用户可以登录获取 JWT
- [ ] 受保护的路由需要有效 Token
- [ ] Token 过期后可用 Refresh Token 续期
- [ ] 登录失败 5 次后账户锁定 5 分钟
- [ ] 前端登录页符合 Linear 风格
- [ ] Docker Compose 一键部署成功

---

## 9. 里程碑

- **M1**: 用户认证系统 ✓ (当前)
- **M2**: 用户个人资料管理
- **M3**: 项目/工作空间管理
- **M4**: 核心功能模块
