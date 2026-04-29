"use client";

import { useEffect, useState } from "react";
import { LoginForm } from "../components/LoginForm";
import ProjectList from "../components/projects/ProjectList";

type View = "home" | "login" | "register" | "dashboard";
type DashboardTab = "overview" | "projects";

type User = {
  id?: string;
  email?: string;
  name?: string;
  created_at?: string;
};

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://47.100.186.167:3000";

const theme = {
  bg: "#08090a",
  panel: "#0f1011",
  text: "#f7f8f8",
  muted: "#8a8f98",
  border: "rgba(255,255,255,0.05)",
  borderStrong: "rgba(255,255,255,0.08)",
  primary: "#5e6ad2",
  surface: "rgba(255,255,255,0.03)",
};

const navStyle = {
  position: "sticky" as const,
  top: 0,
  zIndex: 10,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  height: 64,
  padding: "0 32px",
  background: "rgba(8,9,10,0.92)",
  backdropFilter: "blur(16px)",
  borderBottom: "1px solid rgba(255,255,255,0.05)",
};

const logoStyle = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  color: theme.text,
  fontSize: 15,
  fontWeight: 590,
  letterSpacing: "-0.2px",
};

const buttonBase = {
  border: 0,
  borderRadius: 4,
  height: 38,
  padding: "0 16px",
  fontSize: 14,
  fontWeight: 510,
  cursor: "pointer",
};

export default function Home() {
  const [view, setView] = useState<View>("home");
  const [dashboardTab, setDashboardTab] = useState<DashboardTab>("overview");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // 恢复登录状态（需要验证 token 有效性）
    const savedToken = localStorage.getItem("token");
    if (!savedToken) return;

    const savedUser = localStorage.getItem("user");
    if (!savedUser) return;

    try {
      const parsed = JSON.parse(savedUser);
      // 先验证 token 有效性，再恢复登录状态
      fetch(`${API_BASE_URL}auth/me`, {
        method: "GET",
        headers: { Authorization: `Bearer ${savedToken}` },
      })
        .then((res) => {
          if (!res.ok) throw new Error("Invalid token");
          return res.json();
        })
        .then((data) => {
          setUser(data.user || data);
          setView("dashboard");
        })
        .catch(() => {
          // token 无效，清除登录状态
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          localStorage.removeItem("view");
          setView("home");
        });
    } catch {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      localStorage.removeItem("view");
    }
  }, []);

  useEffect(() => {
    if (view === "login") {
      setError("");
    }
  }, [view]);

  const doLogin = async (loginEmail = email, loginPassword = password) => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_BASE_URL}auth/login/email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || "登录失败，请检查邮箱和密码");
      }

      const token = data?.tokens?.accessToken || data?.token || data?.access_token;
      const nextUser = data?.user || data;

      if (token) {
        localStorage.setItem("token", token);
      }
      if (nextUser) {
        localStorage.setItem("user", JSON.stringify(nextUser));
      }

      setUser(nextUser);
      localStorage.setItem("view", "dashboard"); setView("dashboard");
      return nextUser;
    } catch (loginError) {
      const message = loginError instanceof Error ? loginError.message : "登录失败，请稍后重试";
      setError(message);
      throw loginError;
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_BASE_URL}auth/register/email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || "注册失败，请稍后重试");
      }

      await doLogin(email, password);
    } catch (registerError) {
      const message = registerError instanceof Error ? registerError.message : "注册失败，请稍后重试";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("view");
    setUser(null);
    setView("home");
  };

  const renderNav = () => (
    <nav style={navStyle}>
      <button
        type="button"
        onClick={() => setView("home")}
        style={{ ...logoStyle, background: "transparent", border: 0, cursor: "pointer" }}
      >
        <span style={{ color: theme.primary }}>⚡</span>
        <span>AI 开发平台</span>
      </button>

      <div style={{ display: "flex", alignItems: "center", gap: 28, color: theme.muted, fontSize: 14 }}>
        <a style={{ color: "inherit", textDecoration: "none" }} href="#features">产品</a>
        <a style={{ color: "inherit", textDecoration: "none" }} href="#docs">文档</a>
        <a style={{ color: "inherit", textDecoration: "none" }} href="#changelog">更新日志</a>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {user ? (
          <button
            type="button"
            onClick={handleLogout}
            style={{ ...buttonBase, color: theme.muted, background: theme.surface, border: `1px solid ${theme.borderStrong}` }}
          >
            退出
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setView("login")}
              style={{ ...buttonBase, color: theme.muted, background: "transparent" }}
            >
              登录
            </button>
            <button
              type="button"
              onClick={() => setView("register")}
              style={{ ...buttonBase, color: "#fff", background: theme.primary }}
            >
              免费使用
            </button>
          </>
        )}
      </div>
    </nav>
  );

  if (!mounted) {
    return null;
  }

  if (view === "login") {
    return (
      <main style={{ minHeight: "100vh", background: theme.bg }}>
        <LoginForm
          error={error}
          onSuccess={({ email, password }) => doLogin(email, password)}
          onSwitchToRegister={() => setView("register")}
          onBackToHome={() => setView("home")}
        />
      </main>
    );
  }

  if (view === "register") {
    return (
      <main
        style={{
          minHeight: "100vh",
          display: "grid",
          gridTemplateColumns: "minmax(360px, 0.92fr) minmax(420px, 1fr)",
          background: theme.bg,
          color: theme.text,
          fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          fontFeatureSettings: "'cv01', 'ss03'",
        }}
      >
        <section
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "56px 64px",
            background: theme.panel,
            borderRight: `1px solid ${theme.border}`,
          }}
        >
          <div style={logoStyle}>
            <span style={{ color: theme.primary }}>⚡</span>
            <span>AI 开发平台</span>
          </div>

          <div>
            <h1 style={{ margin: 0, fontSize: 58, fontWeight: 510, letterSpacing: "-1.2px", lineHeight: 1.05 }}>
              创建账号
            </h1>
            <p style={{ maxWidth: 420, marginTop: 22, color: theme.muted, fontSize: 17, lineHeight: 1.65 }}>
              连接模型、部署智能体、监控生产调用，用一个工作台完成 AI 应用从想法到上线的全部流程。
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
            {[
              ["项目总数", "128"],
              ["本周调用量", "42.8K"],
              ["最近部署", "2 分钟前"],
            ].map(([label, value]) => (
              <div key={label} style={{ padding: 16, background: theme.surface, border: `1px solid ${theme.borderStrong}`, borderRadius: 8 }}>
                <div style={{ color: theme.muted, fontSize: 12 }}>{label}</div>
                <div style={{ marginTop: 8, color: theme.text, fontSize: 18, fontWeight: 590 }}>{value}</div>
              </div>
            ))}
          </div>
        </section>

        <section style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 40 }}>
          <form onSubmit={handleRegister} style={{ width: "100%", maxWidth: 420 }}>
            <div style={{ marginBottom: 28 }}>
              <h2 style={{ margin: 0, fontSize: 28, fontWeight: 590, letterSpacing: "-0.6px" }}>免费开始</h2>
              <p style={{ margin: "10px 0 0", color: theme.muted, fontSize: 14 }}>创建你的 AI 开发工作区。</p>
            </div>

            {error && (
              <div style={{ marginBottom: 16, padding: 12, color: "#ffb4b4", background: "rgba(255,90,90,0.1)", border: "1px solid rgba(255,90,90,0.18)", borderRadius: 6, fontSize: 13 }}>
                {error}
              </div>
            )}

            {[
              { label: "姓名", value: name, onChange: setName, type: "text", placeholder: "Ada Lovelace" },
              { label: "邮箱", value: email, onChange: setEmail, type: "email", placeholder: "you@example.com" },
              { label: "密码", value: password, onChange: setPassword, type: "password", placeholder: "至少 8 位字符" },
            ].map((field) => (
              <label key={field.label} style={{ display: "block", marginBottom: 16, color: theme.text, fontSize: 13, fontWeight: 510 }}>
                {field.label}
                <input
                  required
                  type={field.type}
                  value={field.value}
                  placeholder={field.placeholder}
                  onChange={(event) => field.onChange(event.target.value)}
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    marginTop: 8,
                    height: 44,
                    padding: "0 12px",
                    color: theme.text,
                    background: theme.surface,
                    border: `1px solid ${theme.borderStrong}`,
                    borderRadius: 6,
                    outline: "none",
                  }}
                />
              </label>
            ))}

            <button
              type="submit"
              disabled={loading}
              style={{ ...buttonBase, width: "100%", height: 44, marginTop: 6, color: "#fff", background: theme.primary, opacity: loading ? 0.72 : 1 }}
            >
              {loading ? "创建中..." : "创建账号"}
            </button>

            <button
              type="button"
              onClick={() => setView("home")}
              style={{ marginTop: 18, padding: 0, color: theme.muted, background: "transparent", border: 0, cursor: "pointer", fontSize: 14 }}
            >
              ← 返回首页
            </button>
          </form>
        </section>
      </main>
    );
  }

  if (view === "dashboard" && user) {
    return (
      <main
        style={{
          minHeight: "100vh",
          background: theme.bg,
          color: theme.text,
          fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          fontFeatureSettings: "'cv01', 'ss03'",
        }}
      >
        {renderNav()}

        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 24px" }}>
          <div style={{ display: "flex", gap: 4, marginBottom: 24, background: theme.surface, borderRadius: 8, padding: 4, width: "fit-content" }}>
            {[
              { key: "overview", label: "概览" },
              { key: "projects", label: "项目" },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setDashboardTab(tab.key as DashboardTab)}
                style={{
                  padding: "8px 20px",
                  borderRadius: 6,
                  border: 0,
                  background: dashboardTab === tab.key ? theme.primary : "transparent",
                  color: dashboardTab === tab.key ? "#fff" : theme.muted,
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {dashboardTab === "overview" && (
            <section style={{ maxWidth: 860 }}>
              <h1 style={{ margin: 0, fontSize: 44, fontWeight: 510, letterSpacing: "-1px" }}>
                欢迎回来，{user.name || user.email}
              </h1>
              <p style={{ marginTop: 14, color: theme.muted, fontSize: 16 }}>你的 AI 开发工作台已准备就绪。</p>

              <div style={{ marginTop: 32, padding: 24, background: theme.surface, border: `1px solid ${theme.borderStrong}`, borderRadius: 8 }}>
                {[
                  ["邮箱", user.email || "-"],
                  ["ID", user.id || "-"],
                  ["创建时间", user.created_at || "-"],
                ].map(([label, value]) => (
                  <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "14px 0", borderBottom: label === "创建时间" ? 0 : `1px solid ${theme.border}` }}>
                    <span style={{ color: theme.muted }}>{label}</span>
                    <span>{value}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {dashboardTab === "projects" && (
            <ProjectList token={typeof window !== "undefined" ? localStorage.getItem("token") || "" : ""} />
          )}
        </div>
      </main>
    );
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: theme.bg,
        color: theme.text,
        fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        fontFeatureSettings: "'cv01', 'ss03'",
      }}
    >
      {renderNav()}

      <section style={{ maxWidth: 860, margin: "0 auto", padding: "112px 24px 92px", textAlign: "center" }}>
        <h1
          style={{
            margin: 0,
            color: theme.text,
            fontSize: 58,
            fontWeight: 510,
            letterSpacing: "-1.2px",
            lineHeight: 1.05,
          }}
        >
          AI 开发，<br />从这里开始
        </h1>
        <p style={{ maxWidth: 520, margin: "24px auto 0", color: theme.muted, fontSize: 17, lineHeight: 1.65 }}>
          面向现代团队的一站式 AI 开发平台，连接模型、工具、部署与监控，让智能应用更快进入生产。
        </p>
        <div style={{ display: "flex", justifyContent: "center", gap: 12, marginTop: 34 }}>
          <button type="button" onClick={() => setView("register")} style={{ ...buttonBase, color: "#fff", background: theme.primary }}>
            免费使用
          </button>
          <button
            type="button"
            onClick={() => setView("login")}
            style={{ ...buttonBase, color: theme.muted, background: theme.surface, border: `1px solid ${theme.borderStrong}` }}
          >
            登录控制台
          </button>
        </div>
      </section>

      <section id="features" style={{ maxWidth: 980, margin: "0 auto", padding: "0 24px 96px" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 1,
            overflow: "hidden",
            background: "rgba(255,255,255,0.05)",
            border: `1px solid ${theme.border}`,
            borderRadius: 8,
          }}
        >
          {[
            ["50+模型", "统一调用主流大模型与私有模型。"],
            ["秒级部署", "从原型到生产环境快速发布。"],
            ["企业级安全", "密钥、权限与审计全链路保护。"],
            ["实时监控", "追踪延迟、成本、质量与错误。"],
            ["开放API", "标准接口无缝接入现有系统。"],
            ["团队协作", "共享项目、提示词、工具和发布流程。"],
          ].map(([title, desc]) => (
            <article key={title} style={{ minHeight: 118, padding: 24, background: theme.bg }}>
              <h3 style={{ margin: 0, color: theme.text, fontSize: 14, fontWeight: 590 }}>{title}</h3>
              <p style={{ margin: "10px 0 0", color: theme.muted, fontSize: 13, lineHeight: 1.6 }}>{desc}</p>
            </article>
          ))}
        </div>
      </section>

      <footer
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "28px 32px",
          borderTop: `1px solid ${theme.border}`,
          color: theme.muted,
          fontSize: 13,
        }}
      >
        <div style={logoStyle}>
          <span style={{ color: theme.primary }}>⚡</span>
          <span>AI 开发平台</span>
        </div>
        <div style={{ display: "flex", gap: 22 }}>
          <a id="docs" style={{ color: "inherit", textDecoration: "none" }} href="#docs">文档</a>
          <a id="changelog" style={{ color: "inherit", textDecoration: "none" }} href="#changelog">更新日志</a>
          <a style={{ color: "inherit", textDecoration: "none" }} href="mailto:hello@example.com">联系</a>
        </div>
      </footer>
    </main>
  );
}
