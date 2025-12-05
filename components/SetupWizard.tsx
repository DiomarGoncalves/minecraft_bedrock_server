import React, { useState, useEffect } from 'react';
import { Folder, HardDrive, Check, AlertTriangle, ArrowRight } from 'lucide-react';
import { CommonProps } from '../types';

interface SetupWizardProps extends CommonProps {
  onComplete: () => void;
}

const SetupWizard: React.FC<SetupWizardProps> = ({ showToast, onComplete }) => {
  const [cwd, setCwd] = useState('');
  const [pathInput, setPathInput] = useState('');
  const [useDefault, setUseDefault] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Get current working directory from backend for suggestion
    fetch('/api/setup/status')
      .then(res => res.json())
      .then(data => {
        if (data.cwd) {
            setCwd(data.cwd);
            // Suggest a default folder inside the app directory
            setPathInput(`${data.cwd}/mc-server`);
        }
      });
  }, []);

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            path: pathInput, 
            autoCreate: true 
        })
      });

      const data = await res.json();
      
      if (res.ok) {
        showToast('success', 'Server location configured successfully!');
        onComplete();
      } else {
        showToast('error', data.error || 'Failed to configure path');
      }
    } catch (err) {
      showToast('error', 'Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 p-4">
      <div className="max-w-xl w-full bg-gray-800 border border-gray-700 rounded-2xl shadow-2xl p-8 animate-fade-in">
        <div className="text-center mb-8">
            <div className="bg-emerald-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-900/40">
                <HardDrive className="text-white" size={32} />
            </div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Setup Server</h1>
            <p className="text-gray-400 mt-2">Where is your Minecraft Bedrock Server located?</p>
        </div>

        <form onSubmit={handleSetup} className="space-y-6">
            
            <div className="bg-gray-900/50 p-4 rounded-xl border border-gray-700">
                <label className="block text-sm font-medium text-gray-300 mb-2">Server Directory Path</label>
                <div className="relative">
                    <Folder className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                    <input 
                        type="text" 
                        value={pathInput}
                        onChange={(e) => {
                            setPathInput(e.target.value);
                            setUseDefault(false);
                        }}
                        className="w-full bg-gray-800 border border-gray-600 text-white pl-10 pr-4 py-3 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none font-mono text-sm transition-all"
                        placeholder="/path/to/server"
                    />
                </div>
                <p className="text-xs text-gray-500 mt-2 ml-1">
                    Current Environment: <code className="text-gray-400">{cwd || 'Loading...'}</code>
                </p>
            </div>

            <div className="flex items-start space-x-3 p-4 bg-blue-900/20 border border-blue-800/50 rounded-lg">
                <AlertTriangle className="text-blue-400 shrink-0 mt-0.5" size={18} />
                <div className="text-sm text-blue-200/80">
                    <p className="font-semibold mb-1">Important for Linux/Codespaces:</p>
                    <p>Ensure the directory contains the <code>bedrock_server</code> executable. If the folder is empty, we will create the structure for you, but you must manually upload/download the Bedrock Server binary files into it later.</p>
                </div>
            </div>

            <button 
                type="submit" 
                disabled={loading || !pathInput.trim()}
                className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white py-4 rounded-xl font-bold text-lg shadow-lg shadow-emerald-900/20 transition-all transform active:scale-98 flex items-center justify-center space-x-2"
            >
                {loading ? (
                    <span>Configuring...</span>
                ) : (
                    <>
                        <span>Complete Setup</span>
                        <ArrowRight size={20} />
                    </>
                )}
            </button>
        </form>
      </div>
    </div>
  );
};

export default SetupWizard;