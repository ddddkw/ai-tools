import React, { useState, useEffect } from 'react';
import ProjectCard from './ProjectCard';
import ProjectForm from './ProjectForm';
import api from '../../utils/api';

interface ProjectListProps {
  token: string;
}

export default function ProjectList({ token }: ProjectListProps) {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingProject, setEditingProject] = useState<any>(null);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const result = await api.projects.list({ page, limit: 9, search }, token);
      setProjects(result.data);
      setTotalPages(result.totalPages);
      setError(null);
    } catch (err) {
      setError('加载项目失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [page, token]);

  useEffect(() => {
    const debounce = setTimeout(() => {
      setPage(1);
      fetchProjects();
    }, 300);
    return () => clearTimeout(debounce);
  }, [search]);

  const handleCreate = async (data: any) => {
    await api.projects.create(data, token);
    setShowForm(false);
    fetchProjects();
  };

  const handleUpdate = async (data: any) => {
    await api.projects.update(editingProject.id, data, token);
    setEditingProject(null);
    fetchProjects();
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('确定要删除吗？这将删除该项目下的所有需求。')) {
      await api.projects.delete(id, token);
      fetchProjects();
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 style={{ color: "#ffffff", fontSize: "1.5rem", fontWeight: "700" }}>我的项目</h1>
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          + New Project
        </button>
      </div>

      <div className="mb-6">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="搜索项目..."
          className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-10 text-gray-500">正在加载项目...</div>
      ) : projects.length === 0 ? (
        <div className="text-center py-10 text-gray-500">
          {search ? '没有找到匹配的项目' : '还没有项目，创建你的第一个项目吧！'}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onEdit={(p) => setEditingProject(p)}
                onDelete={handleDelete}
                onView={(id) => window.location.href = `/projects/${id}`}
              />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-6">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 border rounded disabled:opacity-50"
              >
                上一页
              </button>
              <span className="px-3 py-1">
                第 {page} 页，共 {totalPages} 页
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1 border rounded disabled:opacity-50"
              >
                下一页
              </button>
            </div>
          )}
        </>
      )}

      {(showForm || editingProject) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">
              {editingProject ? '编辑项目' : '创建新项目'}
            </h2>
            <ProjectForm
              project={editingProject}
              onSubmit={editingProject ? handleUpdate : handleCreate}
              onCancel={() => {
                setShowForm(false);
                setEditingProject(null);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
