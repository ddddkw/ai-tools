import React, { useState, useEffect } from 'react';
import RequirementCard from './RequirementCard';
import RequirementForm from './RequirementForm';
import api from '../../utils/api';

interface RequirementListProps {
  projectId: string;
  token: string;
}

export default function RequirementList({ projectId, token }: RequirementListProps) {
  const [requirements, setRequirements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [showForm, setShowForm] = useState(false);
  const [editingRequirement, setEditingRequirement] = useState<any>(null);

  const fetchRequirements = async () => {
    try {
      setLoading(true);
      const result = await api.requirements.listByProject(
        projectId,
        { page, limit: 9, search, status: statusFilter || undefined },
        token
      );
      setRequirements(result.data);
      setTotalPages(result.totalPages);
      setError(null);
    } catch (err) {
      setError('Failed to load requirements');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequirements();
  }, [page, projectId, token]);

  useEffect(() => {
    const debounce = setTimeout(() => {
      setPage(1);
      fetchRequirements();
    }, 300);
    return () => clearTimeout(debounce);
  }, [search, statusFilter]);

  const handleCreate = async (data: any) => {
    await api.requirements.create(projectId, data, token);
    setShowForm(false);
    fetchRequirements();
  };

  const handleUpdate = async (data: any) => {
    await api.requirements.update(editingRequirement.id, data, token);
    setEditingRequirement(null);
    fetchRequirements();
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this requirement?')) {
      await api.requirements.delete(id, token);
      fetchRequirements();
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Requirements</h1>
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          + New Requirement
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search requirements..."
          className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Status</option>
          <option value="draft">Draft</option>
          <option value="analyzing">Analyzing</option>
          <option value="analyzed">Analyzed</option>
          <option value="approved">Approved</option>
        </select>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-10 text-gray-500">Loading requirements...</div>
      ) : requirements.length === 0 ? (
        <div className="text-center py-10 text-gray-500">
          {search || statusFilter
            ? 'No requirements match your filters'
            : 'No requirements yet. Create your first requirement!'}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {requirements.map((req) => (
              <RequirementCard
                key={req.id}
                requirement={req}
                onEdit={(r) => setEditingRequirement(r)}
                onDelete={handleDelete}
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
                Previous
              </button>
              <span className="px-3 py-1">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1 border rounded disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      {(showForm || editingRequirement) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full my-8">
            <h2 className="text-xl font-bold mb-4">
              {editingRequirement ? 'Edit Requirement' : 'Create New Requirement'}
            </h2>
            <RequirementForm
              requirement={editingRequirement}
              onSubmit={editingRequirement ? handleUpdate : handleCreate}
              onCancel={() => {
                setShowForm(false);
                setEditingRequirement(null);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
