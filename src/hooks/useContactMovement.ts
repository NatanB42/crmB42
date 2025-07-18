import { useState, useCallback, useRef } from 'react';
import { Contact } from '../types';
import { updateContact } from '../lib/database';
import { useToast } from './useToast';

interface MovementState {
  contactId: string;
  fromStageId: string;
  toStageId: string;
  attempt: number;
  timestamp: number;
}

interface UseContactMovementProps {
  onOptimisticUpdate: (contactId: string, newStageId: string) => void;
  onRevertUpdate: (contactId: string, originalStageId: string) => void;
}

export const useContactMovement = ({ 
  onOptimisticUpdate, 
  onRevertUpdate 
}: UseContactMovementProps) => {
  const [movingContacts, setMovingContacts] = useState<Set<string>>(new Set());
  const [failedMoves, setFailedMoves] = useState<Set<string>>(new Set());
  const toast = useToast();
  const retryTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const movementQueue = useRef<Map<string, MovementState>>(new Map());

  const MAX_RETRIES = 3;
  const RETRY_DELAYS = [1000, 2000, 4000]; // Exponential backoff

  const clearRetryTimeout = (contactId: string) => {
    const timeout = retryTimeouts.current.get(contactId);
    if (timeout) {
      clearTimeout(timeout);
      retryTimeouts.current.delete(contactId);
    }
  };

  const executeMovement = useCallback(async (
    contactId: string, 
    newStageId: string, 
    originalStageId: string,
    attempt: number = 0
  ): Promise<boolean> => {
    try {
      console.log(`🎯 Attempting to move contact ${contactId} to stage ${newStageId} (attempt ${attempt + 1})`);
      
      // Add to moving contacts
      setMovingContacts(prev => new Set(prev).add(contactId));
      setFailedMoves(prev => {
        const newSet = new Set(prev);
        newSet.delete(contactId);
        return newSet;
      });

      // Perform the database update
      await updateContact(contactId, { stageId: newStageId });
      
      // Success - clean up
      setMovingContacts(prev => {
        const newSet = new Set(prev);
        newSet.delete(contactId);
        return newSet;
      });
      
      movementQueue.current.delete(contactId);
      clearRetryTimeout(contactId);
      
      console.log(`✅ Successfully moved contact ${contactId} to stage ${newStageId}`);
      toast.success('Contato movido com sucesso!');
      
      return true;
      
    } catch (error) {
      console.error(`❌ Failed to move contact ${contactId}:`, error);
      
      // Check if we should retry
      if (attempt < MAX_RETRIES) {
        const nextAttempt = attempt + 1;
        const delay = RETRY_DELAYS[attempt] || 4000;
        
        console.log(`🔄 Scheduling retry ${nextAttempt}/${MAX_RETRIES} for contact ${contactId} in ${delay}ms`);
        
        // Update movement state
        movementQueue.current.set(contactId, {
          contactId,
          fromStageId: originalStageId,
          toStageId: newStageId,
          attempt: nextAttempt,
          timestamp: Date.now()
        });
        
        // Schedule retry
        const timeout = setTimeout(() => {
          executeMovement(contactId, newStageId, originalStageId, nextAttempt);
        }, delay);
        
        retryTimeouts.current.set(contactId, timeout);
        
        return false;
      } else {
        // Max retries reached - revert and show error
        console.error(`💥 Max retries reached for contact ${contactId}, reverting...`);
        
        setMovingContacts(prev => {
          const newSet = new Set(prev);
          newSet.delete(contactId);
          return newSet;
        });
        
        setFailedMoves(prev => new Set(prev).add(contactId));
        
        // Revert the optimistic update
        onRevertUpdate(contactId, originalStageId);
        
        movementQueue.current.delete(contactId);
        clearRetryTimeout(contactId);
        
        toast.error('Falha ao mover contato. Posição revertida.');
        
        // Auto-clear failed state after 5 seconds
        setTimeout(() => {
          setFailedMoves(prev => {
            const newSet = new Set(prev);
            newSet.delete(contactId);
            return newSet;
          });
        }, 5000);
        
        return false;
      }
    }
  }, [onRevertUpdate, toast]);

  const moveContact = useCallback((
    contactId: string, 
    newStageId: string, 
    originalStageId: string
  ) => {
    // Prevent duplicate moves
    if (movingContacts.has(contactId)) {
      console.log(`⚠️ Contact ${contactId} is already being moved, ignoring...`);
      return;
    }

    // Clear any existing retry for this contact
    clearRetryTimeout(contactId);
    
    // Apply optimistic update immediately
    onOptimisticUpdate(contactId, newStageId);
    
    // Execute the movement
    executeMovement(contactId, newStageId, originalStageId);
  }, [movingContacts, onOptimisticUpdate, executeMovement]);

  const retryFailedMove = useCallback((contactId: string) => {
    const movement = movementQueue.current.get(contactId);
    if (movement) {
      setFailedMoves(prev => {
        const newSet = new Set(prev);
        newSet.delete(contactId);
        return newSet;
      });
      
      executeMovement(
        movement.contactId, 
        movement.toStageId, 
        movement.fromStageId, 
        movement.attempt
      );
    }
  }, [executeMovement]);

  const cancelMove = useCallback((contactId: string) => {
    const movement = movementQueue.current.get(contactId);
    if (movement) {
      clearRetryTimeout(contactId);
      
      setMovingContacts(prev => {
        const newSet = new Set(prev);
        newSet.delete(contactId);
        return newSet;
      });
      
      setFailedMoves(prev => {
        const newSet = new Set(prev);
        newSet.delete(contactId);
        return newSet;
      });
      
      // Revert the optimistic update
      onRevertUpdate(contactId, movement.fromStageId);
      
      movementQueue.current.delete(contactId);
      
      toast.info('Movimentação cancelada');
    }
  }, [onRevertUpdate, toast]);

  // Cleanup on unmount
  const cleanup = useCallback(() => {
    retryTimeouts.current.forEach(timeout => clearTimeout(timeout));
    retryTimeouts.current.clear();
    movementQueue.current.clear();
  }, []);

  return {
    moveContact,
    retryFailedMove,
    cancelMove,
    cleanup,
    movingContacts,
    failedMoves,
    isMoving: (contactId: string) => movingContacts.has(contactId),
    hasFailed: (contactId: string) => failedMoves.has(contactId)
  };
};