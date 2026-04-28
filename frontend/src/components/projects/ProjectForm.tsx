import React, { useState } from 'react';

interface ProjectFormProps {
  project?: {
    id?: string;
    name: string;
    description?: string;
    github_repo?: string;
    github_branch?: string;
  };
  onSubmit: (data: any) => void;
  onCancel: () => void;
}

export default function ProjectForm({ project, onSubmit, onCancel }: ProjectFormProps) {
  const [formData, setFormData] = useState({
    name: project?.name || '',
    description: project?.description || '',
    github_repo: project?.github_repo || '',
    github_branch: project?.github_branch || 'main',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) {
      newErrors.name = '请输入项目名称';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      await onSubmit(formData);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-900 mb-1">
          项目名称 *
        </label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className={"w-full px-3 py-2 border rounded-md text-gray-900 " + (errors.name ? 'border-red-500' : 'border-gray-400') + " focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-500 bg-white"}
          placeholder="我的项目"
        />
        {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-900 mb-1">
          项目描述
        </label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={3}
          className="w-full px-3 py-2 border border-gray-400 rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-500 bg-white"
          placeholder="项目描述（可选）"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-900 mb-1">
          GitHub 仓库
        </label>
        <input
          type="text"
          value={formData.github_repo}
          onChange={(e) => setFormData({ ...formData, github_repo: e.target.value })}
          className="w-full px-3 py-2 border border-gray-400 rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-500 bg-white"
          placeholder="owner/repo"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-900 mb-1">
          GitHub 分支
        </label>
        <input
          type="text"
          value={formData.github_branch}
          onChange={(e) => setFormData({ ...formData, github_branch: e.target.value })}
          className="w-full px-3 py-2 border border-gray-400 rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-500 bg-white"
          placeholder="main"
        />
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
        >
          取消
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? '保存中...' : project?.id ? '更新' : '创建'} 项目
        </button>
      </div>
    </form>
  );
}
