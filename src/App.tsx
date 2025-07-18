import React, { useState, useEffect, useCallback } from 'react';
import { useToast } from './hooks/useToast';
import ToastContainer from './components/ToastContainer';
import { 
  BarChart3, 
  Users, 
  UserCheck, 
  Target, 
  Settings, 
  List, 
  Upload,
  LogOut,
  Menu,
  X,
  Folder
} from 'lucide-react';
import AuthWrapper from './components/AuthWrapper';
import Dashboard from './components/Dashboard';
import ContactManager from './components/ContactManager';
import AgentManager from './components/AgentManager';
import ListManager from './components/ListManager';
import { PipelineManager } from './components/PipelineManager';
import SettingsPanel from './components/SettingsPanel';
import ListIdDisplay from './components/ListIdDisplay';
import FolderManager from './components/FolderManager';
import { loadAllData, initializeDatabase, cleanupInstagramCustomFields } from './lib/database';
import { useRealtime } from './hooks/useRealtime';
import { exportContactsToCSV } from './utils/csvExport';
import { logout } from './lib/auth';
import type { CRMData, Contact } from './types';

function App() {
  const [data, setData] = useState<CRMData | null>(null);
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedListId, setSelectedListId] = useState<string | undefined>();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Load initial data
  const optimisticDataUpdate = useCallback((updateFn: (data: CRMData) => CRMData) => {
    setData(prevData => {
      if (!prevData) return prevData;
      return updateFn(prevData);
    });
  }, []);

  // ✅ CORREÇÃO: Função otimizada que evita reload completo
  const refreshData = useCallback(async (showToast = false) => {
    try {
      const crmData = await loadAllData();
      setData(crmData);
      if (showToast) toast.success('Dados atualizados!');
    } catch (error) {
      console.error('Error refreshing data:', error);
      if (showToast) toast.error('Erro ao atualizar dados');
    }
  }, [toast]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      await initializeDatabase();
      await cleanupInstagramCustomFields(); // Clean up Instagram custom fields
      const crmData = await loadAllData();
      // ✅ CORREÇÃO: Usar refreshData em vez de fetchData para evitar loading desnecessário
      setData(crmData);
    } catch (err) {
      console.error('Failed to load data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // ✅ CORREÇÃO: Set up real-time updates sem forçar loading
  useRealtime(refreshData);

  const handleLogout = async () => {
    try {
      logout();
      window.location.reload(); // Force reload to reset auth state
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleExportFiltered = (contacts: Contact[]) => {
    if (data) {
      exportContactsToCSV(contacts, data);
    }
  };

  const handleOpenListPipeline = (listId: string) => {
    setSelectedListId(listId);
    setActiveTab('pipeline');
  };

  const handleBackToLists = () => {
    setSelectedListId(undefined);
    setActiveTab('lists');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando sistema...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-red-600 mb-4">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Erro ao Carregar Dados</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={fetchData}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Nenhum dado disponível</p>
        </div>
      </div>
    );
  }

  const navigation = [
    { id: 'dashboard', name: 'Dashboard', icon: BarChart3 },
    { id: 'contacts', name: 'Contatos', icon: Users },
    { id: 'agents', name: 'Atendentes', icon: UserCheck },
    { id: 'lists', name: 'Listas', icon: List },
    { id: 'folders', name: 'Pastas', icon: Folder },
    { id: 'pipeline', name: 'Funil', icon: Target },
    { id: 'list-ids', name: 'IDs das Listas', icon: Target },
    { id: 'settings', name: 'Configurações', icon: Settings },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard data={data} onDataChange={fetchData} />;
      case 'contacts':
        return (
          <ContactManager 
            data={data}
            onDataChange={fetchData}
            onExportFiltered={handleExportFiltered}
          />
        );
      case 'agents':
        return <AgentManager data={data} onDataChange={fetchData} />;
      case 'lists':
        return (
          <ListManager 
            data={data}
            onDataChange={fetchData}
            onOpenListPipeline={handleOpenListPipeline}
          />
        );
      case 'folders':
        return <FolderManager data={data} onDataChange={fetchData} />;
      case 'pipeline':
        return (
          <PipelineManager 
            data={data}
            onDataChange={fetchData}
            selectedListId={selectedListId}
            onBackToLists={handleBackToLists}
          />
        );
      case 'list-ids':
        return <ListIdDisplay lists={data.lists} />;
      case 'settings':
        return <SettingsPanel data={data} onDataChange={fetchData} />;
      default:
        return <Dashboard data={data} />;
    }
  };

  return (
    <AuthWrapper>
      {/* ✅ Toast Container para feedback sem reload */}
      <ToastContainer toasts={toast.toasts} onRemove={toast.removeToast} />
      
      <div className="min-h-screen bg-gray-50 flex">
        {/* Mobile sidebar backdrop */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:relative lg:flex lg:flex-col ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}>
          <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200">
            <h1 className="text-xl font-bold text-gray-900">CRM Sistema</h1>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-gray-500 hover:text-gray-700"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
          
          <nav className="flex-1 mt-6 px-3 overflow-y-auto">
            <div className="space-y-1">
              {navigation.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id);
                      setSidebarOpen(false);
                    }}
                    className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      activeTab === item.id
                        ? 'bg-indigo-100 text-indigo-700'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <Icon className="mr-3 h-5 w-5" />
                    {item.name}
                  </button>
                );
              })}
            </div>
            
            <div className="mt-8 pt-6 border-t border-gray-200">
              <button
                onClick={handleLogout}
                className="w-full flex items-center px-3 py-2 text-sm font-medium text-gray-600 rounded-md hover:bg-gray-50 hover:text-gray-900 transition-colors mt-1"
              >
                <LogOut className="mr-3 h-5 w-5" />
                Sair
              </button>
            </div>
          </nav>
        </div>

        {/* Main content */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Top bar */}
          <div className="sticky top-0 z-10 bg-white shadow-sm border-b border-gray-200">
            <div className="flex items-center justify-between h-16 px-4 sm:px-6">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden text-gray-500 hover:text-gray-700"
              >
                <Menu className="h-6 w-6" />
              </button>
              
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-500">
                  {data.contacts.length} contatos • {data.agents.filter(a => a.isActive).length} atendentes ativos
                </span>
              </div>
            </div>
          </div>

          {/* Page content */}
          <main className="flex-1 p-6 overflow-auto">
            {renderContent()}
          </main>
        </div>
      </div>
    </AuthWrapper>
  );
}

export default App;