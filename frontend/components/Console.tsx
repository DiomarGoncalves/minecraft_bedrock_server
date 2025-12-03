import React, { useEffect, useRef, useState } from 'react';
import { Send, Terminal, Trash2, ArrowDownCircle, PauseCircle, PlayCircle } from 'lucide-react';
import { ConsoleMessage, CommonProps } from '../types';

const Console: React.FC<CommonProps> = ({ showToast }) => {
  const [logs, setLogs] = useState<ConsoleMessage[]>([]);
  const [input, setInput] = useState('');
  const [connected, setConnected] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const wsRef = useRef<WebSocket | null>(null);
  const logContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const ws = new WebSocket(`${protocol}//${host}/ws/console`);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      addLog('system', 'Connected to server console.');
    };

    ws.onclose = () => {
      setConnected(false);
      addLog('system', 'Disconnected from server console.');
    };

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === 'console') {
          setLogs(prev => {
             const newLogs = [...prev, payload.data].slice(-500); // Increased buffer
             return newLogs;
          }); 
        }
      } catch (e) {
        console.error("WS Parse Error", e);
      }
    };

    return () => {
      ws.close();
    };
  }, []);

  useEffect(() => {
    if (autoScroll && logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  const addLog = (type: 'system' | 'stdout' | 'stderr', msg: string) => {
    setLogs(prev => [...prev, { type, message: msg, timestamp: new Date().toISOString() }]);
  };

  const sendCommand = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        showToast('error', 'Console not connected.');
        return;
    }

    wsRef.current.send(JSON.stringify({ command: 'input', value: input }));
    setInput('');
  };

  const handleClear = () => {
      setLogs([]);
      showToast('info', 'Console cleared');
  };

  const getLogColor = (type: string, msg: string) => {
    if (type === 'stderr') return 'text-red-400';
    if (type === 'system') return 'text-blue-400 italic';
    
    // Simple parsing for Bedrock logs to highlight levels
    if (msg.includes('ERROR]')) return 'text-red-400';
    if (msg.includes('WARN]')) return 'text-yellow-400';
    if (msg.includes('INFO]')) return 'text-gray-300';
    
    return 'text-gray-300';
  };

  return (
    <div className="flex flex-col h-full bg-gray-950 rounded-xl overflow-hidden border border-gray-800 shadow-2xl relative">
      {/* Console Toolbar */}
      <div className="bg-gray-900 px-4 py-2 border-b border-gray-800 flex justify-between items-center">
        <div className="flex items-center space-x-2 text-gray-400">
          <Terminal size={18} />
          <span className="text-sm font-mono hidden sm:inline">root@bedrock-server:~#</span>
        </div>
        <div className="flex items-center space-x-2">
            <button 
                onClick={() => setAutoScroll(!autoScroll)}
                className={`p-1.5 rounded hover:bg-gray-700 transition-colors ${autoScroll ? 'text-emerald-400' : 'text-gray-500'}`}
                title={autoScroll ? "Auto-scroll ON" : "Auto-scroll OFF"}
            >
                {autoScroll ? <ArrowDownCircle size={18} /> : <PauseCircle size={18} />}
            </button>
            <button 
                onClick={handleClear}
                className="p-1.5 rounded hover:bg-gray-700 text-gray-400 hover:text-red-400 transition-colors"
                title="Clear Console"
            >
                <Trash2 size={18} />
            </button>
            <div className="h-4 w-px bg-gray-700 mx-2" />
            <div className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-500' : 'bg-red-500'}`} />
            <span className="text-xs text-gray-500 font-medium">{connected ? 'ONLINE' : 'OFFLINE'}</span>
        </div>
      </div>
      
      {/* Log Area */}
      <div 
        ref={logContainerRef}
        className="flex-1 p-4 overflow-y-auto font-mono text-xs sm:text-sm space-y-0.5 console-scroll bg-black text-gray-300"
      >
        {logs.map((log, idx) => (
          <div key={idx} className={`${getLogColor(log.type, log.message)} break-words whitespace-pre-wrap leading-tight`}>
            <span className="opacity-30 mr-2 select-none text-[10px]">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
            {log.message}
          </div>
        ))}
        {logs.length === 0 && (
            <div className="h-full flex items-center justify-center text-gray-700 flex-col">
                <Terminal size={48} className="mb-2 opacity-20" />
                <p>Console ready. Waiting for logs...</p>
            </div>
        )}
      </div>

      {/* Input Area */}
      <form onSubmit={sendCommand} className="bg-gray-900 p-2 flex items-center border-t border-gray-800">
        <div className="flex-1 relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-500 font-bold font-mono">{'>'}</span>
            <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a command (e.g., 'list', 'op user')"
            className="w-full bg-gray-800 text-white pl-8 pr-4 py-2.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono text-sm placeholder-gray-600"
            disabled={!connected}
            />
        </div>
        <button 
            type="submit" 
            disabled={!connected}
            className="ml-2 p-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
        >
            <Send size={18} />
        </button>
      </form>
    </div>
  );
};

export default Console;