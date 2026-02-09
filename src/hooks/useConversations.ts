import { useState, useEffect } from 'react';
import { conversationStore, type Conversation, type ChatMessage } from '@/lib/conversations';
import { type ChatMode } from './useChatModes';

export function useConversations() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);

  const refreshConversations = () => {
    const allConvs = conversationStore.getAllConversations();
    const activeConv = conversationStore.getActiveConversation();
    
    console.log('[useConversations] Refreshing conversations:', {
      totalConversations: allConvs.length,
      activeConversationId: activeConv?.id,
      activeConversationTitle: activeConv?.title,
      activeMessageCount: activeConv?.messages.length || 0
    });
    
    setConversations(allConvs);
    setActiveConversation(activeConv);
  };

  useEffect(() => {
    console.log('useConversations mounting, initializing...');
    // Initialize conversations and ensure we have a proper active conversation
    const initialized = conversationStore.initializeConversations();
    refreshConversations();
    
    // Debug logging
    const allConvs = conversationStore.getAllConversations();
    console.log('Conversations initialized:', {
      totalConversations: allConvs.length,
      activeConversationId: initialized?.id,
      activeMessageCount: initialized?.messages?.length || 0,
      allConversations: allConvs.map(c => ({ id: c.id, title: c.title, msgCount: c.messages.length }))
    });
  }, []);

  const createNewConversation = (mode: ChatMode = 'auto') => {
    const conversation = conversationStore.createConversation(mode);
    refreshConversations();
    return conversation;
  };

  const switchToConversation = (id: string) => {
    console.log('[useConversations] Switching to conversation:', id);
    
    if (conversationStore.setActiveConversation(id)) {
      console.log('[useConversations] Conversation switched successfully, refreshing...');
      refreshConversations();
      return true;
    }
    
    console.error('[useConversations] Failed to switch conversation:', id);
    return false;
  };

  const addMessageToActive = (message: any) => {
    if (!activeConversation) return false;
    
    if (conversationStore.addMessage(activeConversation.id, message)) {
      refreshConversations();
      return true;
    }
    return false;
  };

  const updateActiveMode = (mode: ChatMode) => {
    if (!activeConversation) return false;
    
    if (conversationStore.updateConversationMode(activeConversation.id, mode)) {
      refreshConversations();
      return true;
    }
    return false;
  };

  const renameConversation = (id: string, title: string) => {
    if (conversationStore.renameConversation(id, title)) {
      refreshConversations();
      return true;
    }
    return false;
  };

  const deleteConversation = (id: string) => {
    if (conversationStore.deleteConversation(id)) {
      refreshConversations();
      return true;
    }
    return false;
  };

  const clearAllConversations = () => {
    conversationStore.clearAll();
    refreshConversations();
  };

  return {
    conversations,
    activeConversation,
    createNewConversation,
    switchToConversation,
    addMessageToActive,
    updateActiveMode,
    renameConversation,
    deleteConversation,
    clearAllConversations
  };
}