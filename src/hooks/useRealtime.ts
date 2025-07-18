import { useEffect } from 'react';
import { supabase } from '../lib/supabase';

export const useRealtime = (onDataChange: () => void) => {
  useEffect(() => {
    console.log('🔄 Configurando subscriptions em tempo real...');
    
    // ✅ CORREÇÃO: Debounce function to prevent too many updates
    let updateTimeout: NodeJS.Timeout;
    const debouncedUpdate = () => {
      clearTimeout(updateTimeout);
      updateTimeout = setTimeout(() => {
        onDataChange();
      }, 1000); // ✅ CORREÇÃO: Aumentado para 1 segundo para reduzir updates
    };
    
    // Subscribe to contacts changes
    const contactsSubscription = supabase
      .channel('contacts-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'contacts' }, 
        (payload) => {
          console.log('📡 Contato atualizado:', payload.eventType, payload.new?.name || payload.old?.name);
          debouncedUpdate();
        }
      )
      .subscribe();

    // Subscribe to lists changes
    const listsSubscription = supabase
      .channel('lists-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'lists' }, 
        (payload) => {
          console.log('📡 Lista atualizada:', payload.eventType);
          debouncedUpdate();
        }
      )
      .subscribe();

    // Subscribe to agents changes
    const agentsSubscription = supabase
      .channel('agents-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'agents' }, 
        (payload) => {
          console.log('📡 Atendente atualizado:', payload.eventType);
          debouncedUpdate();
        }
      )
      .subscribe();

    // Subscribe to pipeline_stages changes
    const stagesSubscription = supabase
      .channel('stages-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'pipeline_stages' }, 
        (payload) => {
          console.log('📡 Etapa atualizada:', payload.eventType);
          debouncedUpdate();
        }
      )
      .subscribe();

    // Subscribe to tags changes
    const tagsSubscription = supabase
      .channel('tags-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'tags' }, 
        (payload) => {
          console.log('📡 Tag atualizada:', payload.eventType);
          debouncedUpdate();
        }
      )
      .subscribe();

    // Subscribe to custom_fields changes
    const fieldsSubscription = supabase
      .channel('fields-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'custom_fields' }, 
        (payload) => {
          console.log('📡 Campo personalizado atualizado:', payload.eventType);
          debouncedUpdate();
        }
      )
      .subscribe();

    // Subscribe to dashboard_configs changes
    const dashboardSubscription = supabase
      .channel('dashboard-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'dashboard_configs' }, 
        (payload) => {
          console.log('📡 Dashboard config atualizada:', payload.eventType);
          // ✅ CORREÇÃO: Don't reload all data for dashboard config changes
          // The dashboard will handle its own state updates
        }
      )
      .subscribe();

    // Cleanup subscriptions
    return () => {
      console.log('🔄 Limpando subscriptions...');
      clearTimeout(updateTimeout);
      contactsSubscription.unsubscribe();
      listsSubscription.unsubscribe();
      agentsSubscription.unsubscribe();
      stagesSubscription.unsubscribe();
      tagsSubscription.unsubscribe();
      fieldsSubscription.unsubscribe();
      dashboardSubscription.unsubscribe();
    };
  }, [onDataChange]);
};