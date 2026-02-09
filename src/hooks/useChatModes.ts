import { useState, useEffect } from 'react';

export type ChatMode = 'auto' | 'rag-only' | 'general';

const CHAT_MODE_KEY = 'gt_mode';

export function useChatModes() {
  // Load from localStorage on init
  const [mode, setModeState] = useState<ChatMode>(() => {
    try {
      const stored = localStorage.getItem(CHAT_MODE_KEY);
      return (stored as ChatMode) || 'auto';
    } catch {
      return 'auto';
    }
  });

  // Persist to localStorage on change
  const setMode = (newMode: ChatMode) => {
    setModeState(newMode);
    try {
      localStorage.setItem(CHAT_MODE_KEY, newMode);
    } catch (error) {
      console.warn('Failed to save chat mode to localStorage:', error);
    }
  };

  return {
    mode,
    setMode
  };
}