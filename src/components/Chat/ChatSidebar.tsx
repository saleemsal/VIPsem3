import { ConversationList } from "@/components/Conversations/ConversationList";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, MessageSquare, Clock } from "lucide-react";
import { type Conversation } from "@/lib/conversations";
import { type ChatMode } from "@/hooks/useChatModes";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ChatSidebarProps {
  conversations: Conversation[];
  activeConversation: Conversation | null;
  createNewConversation: (mode?: ChatMode) => Conversation;
  switchToConversation: (id: string) => boolean;
  renameConversation: (id: string, title: string) => boolean;
  deleteConversation: (id: string) => boolean;
  clearAllConversations: () => void;
}

export function ChatSidebar({
  conversations,
  activeConversation,
  createNewConversation,
  switchToConversation,
  renameConversation,
  deleteConversation,
  clearAllConversations
}: ChatSidebarProps) {
  const totalMessages = conversations.reduce((sum, conv) => sum + conv.messages.length, 0);
  const recentConversations = conversations.slice(0, 5);

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">Conversations</h2>
          <Button
            size="sm"
            onClick={() => createNewConversation()}
            className="bg-gt-gold hover:bg-gt-gold/90 text-gt-navy"
          >
            <Plus className="h-4 w-4 mr-1" />
            New
          </Button>
        </div>
        
        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="p-3 bg-background/50">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-gt-gold" />
              <div>
                <p className="text-sm font-medium">{conversations.length}</p>
                <p className="text-xs text-muted-foreground">Chats</p>
              </div>
            </div>
          </Card>
          <Card className="p-3 bg-background/50">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-500" />
              <div>
                <p className="text-sm font-medium">{totalMessages}</p>
                <p className="text-xs text-muted-foreground">Messages</p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Conversation List (Scrollable) */}
      <ScrollArea className="flex-1">
        <div className="p-4">
          {conversations.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-medium mb-2">No conversations yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Start your first conversation with ChatGT
              </p>
              <Button
                onClick={() => createNewConversation()}
                className="bg-gt-gold hover:bg-gt-gold/90 text-gt-navy"
              >
                <Plus className="h-4 w-4 mr-2" />
                Start Chatting
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-muted-foreground">Recent</span>
                {activeConversation && (
                  <Badge variant="outline" className="text-xs">
                    {activeConversation.messages.length} messages
                  </Badge>
                )}
              </div>
              <ConversationList
                conversations={conversations}
                activeConversationId={activeConversation?.id || null}
                onSelectConversation={switchToConversation}
                onCreateNew={() => createNewConversation()}
                onRename={renameConversation}
                onDelete={deleteConversation}
              />
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Footer Actions */}
      {conversations.length > 0 && (
        <div className="p-4 border-t border-border">
          <Button
            variant="outline"
            size="sm"
            onClick={clearAllConversations}
            className="w-full text-xs"
          >
            Clear All Conversations
          </Button>
        </div>
      )}
    </div>
  );
}