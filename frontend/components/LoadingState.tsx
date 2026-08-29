import React from 'react';

interface LoadingStateProps {
  message?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({ message = 'Loading application data...' }) => {
  return (
    <div className="p-12 text-center text-slate-400 my-auto">
      <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent mb-4"></div>
      <p className="text-sm font-medium">{message}</p>
    </div>
  );
};
