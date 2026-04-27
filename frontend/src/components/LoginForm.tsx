"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";

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

export function LoginForm({
  onSwitchToRegister,
  onBackToHome,
}: {
  onSwitchToRegister: () => void;
  onBackToHome: () => void;
}) {
  const { login, forgotPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      await login(email, password);
      onBackToHome();
    } catch (err) {
      setError(err instanceof Error ? err.message : "登录失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      await forgotPassword(email);
      setForgotSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "发送失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  };

  if (showForgotPassword) {
    return (
      <main
        style={{
          minHeight: "100vh",
          display: "grid",
          gridTemplateColumns: "minmax(360px, 0.92fr) minmax(420px, 1fr)",
          background: theme.bg,
          color: theme.text,
          fontFamily:
            "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
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
          <div style={{ display: "flex", alignItems: "center", gap: 10, color: theme.text, fontSize: 15, fontWeight: 590 }}>
            <span style={{ color: theme.primary }}>⚡</span>
            <span>AI 开发平台</span>
          </div>

          <div>
            <h1 style={{ margin: 0, fontSize: 58, fontWeight: 510, letterSpacing: "-1.2px", lineHeight: 1.05 }}>
              重置密码
            </h1>
            <p style={{ maxWidth: 420, marginTop: 22, color: theme.muted, fontSize: 17, lineHeight: 1.65 }}>
              输入你的注册邮箱，我们会发送重置链接到你的邮箱。
            </p>
          </div>
        </section>

        <section style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 40 }}>
          <div style={{ width: "100%", maxWidth: 420 }}>
            <button
              type="button"
              onClick={() => { setShowForgotPassword(false); setForgotSuccess(false); setError(""); }}
              style={{ marginBottom: 28, padding: 0, color: theme.muted, background: "transparent", border: 0, cursor: "pointer", fontSize: 14, fontFamily: "inherit" }}
            >
              ← 返回登录
            </button>

            <h2 style={{ margin: 0, fontSize: 28, fontWeight: 590, letterSpacing: "-0.6px" }}>
              忘记密码
            </h2>

            {forgotSuccess ? (
              <div style={{ marginTop: 28 }}>
                <div style={{ padding: 16, color: "#4ade80", background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.18)", borderRadius: 6, fontSize: 14 }}>
                  重置链接已发送！请检查你的邮箱。
                </div>
                <button
                  type="button"
                  onClick={() => { setShowForgotPassword(false); setForgotSuccess(false); }}
                  style={{ marginTop: 18, border: 0, background: "transparent", color: theme.primary, cursor: "pointer", fontSize: 14, fontFamily: "inherit", padding: 0 }}
                >
                  返回登录
                </button>
              </div>
            ) : (
              <>
                <p style={{ margin: "10px 0 28px", color: theme.muted, fontSize: 14 }}>
                  我们会发送一封包含重置链接的邮件到你的邮箱。
                </p>

                {error && (
                  <div style={{ marginBottom: 16, padding: "12px 16px", color: "#ffb4b4", background: "rgba(255,90,90,0.1)", border: "1px solid rgba(255,90,90,0.18)", borderRadius: 6, fontSize: 13 }}>
                    {error}
                  </div>
                )}

                <form onSubmit={handleForgotPassword}>
                  <label style={{ display: "block", marginBottom: 16, color: theme.text, fontSize: 13, fontWeight: 510 }}>
                    邮箱地址
                    <input
                      type="email"
                      value={email}
                      placeholder="you@example.com"
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      style={{ width: "100%", boxSizing: "border-box", marginTop: 8, height: 44, padding: "0 12px", color: theme.text, background: theme.surface, border: `1px solid ${theme.borderStrong}`, borderRadius: 6, outline: "none", fontSize: 15, fontFamily: "inherit" }}
                    />
                  </label>

                  <button
                    type="submit"
                    disabled={loading}
                    style={{ width: "100%", height: 44, marginTop: 6, color: "#fff", background: theme.primary, border: 0, borderRadius: 4, fontSize: 14, fontWeight: 510, cursor: "pointer", fontFamily: "inherit", opacity: loading ? 0.72 : 1 }}
                  >
                    {loading ? "发送中..." : "发送重置链接"}
                  </button>
                </form>
              </>
            )}
          </div>
        </section>
      </main>
    );
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        gridTemplateColumns: "minmax(360px, 0.92fr) minmax(420px, 1fr)",
        background: theme.bg,
        color: theme.text,
        fontFamily:
          "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
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
        <div style={{ display: "flex", alignItems: "center", gap: 10, color: theme.text, fontSize: 15, fontWeight: 590 }}>
          <span style={{ color: theme.primary }}>⚡</span>
          <span>AI 开发平台</span>
        </div>

        <div>
          <h1 style={{ margin: 0, fontSize: 58, fontWeight: 510, letterSpacing: "-1.2px", lineHeight: 1.05 }}>
            欢迎回来
          </h1>
          <p style={{ maxWidth: 420, marginTop: 22, color: theme.muted, fontSize: 17, lineHeight: 1.65 }}>
            登录后解锁完整的 AI 开发能力。从模型调用到生产部署，一站式完成。
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
          {[["项目总数", "128"], ["本周调用量", "42.8K"], ["最近部署", "2 分钟前"]].map(([label, value]) => (
            <div key={label} style={{ padding: 16, background: theme.surface, border: `1px solid ${theme.borderStrong}`, borderRadius: 8 }}>
              <div style={{ color: theme.muted, fontSize: 12 }}>{label}</div>
              <div style={{ marginTop: 8, color: theme.text, fontSize: 18, fontWeight: 590 }}>{value}</div>
            </div>
          ))}
        </div>
      </section>

      <section style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 40 }}>
        <div style={{ width: "100%", maxWidth: 420 }}>
          <button
            type="button"
            onClick={onBackToHome}
            style={{ marginBottom: 28, padding: 0, color: theme.muted, background: "transparent", border: 0, cursor: "pointer", fontSize: 14, fontFamily: "inherit" }}
          >
            ← 返回首页
          </button>

          <h2 style={{ margin: 0, fontSize: 28, fontWeight: 590, letterSpacing: "-0.6px" }}>
            登录你的账号
          </h2>
          <p style={{ margin: "10px 0 28px", color: theme.muted, fontSize: 14 }}>
            还没有账号？{" "}
            <button
              type="button"
              onClick={onSwitchToRegister}
              style={{ border: 0, background: "transparent", color: theme.primary, cursor: "pointer", fontFamily: "inherit", fontSize: "inherit", padding: 0 }}
            >
              立即注册
            </button>
          </p>

          {error && (
            <div style={{ marginBottom: 16, padding: "12px 16px", color: "#ffb4b4", background: "rgba(255,90,90,0.1)", border: "1px solid rgba(255,90,90,0.18)", borderRadius: 6, fontSize: 13 }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {[
              { label: "邮箱地址", value: email, onChange: setEmail, type: "email", placeholder: "you@example.com", id: "login-email", autocomplete: "email" },
              { label: "密码", value: password, onChange: setPassword, type: showPassword ? "text" : "password", placeholder: "输入你的密码", id: "login-password", autocomplete: "current-password" },
            ].map((field) => (
              <label
                key={field.id}
                style={{ display: "block", marginBottom: 16, color: theme.text, fontSize: 13, fontWeight: 510 }}
              >
                {field.label}
                <div style={{ position: "relative" }}>
                  <input
                    id={field.id}
                    type={field.type}
                    value={field.value}
                    placeholder={field.placeholder}
                    autoComplete={field.autocomplete}
                    onChange={(e) => field.onChange(e.target.value)}
                    required
                    style={{ width: "100%", boxSizing: "border-box", marginTop: 8, height: 44, padding: field.id === "login-password" ? "0 80px 0 12px" : "0 12px", color: theme.text, background: theme.surface, border: `1px solid ${theme.borderStrong}`, borderRadius: 6, outline: "none", fontSize: 15, fontFamily: "inherit" }}
                  />
                  {field.id === "login-password" && (
                    <button
                      type="button"
                      onClick={() => setShowPassword((s) => !s)}
                      style={{ position: "absolute", top: "50%", right: 12, transform: "translateY(-50%)", border: 0, background: "transparent", color: theme.muted, cursor: "pointer", fontSize: 12, fontWeight: 500, fontFamily: "inherit", padding: "4px 6px" }}
                    >
                      {showPassword ? "隐藏" : "显示"}
                    </button>
                  )}
                </div>
              </label>
            ))}

            <button
              type="submit"
              disabled={loading}
              style={{ width: "100%", height: 44, marginTop: 6, color: "#fff", background: theme.primary, border: 0, borderRadius: 4, fontSize: 14, fontWeight: 510, cursor: "pointer", fontFamily: "inherit", opacity: loading ? 0.72 : 1 }}
            >
              {loading ? "登录中..." : "登录"}
            </button>

            <div style={{ marginTop: 18, display: "flex", justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={() => { setShowForgotPassword(true); setError(""); }}
                style={{ border: 0, background: "transparent", color: theme.muted, cursor: "pointer", fontSize: 13, fontFamily: "inherit", padding: 0 }}
              >
                忘记密码？
              </button>
            </div>
          </form>
        </div>
      </section>
    </main>
  );
}
