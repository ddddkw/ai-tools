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

const buttonBase: CSSProperties = {
  border: 0,
  borderRadius: 4,
  height: 38,
  padding: "0 16px",
  fontSize: 14,
  fontWeight: 510,
  cursor: "pointer",
};

export default function ProjectDetail() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [project, setProject] = useState<any>(null);
  const [requirements, setRequirements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [token, setToken] = useState("");

  useEffect(() => {
    const storedToken = localStorage.getItem("token") || "";
    setToken(storedToken);
  }, []);

  useEffect(() => {
    if (!token) return;

    const loadData = async () => {
      setLoading(true);
      setError("");
      try {
        const [projectData, reqData] = await Promise.all([
          api.projects.get(projectId, token),
          api.requirements.listByProject(projectId, {}, token),
        ]);
        setProject(projectData);
        setRequirements(reqData.data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load project");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [projectId, token]);

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this project?")) return;
    try {
      await api.projects.delete(projectId, token);
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete project");
    }
  };

  const handleRequirementDelete = async (id: string) => {
    if (!confirm("Delete this requirement?")) return;
    try {
      await api.requirements.delete(id, token);
      setRequirements((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete requirement");
    }
  };

  if (loading) {
    return (
      <main style={{ minHeight: "100vh", background: theme.bg, color: theme.text, padding: 40 }}>
        <div style={{ textAlign: "center", color: theme.muted }}>Loading...</div>
      </main>
    );
  }

  if (!project) {
    return (
      <main style={{ minHeight: "100vh", background: theme.bg, color: theme.text, padding: 40 }}>
        <div style={{ textAlign: "center", color: theme.muted }}>Project not found</div>
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
          justifyContent: "space-between",
          height: 64,
          padding: "0 32px",
          background: "rgba(8,9,10,0.92)",
          backdropFilter: "blur(16px)",
          borderBottom: `1px solid ${theme.border}`,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            onClick={() => router.push("/")}
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
          <span style={{ width: 1, height: 24, background: theme.borderStrong }} />
          <span style={{ fontSize: 15, fontWeight: 590 }}>{project.name}</span>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={() => router.push(`/projects/${projectId}/edit`)}
            style={{ ...buttonBase, color: theme.text, background: theme.surface, border: `1px solid ${theme.borderStrong}` }}
          >
            Edit Project
          </button>
          <button
            onClick={handleDelete}
            style={{ ...buttonBase, color: "#ffb4b4", background: "rgba(255,90,90,0.1)", border: `1px solid rgba(255,90,90,0.18)` }}
          >
            Delete
          </button>
        </div>
      </header>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 24px" }}>
        {error && (
          <div style={{ marginBottom: 16, padding: 12, color: "#ffb4b4", background: "rgba(255,90,90,0.1)", border: "1px solid rgba(255,90,90,0.18)", borderRadius: 6, fontSize: 13 }}>
            {error}
          </div>
        )}

        {/* Project Info */}
        <section style={{ marginBottom: 32 }}>
          <div style={{ padding: 24, background: theme.surface, border: `1px solid ${theme.borderStrong}`, borderRadius: 8 }}>
            <h1 style={{ margin: "0 0 16px", fontSize: 28, fontWeight: 590, letterSpacing: "-0.6px" }}>{project.name}</h1>
            {project.description && (
              <p style={{ margin: "0 0 16px", color: theme.muted, fontSize: 15, lineHeight: 1.6 }}>{project.description}</p>
            )}
            <div style={{ display: "flex", gap: 24, fontSize: 13, color: theme.muted }}>
              {project.github_repo && (
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <svg style={{ width: 16, height: 16 }} fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
                  </svg>
                  {project.github_repo}
                </span>
              )}
              {project.github_branch && <span>Branch: {project.github_branch}</span>}
              <span>Created: {new Date(project.created_at).toLocaleDateString()}</span>
            </div>
          </div>
        </section>

        {/* Requirements */}
        <section>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 590 }}>Requirements ({requirements.length})</h2>
            <button
              onClick={() => router.push(`/projects/${projectId}/requirements/new`)}
              style={{ ...buttonBase, color: "#fff", background: theme.primary }}
            >
              + New Requirement
            </button>
          </div>

          {requirements.length === 0 ? (
            <div style={{ padding: 48, textAlign: "center", color: theme.muted, background: theme.surface, border: `1px solid ${theme.borderStrong}`, borderRadius: 8 }}>
              No requirements yet. Create one to get started.
            </div>
          ) : (
            <div style={{ display: "grid", gap: 16 }}>
              {requirements.map((req) => (
                <div
                  key={req.id}
                  style={{
                    padding: 20,
                    background: theme.surface,
                    border: `1px solid ${theme.borderStrong}`,
                    borderRadius: 8,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                    <h3 style={{ margin: 0, fontSize: 15, fontWeight: 590 }}>{req.title}</h3>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <span
                        style={{
                          padding: "2px 8px",
                          fontSize: 11,
                          fontWeight: 510,
                          borderRadius: 4,
                          background: req.priority === "high" ? "rgba(255,90,90,0.15)" : req.priority === "medium" ? "rgba(255,193,7,0.15)" : "rgba(255,255,255,0.05)",
                          color: req.priority === "high" ? "#ffb4b4" : req.priority === "medium" ? "#ffd866" : theme.muted,
                        }}
                      >
                        {req.priority}
                      </span>
                      <span
                        style={{
                          padding: "2px 8px",
                          fontSize: 11,
                          fontWeight: 510,
                          borderRadius: 4,
                          background: "rgba(94,106,210,0.15)",
                          color: theme.primary,
                        }}
                      >
                        {req.status}
                      </span>
                      <button
                        onClick={() => router.push(`/requirements/${req.id}/edit`)}
                        style={{ ...buttonBase, height: 28, padding: "0 10px", color: theme.muted, background: "transparent" }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleRequirementDelete(req.id)}
                        style={{ ...buttonBase, height: 28, padding: "0 10px", color: "#ffb4b4", background: "transparent" }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  <p style={{ margin: "0 0 12px", color: theme.muted, fontSize: 13, lineHeight: 1.6 }}>{req.content}</p>
                  {req.tags && req.tags.length > 0 && (
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {req.tags.map((tag: string, i: number) => (
                        <span key={i} style={{ padding: "2px 8px", fontSize: 11, background: "rgba(94,106,210,0.1)", color: theme.primary, borderRadius: 4 }}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}