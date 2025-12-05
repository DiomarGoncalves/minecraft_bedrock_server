
import React, { useState, useEffect } from 'react';
import { Globe, Plus, Play, Trash2, Archive, Calendar, HardDrive, Settings, ArrowLeft, ToggleLeft, ToggleRight, Layers, FileDigit, Upload, Download, Search, CheckCircle, Package, FlaskConical, Gamepad2, Info, ChevronRight, AlertTriangle } from 'lucide-react';
import { CommonProps, World, WorldBackup, WorldAddonStatus, WorldExperiments, ServerStatus } from '../types';

const WorldManager: React.FC<CommonProps> = ({ showToast }) => {
  const [worlds, setWorlds] = useState<World[]>([]);
  const [selectedWorldId, setSelectedWorldId] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
  
  const [isCreating, setIsCreating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  useEffect(() => { fetchWorlds(); }, []);

  const fetchWorlds = async () => {
    try {
        const res = await fetch('/api/worlds');
        if (res.ok) setWorlds(await res.json());
    } catch {}
  };

  const selectedWorld = worlds.find(w => w.id === selectedWorldId);

  return (
    <div className="flex h-full bg-gray-900 overflow-hidden">
        {/* SIDEBAR: World List */}
        <div className={`w-full md:w-80 flex flex-col border-r border-gray-800 bg-gray-950 ${selectedWorldId ? 'hidden md:flex' : 'flex'}`}>
            <div className="p-5 border-b border-gray-800">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2"><Globe size={18} className="text-emerald-500"/> Worlds</h2>
                    <div className="flex gap-1">
                        <button onClick={() => setIsImporting(true)} className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-white transition-colors" title="Import World"><Upload size={16}/></button>
                        <button onClick={() => setIsCreating(true)} className="p-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-white transition-colors shadow-lg shadow-emerald-900/20" title="Create World"><Plus size={16}/></button>
                    </div>
                </div>
                <div className="relative group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-emerald-500 transition-colors" size={14} />
                    <input 
                        type="text" 
                        placeholder="Search worlds..." 
                        value={filter}
                        onChange={e => setFilter(e.target.value)}
                        className="w-full bg-gray-900 border border-gray-800 rounded-lg pl-9 pr-3 py-2.5 text-sm text-gray-300 focus:border-emerald-500 focus:outline-none transition-all"
                    />
                </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-3 space-y-1">
                {worlds.filter(w => w.name.toLowerCase().includes(filter.toLowerCase())).map(world => (
                    <div 
                        key={world.id}
                        onClick={() => setSelectedWorldId(world.id)}
                        className={`p-3 rounded-xl cursor-pointer transition-all flex items-center justify-between group border ${selectedWorldId === world.id ? 'bg-gray-800 border-emerald-500/30' : 'bg-transparent border-transparent hover:bg-gray-900'}`}
                    >
                        <div className="flex items-center gap-3 overflow-hidden">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${world.isActive ? 'bg-emerald-500/10 text-emerald-500' : 'bg-gray-800 text-gray-500'}`}>
                                <HardDrive size={20} />
                            </div>
                            <div className="min-w-0">
                                <h3 className={`font-medium truncate text-sm ${selectedWorldId === world.id ? 'text-white' : 'text-gray-300 group-hover:text-white'}`}>{world.name}</h3>
                                <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                                    <Calendar size={10}/> {new Date(world.lastModified).toLocaleDateString()}
                                </p>
                            </div>
                        </div>
                        {world.isActive ? (
                            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)] animate-pulse"></div>
                        ) : (
                            <ChevronRight size={16} className="text-gray-700 opacity-0 group-hover:opacity-100 transition-opacity" />
                        )}
                    </div>
                ))}
            </div>
        </div>

        {/* MAIN: Details */}
        <div className={`flex-1 flex flex-col bg-gray-900 overflow-hidden ${!selectedWorldId ? 'hidden md:flex' : 'flex'}`}>
            {selectedWorld ? (
                <WorldDetailView 
                    world={selectedWorld} 
                    showToast={showToast} 
                    onBack={() => setSelectedWorldId(null)}
                    onRefresh={fetchWorlds}
                />
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-600 p-8 text-center bg-gray-900/50">
                    <div className="w-24 h-24 bg-gray-800 rounded-full flex items-center justify-center mb-6">
                        <Globe size={48} className="opacity-50" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-300">No World Selected</h3>
                    <p className="max-w-xs mt-2 text-gray-500">Select a world from the sidebar to manage addons, backups, and experiments.</p>
                </div>
            )}
        </div>

        {/* Modals */}
        {isCreating && <CreateWorldModal onClose={() => setIsCreating(false)} onSuccess={() => { setIsCreating(false); fetchWorlds(); }} showToast={showToast} />}
        {isImporting && <ImportWorldModal onClose={() => setIsImporting(false)} onSuccess={() => { setIsImporting(false); fetchWorlds(); }} showToast={showToast} />}
    </div>
  );
};

// --- Sub Components ---

const WorldDetailView: React.FC<{ world: World, showToast: any, onBack: () => void, onRefresh: () => void }> = ({ world, showToast, onBack, onRefresh }) => {
    const [tab, setTab] = useState<'overview' | 'addons' | 'experiments' | 'gamerules' | 'backups'>('overview');

    const activateWorld = async () => {
        try {
            await fetch(`/api/worlds/${world.id}/activate`, { method: 'POST' });
            showToast('success', 'World Activated', 'Restart server to apply.');
            onRefresh();
        } catch { showToast('error', 'Failed to activate'); }
    };

    const deleteWorld = async () => {
        if (!confirm('Delete this world permanently?')) return;
        try {
            await fetch(`/api/worlds/${world.id}`, { method: 'DELETE' });
            showToast('success', 'World Deleted');
            onRefresh();
            onBack();
        } catch { showToast('error', 'Failed to delete'); }
    };

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="bg-gray-900 border-b border-gray-800 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="md:hidden p-2 text-gray-400 hover:text-white bg-gray-800 rounded-lg"><ArrowLeft size={20}/></button>
                    <div>
                        <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                            {world.name}
                            {world.isActive && <span className="bg-emerald-500/10 text-emerald-400 text-xs px-2 py-1 rounded border border-emerald-500/20 uppercase tracking-wide font-bold">Active World</span>}
                        </h2>
                        <div className="flex items-center gap-3 mt-1 text-sm text-gray-500 font-mono">
                            <span>{world.id}</span>
                            <span>•</span>
                            <span><span>{(world.sizeBytes / 1024 / 1024).toFixed(2)} MB</span></span>
                        </div>
                    </div>
                </div>
                <div className="flex gap-3">
                    {!world.isActive && (
                        <button onClick={activateWorld} className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-lg font-bold flex items-center gap-2 shadow-lg shadow-emerald-900/20 transition-all active:scale-95">
                            <Play size={18} fill="currentColor" /> <span>Activate</span>
                        </button>
                    )}
                    <button onClick={deleteWorld} className="bg-gray-800 hover:bg-red-900/30 text-gray-400 hover:text-red-400 border border-gray-700 hover:border-red-800 px-3 py-2 rounded-lg transition-colors">
                        <Trash2 size={18} />
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-800 bg-gray-900 px-6 overflow-x-auto">
                {[
                    { id: 'overview', icon: Info, label: 'Overview' },
                    { id: 'addons', icon: Layers, label: 'Addons' },
                    { id: 'experiments', icon: FlaskConical, label: 'Experiments' },
                    { id: 'gamerules', icon: Gamepad2, label: 'Gamerules' },
                    { id: 'backups', icon: Archive, label: 'Backups' },
                ].map(t => (
                    <button 
                        key={t.id} 
                        onClick={() => setTab(t.id as any)} 
                        className={`flex items-center gap-2 px-5 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${tab === t.id ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-gray-400 hover:text-white hover:bg-gray-800/50'}`}
                    >
                        <t.icon size={16} />
                        {t.label}
                    </button>
                ))}
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-black/20">
                <div className="max-w-5xl mx-auto">
                    {tab === 'overview' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                                <h3 className="text-lg font-bold text-white mb-4">World Information</h3>
                                <div className="space-y-4">
                                    <div className="flex justify-between border-b border-gray-700 pb-2">
                                        <span className="text-gray-400">Folder Name</span>
                                        <span className="text-white font-mono text-sm">{world.id}</span>
                                    </div>
                                    <div className="flex justify-between border-b border-gray-700 pb-2">
                                        <span className="text-gray-400">Size</span>
                                        <span className="text-white font-mono text-sm"><span>{(world.sizeBytes / 1024).toFixed(1)} KB</span></span>
                                    </div>
                                    <div className="flex justify-between border-b border-gray-700 pb-2">
                                        <span className="text-gray-400">Last Modified</span>
                                        <span className="text-white font-mono text-sm">{new Date(world.lastModified).toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 flex flex-col items-center justify-center text-center">
                                <HardDrive size={48} className="text-emerald-500 mb-4 opacity-50" />
                                <h3 className="text-white font-bold text-lg">{world.name}</h3>
                                <p className="text-gray-400 text-sm mt-2">Manage your world settings, addons and backups using the tabs above.</p>
                            </div>
                        </div>
                    )}
                    
                    {tab === 'addons' && <WorldAddonsTab worldId={world.id} showToast={showToast} />}
                    {tab === 'experiments' && <ExperimentsTab world={world} showToast={showToast} onRefresh={onRefresh} />}
                    {tab === 'backups' && <WorldBackupsTab worldId={world.id} showToast={showToast} />}
                    {tab === 'gamerules' && <GamerulesTab worldId={world.id} showToast={showToast} />}
                </div>
            </div>
        </div>
    );
};

// --- TAB: ADDONS ---
const WorldAddonsTab: React.FC<{ worldId: string, showToast: any }> = ({ worldId, showToast }) => {
    const [addons, setAddons] = useState<WorldAddonStatus[]>([]);
    const [search, setSearch] = useState('');
    
    const fetchAddons = async () => {
        const res = await fetch(`/api/worlds/${worldId}/addons`);
        if (res.ok) setAddons(await res.json());
    };

    const toggle = async (addonId: string, enabled: boolean) => {
        try {
            await fetch(`/api/worlds/${worldId}/addons`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ addonId, enabled })
            });
            fetchAddons();
            showToast('success', `Addon ${enabled ? 'Enabled' : 'Disabled'}`);
        } catch { showToast('error', 'Failed to toggle addon'); }
    };

    useEffect(() => { fetchAddons(); }, [worldId]);

    const renderSection = (title: string, type: 'behavior' | 'resource', icon: any) => {
        const filtered = addons
            .filter(a => a.type === type)
            .filter(a => a.name.toLowerCase().includes(search.toLowerCase()));

        return (
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-4 p-3 bg-gray-800/50 rounded-lg border border-gray-700/50">
                    {icon}
                    <div>
                        <h3 className="text-lg font-bold text-white">{title}</h3>
                        <p className="text-xs text-gray-500">{filtered.length} installed</p>
                    </div>
                </div>
                
                {filtered.length === 0 ? (
                    <div className="text-center py-8 border-2 border-dashed border-gray-800 rounded-xl">
                        <p className="text-gray-500">No {type} packs matching "{search}" found.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-3">
                        {filtered.map(a => (
                            <div key={a.id} className={`flex items-center justify-between p-4 rounded-xl border transition-all ${a.enabled ? 'bg-emerald-900/10 border-emerald-500/30' : 'bg-gray-800 border-gray-700 opacity-80 hover:opacity-100'}`}>
                                <div className="flex items-center gap-4">
                                    <div className={`p-2 rounded-lg ${a.enabled ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-700 text-gray-400'}`}>
                                        <Package size={20} />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-gray-200">{a.name}</h4>
                                        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500 font-mono mt-1">
                                            <span className="bg-gray-900 px-1.5 rounded">v{Array.isArray(a.version) ? a.version.join('.') : a.version}</span>
                                            <span>{a.uuid}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className={`text-xs font-bold uppercase tracking-wider ${a.enabled ? 'text-emerald-500' : 'text-gray-600'}`}>{a.enabled ? 'Active' : 'Disabled'}</span>
                                    <button 
                                        onClick={() => toggle(a.id, !a.enabled)} 
                                        className={`w-12 h-6 rounded-full p-1 transition-colors duration-200 ${a.enabled ? 'bg-emerald-600' : 'bg-gray-600'}`}
                                    >
                                        <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${a.enabled ? 'translate-x-6' : 'translate-x-0'}`} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="max-w-4xl mx-auto">
            <div className="mb-6 relative">
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                 <input 
                    type="text" 
                    placeholder="Search installed addons..." 
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl pl-10 pr-4 py-3 text-white focus:border-emerald-500 focus:outline-none"
                 />
            </div>
            {renderSection('Behavior Packs', 'behavior', <Layers className="text-purple-400" />)}
            {renderSection('Resource Packs', 'resource', <FileDigit className="text-blue-400" />)}
        </div>
    );
};

// --- TAB: EXPERIMENTS ---
const ExperimentsTab: React.FC<{ world: World, showToast: any, onRefresh: () => void }> = ({ world, showToast, onRefresh }) => {
    const [experiments, setExperiments] = useState<WorldExperiments>(world.experiments || {});
    
    // Common Bedrock Experiments
    const options = [
        { key: 'gametest', label: 'Beta APIs', desc: 'Enable Gametest Framework & Scripts' },
        { key: 'experiments', label: 'Holiday Creator Features', desc: 'Unlock experimental creator blocks & items' },
        { key: 'custom_biomes', label: 'Custom Biomes', desc: 'Allow addon-created biomes' },
        { key: 'upcoming_creator_features', label: 'Upcoming Creator Features', desc: 'New addon capabilities' }
    ];

    const toggle = async (key: string) => {
        const newVal = !experiments[key];
        const updated = { ...experiments, [key]: newVal };
        setExperiments(updated);
        
        try {
            await fetch(`/api/worlds/${world.id}/experiments`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(updated)
            });
            onRefresh();
        } catch { showToast('error', 'Failed to save'); }
    };

    return (
        <div className="max-w-3xl mx-auto">
            <div className="bg-yellow-900/20 border border-yellow-700/50 p-4 rounded-xl mb-8 flex gap-3">
                <FlaskConical className="text-yellow-500 shrink-0" />
                <div className="text-yellow-200 text-sm">
                    <p className="font-bold mb-1">Warning: Experimental Features</p>
                    <p>Enabling these features may make the world unstable. Many complex addons require "Beta APIs" or "Holiday Creator Features".</p>
                </div>
            </div>

            <div className="grid gap-4">
                {options.map(opt => (
                    <div key={opt.key} className="bg-gray-800 p-5 rounded-xl border border-gray-700 flex items-center justify-between">
                        <div>
                            <h4 className="font-bold text-white text-lg">{opt.label}</h4>
                            <p className="text-sm text-gray-500">{opt.desc}</p>
                        </div>
                        <button 
                            onClick={() => toggle(opt.key)} 
                            className={`w-14 h-7 rounded-full p-1 transition-colors duration-200 ease-in-out ${experiments[opt.key] ? 'bg-emerald-600' : 'bg-gray-700'}`}
                        >
                            <div className={`bg-white w-5 h-5 rounded-full shadow-md transform transition-transform duration-200 ${experiments[opt.key] ? 'translate-x-7' : 'translate-x-0'}`} />
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};

// --- TAB: GAMERULES ---
const GamerulesTab: React.FC<{ worldId: string, showToast: any }> = ({ worldId, showToast }) => {
    const [online, setOnline] = useState(false);

    useEffect(() => {
        // Check server status to enable/disable controls
        fetch('/api/server/status')
            .then(res => res.json())
            .then(data => setOnline(data.status === 'ONLINE'))
            .catch(() => setOnline(false));
    }, []);

    const rules = [
        { key: 'keepinventory', label: 'Keep Inventory', desc: 'Keep items after death' },
        { key: 'showcoordinates', label: 'Show Coordinates', desc: 'Display XYZ position' },
        { key: 'dodaylightcycle', label: 'Daylight Cycle', desc: 'Sun/Moon movement' },
        { key: 'domobspawning', label: 'Mob Spawning', desc: 'Natural mob spawning' },
        { key: 'mobgriefing', label: 'Mob Griefing', desc: 'Creepers damage blocks' },
        { key: 'pvp', label: 'PVP', desc: 'Player vs Player damage' },
    ];

    const setRule = async (rule: string, val: boolean) => {
        if (!online) {
            showToast('error', 'Server must be ONLINE to change gamerules.');
            return;
        }
        try {
            const res = await fetch(`/api/worlds/${worldId}/gamerule`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ rule, value: val.toString() })
            });
            if (res.ok) showToast('success', `Set ${rule} to ${val}`);
            else showToast('error', 'Command failed');
        } catch { showToast('error', 'Network error'); }
    };

    return (
        <div className="max-w-3xl mx-auto">
             <div className={`p-4 rounded-xl mb-6 flex gap-3 border ${online ? 'bg-blue-900/20 border-blue-700/50' : 'bg-red-900/20 border-red-700/50'}`}>
                {online ? <Settings className="text-blue-400 shrink-0" /> : <AlertTriangle className="text-red-400 shrink-0" />}
                <div className={`text-sm ${online ? 'text-blue-200' : 'text-red-200'}`}>
                    <p className="font-bold">Live Configuration</p>
                    {online ? (
                        <p>Gamerules are injected via console commands. Changes apply immediately.</p>
                    ) : (
                        <p>Server is <strong>OFFLINE</strong>. Start the server to configure gamerules.</p>
                    )}
                </div>
             </div>
             
             <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${!online ? 'opacity-50 pointer-events-none' : ''}`}>
                 {rules.map(r => (
                     <div key={r.key} className="bg-gray-800 p-4 rounded-xl border border-gray-700 flex flex-col justify-between hover:bg-gray-750 transition-colors">
                         <div className="mb-4">
                             <h4 className="font-bold text-white">{r.label}</h4>
                             <p className="text-xs text-gray-500 mt-1">{r.desc}</p>
                         </div>
                         <div className="flex gap-2 bg-gray-900 p-1 rounded-lg self-start">
                            <button onClick={() => setRule(r.key, true)} className="px-4 py-1.5 hover:bg-emerald-600 hover:text-white rounded text-xs font-bold text-gray-400 transition-all">ON</button>
                            <button onClick={() => setRule(r.key, false)} className="px-4 py-1.5 hover:bg-red-600 hover:text-white rounded text-xs font-bold text-gray-400 transition-all">OFF</button>
                         </div>
                     </div>
                 ))}
             </div>
        </div>
    );
};

// --- TAB: BACKUPS ---
const WorldBackupsTab: React.FC<{ worldId: string, showToast: any }> = ({ worldId, showToast }) => {
    const [backups, setBackups] = useState<WorldBackup[]>([]);
    
    const fetchBackups = async () => {
        const res = await fetch(`/api/worlds/${worldId}/backups`);
        if (res.ok) setBackups(await res.json());
    };

    const createBackup = async () => {
        showToast('info', 'Creating Backup...');
        await fetch(`/api/worlds/${worldId}/backups`, { method: 'POST' });
        showToast('success', 'Backup Created');
        fetchBackups();
    };

    useEffect(() => { fetchBackups(); }, [worldId]);

    return (
        <div className="max-w-3xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h3 className="text-lg font-bold text-white">Backups</h3>
                    <p className="text-gray-400 text-sm">Downloadable zip snapshots of this world.</p>
                </div>
                <button onClick={createBackup} className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-lg flex items-center gap-2 font-medium shadow-lg shadow-blue-900/20"><Archive size={18} /> <span>Create New</span></button>
            </div>
            <div className="space-y-3">
                {backups.length === 0 && (
                    <div className="text-center py-12 bg-gray-800/50 rounded-xl border border-gray-800 border-dashed">
                        <Archive className="mx-auto text-gray-600 mb-2" size={32} />
                        <p className="text-gray-500">No backups found.</p>
                    </div>
                )}
                {backups.map(b => (
                    <div key={b.filename} className="bg-gray-800 p-4 rounded-xl border border-gray-700 flex justify-between items-center">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-gray-900 rounded-lg text-emerald-500"><Package size={20} /></div>
                            <div>
                                <p className="text-white font-bold">{new Date(b.date).toLocaleString()}</p>
                                <p className="text-xs text-gray-500 font-mono mt-1">{b.filename}</p>
                            </div>
                        </div>
                        <span className="text-xs font-mono text-gray-400 bg-gray-950 px-3 py-1.5 rounded-lg border border-gray-800">{(b.sizeBytes / 1024 / 1024).toFixed(2)} MB</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

// --- Modals ---
const CreateWorldModal: React.FC<{ onClose: () => void, onSuccess: () => void, showToast: any }> = ({ onClose, onSuccess, showToast }) => {
    const [data, setData] = useState({ name: '', seed: '', gamemode: 'survival', difficulty: 'easy' });
    
    const submit = async () => {
        if (!data.name) return;
        try {
            const res = await fetch('/api/worlds', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(data)
            });
            if (res.ok) { onSuccess(); showToast('success', 'World Created'); }
            else showToast('error', 'Failed');
        } catch { showToast('error', 'Error'); }
    };

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-md border border-gray-700 shadow-2xl">
                <h3 className="text-xl font-bold text-white mb-6">Create New World</h3>
                <div className="space-y-4">
                    <div>
                        <label className="text-xs uppercase text-gray-500 font-bold mb-1 block">World Name</label>
                        <input className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white focus:border-emerald-500 focus:outline-none" placeholder="My New World" value={data.name} onChange={e => setData({...data, name: e.target.value})} />
                    </div>
                    <div>
                        <label className="text-xs uppercase text-gray-500 font-bold mb-1 block">Seed (Optional)</label>
                        <input className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white focus:border-emerald-500 focus:outline-none" placeholder="Random" value={data.seed} onChange={e => setData({...data, seed: e.target.value})} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                             <label className="text-xs uppercase text-gray-500 font-bold mb-1 block">Gamemode</label>
                            <select className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white focus:border-emerald-500 focus:outline-none" value={data.gamemode} onChange={e => setData({...data, gamemode: e.target.value})}>
                                <option value="survival">Survival</option>
                                <option value="creative">Creative</option>
                            </select>
                        </div>
                        <div>
                             <label className="text-xs uppercase text-gray-500 font-bold mb-1 block">Difficulty</label>
                            <select className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white focus:border-emerald-500 focus:outline-none" value={data.difficulty} onChange={e => setData({...data, difficulty: e.target.value})}>
                                <option value="easy">Easy</option>
                                <option value="normal">Normal</option>
                                <option value="hard">Hard</option>
                            </select>
                        </div>
                    </div>
                </div>
                <div className="flex justify-end gap-3 mt-8">
                    <button onClick={onClose} className="text-gray-400 hover:text-white px-4 py-2">Cancel</button>
                    <button onClick={submit} className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2 rounded-lg font-bold">Create World</button>
                </div>
            </div>
        </div>
    );
};

const ImportWorldModal: React.FC<{ onClose: () => void, onSuccess: () => void, showToast: any }> = ({ onClose, onSuccess, showToast }) => {
    const [uploading, setUploading] = useState(false);
    
    const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.length) return;
        setUploading(true);
        const fd = new FormData();
        fd.append('file', e.target.files[0]);
        try {
            const res = await fetch('/api/worlds/import', { method: 'POST', body: fd });
            if (res.ok) { onSuccess(); showToast('success', 'Imported'); }
            else showToast('error', 'Import Failed');
        } catch { showToast('error', 'Network Error'); }
        finally { setUploading(false); }
    };

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-gray-800 rounded-2xl p-8 w-full max-w-md border border-gray-700 shadow-2xl text-center">
                <div className="w-16 h-16 bg-gray-900 rounded-full flex items-center justify-center mx-auto mb-4 text-emerald-500">
                     <Download size={32} />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Import World</h3>
                <p className="text-gray-400 text-sm mb-8">Upload a <code>.zip</code> or <code>.mcworld</code> file to import an existing world.</p>
                
                <label className={`block w-full cursor-pointer bg-gray-900 border-2 border-dashed border-gray-700 hover:border-emerald-500 hover:bg-gray-800/50 rounded-xl p-8 transition-all ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                    <input type="file" className="hidden" accept=".zip,.mcworld" onChange={handleFile} disabled={uploading} />
                    <span className="text-gray-300 font-medium flex flex-col items-center gap-2">
                        {uploading ? (
                            <span><span>Uploading & Extracting...</span></span>
                        ) : (
                            <>
                                <Upload size={24} className="mb-2 text-gray-500"/>
                                <span>Click to Select File</span>
                            </>
                        )}
                    </span>
                </label>
                
                <button onClick={onClose} className="mt-6 text-gray-500 hover:text-white text-sm">Cancel</button>
            </div>
        </div>
    );
};

export default WorldManager;
