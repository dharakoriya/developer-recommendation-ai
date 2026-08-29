import React from 'react';

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  message = 'Unable to connect to backend service.',
  onRetry,
}) => {
  return (
    <div className="p-6 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs my-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <span className="text-lg">⚠️</span>
        <div>
          <p className="font-bold text-rose-200">API Execution Error</p>
          <p className="text-rose-300/80 mt-0.5">{message}</p>
        </div>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="bg-rose-600 hover:bg-rose-500 text-white font-semibold px-3 py-1.5 rounded-md text-xs transition"
        >
          Try Again
        </button>
      )}
    </div>
  );
};
