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

export default function ProjectEdit() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    github_repo: "",
    github_branch: "main",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [token, setToken] = useState("");

  useEffect(() => {
    const storedToken = localStorage.getItem("token") || "";
    setToken(storedToken);
  }, []);

  useEffect(() => {
    if (!token || !projectId) return;

    api.projects.get(projectId, token).then((project: any) => {
      setFormData({
        name: project.name || "",
        description: project.description || "",
        github_repo: project.github_repo || "",
        github_branch: project.github_branch || "main",
      });
    }).catch(() => {
      router.push("/");
    }).finally(() => {
      setFetching(false);
    });
  }, [projectId, token]);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) {
      newErrors.name = "Project name is required";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      await api.projects.update(projectId, formData, token);
      router.push(`/projects/${projectId}`);
    } catch (err) {
      setErrors({ form: err instanceof Error ? err.message : "Failed to update project" });
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
          onClick={() => router.push(`/projects/${projectId}`)}
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

      <div style={{ maxWidth: 600, margin: "0 auto", padding: "40px 24px" }}>
        <h1 style={{ margin: "0 0 32px", fontSize: 28, fontWeight: 590, letterSpacing: "-0.6px" }}>Edit Project</h1>

        {errors.form && (
          <div style={{ marginBottom: 16, padding: 12, color: "#ffb4b4", background: "rgba(255,90,90,0.1)", border: "1px solid rgba(255,90,90,0.18)", borderRadius: 6, fontSize: 13 }}>
            {errors.form}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div>
            <label style={labelStyle}>Project Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              style={{ ...inputStyle, borderColor: errors.name ? "rgba(255,90,90,0.5)" : theme.borderStrong }}
              placeholder="My Awesome Project"
            />
            {errors.name && <p style={{ margin: "6px 0 0", color: "#ffb4b4", fontSize: 12 }}>{errors.name}</p>}
          </div>

          <div>
            <label style={labelStyle}>Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
              style={{ ...inputStyle, padding: "12px", height: "auto", resize: "vertical" }}
              placeholder="Project description (optional)"
            />
          </div>

          <div>
            <label style={labelStyle}>GitHub Repository</label>
            <input
              type="text"
              value={formData.github_repo}
              onChange={(e) => setFormData({ ...formData, github_repo: e.target.value })}
              style={inputStyle}
              placeholder="owner/repo"
            />
          </div>

          <div>
            <label style={labelStyle}>GitHub Branch</label>
            <input
              type="text"
              value={formData.github_branch}
              onChange={(e) => setFormData({ ...formData, github_branch: e.target.value })}
              style={inputStyle}
              placeholder="main"
            />
          </div>

          <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
            <button
              type="button"
              onClick={() => router.push(`/projects/${projectId}`)}
              style={{ ...buttonBase, color: theme.muted, background: theme.surface, border: `1px solid ${theme.borderStrong}` }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{ ...buttonBase, color: "#fff", background: theme.primary, opacity: loading ? 0.72 : 1 }}
            >
              {loading ? "Saving..." : "Update Project"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}