
import React, { useState, useEffect } from 'react';
import { Globe, Plus, Play, Trash2, Archive, Calendar, HardDrive, Settings, ArrowLeft, ToggleLeft, ToggleRight, Layers, FileDigit, Upload, Download, Search, CheckCircle, Package } from 'lucide-react';
import { CommonProps, World, WorldBackup, WorldAddonStatus } from '../types';

const WorldManager: React.FC<CommonProps> = ({ showToast }) => {
  const [worlds, setWorlds] = useState<World[]>([]);
  const [selectedWorldId, setSelectedWorldId] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
  
  // Views
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
        {/* Sidebar List */}
        <div className={`w-full md:w-80 flex flex-col border-r border-gray-800 bg-gray-950 ${selectedWorldId ? 'hidden md:flex' : 'flex'}`}>
            <div className="p-4 border-b border-gray-800">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2"><Globe size={18} className="text-emerald-500"/> Worlds</h2>
                    <div className="flex gap-1">
                        <button onClick={() => setIsImporting(true)} className="p-2 bg-gray-800 hover:bg-gray-700 rounded text-gray-400 hover:text-white" title="Import World"><Upload size={16}/></button>
                        <button onClick={() => setIsCreating(true)} className="p-2 bg-emerald-600 hover:bg-emerald-500 rounded text-white" title="Create World"><Plus size={16}/></button>
                    </div>
                </div>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
                    <input 
                        type="text" 
                        placeholder="Search worlds..." 
                        value={filter}
                        onChange={e => setFilter(e.target.value)}
                        className="w-full bg-gray-900 border border-gray-800 rounded pl-9 pr-3 py-2 text-sm text-gray-300 focus:border-emerald-500 focus:outline-none"
                    />
                </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {worlds.filter(w => w.name.toLowerCase().includes(filter.toLowerCase())).map(world => (
                    <div 
                        key={world.id}
                        onClick={() => setSelectedWorldId(world.id)}
                        className={`p-3 rounded-lg cursor-pointer transition-colors flex items-center justify-between group ${selectedWorldId === world.id ? 'bg-gray-800 border border-emerald-500/30' : 'hover:bg-gray-900 border border-transparent'}`}
                    >
                        <div className="flex items-center gap-3 overflow-hidden">
                            <div className={`p-2 rounded ${world.isActive ? 'bg-emerald-500/10 text-emerald-500' : 'bg-gray-800 text-gray-500'}`}>
                                <HardDrive size={18} />
                            </div>
                            <div className="min-w-0">
                                <h3 className={`font-medium truncate ${selectedWorldId === world.id ? 'text-white' : 'text-gray-300'}`}>{world.name}</h3>
                                <p className="text-xs text-gray-500 flex items-center gap-1">
                                    <Calendar size={10}/> {new Date(world.lastModified).toLocaleDateString()}
                                </p>
                            </div>
                        </div>
                        {world.isActive && <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>}
                    </div>
                ))}
            </div>
        </div>

        {/* Main Content Area */}
        <div className={`flex-1 flex flex-col bg-gray-900 overflow-hidden ${!selectedWorldId ? 'hidden md:flex' : 'flex'}`}>
            {selectedWorld ? (
                <WorldDetailView 
                    world={selectedWorld} 
                    showToast={showToast} 
                    onBack={() => setSelectedWorldId(null)}
                    onRefresh={fetchWorlds}
                />
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-500 p-8 text-center">
                    <Globe size={48} className="mb-4 opacity-20" />
                    <h3 className="text-xl font-medium text-gray-400">No World Selected</h3>
                    <p className="max-w-xs mt-2">Select a world from the sidebar to manage addons, backups, and settings.</p>
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
    const [tab, setTab] = useState<'overview' | 'addons' | 'backups' | 'gamerules'>('overview');

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
            <div className="bg-gray-800 border-b border-gray-700 p-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="md:hidden p-2 text-gray-400 hover:text-white"><ArrowLeft /></button>
                    <div>
                        <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                            {world.name}
                            {world.isActive && <span className="bg-emerald-500/20 text-emerald-400 text-xs px-2 py-1 rounded border border-emerald-500/50 uppercase tracking-wide">Active</span>}
                        </h2>
                        <p className="text-gray-400 text-sm font-mono mt-1 text-opacity-70">{world.id}</p>
                    </div>
                </div>
                <div className="flex gap-3">
                    {!world.isActive && (
                        <button onClick={activateWorld} className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded font-medium flex items-center gap-2 shadow-lg shadow-emerald-900/20">
                            <Play size={16} /> <span className="hidden sm:inline">Activate</span>
                        </button>
                    )}
                    <button onClick={deleteWorld} className="bg-red-900/30 hover:bg-red-900/50 text-red-400 border border-red-900 px-3 py-2 rounded transition-colors">
                        <Trash2 size={18} />
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-700 bg-gray-800/50 px-6">
                {(['overview', 'addons', 'gamerules', 'backups'] as const).map(t => (
                    <button 
                        key={t} 
                        onClick={() => setTab(t)} 
                        className={`px-6 py-4 text-sm font-medium capitalize border-b-2 transition-colors ${tab === t ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-gray-400 hover:text-white'}`}
                    >
                        {t}
                    </button>
                ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 md:p-10">
                {tab === 'overview' && (
                    <div className="max-w-3xl space-y-6">
                        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                            <h3 className="text-lg font-bold text-white mb-4">World Statistics</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-gray-900 rounded-lg">
                                    <p className="text-gray-500 text-sm uppercase">Last Modified</p>
                                    <p className="text-white font-medium mt-1">{new Date(world.lastModified).toLocaleString()}</p>
                                </div>
                                <div className="p-4 bg-gray-900 rounded-lg">
                                    <p className="text-gray-500 text-sm uppercase">Folder Size</p>
                                    <p className="text-white font-medium mt-1">~{(world.sizeBytes / 1024).toFixed(1)} KB</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                
                {tab === 'addons' && <WorldAddonsTab worldId={world.id} showToast={showToast} />}
                {tab === 'backups' && <WorldBackupsTab worldId={world.id} showToast={showToast} />}
                {tab === 'gamerules' && <GamerulesTab worldId={world.id} showToast={showToast} />}
            </div>
        </div>
    );
};

const WorldAddonsTab: React.FC<{ worldId: string, showToast: any }> = ({ worldId, showToast }) => {
    const [addons, setAddons] = useState<WorldAddonStatus[]>([]);
    
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
        } catch { showToast('error', 'Failed to toggle addon'); }
    };

    useEffect(() => { fetchAddons(); }, [worldId]);

    const renderSection = (title: string, type: 'behavior' | 'resource', icon: any) => {
        const filtered = addons.filter(a => a.type === type);
        return (
            <div className="mb-8">
                <div className="flex items-center gap-2 mb-4">
                    {icon}
                    <h3 className="text-xl font-bold text-white">{title}</h3>
                </div>
                {filtered.length === 0 ? (
                    <p className="text-gray-500 italic ml-8">No {type} packs installed on server.</p>
                ) : (
                    <div className="space-y-2">
                        {filtered.map(a => (
                            <div key={a.uuid} className={`flex items-center justify-between p-4 rounded-lg border transition-all ${a.enabled ? 'bg-emerald-900/10 border-emerald-500/30' : 'bg-gray-800 border-gray-700'}`}>
                                <div>
                                    <h4 className="font-bold text-gray-200">{a.name}</h4>
                                    <div className="flex gap-2 text-xs text-gray-500 font-mono mt-1">
                                        <span>v{a.version.join('.')}</span>
                                        <span className="opacity-50">|</span>
                                        <span>{a.uuid}</span>
                                    </div>
                                </div>
                                <button onClick={() => toggle(a.folderName, !a.enabled)} className={`text-3xl transition-colors ${a.enabled ? 'text-emerald-500' : 'text-gray-600 hover:text-gray-400'}`}>
                                    {a.enabled ? <ToggleRight /> : <ToggleLeft />}
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="max-w-4xl">
            {renderSection('Behavior Packs', 'behavior', <Layers className="text-purple-400" />)}
            {renderSection('Resource Packs', 'resource', <FileDigit className="text-blue-400" />)}
        </div>
    );
};

const GamerulesTab: React.FC<{ worldId: string, showToast: any }> = ({ worldId, showToast }) => {
    // Only common gamerules
    const rules = [
        { key: 'keepinventory', label: 'Keep Inventory', desc: 'Keep items after death' },
        { key: 'showcoordinates', label: 'Show Coordinates', desc: 'Display XYZ' },
        { key: 'dodaylightcycle', label: 'Daylight Cycle', desc: 'Sun movement' },
        { key: 'domobspawning', label: 'Mob Spawning', desc: 'Natural mob spawning' },
        { key: 'doweathercycle', label: 'Weather Cycle', desc: 'Rain/Thunder changes' },
        { key: 'mobgriefing', label: 'Mob Griefing', desc: 'Creepers/Endermen damage blocks' },
    ];

    const setRule = async (rule: string, val: boolean) => {
        try {
            const res = await fetch(`/api/worlds/${worldId}/gamerule`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ rule, value: val.toString() })
            });
            if (res.ok) showToast('success', `Set ${rule} to ${val}`);
            else showToast('error', 'Server must be ONLINE to change gamerules');
        } catch { showToast('error', 'Network error'); }
    };

    return (
        <div className="max-w-3xl">
             <div className="bg-yellow-900/20 border border-yellow-700/50 p-4 rounded-lg mb-6 flex gap-3">
                <Settings className="text-yellow-500 shrink-0" />
                <p className="text-yellow-200 text-sm">Note: Gamerules can only be applied when the server is <strong>ONLINE</strong> and this world is currently running. They are injected via console commands.</p>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 {rules.map(r => (
                     <div key={r.key} className="bg-gray-800 p-4 rounded-lg border border-gray-700 flex items-center justify-between">
                         <div>
                             <h4 className="font-bold text-white">{r.label}</h4>
                             <p className="text-xs text-gray-500">{r.desc}</p>
                         </div>
                         <div className="flex gap-2">
                            <button onClick={() => setRule(r.key, true)} className="px-3 py-1 bg-gray-700 hover:bg-emerald-600 hover:text-white rounded text-xs text-emerald-400 transition-colors">True</button>
                            <button onClick={() => setRule(r.key, false)} className="px-3 py-1 bg-gray-700 hover:bg-red-600 hover:text-white rounded text-xs text-red-400 transition-colors">False</button>
                         </div>
                     </div>
                 ))}
             </div>
        </div>
    );
};

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
        <div className="max-w-3xl">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-white">Snapshots</h3>
                <button onClick={createBackup} className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded flex items-center gap-2"><Archive size={16} /> <span>Create New</span></button>
            </div>
            <div className="space-y-3">
                {backups.length === 0 && <p className="text-gray-500 text-center py-8 bg-gray-800 rounded border border-gray-700 border-dashed">No backups found.</p>}
                {backups.map(b => (
                    <div key={b.filename} className="bg-gray-800 p-4 rounded-lg border border-gray-700 flex justify-between items-center">
                        <div className="flex items-center gap-4">
                            <div className="p-2 bg-gray-700 rounded text-gray-400"><Package size={20} /></div>
                            <div>
                                <p className="text-white font-medium">{new Date(b.date).toLocaleString()}</p>
                                <p className="text-xs text-gray-500 font-mono">{b.filename}</p>
                            </div>
                        </div>
                        <span className="text-sm text-gray-400 bg-gray-900 px-2 py-1 rounded">{(b.sizeBytes / 1024 / 1024).toFixed(2)} MB</span>
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
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-xl p-6 w-full max-w-md border border-gray-700 shadow-2xl">
                <h3 className="text-xl font-bold text-white mb-4">Create New World</h3>
                <div className="space-y-4">
                    <input className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white" placeholder="World Name" value={data.name} onChange={e => setData({...data, name: e.target.value})} />
                    <input className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white" placeholder="Seed (Optional)" value={data.seed} onChange={e => setData({...data, seed: e.target.value})} />
                    <select className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white" value={data.gamemode} onChange={e => setData({...data, gamemode: e.target.value})}>
                        <option value="survival">Survival</option>
                        <option value="creative">Creative</option>
                    </select>
                </div>
                <div className="flex justify-end gap-3 mt-6">
                    <button onClick={onClose} className="text-gray-400 hover:text-white">Cancel</button>
                    <button onClick={submit} className="bg-emerald-600 text-white px-4 py-2 rounded font-bold">Create</button>
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
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-xl p-8 w-full max-w-md border border-gray-700 shadow-2xl text-center">
                <Download size={48} className="mx-auto text-emerald-500 mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">Import World</h3>
                <p className="text-gray-400 text-sm mb-6">Supports .zip and .mcworld files.</p>
                
                <label className={`block w-full cursor-pointer bg-gray-900 border-2 border-dashed border-gray-600 hover:border-emerald-500 rounded-xl p-6 ${uploading ? 'opacity-50' : ''}`}>
                    <input type="file" className="hidden" accept=".zip,.mcworld" onChange={handleFile} disabled={uploading} />
                    <span className="text-gray-300 font-medium">{uploading ? 'Uploading...' : 'Click to Upload'}</span>
                </label>
                
                <button onClick={onClose} className="mt-6 text-gray-500 hover:text-white text-sm">Cancel</button>
            </div>
        </div>
    );
};

export default WorldManager;
