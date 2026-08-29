import React from 'react';

interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  actionLabel,
  onAction,
}) => {
  return (
    <div className="p-12 text-center bg-slate-900/60 border border-slate-800 rounded-xl my-6">
      <div className="w-12 h-12 bg-slate-800 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-4 text-xl">
        🔍
      </div>
      <h3 className="text-base font-bold text-white mb-1">{title}</h3>
      <p className="text-slate-400 text-xs max-w-sm mx-auto mb-6">{description}</p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-4 py-2 rounded-lg transition shadow-lg shadow-blue-600/20"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};
