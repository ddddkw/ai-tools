"use client";

import { useEffect, useState, CSSProperties } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/utils/api";

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

const inputStyle: CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  height: 44,
  padding: "0 12px",
  color: theme.text,
  background: theme.surface,
  border: `1px solid ${theme.borderStrong}`,
  borderRadius: 6,
  outline: "none",
  fontSize: 14,
  fontFamily: "inherit",
};

const labelStyle: CSSProperties = {
  display: "block",
  marginBottom: 8,
  color: theme.text,
  fontSize: 13,
  fontWeight: 510,
};

const buttonBase: CSSProperties = {
  border: 0,
  borderRadius: 4,
  height: 38,
  padding: "0 16px",
  fontSize: 14,
  fontWeight: 510,
  cursor: "pointer",
};

export default function RequirementEdit() {
  const params = useParams();
  const router = useRouter();
  const requirementId = params.id as string;

  const [formData, setFormData] = useState({
    title: "",
    content: "",
    priority: "medium",
    tags: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [token, setToken] = useState("");
  const [projectId, setProjectId] = useState<string | null>(null);

  useEffect(() => {
    const storedToken = localStorage.getItem("token") || "";
    setToken(storedToken);
  }, []);

  useEffect(() => {
    if (!token || !requirementId) return;

    api.requirements.get(requirementId, token).then((req: any) => {
      setFormData({
        title: req.title || "",
        content: req.content || "",
        priority: req.priority || "medium",
        tags: req.tags?.join(", ") || "",
      });
      setProjectId(req.project_id);
    }).catch(() => {
      router.push("/");
    }).finally(() => {
      setFetching(false);
    });
  }, [requirementId, token]);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.title.trim()) {
      newErrors.title = "Title is required";
    }
    if (!formData.content.trim()) {
      newErrors.content = "Content is required";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const tagsArray = formData.tags
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    setLoading(true);
    try {
      await api.requirements.update(requirementId, {
        ...formData,
        tags: tagsArray,
      }, token);
      router.push(`/requirements/${requirementId}`);
    } catch (err) {
      setErrors({ form: err instanceof Error ? err.message : "Failed to update requirement" });
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <main style={{ minHeight: "100vh", background: theme.bg, color: theme.text, padding: 40 }}>
        <div style={{ textAlign: "center", color: theme.muted }}>Loading...</div>
      </main>
    );
  }

  return (
    <main style={{ minHeight: "100vh", background: theme.bg, color: theme.text }}>
      {/* Header */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          height: 64,
          padding: "0 32px",
          background: "rgba(8,9,10,0.92)",
          backdropFilter: "blur(16px)",
          borderBottom: `1px solid ${theme.border}`,
        }}
      >
        <button
          onClick={() => router.push(`/requirements/${requirementId}`)}
          style={{
            ...buttonBase,
            color: theme.muted,
            background: "transparent",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <span style={{ fontSize: 18 }}>←</span> Back
        </button>
      </header>

      <div style={{ maxWidth: 700, margin: "0 auto", padding: "40px 24px" }}>
        <h1 style={{ margin: "0 0 32px", fontSize: 28, fontWeight: 590, letterSpacing: "-0.6px" }}>Edit Requirement</h1>

        {errors.form && (
          <div style={{ marginBottom: 16, padding: 12, color: "#ffb4b4", background: "rgba(255,90,90,0.1)", border: "1px solid rgba(255,90,90,0.18)", borderRadius: 6, fontSize: 13 }}>
            {errors.form}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div>
            <label style={labelStyle}>Title *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              style={{ ...inputStyle, borderColor: errors.title ? "rgba(255,90,90,0.5)" : theme.borderStrong }}
              placeholder="Requirement title"
            />
            {errors.title && <p style={{ margin: "6px 0 0", color: "#ffb4b4", fontSize: 12 }}>{errors.title}</p>}
          </div>

          <div>
            <label style={labelStyle}>Content (Markdown) *</label>
            <textarea
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              rows={10}
              style={{ ...inputStyle, padding: "12px", height: "auto", resize: "vertical", fontFamily: "monospace", fontSize: 13 }}
              placeholder="Describe the requirement in detail using Markdown..."
            />
            {errors.content && <p style={{ margin: "6px 0 0", color: "#ffb4b4", fontSize: 12 }}>{errors.content}</p>}
          </div>

          <div>
            <label style={labelStyle}>Priority</label>
            <select
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
              style={inputStyle}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>

          <div>
            <label style={labelStyle}>Tags (comma-separated)</label>
            <input
              type="text"
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              style={inputStyle}
              placeholder="frontend, api, auth"
            />
          </div>

          <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
            <button
              type="button"
              onClick={() => router.push(`/requirements/${requirementId}`)}
              style={{ ...buttonBase, color: theme.muted, background: theme.surface, border: `1px solid ${theme.borderStrong}` }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{ ...buttonBase, color: "#fff", background: theme.primary, opacity: loading ? 0.72 : 1 }}
            >
              {loading ? "Saving..." : "Update Requirement"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}