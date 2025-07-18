import React, { useState, useEffect } from 'react';
import { X, Clock, User, List, Target, Tag as TagIcon, Plus, Minus, Edit, Trash2, History } from 'lucide-react';
import { Contact } from '../types';
import { getLeadMaster, getLeadHistory, LeadMaster, LeadHistory } from '../lib/database';

interface LeadHistoryPanelProps {
  contact: Contact;
  isOpen: boolean;
  onClose: () => void;
}

const LeadHistoryPanel: React.FC<LeadHistoryPanelProps> = ({ contact, isOpen, onClose }) => {
  const [leadMaster, setLeadMaster] = useState<LeadMaster | null>(null);
  const [leadHistory, setLeadHistory] = useState<LeadHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && contact.email) {
      loadLeadData();
    }
  }, [isOpen, contact.email]);

  const loadLeadData = async () => {
    try {
      setLoading(true);
      const [masterData, historyData] = await Promise.all([
        getLeadMaster(contact.email),
        getLeadHistory(contact.email)
      ]);
      
      setLeadMaster(masterData);
      setLeadHistory(historyData);
    } catch (error) {
      console.error('Error loading lead data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case 'created':
        return <Plus className="h-4 w-4 text-green-600" />;
      case 'updated':
        return <Edit className="h-4 w-4 text-blue-600" />;
      case 'deleted':
        return <Trash2 className="h-4 w-4 text-red-600" />;
      case 'list_changed':
        return <List className="h-4 w-4 text-purple-600" />;
      case 'stage_changed':
        return <Target className="h-4 w-4 text-orange-600" />;
      case 'agent_changed':
        return <User className="h-4 w-4 text-indigo-600" />;
      case 'tags_changed':
        return <TagIcon className="h-4 w-4 text-pink-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getActionColor = (actionType: string) => {
    switch (actionType) {
      case 'created':
        return 'bg-green-50 border-green-200';
      case 'updated':
        return 'bg-blue-50 border-blue-200';
      case 'deleted':
        return 'bg-red-50 border-red-200';
      case 'list_changed':
        return 'bg-purple-50 border-purple-200';
      case 'stage_changed':
        return 'bg-orange-50 border-orange-200';
      case 'agent_changed':
        return 'bg-indigo-50 border-indigo-200';
      case 'tags_changed':
        return 'bg-pink-50 border-pink-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const formatActionDescription = (history: LeadHistory) => {
    switch (history.action_type) {
      case 'created':
        return `Lead criado${history.list_name ? ` na lista "${history.list_name}"` : ''}${history.agent_name ? ` para ${history.agent_name}` : ''}`;
      case 'updated':
        return 'Informações do lead atualizadas';
      case 'deleted':
        return 'Lead removido do sistema';
      case 'list_changed':
        return `Movido de "${history.old_value || 'Sem lista'}" para "${history.new_value || 'Sem lista'}"`;
      case 'stage_changed':
        return `Etapa alterada de "${history.old_value || 'Sem etapa'}" para "${history.new_value || 'Sem etapa'}"`;
      case 'agent_changed':
        return `Atendente alterado de "${history.old_value || 'Sem atendente'}" para "${history.new_value || 'Sem atendente'}"`;
      case 'tags_changed':
        return `Tags alteradas de "${history.old_value || 'Sem tags'}" para "${history.new_value || 'Sem tags'}"`;
      default:
        return 'Ação desconhecida';
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity"
        onClick={onClose}
      />
      
      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-full max-w-2xl bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center mr-3">
              <History className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Histórico do Lead</h2>
              <p className="text-sm text-gray-500">{contact.email}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Carregando histórico...</p>
            </div>
          ) : (
            <>
              {/* Lead Master Summary */}
              {leadMaster && (
                <div className="bg-purple-50 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-purple-900 mb-3 flex items-center">
                    <User className="h-4 w-4 mr-2" />
                    Resumo do Lead Master
                  </h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-purple-700 font-medium">Nome Atual</p>
                      <p className="text-purple-900">{leadMaster.current_name}</p>
                    </div>
                    <div>
                      <p className="text-purple-700 font-medium">Nome Original</p>
                      <p className="text-purple-900">{leadMaster.first_name}</p>
                    </div>
                    <div>
                      <p className="text-purple-700 font-medium">Total de Interações</p>
                      <p className="text-purple-900">{leadMaster.total_interactions}</p>
                    </div>
                    <div>
                      <p className="text-purple-700 font-medium">Status</p>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        leadMaster.is_active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {leadMaster.is_active ? 'Ativo' : 'Inativo'}
                      </span>
                    </div>
                    <div>
                      <p className="text-purple-700 font-medium">Primeiro Contato</p>
                      <p className="text-purple-900">
                        {leadMaster.first_created_at.toLocaleDateString('pt-BR', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                    <div>
                      <p className="text-purple-700 font-medium">Última Atualização</p>
                      <p className="text-purple-900">
                        {leadMaster.last_updated_at.toLocaleDateString('pt-BR', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* History Timeline */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <Clock className="h-5 w-5 mr-2" />
                  Linha do Tempo ({leadHistory.length} eventos)
                </h3>
                
                {leadHistory.length > 0 ? (
                  <div className="space-y-4">
                    {leadHistory.map((history, index) => (
                      <div key={history.id} className="relative">
                        {/* Timeline line */}
                        {index < leadHistory.length - 1 && (
                          <div className="absolute left-6 top-12 w-0.5 h-8 bg-gray-200" />
                        )}
                        
                        <div className={`flex items-start space-x-4 p-4 rounded-lg border ${getActionColor(history.action_type)}`}>
                          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-white border-2 border-current flex items-center justify-center">
                            {getActionIcon(history.action_type)}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-medium text-gray-900">
                                {formatActionDescription(history)}
                              </p>
                              <time className="text-xs text-gray-500">
                                {history.created_at.toLocaleDateString('pt-BR', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </time>
                            </div>
                            
                            {/* Additional details */}
                            <div className="mt-2 space-y-1">
                              {history.list_name && (
                                <p className="text-xs text-gray-600">
                                  <span className="font-medium">Lista:</span> {history.list_name}
                                </p>
                              )}
                              {history.stage_name && (
                                <p className="text-xs text-gray-600">
                                  <span className="font-medium">Etapa:</span> {history.stage_name}
                                </p>
                              )}
                              {history.agent_name && (
                                <p className="text-xs text-gray-600">
                                  <span className="font-medium">Atendente:</span> {history.agent_name}
                                </p>
                              )}
                              {history.tag_names && history.tag_names.length > 0 && (
                                <p className="text-xs text-gray-600">
                                  <span className="font-medium">Tags:</span> {history.tag_names.join(', ')}
                                </p>
                              )}
                              {history.metadata && Object.keys(history.metadata).length > 0 && (
                                <details className="text-xs text-gray-600">
                                  <summary className="cursor-pointer font-medium">Detalhes técnicos</summary>
                                  <pre className="mt-1 text-xs bg-gray-100 p-2 rounded overflow-x-auto">
                                    {JSON.stringify(history.metadata, null, 2)}
                                  </pre>
                                </details>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Clock className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                    <p>Nenhum histórico encontrado para este lead</p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default LeadHistoryPanel;