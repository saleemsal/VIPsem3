import { useState, useRef, useCallback } from 'react';
import { retrieve, sourcesRegistry } from '../lib/sources';
import { API_BASE } from '@/lib/runtime';
import type { ChatMode } from './useChatModes';

// Intent classification for routing
function classifyIntent(prompt: string): 'meta' | 'study' | 'navigation' {
  const lowerPrompt = prompt.toLowerCase().trim();
  
  // Meta/product queries - force general mode
  const metaKeywords = [
    'hello', 'hi', 'hey', 'what are you', 'who are you', 'tell me about yourself',
    'what can you do', 'how do you work', 'what is this', 'help me understand',
    'introduce yourself', 'capabilities', 'features'
  ];
  
  // Navigation/upload hints
  const navKeywords = [
    'upload', 'file', 'document', 'attach', 'open', 'load', 'import'
  ];
  
  if (metaKeywords.some(keyword => lowerPrompt.includes(keyword))) {
    return 'meta';
  }
  
  if (navKeywords.some(keyword => lowerPrompt.includes(keyword))) {
    return 'navigation';
  }
  
  return 'study';
}

export interface Message {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
  status?: 'streaming' | 'final' | 'error';
  citations?: Citation[];
  timestamp?: Date;
  model?: string;
  grounded?: boolean;
}

export interface Citation {
  source: string;
  page: number;
  score: number;
}

export interface ChatStatus {
  grounded: boolean | null;
  note?: string;
  model?: string;
  fallbackNotice?: string;
}

function stripSentinel(text: string): string {
  if (!text) return text;
  // Remove code fences
  const unfenced = text.replace(/```(?:json)?\n([\s\S]*?)```/gi, '$1');
  // Remove trailing sentinel object containing "done": true
  const sentinelRegex = /\{[\s\S]*?"done"\s*:\s*true[\s\S]*?\}\s*$/;
  if (sentinelRegex.test(unfenced)) {
    return unfenced.replace(sentinelRegex, '').trimEnd();
  }
  return unfenced;
}

export function useChatStream() {
  // State is now keyed by conversation ID for isolation
  const [conversationStates, setConversationStates] = useState<Record<string, {
    messages: Message[];
    pending: boolean;
    citations: Citation[] | null;
    status: ChatStatus;
    lastAssistantMessage: Message | null;
  }>>({});
  
  const [streamingConversationId, setStreamingConversationId] = useState<string | null>(null);
  const ctrlRef = useRef<AbortController | null>(null);

  // Get current conversation state or default
  const getCurrentState = (conversationId: string | null) => {
    if (!conversationId) return {
      messages: [],
      pending: false,
      citations: null,
      status: { grounded: null },
      lastAssistantMessage: null
    };
    
    return conversationStates[conversationId] || {
      messages: [],
      pending: false,
      citations: null,
      status: { grounded: null },
      lastAssistantMessage: null
    };
  };

  const currentState = getCurrentState(streamingConversationId);
  const { messages, pending, citations, status, lastAssistantMessage } = currentState;

  // Update state for a specific conversation
  const updateConversationState = (conversationId: string, updates: Partial<typeof currentState>) => {
    setConversationStates(prev => ({
      ...prev,
      [conversationId]: {
        ...getCurrentState(conversationId),
        ...updates
      }
    }));
  };

  async function send({
    prompt,
    topK = 12,
    mode = 'auto',
    waitForFiles = false,
    conversationId,
    reasoningMode = true,
    onMessageUpdate
  }: {
    prompt: string;
    topK?: number;
    mode?: ChatMode;
    waitForFiles?: boolean;
    conversationId: string;
    reasoningMode?: boolean;
    onMessageUpdate?: (message: Message) => void;
  }) {
    // Intent classification
    const intent = classifyIntent(prompt);
    let effectiveMode = mode;
    
    // Override mode for meta queries
    if (intent === 'meta') {
      effectiveMode = 'general';
    }
    
    // Handle navigation queries
    if (intent === 'navigation') {
      const assistantMessage: Message = {
        id: `nav-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        role: 'assistant',
        content: 'To upload files, click the attachment button (📎) next to the input field. You can upload PDFs, images, and documents that I can analyze and answer questions about.',
        status: 'final',
        timestamp: new Date(),
        grounded: false
      };
      
      updateConversationState(conversationId, {
        messages: [...getCurrentState(conversationId).messages, assistantMessage],
        lastAssistantMessage: assistantMessage,
        pending: false,
        status: { grounded: false, model: 'Navigation Helper' }
      });
      
      onMessageUpdate?.(assistantMessage);
      return;
    }
    const currentMessages = getCurrentState(conversationId).messages;
    
    updateConversationState(conversationId, {
      pending: true,
      citations: null,
      status: { grounded: null }
    });

    // Create assistant message for this conversation
    const assistantMessage: Message = { 
      id: (globalThis as any).crypto?.randomUUID?.() ?? `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      role: 'assistant', 
      content: '', 
      status: 'streaming',
      timestamp: new Date()
    };
    
    // Append assistant after the latest messages currently in view
    const updatedStartMessages = [...getCurrentState(conversationId).messages, assistantMessage];
    
    updateConversationState(conversationId, {
      messages: updatedStartMessages
    });

    // Handle meta queries with special response
    if (intent === 'meta') {
      const metaResponse = `**GT Study Buddy** is your AI-powered academic assistant.

**Key capabilities:**
• **Document Analysis** - Upload PDFs, images, and documents for Q&A
• **Smart Retrieval** - Find relevant information from your uploaded sources  
• **Study Support** - Get explanations, summaries, and insights
• **Multiple Modes** - Auto (smart routing), RAG-only (source-based), or General responses

Upload your course materials to get started with grounded, cited answers!`;

      // Stream the meta response
      let currentContent = '';
      for (const char of metaResponse) {
        currentContent += char;
        const updatedMessages = [...getCurrentState(conversationId).messages];
        updatedMessages[updatedMessages.length - 1] = {
          ...updatedMessages[updatedMessages.length - 1],
          content: currentContent,
          status: 'streaming'
        };
        
        updateConversationState(conversationId, {
          messages: updatedMessages
        });
        
        // Small delay for typing effect
        await new Promise(resolve => setTimeout(resolve, 20));
      }

      // Finalize meta response
      const finalMetaMessage = {
        ...getCurrentState(conversationId).messages[getCurrentState(conversationId).messages.length - 1],
        content: metaResponse,
        status: 'final' as const,
        grounded: false,
        model: 'GT Study Buddy',
        timestamp: new Date()
      };
      
      const finalMessages = [...getCurrentState(conversationId).messages];
      finalMessages[finalMessages.length - 1] = finalMetaMessage;
      
      updateConversationState(conversationId, {
        messages: finalMessages,
        lastAssistantMessage: finalMetaMessage,
        pending: false,
        status: { grounded: false, model: 'GT Study Buddy' }
      });
      
      onMessageUpdate?.(finalMetaMessage);
      return;
    }

    try {
      // Wait for files if needed
      if (waitForFiles) {
        // Small delay to let file processing complete
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Build context from ready sources 
      const readySources = sourcesRegistry.getSourcesByStatus('ready');
      const hasAnySources = readySources.length > 0;

      let hits: any[] = [];
      let context = '';
      let normalizedCitations: any[] = [];
      
      // Only retrieve if not in general mode
      if (effectiveMode !== 'general' && hasAnySources) {
        hits = retrieve(prompt, topK, 0.15);
        
        // Assemble context as trimmed page-level snippets
        if (hits.length > 0) {
          context = hits.map(h => {
            const snippet = h.text.length > 800 ? h.text.substring(0, 800) + '…' : h.text;
            return `[[file: ${h.source} | page: ${h.page}]]\n${snippet}`;
          }).join('\n\n');
        }

        // Normalize citations to 0-100 and include optional snippet for tooltips
        normalizedCitations = hits.map(h => ({
          source: h.source,
          page: h.page,
          score: Math.round(h.score * 100),
          snippet: h.text.length > 120 ? h.text.substring(0, 120) + '…' : h.text
        }));
      }

      // Check RAG-only mode enforcement
      if (effectiveMode === 'rag-only' && hits.length === 0) {
        const refusalMessage = 'Insufficient evidence in uploaded sources to answer this query. Please upload relevant documents or switch to General mode.';
        
        const refusalMessageObj = {
          ...getCurrentState(conversationId).messages[getCurrentState(conversationId).messages.length - 1],
          content: refusalMessage,
          status: 'final' as const,
          grounded: false,
          model: 'RAG Guard',
          timestamp: new Date()
        };
        
        const finalMessages = [...getCurrentState(conversationId).messages];
        finalMessages[finalMessages.length - 1] = refusalMessageObj;
        
        updateConversationState(conversationId, {
          messages: finalMessages,
          lastAssistantMessage: refusalMessageObj,
          pending: false,
          citations: [],
          status: { grounded: false, model: 'RAG Guard' }
        });
        
        onMessageUpdate?.(refusalMessageObj);
        return;
      }

      // Auto mode: fallback to general if insufficient hits
      const isGrounded = effectiveMode === 'general' ? false : hits.length > 0;
      const hasStrongHits = hits.length > 0 && hits[0].score > 0.3; // Threshold for auto mode
      const shouldUseRAG = effectiveMode === 'rag-only' || (effectiveMode === 'auto' && hasStrongHits);

      // Set status based on mode and hits
      updateConversationState(conversationId, {
        citations: normalizedCitations,
        status: { grounded: isGrounded, model: 'Gemini 1.5 Flash' }
      });

      // Prepare system prompt based on mode and context
      let systemPrompt = '';
      if (shouldUseRAG && context) {
        systemPrompt = "You are GT Study Buddy. Use ONLY the provided context. After each claim, add a citation like (Slide N) or (p. N). Start with a one-sentence takeaway, then concise bullets. Output clean Markdown.";
      } else {
        systemPrompt = "You are GT Study Buddy. Provide a helpful answer in clean Markdown with a brief summary and concise bullets where helpful.";
      }

      let responseContent = '';
      let finalSentinel: any = null;
      let hadError = false;

      // Create AbortController with timeout and retry capability
      const abortController = new AbortController();
      ctrlRef.current = abortController;
      
      const timeout = setTimeout(() => {
        console.warn('Chat request timeout after 30s');
        abortController.abort();
        
        // Update status with timeout notice
        updateConversationState(conversationId, {
          status: { 
            ...getCurrentState(conversationId).status, 
            fallbackNotice: 'Request timed out after 30 seconds. Please try again.' 
          }
        });
      }, 30000); // 30s timeout

      clearTimeout(timeout);

      try {
        const response = await fetch(`${API_BASE}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt,
            system: systemPrompt,
            context: shouldUseRAG ? context : undefined,
            mode: shouldUseRAG ? 'rag' : 'general',
            reasoningMode
          })
        });

        if (!response.ok) {
          const text = await response.text();
          throw new Error(`Local model error: ${response.status} ${text}`);
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        if (!reader) {
          throw new Error('No response body');
        }

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          let idx;
          while ((idx = buffer.indexOf('\n')) >= 0) {
            const line = buffer.slice(0, idx).trim();
            buffer = buffer.slice(idx + 1);
            if (!line) continue;

            if (line.startsWith('{') && line.includes('"citations"')) {
              try {
                const json = JSON.parse(line);
                updateConversationState(conversationId, {
                  citations: json.citations || normalizedCitations,
                  status: {
                    grounded: json.grounded !== undefined ? json.grounded : isGrounded,
                    model: json.model || 'Ollama (local)'
                  }
                });
              } catch (err) {
                console.error('Failed to parse citations line:', err);
              }
            } else {
              responseContent += line + '\n';
            }
          }
        }
      } catch (streamError: any) {
        console.error('Local model error:', streamError);
        responseContent += `\n[Error] ${streamError.message}`;
        hadError = true;
        const updatedMessages = [...getCurrentState(conversationId).messages];
        updatedMessages[updatedMessages.length - 1] = {
          ...updatedMessages[updatedMessages.length - 1],
          role: 'assistant' as const,
          content: responseContent,
          status: 'error'
        };
        updateConversationState(conversationId, {
          messages: updatedMessages
        });
      }
      // Finalize only if no error occurred
      if (!hadError) {
        const finalState = getCurrentState(conversationId);
        const finalMessages = [...finalState.messages];
        const finalMessage = {
          ...finalMessages[finalMessages.length - 1],
          role: 'assistant' as const,
          content: stripSentinel(responseContent),
          status: 'final' as const,
          citations: finalState.citations,
          model: finalState.status.model,
          grounded: finalState.status.grounded,
          timestamp: new Date()
        };
        finalMessages[finalMessages.length - 1] = finalMessage;

        updateConversationState(conversationId, {
          messages: finalMessages,
          lastAssistantMessage: finalMessage,
          pending: false
        });

        // Process final sentinel if received
        if (finalSentinel) {
          if (finalSentinel.citations && finalSentinel.citations.length > 0) {
            updateConversationState(conversationId, {
              citations: finalSentinel.citations,
              status: { ...finalState.status, grounded: true }
            });
          }
          if (finalSentinel.model) {
            updateConversationState(conversationId, {
              status: { ...finalState.status, model: finalSentinel.model }
            });
          }
        }

        // Persist the final message
        onMessageUpdate?.(finalMessage);
      } else {
        // Just clear pending on error
        updateConversationState(conversationId, { pending: false });
      }
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessages = [...getCurrentState(conversationId).messages];
      const errorMessage = {
        ...errorMessages[errorMessages.length - 1],
        role: 'assistant' as const,
        content: 'Error occurred while processing your request.',
        status: 'error' as const,
        timestamp: new Date()
      };
      errorMessages[errorMessages.length - 1] = errorMessage;
      
      updateConversationState(conversationId, {
        messages: errorMessages,
        pending: false,
        lastAssistantMessage: errorMessage
      });
      
      onMessageUpdate?.(errorMessage);
    }
  }

  function abort() {
    ctrlRef.current?.abort();
    if (streamingConversationId) {
      updateConversationState(streamingConversationId, { pending: false });
    }
  }

  // Load messages from conversation with proper status handling
  const loadMessages = useCallback((conversationId: string | null, conversationMessages: Message[]) => {
    if (!conversationId) {
      console.log('[useChatStream] Clearing messages - no conversation ID');
      setStreamingConversationId(null);
      return;
    }
    
    // Fix any leftover streaming messages
    const fixedMessages = conversationMessages.map((msg, i) => {
      const normalizedRole: 'user' | 'assistant' = msg.role === 'user' || msg.role === 'assistant' ? msg.role : 'assistant';
      const ensuredId = (msg as any).id ?? ((globalThis as any).crypto?.randomUUID?.() ?? `msg-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 8)}`);
      return {
        ...msg,
        id: ensuredId,
        role: normalizedRole,
        status: msg.status === 'streaming' ? 'final' as const : msg.status
      } as Message;
    });
    
    // Set last assistant message for citations
    const lastAssistant = fixedMessages.filter(m => m.role === 'assistant').pop();
    
    console.log('[useChatStream] Loading messages into streaming state:', {
      conversationId,
      messageCount: fixedMessages.length,
      lastAssistantHasCitations: !!lastAssistant?.citations,
      citationCount: lastAssistant?.citations?.length || 0,
      messages: fixedMessages.map(m => ({
        role: m.role,
        status: m.status,
        contentPreview: m.content.substring(0, 30),
        hasCitations: !!m.citations
      }))
    });
    
    setConversationStates(prev => {
      const newState = {
        ...prev,
        [conversationId]: {
          messages: fixedMessages,
          lastAssistantMessage: lastAssistant || null,
          citations: lastAssistant?.citations || null,
          pending: false,
          status: lastAssistant?.grounded !== undefined 
            ? { grounded: lastAssistant.grounded, model: lastAssistant.model }
            : { grounded: null }
        }
      };
      
      console.log('[useChatStream] Updated conversation states:', {
        conversationId,
        previousConversationIds: Object.keys(prev),
        newConversationIds: Object.keys(newState),
        newMessageCount: newState[conversationId].messages.length
      });
      
      return newState;
    });
    
    setStreamingConversationId(conversationId);
    
    console.log('[useChatStream] Set streaming conversation ID to:', conversationId);
  }, []);

  return {
    messages,
    loadMessages,
    pending,
    citations,
    status,
    lastAssistantMessage,
    streamingConversationId,
    setStreamingConversationId,
    send,
    abort
  };
}