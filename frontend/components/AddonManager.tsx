import React, { useEffect, useState } from 'react';
import { Package, Trash2, Upload, Layers, Image as ImageIcon, Info } from 'lucide-react';
import { AddonFile, CommonProps } from '../types';

const AddonManager: React.FC<CommonProps> = ({ showToast }) => {
  const [addons, setAddons] = useState<AddonFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);

  const fetchAddons = () => {
    setLoading(true);
    fetch('/addons')
      .then(res => res.json())
      .then(data => {
        if(Array.isArray(data)) setAddons(data);
        setLoading(false);
      })
      .catch(() => {
        showToast('error', 'Failed to load addons');
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchAddons();
  }, []);

  const handleDelete = async (type: string, id: string) => {
    if(!confirm(`Are you sure you want to delete this ${type} pack? This action cannot be undone.`)) return;
    try {
        const res = await fetch(`/addons/${type}/${id}`, { method: 'DELETE' });
        if(res.ok) {
            showToast('success', 'Addon deleted successfully');
            fetchAddons();
        } else {
            showToast('error', 'Failed to delete addon');
        }
    } catch (e) {
        showToast('error', 'Network error');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files || e.target.files.length === 0) return;
      
      setIsUploading(true);
      const formData = new FormData();
      formData.append('file', e.target.files[0]);

      try {
          const res = await fetch('/addons/upload', {
              method: 'POST',
              body: formData
          });
          const data = await res.json();
          if(res.ok) {
            showToast('success', data.message || 'Installed successfully');
            fetchAddons(); 
          } else {
            showToast('error', data.error || 'Upload failed');
          }
      } catch (e) {
          showToast('error', 'Upload failed due to network error');
      } finally {
          setIsUploading(false);
          // Reset input
          e.target.value = '';
      }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-10">
      
      {/* Upload Section */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-8 text-center shadow-xl">
        <div className="mx-auto w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center mb-4 ring-4 ring-gray-800">
            <Upload className={`text-emerald-500 ${isUploading ? 'animate-bounce' : ''}`} size={32} />
        </div>
        <h3 className="text-xl font-semibold text-white">Install New Addon</h3>
        <p className="text-gray-400 text-sm mb-6 max-w-md mx-auto mt-2">
            Upload <code>.mcpack</code> or <code>.zip</code> files. 
            The system will analyze the <code>manifest.json</code> and install it to the correct folder automatically.
        </p>
        <label className={`cursor-pointer bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-3 rounded-lg font-bold transition-all shadow-lg shadow-emerald-900/20 inline-flex items-center space-x-2 ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
            <span>{isUploading ? 'Installing...' : 'Select File to Upload'}</span>
            <input type="file" className="hidden" accept=".zip,.mcpack" onChange={handleFileUpload} disabled={isUploading} />
        </label>
      </div>

      {/* Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Behavior Packs */}
        <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
            <div className="flex items-center space-x-3 mb-6 border-b border-gray-700 pb-4">
                <div className="p-2 bg-purple-500/10 rounded-lg">
                    <Layers className="text-purple-400" size={24} />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-white">Behavior Packs</h3>
                    <p className="text-xs text-gray-500">Game logic, entities, and scripts</p>
                </div>
            </div>
            
            <div className="space-y-3">
                {addons.filter(a => a.type === 'behavior').map(addon => (
                    <AddonCard key={addon.id} addon={addon} onDelete={() => handleDelete(addon.type, addon.id)} />
                ))}
                {addons.filter(a => a.type === 'behavior').length === 0 && (
                    <EmptyState type="Behavior Packs" />
                )}
            </div>
        </div>

        {/* Resource Packs */}
        <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
            <div className="flex items-center space-x-3 mb-6 border-b border-gray-700 pb-4">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                    <ImageIcon className="text-blue-400" size={24} />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-white">Resource Packs</h3>
                    <p className="text-xs text-gray-500">Textures, models, and sounds</p>
                </div>
            </div>

            <div className="space-y-3">
                 {addons.filter(a => a.type === 'resource').map(addon => (
                    <AddonCard key={addon.id} addon={addon} onDelete={() => handleDelete(addon.type, addon.id)} />
                ))}
                 {addons.filter(a => a.type === 'resource').length === 0 && (
                    <EmptyState type="Resource Packs" />
                )}
            </div>
        </div>

      </div>
    </div>
  );
};

const EmptyState: React.FC<{type: string}> = ({type}) => (
    <div className="text-center py-10 border-2 border-dashed border-gray-700 rounded-lg">
        <Package className="mx-auto text-gray-600 mb-2" size={32} />
        <p className="text-gray-500">No {type} installed.</p>
    </div>
);

const AddonCard: React.FC<{ addon: AddonFile, onDelete: () => void }> = ({ addon, onDelete }) => (
    <div className="bg-gray-800 border border-gray-700 p-4 rounded-lg flex justify-between items-start group hover:border-gray-500 hover:bg-gray-750 transition-all shadow-sm">
        <div className="flex items-start space-x-4 overflow-hidden">
            <div className="p-3 bg-gray-900 rounded-lg shrink-0">
                <Package size={20} className="text-gray-400" />
            </div>
            <div className="min-w-0">
                <h4 className="font-bold text-gray-200 truncate pr-2" title={addon.name}>{addon.name}</h4>
                <div className="flex items-center text-xs text-gray-500 mt-1 space-x-2">
                    <span className="bg-gray-700 px-1.5 py-0.5 rounded font-mono">{addon.id}</span>
                </div>
                {addon.description && <p className="text-xs text-gray-400 mt-2 line-clamp-2 leading-relaxed">{addon.description}</p>}
            </div>
        </div>
        <button 
            onClick={onDelete} 
            className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-colors ml-2"
            title="Delete Addon"
        >
            <Trash2 size={18} />
        </button>
    </div>
);

export default AddonManager;