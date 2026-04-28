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

export default function RequirementDetail() {
  const params = useParams();
  const router = useRouter();
  const requirementId = params.id as string;

  const [requirement, setRequirement] = useState<any>(null);
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [token, setToken] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);

  useEffect(() => {
    const storedToken = localStorage.getItem("token") || "";
    setToken(storedToken);
  }, []);

  useEffect(() => {
    if (!token || !requirementId) return;

    const loadData = async () => {
      setLoading(true);
      setError("");
      try {
        const reqData = await api.requirements.get(requirementId, token);
        setRequirement(reqData);
        if (reqData.project_id) {
          const projData = await api.projects.get(reqData.project_id, token);
          setProject(projData);
        }
        // Load analysis result if requirement is analyzed
        if (reqData.status === 'analyzed') {
          try {
            const analysis = await api.requirements.getAnalysis(requirementId, token);
            setAnalysisResult(analysis.analysis);
          } catch { /* no analysis yet */ }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load requirement");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [requirementId, token]);

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this requirement?")) return;
    try {
      await api.requirements.delete(requirementId, token);
      if (requirement?.project_id) {
        router.push(`/projects/${requirement.project_id}`);
      } else {
        router.push("/");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete requirement");
    }
  };

  const handleAnalyze = async () => {
    setAnalyzing(true);
    setError("");
    try {
      const result = await api.requirements.analyze(requirementId, token);
      setAnalysisResult(result);
      setRequirement((prev: any) => ({ ...prev, status: 'analyzing' }));
      // Poll for completion
      const poll = setInterval(async () => {
        try {
          const updated = await api.requirements.get(requirementId, token);
          setRequirement(updated);
          if (updated.status !== 'analyzing') {
            clearInterval(poll);
            if (updated.status === 'analyzed') {
              const analysis = await api.requirements.getAnalysis(requirementId, token);
              setAnalysisResult(analysis.analysis);
            }
            setAnalyzing(false);
          }
        } catch { /* keep polling */ }
      }, 2000);
      // Timeout after 60s
      setTimeout(() => { clearInterval(poll); setAnalyzing(false); }, 60000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to analyze requirement");
      setAnalyzing(false);
    }
  };

  if (loading) {
    return (
      <main style={{ minHeight: "100vh", background: theme.bg, color: theme.text, padding: 40 }}>
        <div style={{ textAlign: "center", color: theme.muted }}>Loading...</div>
      </main>
    );
  }

  if (!requirement) {
    return (
      <main style={{ minHeight: "100vh", background: theme.bg, color: theme.text, padding: 40 }}>
        <div style={{ textAlign: "center", color: theme.muted }}>Requirement not found</div>
      </main>
    );
  }

  const statusColors: Record<string, { bg: string; color: string }> = {
    draft: { bg: "rgba(255,255,255,0.05)", color: theme.muted },
    analyzing: { bg: "rgba(94,106,210,0.15)", color: theme.primary },
    analyzed: { bg: "rgba(168,85,247,0.15)", color: "#c084fc" },
    approved: { bg: "rgba(34,197,94,0.15)", color: "#4ade80" },
  };

  const priorityColors: Record<string, { bg: string; color: string }> = {
    low: { bg: "rgba(255,255,255,0.05)", color: theme.muted },
    medium: { bg: "rgba(255,193,7,0.15)", color: "#ffd866" },
    high: { bg: "rgba(255,90,90,0.15)", color: "#ffb4b4" },
  };

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
            onClick={() => requirement.project_id ? router.push(`/projects/${requirement.project_id}`) : router.push("/")}
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
          <span style={{ fontSize: 15, fontWeight: 590 }}>{requirement.title}</span>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          {(requirement.status === 'draft' || requirement.status === 'analyzed') && (
            <button
              onClick={handleAnalyze}
              disabled={analyzing}
              style={{ ...buttonBase, color: "#fff", background: theme.primary, opacity: analyzing ? 0.7 : 1 }}
            >
              {analyzing ? "⚡ Analyzing..." : "⚡ AI 分析"}
            </button>
          )}
          <button
            onClick={() => router.push(`/requirements/${requirementId}/edit`)}
            style={{ ...buttonBase, color: theme.text, background: theme.surface, border: `1px solid ${theme.borderStrong}` }}
          >
            Edit Requirement
          </button>
          <button
            onClick={handleDelete}
            style={{ ...buttonBase, color: "#ffb4b4", background: "rgba(255,90,90,0.1)", border: `1px solid rgba(255,90,90,0.18)` }}
          >
            Delete
          </button>
        </div>
      </header>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "32px 24px" }}>
        {error && (
          <div style={{ marginBottom: 16, padding: 12, color: "#ffb4b4", background: "rgba(255,90,90,0.1)", border: "1px solid rgba(255,90,90,0.18)", borderRadius: 6, fontSize: 13 }}>
            {error}
          </div>
        )}

        {/* Requirement Info */}
        <section style={{ marginBottom: 32 }}>
          <div style={{ padding: 24, background: theme.surface, border: `1px solid ${theme.borderStrong}`, borderRadius: 8 }}>
            <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
              <span
                style={{
                  padding: "4px 10px",
                  fontSize: 12,
                  fontWeight: 510,
                  borderRadius: 4,
                  background: priorityColors[requirement.priority]?.bg,
                  color: priorityColors[requirement.priority]?.color,
                }}
              >
                {requirement.priority || "medium"}
              </span>
              <span
                style={{
                  padding: "4px 10px",
                  fontSize: 12,
                  fontWeight: 510,
                  borderRadius: 4,
                  background: statusColors[requirement.status]?.bg,
                  color: statusColors[requirement.status]?.color,
                }}
              >
                {requirement.status || "draft"}
              </span>
            </div>

            <h1 style={{ margin: "0 0 20px", fontSize: 24, fontWeight: 590, letterSpacing: "-0.4px" }}>{requirement.title}</h1>

            <div style={{ padding: 16, background: theme.bg, borderRadius: 6, marginBottom: 16 }}>
              <pre style={{ margin: 0, fontSize: 14, lineHeight: 1.7, color: theme.text, whiteSpace: "pre-wrap", fontFamily: "inherit" }}>
                {requirement.content}
              </pre>
            </div>

            {requirement.tags && requirement.tags.length > 0 && (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {requirement.tags.map((tag: string, i: number) => (
                  <span key={i} style={{ padding: "4px 10px", fontSize: 12, background: "rgba(94,106,210,0.1)", color: theme.primary, borderRadius: 4 }}>
                    {tag}
                  </span>
                ))}
              </div>
            )}

            <div style={{ marginTop: 20, paddingTop: 16, borderTop: `1px solid ${theme.border}`, display: "flex", gap: 24, fontSize: 13, color: theme.muted }}>
              <span>Created: {new Date(requirement.created_at).toLocaleDateString()}</span>
              {project && <span>Project: {project.name}</span>}
            </div>
          </div>
        </section>

        {/* AI Analysis Result */}
        {analysisResult && (
          <section style={{ marginBottom: 32 }}>
            <h2 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 590, color: theme.text }}>⚡ AI 分析结果</h2>
            <div style={{ padding: 24, background: theme.surface, border: `1px solid ${theme.borderStrong}`, borderRadius: 8 }}>
              <p style={{ margin: "0 0 16px", fontSize: 14, color: theme.text, lineHeight: 1.7 }}>{analysisResult.summary}</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
                <div style={{ padding: 12, background: theme.bg, borderRadius: 6 }}>
                  <div style={{ fontSize: 12, color: theme.muted, marginBottom: 4 }}>预估复杂度</div>
                  <div style={{ fontSize: 14, fontWeight: 590, color: analysisResult.estimatedComplexity === 'high' ? '#ffb4b4' : analysisResult.estimatedComplexity === 'medium' ? '#ffd866' : '#4ade80' }}>{analysisResult.estimatedComplexity}</div>
                </div>
                <div style={{ padding: 12, background: theme.bg, borderRadius: 6 }}>
                  <div style={{ fontSize: 12, color: theme.muted, marginBottom: 4 }}>建议优先级</div>
                  <div style={{ fontSize: 14, fontWeight: 590, color: analysisResult.suggestedPriority === 'high' ? '#ffb4b4' : analysisResult.suggestedPriority === 'medium' ? '#ffd866' : '#4ade80' }}>{analysisResult.suggestedPriority}</div>
                </div>
              </div>
              {analysisResult.suggestedTasks && analysisResult.suggestedTasks.length > 0 && (
                <div>
                  <div style={{ fontSize: 12, color: theme.muted, marginBottom: 8 }}>建议任务</div>
                  <ul style={{ margin: 0, paddingLeft: 20 }}>
                    {analysisResult.suggestedTasks.map((task: string, i: number) => (
                      <li key={i} style={{ fontSize: 13, color: theme.text, marginBottom: 4, lineHeight: 1.6 }}>{task}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}