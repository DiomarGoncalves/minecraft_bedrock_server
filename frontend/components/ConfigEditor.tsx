import React, { useState, useEffect } from 'react';
import { Save, Search, Settings2 } from 'lucide-react';
import { ServerConfigItem, CommonProps } from '../types';

// Metadata to provide better UI for known properties
const PROPERTY_META: Record<string, { type: 'select' | 'boolean' | 'number' | 'text', options?: string[], label?: string, desc?: string }> = {
  'gamemode': { 
    type: 'select', 
    options: ['survival', 'creative', 'adventure'], 
    label: 'Game Mode',
    desc: 'Sets the game mode for new players.' 
  },
  'difficulty': { 
    type: 'select', 
    options: ['peaceful', 'easy', 'normal', 'hard'], 
    label: 'Difficulty',
    desc: 'Sets the difficulty of the world.'
  },
  'allow-cheats': { 
    type: 'boolean', 
    label: 'Allow Cheats',
    desc: 'If true, achievements are disabled.'
  },
  'online-mode': { 
    type: 'boolean', 
    label: 'Online Mode',
    desc: 'If true, players must sign in to Xbox Live.'
  },
  'white-list': { 
    type: 'boolean', 
    label: 'Whitelist',
    desc: 'If true, only listed players can join.'
  },
  'server-port': { type: 'number', label: 'Server Port' },
  'server-portv6': { type: 'number', label: 'Server Port (IPv6)' },
  'max-players': { type: 'number', label: 'Max Players' },
  'view-distance': { type: 'number', label: 'View Distance' },
  'tick-distance': { type: 'number', label: 'Tick Distance' },
  'level-name': { type: 'text', label: 'Level Name' },
  'level-seed': { type: 'text', label: 'Level Seed' },
  'texturepack-required': { type: 'boolean', label: 'Require Texture Pack' },
  'content-log-file-enabled': { type: 'boolean', label: 'Enable Content Log' },
};

const ConfigEditor: React.FC<CommonProps> = ({ showToast }) => {
  const [config, setConfig] = useState<ServerConfigItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetch('/config/server')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setConfig(data);
        setLoading(false);
      })
      .catch(() => {
        showToast('error', 'Failed to load configuration');
        setLoading(false);
      });
  }, [showToast]);

  const handleChange = (key: string, newValue: string) => {
    setConfig(prev => prev.map(item => item.key === key ? { ...item, value: newValue } : item));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/config/server', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      if (res.ok) {
        showToast('success', 'Configuration saved successfully! Restart server to apply.');
      } else {
        showToast('error', 'Failed to save configuration.');
      }
    } catch (e) {
      showToast('error', 'Network error while saving.');
    } finally {
      setSaving(false);
    }
  };

  const filteredConfig = config.filter(item => 
    item.key.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (PROPERTY_META[item.key]?.label || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const renderInput = (item: ServerConfigItem) => {
    const meta = PROPERTY_META[item.key] || { type: 'text' };

    switch (meta.type) {
      case 'boolean':
        return (
            <button 
                onClick={() => handleChange(item.key, item.value === 'true' ? 'false' : 'true')}
                className={`w-14 h-7 rounded-full p-1 transition-colors duration-200 ease-in-out ${item.value === 'true' ? 'bg-emerald-600' : 'bg-gray-700'}`}
            >
                <div className={`bg-white w-5 h-5 rounded-full shadow-md transform transition-transform duration-200 ${item.value === 'true' ? 'translate-x-7' : 'translate-x-0'}`} />
            </button>
        );
      case 'select':
        return (
          <select
            value={item.value}
            onChange={(e) => handleChange(item.key, e.target.value)}
            className="w-full bg-gray-900 border border-gray-700 text-white px-3 py-2 rounded focus:outline-none focus:border-emerald-500 transition-colors text-sm"
          >
            {meta.options?.map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        );
      case 'number':
        return (
          <input
            type="number"
            value={item.value}
            onChange={(e) => handleChange(item.key, e.target.value)}
            className="w-full bg-gray-900 border border-gray-700 text-white px-3 py-2 rounded focus:outline-none focus:border-emerald-500 transition-colors text-sm font-mono"
          />
        );
      default:
        return (
          <input
            type="text"
            value={item.value}
            onChange={(e) => handleChange(item.key, e.target.value)}
            className="w-full bg-gray-900 border border-gray-700 text-white px-3 py-2 rounded focus:outline-none focus:border-emerald-500 transition-colors text-sm font-mono"
          />
        );
    }
  };

  if (loading) return <div className="text-center text-gray-400 mt-10 animate-pulse">Loading configuration...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-10">
      {/* Header & Toolbar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gray-800/50 p-6 rounded-xl border border-gray-700 backdrop-blur-sm">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Settings2 className="text-emerald-500" />
            Server Properties
          </h2>
          <p className="text-gray-400 text-sm mt-1">Changes require a server restart.</p>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                <input 
                    type="text" 
                    placeholder="Search settings..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 text-gray-200 pl-9 pr-4 py-2 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                />
            </div>
            <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-lg shadow-emerald-900/20"
            >
            <Save size={18} />
            <span className="hidden sm:inline">{saving ? 'Saving...' : 'Save'}</span>
            </button>
        </div>
      </div>

      {/* Config Grid */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden shadow-xl">
        <div className="divide-y divide-gray-700/50">
          {filteredConfig.map((item) => {
             const meta = PROPERTY_META[item.key];
             return (
                <div key={item.key} className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4 items-center hover:bg-gray-700/30 transition-colors">
                <div className="md:col-span-1">
                    <label className="text-sm font-semibold text-gray-200 block">
                        {meta?.label || item.key}
                    </label>
                    <span className="text-xs text-gray-500 font-mono break-all">{item.key}</span>
                    {meta?.desc && <p className="text-xs text-gray-400 mt-1">{meta.desc}</p>}
                </div>
                <div className="md:col-span-2">
                    {renderInput(item)}
                </div>
                </div>
            );
          })}
          
          {filteredConfig.length === 0 && (
              <div className="p-12 text-center text-gray-500 flex flex-col items-center">
                  <Search size={48} className="mb-4 opacity-20" />
                  <p>No settings match your search.</p>
              </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConfigEditor;