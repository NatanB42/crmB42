import React, { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Plus, Edit2, Trash2, Users, TrendingUp, AlertTriangle, RotateCcw, X, Search, Filter, Calendar, User, Tag as TagIcon, Settings, MoreVertical, Eye, EyeOff } from 'lucide-react';
import { useToast } from '../hooks/useToast';
import { useContactMovement } from '../hooks/useContactMovement';
import { Contact, CRMData, PipelineStage } from '../types';
import { updateContact, deleteContact } from '../lib/database';
import ContactActions from './ContactActions';
import ContactForm from './ContactForm';
import ContactDetailPanel from './ContactDetailPanel';
import PipelineStageManager from './PipelineStageManager';

interface PipelineManagerProps {
  data: CRMData;
  onDataChange: () => void;
  selectedListId?: string;
  onBackToLists: () => void;
}

export const PipelineManager: React.FC<PipelineManagerProps> = ({
  data,
  onDataChange,
  selectedListId,
  onBackToLists
}) => {
  const toast = useToast();
  const [localContacts, setLocalContacts] = useState<Contact[]>([]);
  const [draggedContact, setDraggedContact] = useState<Contact | null>(null);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);

  // ✅ FILTROS REIMPLEMENTADOS
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAgent, setSelectedAgent] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tagSearch, setTagSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // ✅ NOVOS ESTADOS PARA MELHORIAS
  const [showContactForm, setShowContactForm] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [showDetailPanel, setShowDetailPanel] = useState(false);
  const [showStageManager, setShowStageManager] = useState(false);
  const [contactMenuOpen, setContactMenuOpen] = useState<string | null>(null);
  const [hiddenStages, setHiddenStages] = useState<Set<string>>(new Set());
  const [showStageVisibilityMenu, setShowStageVisibilityMenu] = useState(false);

  // Load stage visibility from localStorage
  const loadStageVisibility = useCallback((listId: string) => {
    try {
      const saved = localStorage.getItem(`pipeline-hidden-stages-${listId}`);
      if (saved) {
        const hiddenStageIds = JSON.parse(saved);
        setHiddenStages(new Set(hiddenStageIds));
        console.log('📂 Loaded stage visibility for list:', listId, hiddenStageIds);
      } else {
        setHiddenStages(new Set());
        console.log('📂 No saved visibility config for list:', listId);
      }
    } catch (error) {
      console.error('Error loading stage visibility:', error);
      setHiddenStages(new Set());
    }
  }, []);

  // Save stage visibility to localStorage
  const saveStageVisibility = useCallback((listId: string, hiddenStageIds: Set<string>) => {
    try {
      const hiddenArray = Array.from(hiddenStageIds);
      localStorage.setItem(`pipeline-hidden-stages-${listId}`, JSON.stringify(hiddenArray));
      console.log('💾 Saved stage visibility for list:', listId, hiddenArray);
    } catch (error) {
      console.error('Error saving stage visibility:', error);
    }
  }, []);

  // Load visibility config when list changes
  useEffect(() => {
    if (selectedListId) {
      loadStageVisibility(selectedListId);
    } else {
      // For "all contacts" view, use a default key
      loadStageVisibility('all-contacts');
    }
  }, [selectedListId, loadStageVisibility]);

  // Save visibility config whenever hiddenStages changes
  useEffect(() => {
    const listKey = selectedListId || 'all-contacts';
    saveStageVisibility(listKey, hiddenStages);
  }, [hiddenStages, selectedListId, saveStageVisibility]);

  // Contact movement hook with optimistic updates
  const {
    moveContact,
    retryFailedMove,
    cancelMove,
    movingContacts,
    failedMoves,
    isMoving,
    hasFailed
  } = useContactMovement({
    onOptimisticUpdate: (contactId: string, newStageId: string) => {
      console.log('🎯 Optimistic update:', contactId, newStageId);
      setLocalContacts(prev => prev.map(contact => 
        contact.id === contactId 
          ? { ...contact, stageId: newStageId }
          : contact
      ));
    },
    onRevertUpdate: (contactId: string, originalStageId: string) => {
      console.log('🔄 Reverting update:', contactId, originalStageId);
      setLocalContacts(prev => prev.map(contact => 
        contact.id === contactId 
          ? { ...contact, stageId: originalStageId }
          : contact
      ));
    }
  });

  // ✅ FILTROS APLICADOS
  const filteredContacts = localContacts.filter(contact => {
    // Filtro de busca
    const matchesSearch = !searchTerm || 
      contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (contact.company && contact.company.toLowerCase().includes(searchTerm.toLowerCase()));

    // Filtro de atendente
    const matchesAgent = !selectedAgent || contact.assignedAgentId === selectedAgent;

    // Filtro de tags
    const matchesTags = selectedTags.length === 0 || 
      selectedTags.some(tagId => contact.tags.includes(tagId));

    // Filtro de data
    let matchesDate = true;
    if (startDate) {
      const contactDate = new Date(contact.createdAt);
      const start = new Date(startDate);
      
      if (!endDate) {
        const contactDateOnly = new Date(contactDate.getFullYear(), contactDate.getMonth(), contactDate.getDate());
        const startDateOnly = new Date(start.getFullYear(), start.getMonth(), start.getDate());
        matchesDate = contactDateOnly >= startDateOnly;
      } else {
        const end = new Date(endDate);
        const contactDateOnly = new Date(contactDate.getFullYear(), contactDate.getMonth(), contactDate.getDate());
        const startDateOnly = new Date(start.getFullYear(), start.getMonth(), start.getDate());
        const endDateOnly = new Date(end.getFullYear(), end.getMonth(), end.getDate());
        
        matchesDate = contactDateOnly >= startDateOnly && contactDateOnly <= endDateOnly;
      }
    }
    
    if (!startDate && endDate) {
      const contactDate = new Date(contact.createdAt);
      const end = new Date(endDate);
      const contactDateOnly = new Date(contactDate.getFullYear(), contactDate.getMonth(), contactDate.getDate());
      const endDateOnly = new Date(end.getFullYear(), end.getMonth(), end.getDate());
      
      matchesDate = contactDateOnly <= endDateOnly;
    }

    return matchesSearch && matchesAgent && matchesTags && matchesDate;
  });

  // Update local contacts when data changes
  useEffect(() => {
    if (selectedListId) {
      const listContacts = data.contacts.filter(contact => contact.listId === selectedListId);
      setLocalContacts(listContacts);
      console.log('📋 Filtered contacts for list:', selectedListId, listContacts.length);
    } else {
      setLocalContacts(data.contacts);
      console.log('📋 All contacts:', data.contacts.length);
    }
  }, [data.contacts, selectedListId]);

  // Get contacts by stage (with filters applied)
  const getContactsByStage = useCallback((stageId: string) => {
    return filteredContacts.filter(contact => contact.stageId === stageId);
  }, [filteredContacts]);

  // Get stage statistics
  const getStageStats = useCallback((stageId: string) => {
    const stageContacts = getContactsByStage(stageId);
    return {
      count: stageContacts.length,
      value: stageContacts.reduce((sum, contact) => {
        const value = contact.customFields?.value || 0;
        return sum + (typeof value === 'number' ? value : 0);
      }, 0)
    };
  }, [getContactsByStage]);

  // ✅ FUNÇÕES DE FILTRO
  const toggleTag = (tagId: string) => {
    setSelectedTags(prev => 
      prev.includes(tagId) 
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    );
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedAgent('');
    setSelectedTags([]);
    setTagSearch('');
    setStartDate('');
    setEndDate('');
  };

  // Stage visibility functions
  const toggleStageVisibility = (stageId: string) => {
    console.log('👁️ Toggling stage visibility:', stageId);
    setHiddenStages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(stageId)) {
        newSet.delete(stageId);
        console.log('👁️ Showing stage:', stageId);
      } else {
        newSet.add(stageId);
        console.log('🚫 Hiding stage:', stageId);
      }
      return newSet;
    });
  };

  const showAllStages = () => {
    console.log('👁️ Showing all stages');
    setHiddenStages(new Set());
  };

  const hideAllStages = () => {
    console.log('🚫 Hiding all stages');
    setHiddenStages(new Set(sortedStages.map(s => s.id)));
  };

  const getVisibleStages = () => {
    return sortedStages.filter(stage => !hiddenStages.has(stage.id));
  };
  const hasActiveFilters = searchTerm || selectedAgent || selectedTags.length > 0 || startDate || endDate;

  const filteredTags = data.tags.filter(tag =>
    tag.name.toLowerCase().includes(tagSearch.toLowerCase())
  );

  // ✅ NOVAS FUNÇÕES PARA MELHORIAS
  const handleContactDoubleClick = (contact: Contact) => {
    setSelectedContact(contact);
    setShowDetailPanel(true);
  };

  const handleEditContact = (contact: Contact) => {
    setEditingContact(contact);
    setShowContactForm(true);
    setContactMenuOpen(null);
  };

  const handleDeleteContact = async (contact: Contact) => {
    if (confirm(`Tem certeza que deseja excluir o contato ${contact.name}?`)) {
      try {
        await deleteContact(contact.id);
        toast.success('Contato excluído com sucesso!');
        setContactMenuOpen(null);
      } catch (error) {
        console.error('Error deleting contact:', error);
        toast.error('Erro ao excluir contato');
      }
    }
  };

  const handleContactFormSubmit = async (contactData: Partial<Contact>) => {
    try {
      if (editingContact) {
        await updateContact(editingContact.id, contactData);
        toast.success('Contato atualizado com sucesso!');
      }
      setShowContactForm(false);
      setEditingContact(null);
    } catch (error) {
      console.error('Error saving contact:', error);
      toast.error('Erro ao salvar contato');
    }
  };

  const handleCloseDetailPanel = () => {
    setShowDetailPanel(false);
    setSelectedContact(null);
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, contact: Contact) => {
    if (isMoving(contact.id) || hasFailed(contact.id)) {
      e.preventDefault();
      return;
    }
    
    setDraggedContact(contact);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', contact.id);
    
    // Add visual feedback
    const dragImage = e.currentTarget.cloneNode(true) as HTMLElement;
    dragImage.style.transform = 'rotate(5deg)';
    dragImage.style.opacity = '0.8';
    e.dataTransfer.setDragImage(dragImage, 0, 0);
  };

  const handleDragOver = (e: React.DragEvent, stageId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverStage(stageId);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Only clear if we're leaving the stage container
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragOverStage(null);
    }
  };

  const handleDrop = async (e: React.DragEvent, targetStageId: string) => {
    e.preventDefault();
    setDragOverStage(null);
    
    if (!draggedContact || draggedContact.stageId === targetStageId) {
      setDraggedContact(null);
      return;
    }

    console.log('🎯 Moving contact:', draggedContact.name, 'to stage:', targetStageId);
    
    try {
      // Use the contact movement hook
      moveContact(draggedContact.id, targetStageId, draggedContact.stageId);
      
      toast.success(`${draggedContact.name} movido com sucesso!`);
    } catch (error) {
      console.error('❌ Error moving contact:', error);
      toast.error('Erro ao mover contato');
    } finally {
      setDraggedContact(null);
    }
  };

  const handleDragEnd = () => {
    setDraggedContact(null);
    setDragOverStage(null);
  };

  // Get the selected list name
  const selectedList = selectedListId ? data.lists.find(l => l.id === selectedListId) : null;

  // Sort stages by order
  const sortedStages = [...data.pipelineStages].sort((a, b) => a.order - b.order);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-white">
        <div className="flex items-center space-x-4">
          <button
            onClick={onBackToLists}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Voltar para Listas</span>
          </button>
          <div className="h-6 w-px bg-gray-300" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Funil de Vendas</h1>
            {selectedList && (
              <p className="text-sm text-gray-500">Lista: {selectedList.name}</p>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* ✅ NOVO: Botão de Configuração do Funil */}
          <button
            onClick={() => setShowStageManager(true)}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            title="Configurar Etapas do Funil"
          >
            <Settings className="h-4 w-4 mr-2" />
            Configurar Funil
          </button>
          
          {/* Botão de Visibilidade das Etapas */}
          <div className="relative">
            <button
              onClick={() => setShowStageVisibilityMenu(!showStageVisibilityMenu)}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              title="Controlar Visibilidade das Etapas"
            >
              <Eye className="h-4 w-4 mr-2" />
              Visibilidade
              {hiddenStages.size > 0 && (
                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                  {hiddenStages.size} oculta(s)
                </span>
              )}
            </button>

            {/* Menu de Visibilidade */}
            {showStageVisibilityMenu && (
              <div className="absolute right-0 mt-2 w-72 bg-white rounded-md shadow-lg z-20 border border-gray-200">
                <div className="py-2">
                  <div className="px-4 py-2 text-sm font-medium text-gray-900 border-b border-gray-200">
                    Controlar Visibilidade das Etapas
                  </div>
                  
                  {/* Ações Rápidas */}
                  <div className="px-4 py-2 border-b border-gray-200">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => {
                          showAllStages();
                          setShowStageVisibilityMenu(false);
                        }}
                        className="flex-1 inline-flex items-center justify-center px-2 py-1 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50"
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        Mostrar Todas
                      </button>
                      <button
                        onClick={() => {
                          hideAllStages();
                          setShowStageVisibilityMenu(false);
                        }}
                        className="flex-1 inline-flex items-center justify-center px-2 py-1 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50"
                      >
                        <EyeOff className="h-3 w-3 mr-1" />
                        Ocultar Todas
                      </button>
                    </div>
                  </div>

                  {/* Lista de Etapas */}
                  <div className="max-h-64 overflow-y-auto">
                    {sortedStages.map(stage => {
                      const isHidden = hiddenStages.has(stage.id);
                      const stageContacts = getContactsByStage(stage.id);
                      
                      return (
                        <button
                          key={stage.id}
                          onClick={() => toggleStageVisibility(stage.id)}
                          className="w-full flex items-center justify-between px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                        >
                          <div className="flex items-center space-x-3">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: stage.color }}
                            />
                            <span className={isHidden ? 'text-gray-400 line-through' : 'text-gray-900'}>
                              {stage.name}
                            </span>
                            <span className="text-xs text-gray-500">
                              ({stageContacts.length})
                            </span>
                          </div>
                          <div className="flex items-center">
                            {isHidden ? (
                              <EyeOff className="h-4 w-4 text-gray-400" />
                            ) : (
                              <Eye className="h-4 w-4 text-gray-600" />
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  
                  <div className="px-4 py-2 border-t border-gray-200 text-xs text-gray-500">
                    <p>💡 <strong>Dica:</strong> As configurações de visibilidade são salvas automaticamente e específicas para este funil.</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`inline-flex items-center px-3 py-2 border shadow-sm text-sm leading-4 font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
              hasActiveFilters
                ? 'bg-indigo-50 text-indigo-700 border-indigo-300 hover:bg-indigo-100'
                : 'text-gray-700 bg-white border-gray-300 hover:bg-gray-50'
            }`}
          >
            <Filter className="h-4 w-4 mr-2" />
            Filtros
            {hasActiveFilters && (
              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                Ativo
              </span>
            )}
          </button>
          <div className="text-sm text-gray-500">
            {filteredContacts.length} de {localContacts.length} contatos
          </div>
        </div>
      </div>

      {/* ✅ FILTROS REIMPLEMENTADOS */}
      {showFilters && (
        <div className="bg-white border-b border-gray-200 p-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Busca */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Buscar
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Nome, email ou empresa..."
                  className="pl-10 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>
            </div>

            {/* Atendente */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Atendente
              </label>
              <select
                value={selectedAgent}
                onChange={(e) => setSelectedAgent(e.target.value)}
                className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              >
                <option value="">Todos os atendentes</option>
                {data.agents.map(agent => (
                  <option key={agent.id} value={agent.id}>{agent.name}</option>
                ))}
              </select>
            </div>

            {/* Tags */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tags
              </label>
              <div className="space-y-2">
                <input
                  type="text"
                  value={tagSearch}
                  onChange={(e) => setTagSearch(e.target.value)}
                  placeholder="Buscar tags..."
                  className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
                <div className="max-h-32 overflow-y-auto border border-gray-200 rounded-md p-2">
                  {filteredTags.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {filteredTags.map((tag) => (
                        <button
                          key={tag.id}
                          type="button"
                          onClick={() => toggleTag(tag.id)}
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium transition-colors ${
                            selectedTags.includes(tag.id)
                              ? 'text-white'
                              : 'text-gray-700 bg-gray-100 hover:bg-gray-200'
                          }`}
                          style={{
                            backgroundColor: selectedTags.includes(tag.id) ? tag.color : undefined
                          }}
                        >
                          <TagIcon className="h-3 w-3 mr-1" />
                          {tag.name}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 italic">Nenhuma tag encontrada</p>
                  )}
                </div>
                {selectedTags.length > 0 && (
                  <div className="text-xs text-indigo-600">
                    {selectedTags.length} tag(s) selecionada(s)
                  </div>
                )}
              </div>
            </div>

            {/* Data */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Filtro por Data
              </label>
              <div className="space-y-2">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  placeholder="Data inicial"
                  className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  placeholder="Data final"
                  className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
                {(startDate || endDate) && (
                  <div className="text-xs text-indigo-600 bg-indigo-50 p-2 rounded">
                    <strong>Filtro ativo:</strong>
                    {startDate && !endDate && ` A partir de ${new Date(startDate).toLocaleDateString('pt-BR')}`}
                    {!startDate && endDate && ` Até ${new Date(endDate).toLocaleDateString('pt-BR')}`}
                    {startDate && endDate && ` De ${new Date(startDate).toLocaleDateString('pt-BR')} até ${new Date(endDate).toLocaleDateString('pt-BR')}`}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Botão de limpar filtros */}
          {hasActiveFilters && (
            <div className="mt-4 flex justify-end">
              <button
                onClick={clearFilters}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <X className="h-4 w-4 mr-2" />
                Limpar Filtros
              </button>
            </div>
          )}
        </div>
      )}

      {/* Indicador de Etapas Ocultas */}
      {hiddenStages.size > 0 && (
        <div className="bg-orange-50 border-t border-orange-200 px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center text-orange-700">
              <EyeOff className="h-4 w-4 mr-2" />
              <span className="text-sm font-medium">
                {hiddenStages.size} etapa(s) oculta(s) neste funil
              </span>
            </div>
            <button
              onClick={showAllStages}
              className="text-sm text-orange-600 hover:text-orange-800 font-medium"
            >
              Mostrar todas as etapas
            </button>
          </div>
        </div>
      )}

      {/* Pipeline Stages */}
      <div className="flex-1 overflow-x-auto bg-gray-50">
        <div className="flex space-x-6 p-6 min-w-max h-full">
          {getVisibleStages().map((stage) => {
            const stageContacts = getContactsByStage(stage.id);
            const stats = getStageStats(stage.id);
            const isDragOver = dragOverStage === stage.id;
            
            return (
              <div
                key={stage.id}
                className={`flex-shrink-0 w-80 bg-white rounded-lg shadow-sm border-2 transition-all ${
                  isDragOver 
                    ? 'border-indigo-400 bg-indigo-50 scale-105' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onDragOver={(e) => handleDragOver(e, stage.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, stage.id)}
              >
                {/* Stage Header */}
                <div className="p-4 border-b border-gray-200">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: stage.color }}
                      />
                      <h3 className="font-semibold text-gray-900">{stage.name}</h3>
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-gray-500">
                      <Users className="w-4 h-4" />
                      <span>{stats.count}</span>
                    </div>
                  </div>
                  
                  {stage.description && (
                    <p className="text-sm text-gray-600 mb-2">{stage.description}</p>
                  )}
                  
                  {stats.value > 0 && (
                    <div className="flex items-center space-x-1 text-sm text-green-600">
                      <TrendingUp className="w-4 h-4" />
                      <span>R$ {stats.value.toLocaleString('pt-BR')}</span>
                    </div>
                  )}
                </div>

                {/* Contacts */}
                <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
                  {stageContacts.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Nenhum contato nesta etapa</p>
                      {isDragOver && (
                        <p className="text-xs text-indigo-600 mt-1">Solte aqui para mover</p>
                      )}
                    </div>
                  ) : (
                    stageContacts.map((contact) => {
                      const list = data.lists.find(l => l.id === contact.listId);
                      const agent = data.agents.find(a => a.id === contact.assignedAgentId);
                      const contactIsMoving = isMoving(contact.id);
                      const contactHasFailed = hasFailed(contact.id);
                      const isDragging = draggedContact?.id === contact.id;
                      
                      return (
                        <div
                          key={contact.id}
                          draggable={!contactIsMoving && !contactHasFailed}
                          onDragStart={(e) => handleDragStart(e, contact)}
                          onDragEnd={handleDragEnd}
                          onDoubleClick={() => handleContactDoubleClick(contact)}
                          className={`bg-white rounded-lg p-3 shadow-sm border transition-all select-none relative group ${
                            isDragging 
                              ? 'opacity-50 scale-105 rotate-2 z-50 cursor-grabbing border-indigo-300' 
                              : contactIsMoving 
                                ? 'border-blue-300 bg-blue-50 cursor-wait' 
                                : contactHasFailed 
                                  ? 'border-red-300 bg-red-50' 
                                  : 'border-gray-200 hover:shadow-md cursor-grab hover:border-gray-300'
                          }`}
                          style={{
                            touchAction: 'none',
                            userSelect: 'none'
                          }}
                        >
                          {/* Loading/Error Overlay */}
                          {(contactIsMoving || contactHasFailed) && (
                            <div className="absolute inset-0 bg-white bg-opacity-90 rounded-lg flex items-center justify-center z-10">
                              {contactIsMoving && (
                                <div className="flex items-center text-blue-600">
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                                  <span className="text-xs font-medium">Movendo...</span>
                                </div>
                              )}
                              
                              {contactHasFailed && (
                                <div className="flex items-center space-x-2">
                                  <div className="flex items-center text-red-600">
                                    <AlertTriangle className="h-4 w-4 mr-1" />
                                    <span className="text-xs font-medium">Falha</span>
                                  </div>
                                  <div className="flex space-x-1">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        retryFailedMove(contact.id);
                                      }}
                                      className="p-1 text-blue-600 hover:text-blue-800 bg-white rounded border border-blue-300 hover:bg-blue-50"
                                      title="Tentar novamente"
                                    >
                                      <RotateCcw className="h-3 w-3" />
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        cancelMove(contact.id);
                                      }}
                                      className="p-1 text-red-600 hover:text-red-800 bg-white rounded border border-red-300 hover:bg-red-50"
                                      title="Cancelar"
                                    >
                                      <X className="h-3 w-3" />
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Card Content */}
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <h4 className="text-sm font-medium text-gray-900 truncate">
                                {contact.name}
                              </h4>
                              <p className="text-xs text-gray-500 truncate">
                                {contact.email}
                              </p>
                              {contact.company && (
                                <p className="text-xs text-gray-500 truncate">
                                  {contact.company}
                                </p>
                              )}
                            </div>
                            
                            {/* ✅ NOVO: Menu de Ações do Contato */}
                            <div className="ml-2 flex items-center space-x-1" onClick={(e) => e.stopPropagation()}>
                              <ContactActions contact={contact} size="sm" />
                              <div className="relative">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setContactMenuOpen(contactMenuOpen === contact.id ? null : contact.id);
                                  }}
                                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-gray-400 hover:text-gray-600 rounded"
                                  title="Mais ações"
                                >
                                  <MoreVertical className="h-3 w-3" />
                                </button>
                                
                                {/* Menu Dropdown */}
                                {contactMenuOpen === contact.id && (
                                  <div className="absolute right-0 top-6 w-32 bg-white rounded-md shadow-lg z-20 border border-gray-200">
                                    <div className="py-1">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleEditContact(contact);
                                        }}
                                        className="flex items-center w-full px-3 py-2 text-xs text-gray-700 hover:bg-gray-100"
                                      >
                                        <Edit2 className="h-3 w-3 mr-2" />
                                        Editar
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDeleteContact(contact);
                                        }}
                                        className="flex items-center w-full px-3 py-2 text-xs text-red-600 hover:bg-red-50"
                                      >
                                        <Trash2 className="h-3 w-3 mr-2" />
                                        Excluir
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          <div className="mt-2 flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              {!selectedListId && list && (
                                <span
                                  className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
                                  style={{
                                    backgroundColor: list.color + '20',
                                    color: list.color
                                  }}
                                >
                                  {list.name}
                                </span>
                              )}
                              {contact.tags.slice(0, 2).map(tagId => {
                                const tag = data.tags.find(t => t.id === tagId);
                                return tag ? (
                                  <span
                                    key={tagId}
                                    className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium"
                                    style={{
                                      backgroundColor: tag.color + '20',
                                      color: tag.color
                                    }}
                                  >
                                    {tag.name}
                                  </span>
                                ) : null;
                              })}
                              {contact.tags.length > 2 && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                                  +{contact.tags.length - 2}
                                </span>
                              )}
                            </div>
                            {agent && (
                              <span className="text-xs text-gray-500 truncate ml-2">
                                {agent.name}
                              </span>
                            )}
                          </div>
                          
                          {contact.source && (
                            <div className="mt-2">
                              <span className="text-xs text-gray-400">
                                Fonte: {contact.source}
                              </span>
                            </div>
                          )}
                          
                          {/* ✅ NOVO: Indicador de clique duplo */}
                          <div className="absolute bottom-1 right-1 opacity-0 group-hover:opacity-50 transition-opacity">
                            <span className="text-xs text-gray-400">Duplo clique para detalhes</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ✅ NOVOS MODAIS */}
      
      {/* Contact Form Modal */}
      {showContactForm && editingContact && (
        <ContactForm
          contact={editingContact}
          data={data}
          onSubmit={handleContactFormSubmit}
          onCancel={() => {
            setShowContactForm(false);
            setEditingContact(null);
          }}
        />
      )}

      {/* Contact Detail Panel */}
      {selectedContact && (
        <ContactDetailPanel
          contact={selectedContact}
          data={data}
          isOpen={showDetailPanel}
          onClose={handleCloseDetailPanel}
        />
      )}

      {/* ✅ NOVO: Pipeline Stage Manager */}
      {showStageManager && (
        <PipelineStageManager
          stages={data.pipelineStages}
          isOpen={showStageManager}
          onClose={() => setShowStageManager(false)}
          onDataChange={onDataChange}
        />
      )}

      {/* ✅ Click outside to close contact menu */}
      {contactMenuOpen && (
        <div
          className="fixed inset-0 z-10"
          onClick={() => setContactMenuOpen(null)}
        />
      )}

      {/* Click outside to close stage visibility menu */}
      {showStageVisibilityMenu && (
        <div
          className="fixed inset-0 z-10"
          onClick={() => setShowStageVisibilityMenu(false)}
        />
      )}
    </div>
  );
};