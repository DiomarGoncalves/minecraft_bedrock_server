import React, { useEffect } from 'react';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';
import { ToastData, ToastType } from '../types';

interface ToastProps {
  toasts: ToastData[];
  removeToast: (id: string) => void;
}

const ToastContainer: React.FC<ToastProps> = ({ toasts, removeToast }) => {
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col space-y-2 pointer-events-none">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={() => removeToast(toast.id)} />
      ))}
    </div>
  );
};

const ToastItem: React.FC<{ toast: ToastData; onRemove: () => void }> = ({ toast, onRemove }) => {
  useEffect(() => {
    const timer = setTimeout(() => { onRemove(); }, 4000);
    return () => clearTimeout(timer);
  }, [onRemove]);

  const icons: Record<ToastType, React.ReactNode> = {
    success: <CheckCircle className="text-emerald-400" size={20} />,
    error: <AlertCircle className="text-red-400" size={20} />,
    info: <Info className="text-blue-400" size={20} />,
  };

  const bgColors: Record<ToastType, string> = {
    success: 'bg-gray-800 border-l-4 border-emerald-500',
    error: 'bg-gray-800 border-l-4 border-red-500',
    info: 'bg-gray-800 border-l-4 border-blue-500',
  };

  return (
    <div className={`${bgColors[toast.type]} p-4 rounded shadow-lg flex items-start space-x-3 min-w-[300px] pointer-events-auto transform transition-all duration-300 animate-slide-in`}>
      <div className="mt-0.5">{icons[toast.type]}</div>
      <div className="flex-1">
        <p className="text-sm font-bold text-gray-100">{toast.title}</p>
        {toast.message && <p className="text-xs text-gray-400 mt-1">{toast.message}</p>}
      </div>
      <button onClick={onRemove} className="text-gray-500 hover:text-white transition-colors"><X size={16} /></button>
    </div>
  );
};
export default ToastContainer;
