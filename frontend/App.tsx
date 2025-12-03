import React, { useState } from 'react';
import { Terminal, Settings, Box, Activity, Server, Menu, X } from 'lucide-react';
import Dashboard from './components/Dashboard';
import Console from './components/Console';
import ConfigEditor from './components/ConfigEditor';
import AddonManager from './components/AddonManager';
import ToastContainer from './components/Toast.tsx';
import { ToastData } from './types';

enum Tab {
  DASHBOARD = 'Dashboard',
  CONSOLE = 'Console',
  SETTINGS = 'Settings',
  ADDONS = 'Addons'
}

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>(Tab.DASHBOARD);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const addToast = (type: 'success' | 'error' | 'info', message: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, message }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const renderContent = () => {
    const commonProps = { showToast: addToast };

    switch (activeTab) {
      case Tab.DASHBOARD:
        return <Dashboard onNavigate={(t) => setActiveTab(t)} {...commonProps} />;
      case Tab.CONSOLE:
        return <Console {...commonProps} />;
      case Tab.SETTINGS:
        return <ConfigEditor {...commonProps} />;
      case Tab.ADDONS:
        return <AddonManager {...commonProps} />;
      default:
        return <Dashboard onNavigate={(t) => setActiveTab(t)} {...commonProps} />;
    }
  };

  const NavItem = ({ tab, icon: Icon }: { tab: Tab; icon: any }) => (
    <button
      onClick={() => {
        setActiveTab(tab);
        setMobileMenuOpen(false);
      }}
      className={`flex items-center space-x-3 w-full px-4 py-3 transition-colors ${
        activeTab === tab
          ? 'bg-emerald-600 text-white'
          : 'text-gray-400 hover:bg-gray-800 hover:text-white'
      }`}
    >
      <Icon size={20} />
      <span className="font-medium">{tab}</span>
    </button>
  );

  return (
    <div className="flex h-screen bg-gray-900 text-gray-100">
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      
      {/* Sidebar for Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-gray-950 border-r border-gray-800">
        <div className="p-6 border-b border-gray-800 flex items-center space-x-3">
          <div className="p-2 bg-emerald-600 rounded-lg">
            <Box size={24} className="text-white" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white">Bedrock Panel</h1>
        </div>
        <nav className="flex-1 py-6 space-y-1">
          <NavItem tab={Tab.DASHBOARD} icon={Activity} />
          <NavItem tab={Tab.CONSOLE} icon={Terminal} />
          <NavItem tab={Tab.SETTINGS} icon={Settings} />
          <NavItem tab={Tab.ADDONS} icon={Server} />
        </nav>
        <div className="p-4 border-t border-gray-800 text-xs text-gray-500 text-center">
          MC Bedrock Manager v1.1
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 w-full bg-gray-950 border-b border-gray-800 z-20 flex items-center justify-between p-4">
        <div className="flex items-center space-x-2">
            <Box size={24} className="text-emerald-500" />
            <span className="font-bold text-lg">Bedrock Panel</span>
        </div>
        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="text-white">
          {mobileMenuOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 bg-gray-900 z-10 pt-20 md:hidden">
             <nav className="flex flex-col space-y-1">
                <NavItem tab={Tab.DASHBOARD} icon={Activity} />
                <NavItem tab={Tab.CONSOLE} icon={Terminal} />
                <NavItem tab={Tab.SETTINGS} icon={Settings} />
                <NavItem tab={Tab.ADDONS} icon={Server} />
            </nav>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden relative md:static mt-16 md:mt-0">
        <header className="hidden md:flex items-center justify-between px-8 py-5 bg-gray-900 border-b border-gray-800">
            <h2 className="text-2xl font-semibold text-white">{activeTab}</h2>
        </header>
        <div className="flex-1 overflow-auto p-4 md:p-8 bg-gray-900/50">
            {renderContent()}
        </div>
      </main>
    </div>
  );
};

export default App;