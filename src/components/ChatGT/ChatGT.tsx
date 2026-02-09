import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  Send, 
  Bot, 
  User, 
  Paperclip,
  FileText,
  Image,
  File,
  Loader2,
  MessageCircle,
  Brain,
  Wrench
} from "lucide-react";
import { LocalAuthClient } from "@/lib/local-auth-client";
import { toast } from "@/hooks/use-toast";
import { API_BASE } from "@/lib/runtime";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Conversation } from "@/lib/conversations";
import { sourcesRegistry } from "@/lib/sources";
import { extractPdfText } from "@/lib/pdf";
import { FeedbackDialog } from "@/components/Feedback/FeedbackDialog";
import { useFeedback } from "@/hooks/useFeedback";
import { useCanvasTools } from "@/hooks/useCanvasTools";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Using ChatMessage from conversations instead of local Message interface
import { type ChatMessage as Message } from "@/lib/conversations";

interface UploadedFile {
  id: string;
  name: string;
  type: string;
  content: string;
  isProcessing?: boolean;
}

interface ChatGTProps {
  conversations: Conversation[];
  activeConversation: Conversation | null;
  createNewConversation: (mode?: any) => Conversation;
  addMessageToActive: (message: any) => boolean;
}

export function ChatGT({ conversations, activeConversation, createNewConversation, addMessageToActive }: ChatGTProps) {
  
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [feedbackDialogOpen, setFeedbackDialogOpen] = useState(false);
  const [reasoningMode, setReasoningMode] = useState(true);
  const [messageCount, setMessageCount] = useState(0);
  const [showModelComparison, setShowModelComparison] = useState(false);
  const [modelComparisonData, setModelComparisonData] = useState<any>(null);
  const [isComparingModels, setIsComparingModels] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { submitFeedback, isSubmitting: isFeedbackSubmitting } = useFeedback();
  const { tools, connected, callTool, suggestTool, refreshConnectionStatus } = useCanvasTools();
  
  // Listen for connection status changes - check periodically
  useEffect(() => {
    // Refresh connection status periodically to stay in sync (every 10 seconds)
    const interval = setInterval(() => {
      refreshConnectionStatus();
    }, 10000);
    
    return () => clearInterval(interval);
  }, [refreshConnectionStatus]);
  const [selectedTool, setSelectedTool] = useState<string | null>(null);
  const [toolResult, setToolResult] = useState<any>(null);

  // Initialize conversation only if truly needed
  // This runs after the store has initialized
  const [hasInitialized, setHasInitialized] = useState(false);
  
  useEffect(() => {
    if (hasInitialized) return; // Prevent re-running
    
    console.log('ChatGT initialization check:', {
      conversationCount: conversations.length,
      hasActiveConversation: !!activeConversation,
      activeConvId: activeConversation?.id
    });
    
    // Only create a new conversation if there are NO conversations at all
    if (conversations.length === 0) {
      console.log('No conversations found, creating first conversation');
      createNewConversation('auto');
    }
    
    setHasInitialized(true);
  }, [conversations.length, activeConversation, hasInitialized, createNewConversation]);

  // Get messages from active conversation
  const messages = activeConversation?.messages || [];
  
  // Debug log - only log when conversation ID changes (not on every render)
  useEffect(() => {
    if (activeConversation) {
      console.log('ChatGT - Active conversation:', activeConversation.id, 'messages:', activeConversation.messages.length);
    }
  }, [activeConversation?.id]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    for (const file of Array.from(files)) {
      if (file.size > 20 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: `${file.name} is larger than 20MB`,
          variant: "destructive"
        });
        continue;
      }

      const uploadedFile: UploadedFile = {
        id: crypto.randomUUID(),
        name: file.name,
        type: file.type,
        content: "",
        isProcessing: true
      };

      setUploadedFiles(prev => [...prev, uploadedFile]);

      try {
        let content = "";
        
        if (file.type.startsWith('text/') || file.name.endsWith('.md') || file.name.endsWith('.txt')) {
          content = await file.text();
        } else if (file.type === 'application/pdf') {
          try {
            // Use local PDF.js parsing for better accuracy
            const pages = await extractPdfText(file);
            content = pages
              .map(p => `Page ${p.page}:\n${p.text}`)
              .join('\n\n');
            
            if (!content || content.trim().length === 0) {
              content = `[PDF File: ${file.name} - No text content could be extracted. This might be a scanned PDF or image-based PDF.]`;
            }
            
            console.log(`Successfully extracted ${pages.length} pages from ${file.name}`);
          } catch (parseError) {
            console.error('PDF parsing failed:', parseError);
            content = `[PDF File: ${file.name} - Could not extract text. Error: ${parseError instanceof Error ? parseError.message : 'Unknown error'}]`;
          }
        } else if (file.type.startsWith('image/')) {
          content = `[Image File: ${file.name} - Image analysis available]`;
        } else {
          try {
            content = await file.text();
          } catch {
            content = `[File: ${file.name} - ${file.type}]`;
          }
        }

        setUploadedFiles(prev => prev.map(f => 
          f.id === uploadedFile.id 
            ? { ...f, content, isProcessing: false }
            : f
        ));
        
        toast({
          title: "File uploaded",
          description: `${file.name} has been processed successfully`
        });
      } catch (error) {
        console.error('Error reading file:', error);
        
        setUploadedFiles(prev => prev.map(f => 
          f.id === uploadedFile.id 
            ? { ...f, content: `[Error reading ${file.name}]`, isProcessing: false }
            : f
        ));
        
        toast({
          title: "Upload failed",
          description: `Failed to process ${file.name}`,
          variant: "destructive"
        });
      }
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeFile = (fileId: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading || !activeConversation) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    addMessageToActive(userMessage);
    const currentPrompt = input;
    setInput("");
    setIsLoading(true);
    
    // Tool handling: if tool is selected, run it automatically; otherwise try auto-detection
    let detectedToolResult = toolResult;
    let detectedToolName = selectedTool;
    
    // Normalize selectedTool - treat "none" as null
    const activeTool = (selectedTool === "none" || !selectedTool) ? null : selectedTool;
    
    if (activeTool && connected) {
      // Tool is selected - run it automatically before sending the message
      try {
        console.log('[ChatGT] Auto-running selected tool:', activeTool);
        const result = await callTool(activeTool);
        console.log('[ChatGT] Tool call successful:', activeTool, result);
        detectedToolResult = result;
        detectedToolName = activeTool;
        // Don't clear selectedTool yet - let user see what tool was used
      } catch (e: any) {
        console.error('[ChatGT] Auto tool call failed:', e);
        // Continue without tool result if auto-call fails
        // Show error to user but don't block the message
        const errorMessage: Message = {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: `I tried to access your Canvas data using the ${activeTool} tool, but encountered an error: ${e?.message || 'Unknown error'}. Please make sure your Canvas API key is valid.`,
          timestamp: new Date()
        };
        addMessageToActive(errorMessage);
      }
    } else if (!activeTool) {
      // No tool selected - try to detect intent and call tool automatically
      if (connected) {
        const suggestedTool = suggestTool(currentPrompt);
        console.log('[ChatGT] Suggested tool for prompt:', currentPrompt, '->', suggestedTool);
        
        if (suggestedTool) {
          try {
            console.log('[ChatGT] Auto-calling tool:', suggestedTool);
            const result = await callTool(suggestedTool);
            console.log('[ChatGT] Tool call successful:', suggestedTool, result);
            detectedToolResult = result;
            detectedToolName = suggestedTool;
            setSelectedTool(suggestedTool);
          } catch (e: any) {
            console.error('[ChatGT] Auto tool call failed:', e);
            // Continue without tool result if auto-call fails
          }
        }
      }
    }

    // If tool result exists, inject it into the prompt context
    let finalPrompt = currentPrompt;
    if (detectedToolResult && detectedToolName) {
      const toolData = detectedToolResult.data || detectedToolResult;
      const toolContext = `\n\nCanvas Tool Result (${detectedToolName}):\n${JSON.stringify(toolData, null, 2)}\n\nUse this data to answer the user's question. Format the response in a clear, readable way.`;
      finalPrompt = currentPrompt + toolContext;
      // Clear tool result after use, but keep the selected tool in dropdown for reference
      setToolResult(null);
    }
    
    // Increment message count
    const newMessageCount = messageCount + 1;
    setMessageCount(newMessageCount);
    
    // Check if we should show model comparison (every 5 messages)
    const shouldCompare = newMessageCount % 5 === 0;

    try {
      const fileContext = uploadedFiles.map(file => 
        `Source: ${file.name}\nContent: ${file.content}`
      ).join('\n\n');

      let response;
      
      if (shouldCompare) {
        // Use model comparison API
        setIsComparingModels(true);
        response = await fetch(`${API_BASE}/api/compare-models`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: finalPrompt,
            context: fileContext || undefined,
            reasoningMode: reasoningMode,
            userId: (await LocalAuthClient.getCurrentUser())?.id || 'anonymous',
            conversationId: activeConversation?.id,
            messageId: userMessage.id,
          }),
        });
      } else {
        // Use regular chat API
        response = await fetch(`${API_BASE}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: finalPrompt,
            context: fileContext || undefined,
            reasoningMode: reasoningMode,
          }),
        });
      }

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Local model error: ${response.status} ${text}`);
      }

      if (shouldCompare) {
        // Handle model comparison response
        const comparisonData = await response.json();
        setModelComparisonData(comparisonData);
        setShowModelComparison(true);
        setIsComparingModels(false);
        
        // Don't add a message yet - wait for user preference
        return;
      } else {
        // Handle regular streaming response
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let finalResponse = '';
        let citations: any[] = [];

        if (reader) {
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
                  citations = json.citations || [];
                  console.log('📚 Parsed citations from stream:', citations);
                } catch (parseErr) {
                  console.error('Failed to parse citations:', parseErr);
                }
              } else {
                finalResponse += line + '\n';
              }
            }
          }
        }

        const assistantMessage: Message = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: finalResponse.trim(),
          timestamp: new Date(),
          sources: citations.map((c: any) => c.source).filter(Boolean),
          citations
        };

        addMessageToActive(assistantMessage);
        
        // Add cited sources to sources registry for display in Files tab
        if (assistantMessage.sources && assistantMessage.sources.length > 0) {
          assistantMessage.sources.forEach((sourceName: string) => {
            const existingSources = sourcesRegistry.getAllSources();
            const sourceExists = existingSources.some(s => s.name === sourceName);
            
            if (!sourceExists) {
              sourcesRegistry.addSource({
                id: `cited-${Date.now()}-${Math.random()}`,
                name: sourceName,
                user_id: "cited",
                size: 0,
                mime: "application/pdf",
                pages: 1,
                created_at: new Date(),
                tags: ["cited", "chatgt"],
                status: 'ready'
              });
            }
          });
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <Image className="h-4 w-4" />;
    if (type === 'application/pdf') return <FileText className="h-4 w-4" />;
    return <File className="h-4 w-4" />;
  };

  const handleFeedbackSubmit = async (feedbackData: { rating: number; additional_feedback: string | null }) => {
    const success = await submitFeedback(feedbackData, activeConversation?.id);
    if (success) {
      setFeedbackDialogOpen(false);
    }
  };

  const handleReasoningModeToggle = () => {
    setReasoningMode(!reasoningMode);
  };

  const handleModelPreference = async (preferredModel: string) => {
    if (!modelComparisonData) return;

    try {
      // Log preference to Supabase
      await fetch(`${API_BASE}/api/log-preference`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: (await supabase.auth.getUser()).data.user?.id,
          conversationId: activeConversation?.id,
          messageId: modelComparisonData.messageId,
          modelA: modelComparisonData.modelA.name,
          modelB: modelComparisonData.modelB.name,
          responseA: modelComparisonData.modelA.response,
          responseB: modelComparisonData.modelB.response,
          preferredModel: preferredModel,
          reasoningMode: reasoningMode
        })
      });

      // Add the preferred response as a message
      const preferredResponse = preferredModel === 'modelA' 
        ? modelComparisonData.modelA.response 
        : modelComparisonData.modelB.response;

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: preferredResponse,
        timestamp: new Date()
      };

      addMessageToActive(assistantMessage);
      
      // Reset comparison state
      setShowModelComparison(false);
      setModelComparisonData(null);
      
      toast({
        title: "Preference logged",
        description: `Your preference for ${preferredModel === 'modelA' ? modelComparisonData.modelA.name : modelComparisonData.modelB.name} has been recorded.`
      });

    } catch (error) {
      console.error('Error logging preference:', error);
      toast({
        title: "Error",
        description: "Failed to log preference. Please try again.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0 bg-transparent">
      {/* Uploaded Files */}
      {uploadedFiles.length > 0 && (
        <div className="p-4 bg-muted/10 border-b border-border">
          <p className="text-sm font-medium mb-3 text-foreground">Uploaded Files:</p>
          <div className="flex flex-wrap gap-2">
            {uploadedFiles.map(file => (
              <Badge key={file.id} variant="secondary" className="flex items-center gap-2 px-3 py-1">
                {file.isProcessing ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  getFileIcon(file.type)
                )}
                <span className="max-w-[150px] truncate">{file.name}</span>
                {!file.isProcessing && (
                  <button
                    onClick={() => removeFile(file.id)}
                    className="ml-1 hover:text-destructive text-muted-foreground hover:bg-destructive/10 rounded px-1"
                  >
                    ×
                  </button>
                )}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 pr-6 space-y-4 chat-messages-container" style={{ scrollbarGutter: 'stable both-edges' }}>
        {messages.length === 0 && (
          <div className="text-center text-muted-foreground py-16">
            <Bot className="h-16 w-16 mx-auto mb-4 text-gt-gold" />
            <h2 className="text-xl font-semibold mb-2 text-foreground">Welcome to ChatGT</h2>
            <p className="text-sm max-w-md mx-auto leading-relaxed">
              Upload files and ask questions. I'll help you find answers and cite my sources using the power of the GT/NVIDIA AI Makerspace.
            </p>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-3 ${
              message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
            }`}
          >
            <Avatar className="h-8 w-8 flex-shrink-0">
              <AvatarFallback className={
                message.role === 'user' 
                  ? 'bg-gt-gold text-gt-navy' 
                  : 'bg-primary text-primary-foreground'
              }>
                {message.role === 'user' ? (
                  <User className="h-4 w-4" />
                ) : (
                  <Bot className="h-4 w-4" />
                )}
              </AvatarFallback>
            </Avatar>

            <div className={`space-y-2 max-w-[70%] ${
              message.role === 'user' ? 'text-right' : 'text-left'
            }`}>
              <Card className={`p-4 shadow-sm transition-all duration-200 ${
                message.role === 'user'
                  ? 'bg-gt-gold text-gt-navy ml-auto border-gt-gold/30'
                  : 'bg-card border-border/40 mr-auto'
              }`}>
                {message.role === 'user' ? (
                  <p className="text-sm font-medium leading-relaxed">{message.content}</p>
                ) : (
                  <div className="prose prose-sm max-w-none dark:prose-invert">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {message.content}
                    </ReactMarkdown>
                  </div>
                )}
              </Card>

              {(((message as any).citations?.length > 0 || message.sources?.length > 0)) && (
                <div className="flex flex-wrap gap-1">
                  <span className="text-xs text-muted-foreground mr-1">Sources:</span>
                  {Array.from(new Set(((message as any).citations?.map((c: any) => c.source) || message.sources || []))).map((source: string, index: number) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      📄 {source}
                    </Badge>
                  ))}
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                {message.timestamp.toLocaleTimeString()}
              </p>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-3">
            <Avatar className="h-8 w-8">
              <AvatarFallback>
                <Bot className="h-4 w-4" />
              </AvatarFallback>
            </Avatar>
            <Card className="p-4 bg-card">
              <div className="flex items-center gap-2">
                {isComparingModels ? (
                  // Model comparison animation
                  <div className="flex items-center gap-2">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" style={{ animationDelay: '300ms' }}></div>
                      <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" style={{ animationDelay: '600ms' }}></div>
                    </div>
                    <span className="text-sm text-muted-foreground">Comparing models...</span>
                  </div>
                ) : reasoningMode ? (
                  // Reasoning mode animation - brain-like pulsing
                  <div className="flex items-center gap-2">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '300ms' }}></div>
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '600ms' }}></div>
                    </div>
                    <Brain className="h-4 w-4 text-blue-500 animate-pulse" />
                    <span className="text-sm text-muted-foreground">ChatGT is reasoning step-by-step...</span>
                  </div>
                ) : (
                  // Normal mode animation - simple bouncing
                  <div className="flex items-center gap-2">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gt-gold rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-2 h-2 bg-gt-gold rounded-full animate-bounce" style={{ animationDelay: '200ms' }}></div>
                      <div className="w-2 h-2 bg-gt-gold rounded-full animate-bounce" style={{ animationDelay: '400ms' }}></div>
                    </div>
                    <span className="text-sm text-muted-foreground">ChatGT is thinking...</span>
                  </div>
                )}
              </div>
            </Card>
          </div>
        )}

        {/* Model Comparison UI */}
        {showModelComparison && modelComparisonData && (
          <div className="flex gap-3">
            <Avatar className="h-8 w-8">
              <AvatarFallback>
                <Bot className="h-4 w-4" />
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-4">
              <div className="bg-card border border-border rounded-lg p-4">
                <h3 className="text-sm font-medium text-foreground mb-3">Model Comparison - Which response do you prefer?</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Model A Response */}
                  <div className="border border-border rounded-lg p-3 bg-card">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-medium text-foreground">{modelComparisonData.modelA.name}</h4>
                      <Button
                        size="sm"
                        onClick={() => handleModelPreference('modelA')}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        Choose This
                      </Button>
                    </div>
                    <div className="prose prose-sm max-w-none dark:prose-invert text-muted-foreground">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {modelComparisonData.modelA.response}
                      </ReactMarkdown>
                    </div>
                  </div>

                  {/* Model B Response */}
                  <div className="border border-border rounded-lg p-3 bg-card">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-medium text-foreground">{modelComparisonData.modelB.name}</h4>
                      <Button
                        size="sm"
                        onClick={() => handleModelPreference('modelB')}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        Choose This
                      </Button>
                    </div>
                    <div className="prose prose-sm max-w-none dark:prose-invert text-muted-foreground">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {modelComparisonData.modelB.response}
                      </ReactMarkdown>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-border bg-transparent space-y-2">
        {/* Canvas Tools Dropdown - Always visible */}
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
            {selectedTool && selectedTool !== "none" && (
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
                    setToolResult({ error: e?.message || 'Tool call failed' });
                  }
                }}
                disabled={isLoading || !connected}
              >
                Test Tool
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
        
        {/* Tool result display */}
        {toolResult && (
          <div className="bg-muted p-3 rounded-md text-xs font-mono max-h-32 overflow-auto">
            <pre>{JSON.stringify(toolResult, null, 2)}</pre>
          </div>
        )}

        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileUpload}
            className="hidden"
            accept=".txt,.md,.pdf,.jpg,.jpeg,.png,.gif,.doc,.docx"
          />
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading}
              >
                <Paperclip className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Attach files</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setFeedbackDialogOpen(true)}
                disabled={isLoading}
              >
                <MessageCircle className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Share feedback</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={reasoningMode ? "default" : "outline"}
                size="sm"
                onClick={handleReasoningModeToggle}
                disabled={isLoading}
                className={`transition-all duration-200 ${
                  reasoningMode 
                    ? "bg-blue-600 hover:bg-blue-700 text-white border-blue-600" 
                    : "bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-300"
                }`}
              >
                <Brain className="h-4 w-4 mr-1" />
                {reasoningMode ? "Reasoning" : "Normal"}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {reasoningMode ? "Chain-of-thought reasoning enabled - Click to switch to normal mode" : "Standard responses - Click to enable reasoning mode"}
            </TooltipContent>
          </Tooltip>

          <Input
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              // Auto-suggest tool based on intent
              if (connected && !selectedTool) {
                const suggested = suggestTool(e.target.value);
                if (suggested) {
                  setSelectedTool(suggested);
                }
              }
            }}
            onKeyPress={handleKeyPress}
            placeholder="Ask ChatGT anything..."
            disabled={isLoading}
            className="flex-1"
          />

          <Button
            onClick={sendMessage}
            disabled={!input.trim() || isLoading}
            className="bg-gt-gold hover:bg-gt-gold/90 text-gt-navy"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Feedback Dialog */}
      <FeedbackDialog
        open={feedbackDialogOpen}
        onOpenChange={setFeedbackDialogOpen}
        onSubmit={handleFeedbackSubmit}
        isSubmitting={isFeedbackSubmitting}
      />
    </div>
  );
}