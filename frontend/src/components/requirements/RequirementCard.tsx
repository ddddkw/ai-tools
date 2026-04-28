import React from 'react';

interface RequirementCardProps {
  requirement: {
    id: string;
    title: string;
    content: string;
    priority: 'low' | 'medium' | 'high';
    tags: string[];
    status: 'draft' | 'analyzing' | 'analyzed' | 'approved';
    created_at: string;
  };
  onEdit?: (requirement: any) => void;
  onDelete?: (id: string) => void;
}

const priorityColors = {
  low: 'bg-gray-100 text-gray-700',
  medium: 'bg-yellow-100 text-yellow-700',
  high: 'bg-red-100 text-red-700',
};

const statusColors = {
  draft: 'bg-gray-100 text-gray-600',
  analyzing: 'bg-blue-100 text-blue-600',
  analyzed: 'bg-purple-100 text-purple-600',
  approved: 'bg-green-100 text-green-600',
};

export default function RequirementCard({ requirement, onEdit, onDelete }: RequirementCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-md p-5 border border-gray-200 hover:shadow-lg transition-shadow">
      <div className="flex justify-between items-start mb-2">
        <h3 className="text-lg font-semibold text-gray-900">{requirement.title}</h3>
        <div className="flex gap-2">
          <button
            onClick={() => onEdit?.(requirement)}
            className="text-gray-500 hover:text-blue-600 p-1"
            title="Edit"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            onClick={() => onDelete?.(requirement.id)}
            className="text-gray-500 hover:text-red-600 p-1"
            title="Delete"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      <div className="mb-3">
        <span className={`inline-block px-2 py-1 text-xs rounded mr-2 ${priorityColors[requirement.priority]}`}>
          {requirement.priority}
        </span>
        <span className={`inline-block px-2 py-1 text-xs rounded ${statusColors[requirement.status]}`}>
          {requirement.status}
        </span>
      </div>

      <p className="text-gray-600 text-sm mb-3 line-clamp-3 whitespace-pre-wrap">
        {requirement.content}
      </p>

      {requirement.tags && requirement.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {requirement.tags.map((tag, index) => (
            <span key={index} className="px-2 py-0.5 bg-blue-50 text-blue-600 text-xs rounded">
              {tag}
            </span>
          ))}
        </div>
      )}

      <div className="text-xs text-gray-400">
        Created: {new Date(requirement.created_at).toLocaleDateString()}
      </div>
    </div>
  );
}
