import React from 'react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDanger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  isDanger = false,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="glass-panel max-w-md w-full p-6 rounded-2xl border border-slate-700 shadow-2xl space-y-4">
        <h3 className="text-lg font-bold text-slate-100">{title}</h3>
        <p className="text-sm text-slate-400">{message}</p>
        <div className="flex justify-end gap-3 pt-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-xs font-semibold text-slate-300 rounded-lg bg-slate-800 hover:bg-slate-700 transition"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`px-4 py-2 text-xs font-semibold rounded-lg text-white transition ${
              isDanger
                ? 'bg-rose-600 hover:bg-rose-500 shadow-lg shadow-rose-600/20'
                : 'bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/20'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
