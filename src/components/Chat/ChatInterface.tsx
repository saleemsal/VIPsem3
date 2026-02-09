import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  Send, 
  Square, 
  Bot, 
  User, 
  Quote,
  Clock,
  Shield,
  Settings,
  Plus,
  MessageCircle,
  Wrench
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useChatStream } from "@/hooks/useChatStream";
import { useChatModes, type ChatMode } from "@/hooks/useChatModes";
import { useConversations } from "@/hooks/useConversations";
import { useCanvasTools } from "@/hooks/useCanvasTools";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { AttachButton } from "./AttachButton";
import { retrieve } from "@/lib/rag";
import { sourcesRegistry } from "@/lib/sources";
import { StarRatingFeedback } from "@/components/Feedback/StarRatingFeedback";
import { useFeedback } from "@/hooks/useFeedback";
import { FeedbackDialog } from "@/feedback/FeedbackDialog";



interface ChatInterfaceProps {
  onCitationClick?: (source: string, page: number) => void;
}

export function ChatInterface({ onCitationClick }: ChatInterfaceProps) {
  console.log('[ChatInterface] Component rendering');
  
  const { 
    messages, 
    pending, 
    citations, 
    status, 
    send, 
    abort, 
    loadMessages,
    streamingConversationId,
    setStreamingConversationId
  } = useChatStream();
  const { mode, setMode } = useChatModes();
  const { 
    activeConversation, 
    createNewConversation, 
    addMessageToActive, 
    updateActiveMode,
    conversations 
  } = useConversations();
  const { tools, connected, callTool, suggestTool } = useCanvasTools();
  const [selectedTool, setSelectedTool] = useState<string | null>(null);
  const [toolResult, setToolResult] = useState<any>(null);
  
  // Debug: Log when activeConversation or conversations change
  useEffect(() => {
    console.log('[ChatInterface] Props changed:', {
      activeConversationId: activeConversation?.id,
      activeConversationTitle: activeConversation?.title,
      activeConversationMessageCount: activeConversation?.messages.length || 0,
      totalConversations: conversations.length,
      conversationIds: conversations.map(c => c.id)
    });
  }, [activeConversation, conversations]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [followLatest, setFollowLatest] = useState(true);
  const [prompt, setPrompt] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const lastScrollTimeRef = useRef<number>(0);
  const [feedbackDialogOpen, setFeedbackDialogOpen] = useState(false);
  const { submitFeedback, isSubmitting: isFeedbackSubmitting } = useFeedback();
  
  // Ensure sources registry is hydrated on chat mount
  useEffect(() => {
    sourcesRegistry.initialize();
  }, []);
  
  const readySources = sourcesRegistry.getSourcesByStatus('ready');
  const hasReadySources = readySources.length > 0;

  // Debug: Log when messages change
  useEffect(() => {
    console.log('[ChatInterface] Messages updated:', {
      messageCount: messages.length,
      streamingConversationId,
      activeConversationId: activeConversation?.id,
      messages: messages.map(m => ({
        role: m.role,
        contentPreview: m.content.substring(0, 30),
        status: m.status
      }))
    });
  }, [messages, streamingConversationId, activeConversation?.id]);

  // Removed IntersectionObserver to prevent scroll jitter; rely on scroll position


  // Throttled autoscroll during streaming
  useEffect(() => {
    if (!pending || !followLatest) return;

    const now = Date.now();
    if (now - lastScrollTimeRef.current < 100) return; // Throttle to 100ms

    lastScrollTimeRef.current = now;
    messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
  }, [messages, pending, followLatest]);

  // Handle manual scroll - track proximity to bottom to control auto-follow
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    // Follow latest only when user is near the bottom
    setFollowLatest(distanceFromBottom <= 120);
  };

  // Load messages when conversation changes
  useEffect(() => {
    console.log('[ChatInterface] Load messages useEffect triggered!', {
      hasActiveConversation: !!activeConversation,
      activeConversationId: activeConversation?.id,
      conversationsLength: conversations.length,
      trigger: 'activeConversation.id or conversations changed'
    });
    
    if (activeConversation?.id) {
      // Fetch fresh conversation data directly from the store to avoid stale state
      const freshConversation = conversations.find(c => c.id === activeConversation.id);
      
      console.log('[ChatInterface] Loading conversation:', {
        conversationId: activeConversation.id,
        conversationTitle: activeConversation.title,
        messageCountFromProp: activeConversation.messages.length,
        messageCountFromFresh: freshConversation?.messages.length || 0,
        usingFreshData: !!freshConversation,
        allConversationIds: conversations.map(c => c.id)
      });
      
      // Use fresh data if available, otherwise fall back to the prop
      const messagesToLoad = freshConversation ? freshConversation.messages : activeConversation.messages;
      
      console.log('[ChatInterface] About to load messages:', {
        conversationId: activeConversation.id,
        messagesToLoadCount: messagesToLoad.length,
        messageIds: messagesToLoad.map((m: any) => m.id || 'no-id')
      });
      
      loadMessages(activeConversation.id, messagesToLoad);
      setStreamingConversationId(activeConversation.id);
    } else {
      console.log('[ChatInterface] Clearing conversation - no active conversation');
      loadMessages(null, []);
      setStreamingConversationId(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeConversation?.id, conversations.length, JSON.stringify(conversations.map(c => c.id))]);

  // Persist mode to active conversation for display and history
  useEffect(() => {
    if (activeConversation && activeConversation.mode !== mode) {
      updateActiveMode(mode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, activeConversation?.id]);
  // Save messages back to conversation when they change - prevent duplicates
  useEffect(() => {
    if (!activeConversation || messages.length === 0 || streamingConversationId !== activeConversation.id) {
      return;
    }
    
    const currentStoredMessages = activeConversation.messages;
    const lastStreamingMessage = messages[messages.length - 1];
    
    // Only save final messages that aren't already in storage
    if (lastStreamingMessage && lastStreamingMessage.status === 'final') {
      // Check if this message is already stored (by ID or content+timestamp)
      const isDuplicate = currentStoredMessages.some(stored => {
        // Match by ID if both have IDs
        if (stored.id && lastStreamingMessage.id && stored.id === lastStreamingMessage.id) {
          return true;
        }
        // Otherwise match by content and rough timestamp
        if (stored.role === lastStreamingMessage.role && 
            stored.content === lastStreamingMessage.content) {
          // Allow 1 second difference in timestamps (handles date conversion issues)
          const timeDiff = stored.timestamp && lastStreamingMessage.timestamp
            ? Math.abs(stored.timestamp.getTime() - lastStreamingMessage.timestamp.getTime())
            : 0;
          return timeDiff < 1000;
        }
        return false;
      });
      
      if (!isDuplicate) {
        console.log('[ChatInterface] Saving message to conversation store:', {
          role: lastStreamingMessage.role,
          contentPreview: lastStreamingMessage.content.substring(0, 50),
          conversationId: activeConversation.id
        });
        addMessageToActive(lastStreamingMessage);
      }
    }
  }, [messages, activeConversation?.id, addMessageToActive, streamingConversationId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || pending) return;

    let targetConversationId = activeConversation?.id;
    let targetConversation = activeConversation;
    
    // Create new conversation if none exists
    if (!targetConversationId) {
      const newConv = createNewConversation();
      targetConversationId = newConv.id;
      targetConversation = newConv;
    }

    // Add user message with proper status
    const userMessage: any = { 
      id: (globalThis as any).crypto?.randomUUID?.() ?? `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      role: 'user' as const, 
      content: prompt,
      status: 'final' as const, // User messages are always final
      timestamp: new Date()
    };
    
    console.log('[ChatInterface] User message created:', {
      id: userMessage.id,
      contentPreview: userMessage.content.substring(0, 50),
      conversationId: targetConversationId
    });
    
    // Save to conversation store
    addMessageToActive(userMessage);
    
    // Also add to streaming state immediately so it appears right away
    if (targetConversationId) {
      // Get the current stored messages (which now includes the user message we just added)
      const updatedConversation = conversations.find(c => c.id === targetConversationId) || targetConversation;
      loadMessages(targetConversationId, updatedConversation.messages);
    }

    const currentPrompt = prompt;
    setPrompt("");

    // Intent detection: if no tool selected, try to detect intent and call tool automatically
    let detectedToolResult = toolResult;
    let detectedToolName = selectedTool;
    
    if (!selectedTool && connected) {
      const suggestedTool = suggestTool(currentPrompt);
      console.log('[ChatInterface] Suggested tool for prompt:', currentPrompt, '->', suggestedTool);
      
      if (suggestedTool) {
        try {
          console.log('[ChatInterface] Auto-calling tool:', suggestedTool);
          // Auto-call the suggested tool
          const result = await callTool(suggestedTool);
          console.log('[ChatInterface] Tool call successful:', suggestedTool, result);
          detectedToolResult = result;
          detectedToolName = suggestedTool;
          setSelectedTool(suggestedTool);
          setToolResult(result);
        } catch (e: any) {
          console.error('[ChatInterface] Auto tool call failed:', e);
          // Show error to user but continue with the message
          const errorMessage: any = {
            id: `error-${Date.now()}`,
            role: 'assistant' as const,
            content: `I tried to access your Canvas data, but encountered an error: ${e?.message || 'Unknown error'}. Please make sure your Canvas API key is valid and you have the necessary permissions.`,
            status: 'final' as const,
            timestamp: new Date(),
            grounded: false
          };
          addMessageToActive(errorMessage);
          // Continue without tool result if auto-call fails
        }
      }
    }

    // If tool result exists (either manually selected or auto-detected), inject it into the prompt context
    let finalPrompt = currentPrompt;
    if (detectedToolResult) {
      // Extract the actual data from the tool result (could be in data.data or just data)
      const toolData = detectedToolResult.data || detectedToolResult;
      const toolContext = `\n\nCanvas Tool Result (${detectedToolName}):\n${JSON.stringify(toolData, null, 2)}\n\nUse this data to answer the user's question. Format the response in a clear, readable way.`;
      finalPrompt = currentPrompt + toolContext;
      // Clear tool result after use
      setToolResult(null);
      setSelectedTool(null);
    }

    try {
      await send({
        prompt: finalPrompt,
        mode,
        reasoningMode,
        conversationId: targetConversationId,
        onMessageUpdate: (message) => {
          // Message is handled by the useEffect that monitors streaming messages
          console.log('[ChatInterface] Assistant message completed:', {
            id: message.id,
            status: message.status,
            hasCitations: !!message.citations && message.citations.length > 0,
            citationCount: message.citations?.length || 0
          });
        }
      });
    } catch (error) {
      console.error('[ChatInterface] Send failed:', error);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleAttachmentComplete = (fileCount: number) => {
    // Files are handled by the attachment system and added to the sources registry
    // The user can now send a message that will include these files
  };

  const getStatusNote = () => {
    if (status.fallbackNotice) return status.fallbackNotice;
    if (status.note) return status.note;
    return null;
  };

  const handleFeedbackSubmit = async (feedbackData: { rating: number; additional_feedback: string | null }) => {
    const success = await submitFeedback(feedbackData, activeConversation?.id);
    if (success) {
      setFeedbackDialogOpen(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header with mode toggle */}
      <div className="border-b p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            <span className="font-medium">GT Study Buddy</span>
          </div>
          
          <div className="flex items-center gap-3">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setFeedbackDialogOpen(true)}
                  className="h-9 px-3"
                >
                  <MessageCircle className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Share your feedback</TooltipContent>
            </Tooltip>
            <ToggleGroup
              type="single"
              value={mode}
              onValueChange={(value: ChatMode | "") => {
                if (value) setMode(value);
              }}
              className="bg-muted rounded-md p-1"
            >
              <Tooltip>
                <TooltipTrigger asChild>
                  <ToggleGroupItem 
                    value="auto" 
                    aria-label="Auto mode" 
                    size="sm"
                    className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                    aria-pressed={mode === 'auto'}
                  >
                    Auto
                  </ToggleGroupItem>
                </TooltipTrigger>
                <TooltipContent>RAG first; fallback to general</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <ToggleGroupItem 
                    value="rag-only" 
                    aria-label="RAG only" 
                    size="sm"
                    className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                    aria-pressed={mode === 'rag-only'}
                  >
                    RAG Only
                  </ToggleGroupItem>
                </TooltipTrigger>
                <TooltipContent>Answer only if RAG has hits; otherwise return refusal</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <ToggleGroupItem 
                    value="general" 
                    aria-label="General only" 
                    size="sm"
                    className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                    aria-pressed={mode === 'general'}
                  >
                    General
                  </ToggleGroupItem>
                </TooltipTrigger>
                <TooltipContent>No RAG; no citations</TooltipContent>
              </Tooltip>
            </ToggleGroup>
            
          </div>
        </div>
        
        {!hasReadySources && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-md p-2 mb-2">
            <p className="text-xs text-amber-600 dark:text-amber-400">
              No sources yet — attach a PDF/PNG/JPG to ground answers
            </p>
          </div>
        )}
      </div>

      {/* Messages */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-6 space-y-6" onScroll={handleScroll}>
        {messages.map((message, idx) => {
          // Create stable unique key to avoid DOM reuse across conversations
          const stableKey = message.id ?? `msg-${idx}`;
          return (
            <div
              key={stableKey}
              className={`flex gap-4 ${
                message.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
            <div className={`flex gap-3 max-w-3xl ${
              message.role === "user" ? "flex-row-reverse" : "flex-row"
            }`}>
              <Avatar className="h-8 w-8">
                <AvatarFallback>
                  {message.role === "user" ? (
                    <User className="h-4 w-4" />
                  ) : (
                    <Bot className="h-4 w-4" />
                  )}
                </AvatarFallback>
              </Avatar>
              
              <div className={`space-y-2 ${
                message.role === "user" ? "text-right" : "text-left"
              }`}>
                <Card className={`p-4 transition-all duration-300 shadow-sm ${
                  message.role === "user"
                    ? "bg-gt-gold text-gt-navy ml-auto max-w-lg shadow-gt-gold/20 animate-scale-in border-gt-gold/30 font-medium"
                    : "bg-card backdrop-blur-sm border border-border/40 mr-auto max-w-2xl animate-fade-in shadow-black/5"
                }`}>
                  {message.role === "user" ? (
                    <p className="text-sm leading-relaxed font-medium text-gt-navy">{message.content}</p>
                  ) : (
                    <MarkdownRenderer content={message.content} className="text-sm leading-relaxed" />
                  )}
                </Card>
                
                 {message.role === "assistant" && (
                   <div className="space-y-2">
                      {/* Enhanced typing indicator for streaming messages */}
                      {message.status === 'streaming' && (
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-2 animate-fade-in">
                          <div className="flex space-x-1">
                            <div className="w-2 h-2 bg-gt-gold rounded-full animate-bounce" style={{ animationDelay: '0ms', animationDuration: '1.4s' }}></div>
                            <div className="w-2 h-2 bg-gt-gold rounded-full animate-bounce" style={{ animationDelay: '200ms', animationDuration: '1.4s' }}></div>
                            <div className="w-2 h-2 bg-gt-gold rounded-full animate-bounce" style={{ animationDelay: '400ms', animationDuration: '1.4s' }}></div>
                          </div>
                          <span className="text-gt-gold font-medium">GT Study Buddy is thinking...</span>
                        </div>
                      )}
                     
                     {/* Status badges - only show for final messages */}
                     {message.status === 'final' && (
                       <div className="flex items-center gap-2 flex-wrap">
                         {status.grounded !== null && (
                           <Badge 
                             variant={status.grounded ? "default" : "secondary"}
                             className="text-xs"
                           >
                             {status.grounded ? (
                               <>
                                 <Quote className="h-3 w-3 mr-1" />
                                 Grounded
                               </>
                             ) : (
                               <>
                                 <Brain className="h-3 w-3 mr-1" />
                                 General
                               </>
                             )}
                           </Badge>
                         )}
                         
                         {status.model && (
                           <Badge variant="outline" className="text-xs">
                             {status.model}
                           </Badge>
                         )}
                         
                         {message.timestamp && (
                           <Badge variant="outline" className="text-xs">
                             <Clock className="h-3 w-3 mr-1" />
                             {message.timestamp.toLocaleTimeString([], { 
                               hour: '2-digit', 
                               minute: '2-digit' 
                             })}
                           </Badge>
                         )}
                       </div>
                     )}
                     
                     {/* Status note - only show for final messages */}
                     {message.status === 'final' && getStatusNote() && (
                       <p className="text-xs text-muted-foreground">{getStatusNote()}</p>
                     )}
                   </div>
                 )}
               </div>
             </div>
           </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Jump to latest button - only show when user scrolled up */}
      {!followLatest && (
        <div className="absolute bottom-20 right-6 z-10">
          <Button
            onClick={() => {
              setFollowLatest(true);
              messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            }}
            size="sm"
            variant="gt-gold"
            className="shadow-lg"
          >
            <Plus className="h-4 w-4 mr-1" />
            Jump to latest
          </Button>
        </div>
      )}

      {/* Input */}
      <div className="border-t p-4 space-y-2">
        {/* Always show tool dropdown */}
        {tools.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <Wrench className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Canvas Tools:</span>
            <Select value={selectedTool || "none"} onValueChange={(value) => setSelectedTool(value === "none" ? null : value)}>
              <SelectTrigger className="w-full max-w-xs">
                <SelectValue placeholder="Select Canvas Tool (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None (Auto-detect)</SelectItem>
                {tools.map((tool) => (
                  <SelectItem key={tool.name} value={tool.name}>
                    {tool.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    {tool.description && ` - ${tool.description}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedTool && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={async () => {
                  if (!connected) {
                    setToolResult({ error: 'Canvas not connected. Please connect Canvas first.' });
                    return;
                  }
                  try {
                    const result = await callTool(selectedTool);
                    setToolResult(result);
                  } catch (e: any) {
                    console.error('Tool call failed:', e);
                    // Show error in tool result
                    setToolResult({ error: e?.message || 'Tool call failed' });
                  }
                }}
                disabled={pending || !connected}
              >
                Run Tool
              </Button>
            )}
          </div>
        )}
        {/* Warning when not connected */}
        {!connected && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-md p-2 text-xs text-yellow-600 dark:text-yellow-400">
            <Wrench className="h-3 w-3 inline mr-1" />
            Canvas not connected. Click "Connect Canvas" in the navbar to use Canvas tools.
          </div>
        )}
        {/* Loading state */}
        {loading && tools.length === 0 && (
          <div className="bg-muted/50 border border-border rounded-md p-2 text-xs text-muted-foreground">
            Loading Canvas tools...
          </div>
        )}
        {toolResult && (
          <div className="bg-muted p-3 rounded-md text-xs font-mono max-h-32 overflow-auto">
            <pre>{JSON.stringify(toolResult, null, 2)}</pre>
          </div>
        )}
        <form onSubmit={handleSubmit} className="flex gap-2">
          <div className="flex-1 relative">
            <Input
              ref={inputRef}
              value={prompt}
              onChange={(e) => {
                setPrompt(e.target.value);
                // Auto-suggest tool based on intent
                if (connected && !selectedTool) {
                  const suggested = suggestTool(e.target.value);
                  if (suggested) {
                    setSelectedTool(suggested);
                  }
                }
              }}
              onKeyDown={handleKeyDown}
              placeholder="Ask about your sources..."
              disabled={pending}
              className="pr-12"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2">
              <AttachButton 
                onFilesReady={handleAttachmentComplete}
                disabled={pending}
              />
            </div>
          </div>
          
          <Button
            type="submit"
            disabled={!prompt.trim() || pending}
            variant="gt-gold"
            className="shrink-0"
          >
            {pending ? (
              <Square className="h-4 w-4" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
          
          {pending && (
            <Button
              type="button"
              variant="outline"
              onClick={abort}
              className="shrink-0"
            >
              Stop
            </Button>
          )}
      {/* ⭐ FEEDBACK BUTTON — ADD THIS */}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setFeedbackDialogOpen(true)}
                  className="shrink-0"
                >
                  Feedback
                </Button>

        </form>
      </div>

      <FeedbackDialog
        open={feedbackDialogOpen}
        onOpenChange={setFeedbackDialogOpen}
        onSubmit={async (fullFeedback) => {
          setIsFeedbackSubmitting(true);

          await fetch("/api/feedback", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...fullFeedback,
              conversationId: activeConversation?.id ?? null,
            }),
          });

          setIsFeedbackSubmitting(false);
          setFeedbackDialogOpen(false);
        }}
        isSubmitting={isFeedbackSubmitting}
      />

    </div>
  );
}