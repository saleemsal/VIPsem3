import { ChatGT } from "@/components/ChatGT/ChatGT";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bot, Zap, Shield, Globe } from "lucide-react";
import type { Conversation } from "@/lib/conversations";

interface ChatConversationsProps {
  conversations: Conversation[];
  activeConversation: Conversation | null;
  createNewConversation: (mode?: any) => Conversation;
  addMessageToActive: (message: any) => boolean;
}

export function ChatMainPanel(props: ChatConversationsProps) {
  return (
    <div className="h-full min-h-0 flex flex-col bg-gradient-to-br from-background via-background to-gt-gold/5">
      {/* Main Chat Interface */}
      <div className="flex-1 min-h-0 flex flex-col">
        <ChatGT {...props} />
      </div>

      {/* Footer Info */}
      <div className="p-4 border-t border-border bg-card/20 backdrop-blur-sm">
        <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Bot className="h-3 w-3 text-gt-gold" />
            <span>Powered by the AI Makerspace</span>
          </div>
          <div className="flex items-center gap-1">
            <Zap className="h-3 w-3 text-blue-500" />
            <span>Real-time responses</span>
          </div>
          <div className="flex items-center gap-1">
            <Shield className="h-3 w-3 text-green-500" />
            <span>Secure & Private</span>
          </div>
          <div className="flex items-center gap-1">
            <Globe className="h-3 w-3 text-purple-500" />
            <span>Georgia Tech AI</span>
          </div>
        </div>
      </div>
    </div>
  );
}