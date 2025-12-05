
import React, { useEffect, useState, useRef } from 'react';
import { CloudLightning, Power, Copy, Terminal, ExternalLink, Download, Loader2 } from 'lucide-react';
import { CommonProps, TunnelStatus } from '../types';

const TunnelManager: React.FC<CommonProps> = ({ showToast }) => {
  const [status, setStatus] = useState<TunnelStatus>({ running: false, publicAddress: null, logs: [], isInstalled: false });
  const [loading, setLoading] = useState(false);
  const [installing, setInstalling] = useState(false);
  const logContainerRef = useRef<HTMLDivElement>(null);

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/playit/status');
      if (res.ok) setStatus(await res.json());
    } catch (e) {}
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (logContainerRef.current) logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
  }, [status.logs]);

  const handleAction = async (action: 'start' | 'stop') => {
    setLoading(true);
    try {
      const res = await fetch(`/api/playit/${action}`, { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast('success', action === 'start' ? 'Tunnel Started' : 'Tunnel Stopped');
        fetchStatus();
      } else {
        showToast('error', 'Action failed');
      }
    } catch (e) { showToast('error', 'Network error'); } 
    finally { setLoading(false); }
  };

  const handleInstall = async () => {
      setInstalling(true);
      showToast('info', 'Installation started', 'Check logs below.');
      try {
          const res = await fetch('/api/playit/install', { method: 'POST' });
          if ((await res.json()).success) {
              showToast('success', 'PlayIt Installed');
              fetchStatus();
          } else {
              showToast('error', 'Installation Failed');
          }
      } catch (e) { showToast('error', 'Network error'); } 
      finally { setInstalling(false); }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-10">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 shadow-xl">
          <div className="flex items-center space-x-3 mb-6">
             <div className={`p-3 rounded-xl ${status.running ? 'bg-indigo-500/20 text-indigo-400' : 'bg-gray-700 text-gray-400'}`}>
                <CloudLightning size={24} />
             </div>
             <div>
                <h3 className="text-xl font-bold text-white">PlayIt Tunnel</h3>
                <p className="text-sm text-gray-400">Expose server to internet</p>
             </div>
          </div>

          {!status.isInstalled ? (
             <div className="space-y-4">
                 <div className="bg-yellow-900/20 border border-yellow-700/50 p-4 rounded-lg text-yellow-200 text-sm">
                     Agent not detected. Install automatically?
                 </div>
                 <button onClick={handleInstall} disabled={installing} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-lg font-bold flex items-center justify-center gap-2">
                    {installing ? <Loader2 className="animate-spin" size={18} /> : <Download size={18} />} 
                    <span>{installing ? 'Installing...' : 'Install via APT'}</span>
                </button>
             </div>
          ) : (
            <div className="space-y-6">
                <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700/50">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-2">Public Address</label>
                    {status.running ? (
                        status.publicAddress ? (
                            <div className="flex items-center justify-between">
                                <code className="text-emerald-400 text-lg font-mono">{status.publicAddress}</code>
                                <button onClick={() => { navigator.clipboard.writeText(status.publicAddress || ''); showToast('success', 'Copied'); }} className="text-gray-400 hover:text-white p-2">
                                    <Copy size={18} />
                                </button>
                            </div>
                        ) : <span className="text-yellow-500 animate-pulse">Negotiating...</span>
                    ) : <span className="text-gray-500 italic">Offline</span>}
                </div>
                <button 
                    onClick={() => handleAction(status.running ? 'stop' : 'start')}
                    disabled={loading}
                    className={`w-full py-3 rounded-lg font-bold flex items-center justify-center gap-2 text-white ${status.running ? 'bg-red-600 hover:bg-red-500' : 'bg-indigo-600 hover:bg-indigo-500'}`}
                >
                    <Power size={18} /> 
                    <span>{status.running ? 'Stop Tunnel' : 'Start Tunnel'}</span>
                </button>
            </div>
          )}
        </div>

        <div className="bg-gray-950 border border-gray-800 rounded-xl overflow-hidden shadow-2xl flex flex-col">
           <div className="bg-gray-900 px-4 py-2 border-b border-gray-800 flex items-center gap-2 text-gray-400">
              <Terminal size={16} />
              <span className="text-xs font-mono uppercase">Tunnel Log</span>
           </div>
           <div ref={logContainerRef} className="flex-1 min-h-[200px] overflow-y-auto p-4 font-mono text-xs text-gray-300 space-y-1">
              {status.logs.map((line, idx) => <div key={idx} className="break-all whitespace-pre-wrap">{line}</div>)}
           </div>
        </div>
      </div>
    </div>
  );
};
export default TunnelManager;
