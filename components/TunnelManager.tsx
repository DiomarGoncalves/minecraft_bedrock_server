import React, { useEffect, useState, useRef } from 'react';
import { CloudLightning, Power, Copy, Terminal, ExternalLink } from 'lucide-react';
import { CommonProps, TunnelStatus } from '../types';

const TunnelManager: React.FC<CommonProps> = ({ showToast }) => {
  const [status, setStatus] = useState<TunnelStatus>({ running: false, publicAddress: null, logs: [] });
  const [loading, setLoading] = useState(false);
  const logContainerRef = useRef<HTMLDivElement>(null);

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/playit/status');
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
      }
    } catch (e) {
      // Silent fail on polling
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (logContainerRef.current) {
        logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [status.logs]);

  const handleAction = async (action: 'start' | 'stop') => {
    setLoading(true);
    try {
      const res = await fetch(`/api/playit/${action}`, { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast('success', data.message);
        fetchStatus();
      } else {
        showToast('error', data.message || 'Action failed');
      }
    } catch (e) {
      showToast('error', 'Network error');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (status.publicAddress) {
      navigator.clipboard.writeText(status.publicAddress);
      showToast('success', 'Address copied to clipboard!');
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-10">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Status Card */}
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

          <div className="space-y-6">
            <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700/50">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-2">Public Address</label>
                {status.running ? (
                    status.publicAddress ? (
                        <div className="flex items-center justify-between">
                            <code className="text-emerald-400 text-lg font-mono">{status.publicAddress}</code>
                            <button onClick={copyToClipboard} className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-gray-700 rounded-lg">
                                <Copy size={18} />
                            </button>
                        </div>
                    ) : (
                        <div className="text-yellow-500 text-sm animate-pulse flex items-center gap-2">
                             <span>Negotiating tunnel...</span>
                        </div>
                    )
                ) : (
                    <span className="text-gray-500 italic">Tunnel is offline</span>
                )}
            </div>

            <div className="flex gap-4">
               {status.running ? (
                   <button 
                    onClick={() => handleAction('stop')}
                    disabled={loading}
                    className="flex-1 bg-red-600 hover:bg-red-500 text-white py-3 rounded-lg font-bold transition-all shadow-lg shadow-red-900/20 flex items-center justify-center gap-2"
                   >
                    <Power size={18} /> Stop Tunnel
                   </button>
               ) : (
                   <button 
                    onClick={() => handleAction('start')}
                    disabled={loading}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-lg font-bold transition-all shadow-lg shadow-indigo-900/20 flex items-center justify-center gap-2"
                   >
                    <Power size={18} /> Start Tunnel
                   </button>
               )}
            </div>
            
             <p className="text-xs text-gray-500 text-center">
                This runs the <code>playit</code> agent in the background. Ensure the binary is installed.
             </p>
          </div>
        </div>

        {/* Instructions / Info */}
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 shadow-xl flex flex-col justify-center">
            <h4 className="font-bold text-gray-200 mb-4 flex items-center gap-2">
                <ExternalLink size={18} /> Quick Guide
            </h4>
            <ul className="space-y-3 text-sm text-gray-400">
                <li className="flex items-start gap-2">
                    <span className="bg-gray-700 text-white w-5 h-5 rounded-full flex items-center justify-center text-xs shrink-0 mt-0.5">1</span>
                    <span>Start the tunnel using the button on the left.</span>
                </li>
                <li className="flex items-start gap-2">
                    <span className="bg-gray-700 text-white w-5 h-5 rounded-full flex items-center justify-center text-xs shrink-0 mt-0.5">2</span>
                    <span>Wait for the <strong>Public Address</strong> to appear (e.g., <code>xxx.playit.gg:12345</code>).</span>
                </li>
                <li className="flex items-start gap-2">
                    <span className="bg-gray-700 text-white w-5 h-5 rounded-full flex items-center justify-center text-xs shrink-0 mt-0.5">3</span>
                    <span>If this is your first time, check the <strong>Tunnel Log</strong> below for a claim URL to link this agent to your PlayIt account.</span>
                </li>
            </ul>
        </div>
      </div>

      {/* Mini Console for PlayIt */}
      <div className="bg-gray-950 border border-gray-800 rounded-xl overflow-hidden shadow-2xl">
         <div className="bg-gray-900 px-4 py-2 border-b border-gray-800 flex items-center gap-2 text-gray-400">
            <Terminal size={16} />
            <span className="text-xs font-mono uppercase tracking-wider">Tunnel Log (stdout/stderr)</span>
         </div>
         <div ref={logContainerRef} className="h-64 overflow-y-auto p-4 font-mono text-xs text-gray-300 space-y-1">
            {status.logs.length === 0 && <span className="text-gray-600 italic">No logs yet...</span>}
            {status.logs.map((line, idx) => (
                <div key={idx} className="break-all whitespace-pre-wrap">{line}</div>
            ))}
         </div>
      </div>
    </div>
  );
};

export default TunnelManager;