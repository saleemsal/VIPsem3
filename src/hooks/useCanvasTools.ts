import { useState, useEffect, useCallback } from 'react';
import { API_BASE } from '@/lib/runtime';

export interface CanvasTool {
  name: string;
  description: string;
  category?: string;
}

export function useCanvasTools() {
  const [tools, setTools] = useState<CanvasTool[]>([]);
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(false);
  const [statusCheckTrigger, setStatusCheckTrigger] = useState(0);

  useEffect(() => {
    // Safety check - if API_BASE is not available, don't try to fetch
    if (!API_BASE) {
      console.warn('[useCanvasTools] API_BASE is not defined');
      return;
    }

    // Check connection status
    const checkConnectionStatus = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/canvas/status`).catch(() => null);
        if (res?.ok) {
          const data = await res.json().catch(() => ({ connected: false }));
          const isConnected = data.connected === true;
          setConnected(isConnected);
          console.log('[useCanvasTools] Connection status checked:', isConnected);
        } else {
          // If status endpoint fails, assume not connected
          setConnected(false);
        }
      } catch (error) {
        console.warn('[useCanvasTools] Failed to check connection status:', error);
        setConnected(false);
      }
    };

    // Always load the tool list (doesn't require API key)
    const loadTools = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API_BASE}/api/canvas/tools`).catch((err) => {
          console.warn('[useCanvasTools] Failed to fetch tools:', err);
          return null;
        });
        
        if (!res) {
          setLoading(false);
          return;
        }
        
        const data = await res.json().catch(() => {
          console.warn('[useCanvasTools] Failed to parse tools response');
          return { success: false };
        });
        
        console.log('[useCanvasTools] Tools API response:', { status: res.status, data });
        
        if (res.ok && data) {
          // Handle different response formats
          let toolList: CanvasTool[] = [];
          
          // Try multiple response format patterns
          if (data.success && data.data?.tools) {
            // Format: { success: true, data: { tools: {...} } }
            toolList = Object.values(data.data.tools) as CanvasTool[];
          } else if (data.data?.tools) {
            // Format: { data: { tools: {...} } }
            toolList = Object.values(data.data.tools) as CanvasTool[];
          } else if (data.tools) {
            // Format: { tools: {...} }
            toolList = Object.values(data.tools) as CanvasTool[];
          } else if (data.success && data.tools) {
            // Format: { success: true, tools: {...} }
            toolList = Object.values(data.tools) as CanvasTool[];
          }
          
          console.log('[useCanvasTools] Parsed tools:', toolList);
          
          if (toolList.length > 0) {
            setTools(toolList);
          }
        }
      } catch (error) {
        // Silently handle errors - don't crash the app
        console.warn('[useCanvasTools] Failed to load tools:', error);
      } finally {
        setLoading(false);
      }
    };

    // Load tools and check connection status with a small delay
    const timeout = setTimeout(() => {
      loadTools();
      checkConnectionStatus();
    }, 100);
    
    // Re-check tools and connection status periodically (every 60 seconds)
    const toolsInterval = setInterval(() => {
      loadTools();
      checkConnectionStatus();
    }, 60000);
    
    return () => {
      clearTimeout(timeout);
      clearInterval(toolsInterval);
    };
  }, [statusCheckTrigger]);

  // Expose a function to manually refresh connection status
  const refreshConnectionStatus = useCallback(() => {
    setStatusCheckTrigger(prev => prev + 1);
  }, []);

  const callTool = async (toolName: string, args: Record<string, any> = {}) => {
    try {
      console.log('[useCanvasTools] Calling tool:', toolName, 'with args:', args);
      const res = await fetch(`${API_BASE}/api/canvas/tools.call`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toolName, args })
      });
      
      const data = await res.json().catch(() => ({ success: false, error: 'Failed to parse response' }));
      console.log('[useCanvasTools] Tool call response:', { status: res.status, data });
      
      if (!res.ok) {
        const errorMsg = data.error || data.message || `Tool call failed: ${res.status}`;
        // Check if error indicates not connected
        if (errorMsg.toLowerCase().includes('not connected') || res.status === 401) {
          setConnected(false);
        }
        throw new Error(errorMsg);
      }
      
      // Handle different response formats
      if (data.success === false) {
        const errorMsg = data.error || 'Tool call returned success: false';
        // Check if error indicates not connected
        if (errorMsg.toLowerCase().includes('not connected')) {
          setConnected(false);
        }
        throw new Error(errorMsg);
      }
      
      // Update connection status based on successful response
      setConnected(true);
      // Also trigger a status check to ensure UI is in sync
      setTimeout(() => {
        setStatusCheckTrigger(prev => prev + 1);
      }, 100);
      
      // Return the full response (includes success, data, etc.) so ChatInterface can extract data.data
      return data;
    } catch (error) {
      console.error('[useCanvasTools] Canvas tool call error:', error);
      // If error indicates not connected, update state
      if (error instanceof Error && 
          (error.message.toLowerCase().includes('not connected') || 
           error.message.toLowerCase().includes('canvas not connected'))) {
        setConnected(false);
      }
      throw error;
    }
  };

  // Intent matching to suggest tools
  const suggestTool = (prompt: string): string | null => {
    const lower = prompt.toLowerCase();
    
    // Grade-related - check for "what are my grades", "show my grades", "my gpa", etc.
    if (lower.match(/\b(grade|gpa|score|points?|percent|what.*grade|my.*grade|show.*grade)\b/)) {
      return 'get_current_grades';
    }
    
    // Assignment-related
    if (lower.match(/\b(assignment|homework|due|deadline|submit|task)\b/)) {
      if (lower.match(/\b(overdue|late|missed|past|behind)\b/)) {
        return 'get_overdue_assignments';
      }
      if (lower.match(/\b(upcoming|coming|next|future)\b/)) {
        return 'get_upcoming_assignments';
      }
      // Default to upcoming if just "assignments"
      return 'get_upcoming_assignments';
    }
    
    // Schedule/calendar - check for "what's on my schedule", "today's schedule", etc.
    if (lower.match(/\b(schedule|calendar|event|today|tomorrow|what.*today|what.*schedule|my.*schedule)\b/)) {
      if (lower.match(/\b(today|now|this.*day)\b/)) {
        return 'get_todays_schedule';
      }
      if (lower.match(/\b(event|events|upcoming.*event)\b/)) {
        return 'get_upcoming_events';
      }
      // Default to today's schedule
      return 'get_todays_schedule';
    }
    
    return null;
  };

  return {
    tools,
    loading,
    connected,
    callTool,
    suggestTool,
    refreshConnectionStatus
  };
}

