import React, { useState, useEffect } from 'react';
import { Globe, Plus, Play, Trash2, Archive, Calendar, HardDrive, Settings, ArrowLeft, ToggleLeft, ToggleRight, Layers, FileDigit, Upload, Download } from 'lucide-react';
import { CommonProps, World, WorldBackup, WorldAddonStatus } from '../types';

const WorldManager: React.FC<CommonProps> = ({ showToast }) => {
  const [worlds, setWorlds] = useState<World[]>([]);
  const [selectedWorld, setSelectedWorld] = useState<World | null>(null);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<'list' | 'detail' | 'create' | 'import'>('list');

  // Create Form State
  const [newWorld, setNewWorld] = useState({ name: '', seed: '', gamemode: 'survival', difficulty: 'easy' });
  const [importing, setImporting] = useState(false);

  // Detail State
  const [addons, setAddons] = useState<WorldAddonStatus[]>([]);
  const [backups, setBackups] = useState<WorldBackup[]>([]);
  const [activeTab, setActiveTab] = useState<'general' | 'addons' | 'backups'>('general');

  useEffect(() => { fetchWorlds(); }, []);

  const fetchWorlds = async () => {
    try {
        const res = await fetch('/api/worlds');
        if (res.ok) setWorlds(await res.json());
    } catch {}
  };

  const createWorld = async () => {
      setLoading(true);
      try {
          const res = await fetch('/api/worlds', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(newWorld)
          });
          if (res.ok) {
              showToast('success', 'World Created');
              fetchWorlds();
              setView('list');
          } else showToast('error', 'Failed to create world');
      } catch { showToast('error', 'Network error'); }
      finally { setLoading(false); }
  };

  const importWorld = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files?.length) return;
      setImporting(true);
      const formData = new FormData();
      formData.append('file', e.target.files[0]);

      try {
          const res = await fetch('/api/worlds/import', { method: 'POST', body: formData });
          if (res.ok) {
              showToast('success', 'World Imported Successfully');
              fetchWorlds();
              setView('list');
          } else {
              const d = await res.json();
              showToast('error', d.error || 'Import Failed');
          }
      } catch { showToast('error', 'Network error during import'); }
      finally { setImporting(false); }
  };

  const deleteWorld = async (id: string) => {
      if (!confirm('Are you sure? This will delete the world folder permanently.')) return;
      try {
          const res = await fetch(`/api/worlds/${id}`, { method: 'DELETE' });
          if (res.ok) { showToast('success', 'World Deleted'); fetchWorlds(); setSelectedWorld(null); setView('list'); }
      } catch {}
  };

  const activateWorld = async (id: string) => {
      try {
          const res = await fetch(`/api/worlds/${id}/activate`, { method: 'POST' });
          if (res.ok) { showToast('success', 'World Set as Active', 'Restart server to apply.'); fetchWorlds(); }
      } catch {}
  };

  // --- Detail View Logic ---
  const openDetail = (world: World) => {
      setSelectedWorld(world);
      setView('detail');
      setActiveTab('general');
  };

  const fetchWorldAddons = async () => {
      if (!selectedWorld) return;
      const res = await fetch(`/api/worlds/${selectedWorld.id}/addons`);
      if (res.ok) setAddons(await res.json());
  };

  const fetchBackups = async () => {
      if (!selectedWorld) return;
      const res = await fetch(`/api/worlds/${selectedWorld.id}/backups`);
      if (res.ok) setBackups(await res.json());
  };

  const toggleAddon = async (addonId: string, enabled: boolean) => {
      if (!selectedWorld) return;
      try {
          const res = await fetch(`/api/worlds/${selectedWorld.id}/addons`, {
              method: 'POST',
              headers: {'Content-Type': 'application/json'},
              body: JSON.stringify({ addonId, enabled })
          });
          if (res.ok) fetchWorldAddons();
      } catch {}
  };

  const createBackup = async () => {
      if (!selectedWorld) return;
      showToast('info', 'Creating Backup...');
      await fetch(`/api/worlds/${selectedWorld.id}/backups`, { method: 'POST' });
      showToast('success', 'Backup Created');
      fetchBackups();
  };

  useEffect(() => {
      if (view === 'detail') {
          if (activeTab === 'addons') fetchWorldAddons();
          if (activeTab === 'backups') fetchBackups();
      }
  }, [view, activeTab, selectedWorld]);


  // --- RENDERS ---

  if (view === 'create') {
      return (
          <div className="max-w-2xl mx-auto bg-gray-800 p-8 rounded-xl border border-gray-700">
              <h2 className="text-2xl font-bold mb-6 text-white">Create New World</h2>
              <div className="space-y-4">
                  <div>
                      <label className="block text-sm text-gray-400 mb-1">World Name</label>
                      <input className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white" value={newWorld.name} onChange={e => setNewWorld({...newWorld, name: e.target.value})} />
                  </div>
                  <div>
                      <label className="block text-sm text-gray-400 mb-1">Seed (Optional)</label>
                      <input className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white" value={newWorld.seed} onChange={e => setNewWorld({...newWorld, seed: e.target.value})} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                      <div>
                          <label className="block text-sm text-gray-400 mb-1">Gamemode</label>
                          <select className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white" value={newWorld.gamemode} onChange={e => setNewWorld({...newWorld, gamemode: e.target.value})}>
                              <option value="survival">Survival</option>
                              <option value="creative">Creative</option>
                              <option value="adventure">Adventure</option>
                          </select>
                      </div>
                      <div>
                          <label className="block text-sm text-gray-400 mb-1">Difficulty</label>
                          <select className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white" value={newWorld.difficulty} onChange={e => setNewWorld({...newWorld, difficulty: e.target.value})}>
                              <option value="peaceful">Peaceful</option>
                              <option value="easy">Easy</option>
                              <option value="normal">Normal</option>
                              <option value="hard">Hard</option>
                          </select>
                      </div>
                  </div>
              </div>
              <div className="mt-8 flex gap-4">
                  <button onClick={createWorld} disabled={loading || !newWorld.name} className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2 rounded font-bold">Create</button>
                  <button onClick={() => setView('list')} className="text-gray-400 hover:text-white px-4 py-2">Cancel</button>
              </div>
          </div>
      );
  }

  if (view === 'import') {
      return (
          <div className="max-w-xl mx-auto bg-gray-800 p-8 rounded-xl border border-gray-700 text-center">
              <div className="mx-auto w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center mb-6">
                  <Download className={`text-emerald-500 ${importing ? 'animate-bounce' : ''}`} size={32} />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Import World</h2>
              <p className="text-gray-400 mb-8">Upload a <code>.zip</code> or <code>.mcworld</code> file. We'll extract it and add it to your worlds list.</p>
              
              <label className={`block w-full cursor-pointer bg-gray-900 hover:bg-gray-850 border-2 border-dashed border-gray-600 hover:border-emerald-500 rounded-xl p-8 transition-all ${importing ? 'opacity-50 pointer-events-none' : ''}`}>
                  <input type="file" className="hidden" accept=".zip,.mcworld" onChange={importWorld} disabled={importing} />
                  <div className="flex flex-col items-center">
                      <Upload className="text-gray-500 mb-2" />
                      <span className="text-gray-300 font-medium">{importing ? 'Importing...' : 'Click to Select File'}</span>
                  </div>
              </label>

              <button onClick={() => setView('list')} disabled={importing} className="mt-6 text-gray-400 hover:text-white">Cancel</button>
          </div>
      );
  }

  if (view === 'detail' && selectedWorld) {
      return (
          <div className="max-w-5xl mx-auto space-y-6">
              <div className="flex items-center gap-4 mb-6">
                  <button onClick={() => setView('list')} className="p-2 bg-gray-800 rounded hover:bg-gray-700"><ArrowLeft /></button>
                  <h2 className="text-2xl font-bold text-white">{selectedWorld.name}</h2>
                  {selectedWorld.isActive && <span className="bg-emerald-500/20 text-emerald-400 text-xs px-2 py-1 rounded border border-emerald-500/50">Active</span>}
              </div>

              <div className="flex gap-2 border-b border-gray-700 mb-6">
                  {(['general', 'addons', 'backups'] as const).map(tab => (
                      <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2 capitalize ${activeTab === tab ? 'text-emerald-400 border-b-2 border-emerald-400' : 'text-gray-400 hover:text-white'}`}>{tab}</button>
                  ))}
              </div>

              {activeTab === 'general' && (
                  <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 space-y-6">
                      <div className="flex justify-between items-center">
                          <div>
                              <h3 className="text-lg font-bold text-white">World Actions</h3>
                              <p className="text-sm text-gray-400">Manage state and deletion</p>
                          </div>
                          <div className="flex gap-4">
                                {!selectedWorld.isActive && (
                                    <button onClick={() => activateWorld(selectedWorld.id)} className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded flex items-center gap-2"><Play size={16} /> Activate</button>
                                )}
                                <button onClick={() => deleteWorld(selectedWorld.id)} className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded flex items-center gap-2"><Trash2 size={16} /> Delete</button>
                          </div>
                      </div>
                  </div>
              )}

              {activeTab === 'addons' && (
                  <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
                      <h3 className="text-lg font-bold text-white mb-4">World Addons</h3>
                      <div className="space-y-2">
                          {addons.length === 0 && <p className="text-gray-500">No addons installed on server.</p>}
                          {addons.map(addon => (
                              <div key={addon.uuid} className="flex justify-between items-center bg-gray-900 p-3 rounded border border-gray-800">
                                  <div className="flex items-center gap-3">
                                      {addon.type === 'behavior' ? <Layers className="text-purple-400" size={20} /> : <FileDigit className="text-blue-400" size={20} />}
                                      <div>
                                          <p className="font-bold text-gray-200">{addon.name}</p>
                                          <p className="text-xs text-gray-500">{addon.folderName}</p>
                                      </div>
                                  </div>
                                  <button onClick={() => toggleAddon(addon.folderName, !addon.enabled)} className={`text-2xl ${addon.enabled ? 'text-emerald-500' : 'text-gray-600'}`}>
                                      {addon.enabled ? <ToggleRight /> : <ToggleLeft />}
                                  </button>
                              </div>
                          ))}
                      </div>
                  </div>
              )}

              {activeTab === 'backups' && (
                  <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
                      <div className="flex justify-between mb-4">
                          <h3 className="text-lg font-bold text-white">Backups</h3>
                          <button onClick={createBackup} className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1 rounded text-sm flex items-center gap-2"><Archive size={14} /> Create Backup</button>
                      </div>
                      <div className="space-y-2">
                          {backups.map(b => (
                              <div key={b.filename} className="flex justify-between items-center bg-gray-900 p-3 rounded text-sm">
                                  <div className="flex items-center gap-3">
                                      <Calendar size={16} className="text-gray-500" />
                                      <span>{new Date(b.date).toLocaleString()}</span>
                                      <span className="text-gray-500">({(b.sizeBytes / 1024 / 1024).toFixed(2)} MB)</span>
                                  </div>
                                  <span className="text-gray-500 font-mono text-xs">{b.filename}</span>
                              </div>
                          ))}
                      </div>
                  </div>
              )}
          </div>
      );
  }

  // List View
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex justify-between items-center bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <Globe className="text-emerald-500" /> Worlds
            </h2>
            <p className="text-gray-400">Manage your Minecraft worlds</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setView('import')} className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 shadow-lg shadow-blue-900/20">
                <Upload size={20} /> Import
            </button>
            <button onClick={() => setView('create')} className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 shadow-lg shadow-emerald-900/20">
                <Plus size={20} /> Create
            </button>
          </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {worlds.map(world => (
            <div key={world.id} className={`bg-gray-800 border ${world.isActive ? 'border-emerald-500/50 ring-1 ring-emerald-500/20' : 'border-gray-700'} rounded-xl p-5 hover:bg-gray-750 transition-all group relative`}>
                <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-gray-900 rounded-lg">
                        <HardDrive className={world.isActive ? 'text-emerald-400' : 'text-gray-400'} size={24} />
                    </div>
                    {world.isActive && <span className="bg-emerald-500/20 text-emerald-400 text-xs font-bold px-2 py-1 rounded border border-emerald-500/30">ACTIVE</span>}
                </div>
                <h3 className="text-xl font-bold text-white truncate">{world.name}</h3>
                <p className="text-sm text-gray-500 mt-1 flex items-center gap-1"><Calendar size={12} /> {new Date(world.lastModified).toLocaleDateString()}</p>
                
                <div className="mt-6 flex gap-2">
                    <button onClick={() => openDetail(world)} className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded font-medium text-sm flex items-center justify-center gap-2">
                        <Settings size={14} /> Manage
                    </button>
                    {!world.isActive && (
                        <button onClick={() => activateWorld(world.id)} className="p-2 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-500 hover:text-white rounded transition-colors" title="Activate">
                            <Play size={18} />
                        </button>
                    )}
                </div>
            </div>
        ))}
      </div>
    </div>
  );
};
export default WorldManager;