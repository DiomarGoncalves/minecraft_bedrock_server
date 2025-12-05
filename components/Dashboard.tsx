import React, { useEffect, useState, useRef } from 'react';
import { Play, Square, RefreshCw, Cpu, Wifi, AlertTriangle } from 'lucide-react';
import { ServerStatus, CommonProps } from '../types';

interface DashboardProps extends CommonProps {
  onNavigate: (tab: any) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onNavigate, showToast }) => {
  const [status, setStatus] = useState<ServerStatus>(ServerStatus.OFFLINE);
  const [loading, setLoading] = useState(false);
  const [connectionError, setConnectionError] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/server/status');
      if (!res.ok) throw new Error('Backend unavailable');
      const data = await res.json();
      setStatus(data.status);
      setConnectionError(false);
    } catch (e) {
      if (!connectionError) {
        // Only warn once in console to avoid spam
        console.warn("Failed to connect to backend");
      }
      setConnectionError(true);
    }
  };

  useEffect(() => {
    fetchStatus();
    // Poll slower if error, faster if connected
    const intervalTime = connectionError ? 10000 : 3000;
    
    intervalRef.current = setInterval(fetchStatus, intervalTime);
    
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [connectionError]);

  const handleControl = async (action: 'start' | 'stop' | 'restart') => {
    setLoading(true);
    try {
      const res = await fetch(`/api/server/${action}`, { method: 'POST' });
      if (res.ok) {
          showToast('success', `Command sent: ${action}`);
          // Optimistic update or quick refetch
          setTimeout(fetchStatus, 1000); 
      } else {
          showToast('error', `Failed to ${action} server`);
      }
    } catch (e) {
      showToast('error', 'Network error');
    } finally {
      setLoading(false);
    }
  };

  const StatusBadge = () => {
    const colors = {
      [ServerStatus.OFFLINE]: 'bg-red-500/20 text-red-400 border-red-500/50',
      [ServerStatus.ONLINE]: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50',
      [ServerStatus.STARTING]: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
      [ServerStatus.STOPPING]: 'bg-orange-500/20 text-orange-400 border-orange-500/50',
    };

    if (connectionError) {
       return (
        <span className="px-4 py-1.5 rounded-full border text-sm font-semibold tracking-wide bg-gray-500/20 text-gray-400 border-gray-500/50 animate-pulse">
            Connecting...
        </span>
       );
    }

    return (
      <span className={`px-4 py-1.5 rounded-full border text-sm font-semibold tracking-wide ${colors[status]}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {connectionError && (
        <div className="bg-orange-900/50 border border-orange-700/50 text-orange-200 p-4 rounded-xl flex items-center space-x-3 animate-fade-in">
            <AlertTriangle size={20} />
            <span>Backend not reachable. Retrying connection...</span>
        </div>
      )}

      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 flex items-center justify-between shadow-lg">
            <div>
                <p className="text-gray-400 text-sm font-medium uppercase">Server Status</p>
                <div className="mt-2"><StatusBadge /></div>
            </div>
            <Wifi className="text-gray-600" size={32} />
        </div>
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 flex items-center justify-between shadow-lg">
            <div>
                 <p className="text-gray-400 text-sm font-medium uppercase">Platform</p>
                 <p className="text-2xl font-bold text-white mt-1">Linux (Bedrock)</p>
            </div>
            <Cpu className="text-gray-600" size={32} />
        </div>
         <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 flex flex-col justify-center shadow-lg cursor-pointer hover:bg-gray-750 transition-colors" onClick={() => onNavigate('Console')}>
             <p className="text-gray-400 text-sm font-medium uppercase mb-2">Quick Access</p>
             <div className="flex items-center text-emerald-400 font-medium">
                 <span>Open Console</span>
                 <span className="ml-2 text-xl">&rarr;</span>
             </div>
        </div>
      </div>

      {/* Control Panel */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-8 shadow-xl">
        <h3 className="text-xl font-semibold text-white mb-6">Power Controls</h3>
        <div className="flex flex-wrap gap-4">
          <button
            onClick={() => handleControl('start')}
            disabled={connectionError || status === ServerStatus.ONLINE || status === ServerStatus.STARTING || loading}
            className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed text-white px-8 py-4 rounded-xl font-bold transition-all transform active:scale-95 shadow-lg shadow-emerald-900/20"
          >
            <Play size={24} fill="currentColor" />
            <span>START SERVER</span>
          </button>
          
          <button
             onClick={() => handleControl('restart')}
             disabled={connectionError || status === ServerStatus.OFFLINE || loading}
            className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed text-white px-6 py-4 rounded-xl font-bold transition-all transform active:scale-95 shadow-lg shadow-blue-900/20"
          >
            <RefreshCw size={24} />
            <span>RESTART</span>
          </button>

          <button
             onClick={() => handleControl('stop')}
             disabled={connectionError || status === ServerStatus.OFFLINE || status === ServerStatus.STOPPING || loading}
            className="flex items-center space-x-2 bg-red-600 hover:bg-red-500 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed text-white px-6 py-4 rounded-xl font-bold transition-all transform active:scale-95 shadow-lg shadow-red-900/20"
          >
            <Square size={24} fill="currentColor" />
            <span>STOP SERVER</span>
          </button>
        </div>
        <p className="mt-6 text-sm text-gray-400 border-t border-gray-700 pt-4">
            <span className="text-yellow-500">Warning:</span> Stop the server gracefully before restarting the host machine to prevent world corruption.
        </p>
      </div>
    </div>
  );
};

export default Dashboard;