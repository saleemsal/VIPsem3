import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MessageCircle, Plus, MoreVertical, Edit2, Trash2, Clock } from "lucide-react";
import { type Conversation } from "@/lib/conversations";
import { type ChatMode } from "@/hooks/useChatModes";
interface ConversationListProps {
  conversations: Conversation[];
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onCreateNew: () => void;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
}
export function ConversationList({
  conversations,
  activeConversationId,
  onSelectConversation,
  onCreateNew,
  onRename,
  onDelete
}: ConversationListProps) {
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [renameId, setRenameId] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const handleRename = (id: string, currentTitle: string) => {
    setRenameId(id);
    setNewTitle(currentTitle);
    setRenameDialogOpen(true);
  };
  const submitRename = () => {
    if (renameId && newTitle.trim()) {
      onRename(renameId, newTitle.trim());
      setRenameDialogOpen(false);
      setRenameId(null);
      setNewTitle("");
    }
  };
  const getModeColor = (mode: ChatMode) => {
    switch (mode) {
      case 'auto':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100';
      case 'rag-only':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100';
      case 'general':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100';
    }
  };
  return <div className="w-80 border-r border-border/50 bg-card/20 backdrop-blur-sm flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-border/50">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Conversations</h2>
          <Button onClick={onCreateNew} size="sm" variant="outline">
            <Plus className="h-4 w-4 mr-1" />
            New Chat
          </Button>
        </div>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 px-px">
        {conversations.length === 0 ? <div className="text-center py-8 text-muted-foreground">
            <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No conversations yet</p>
            <p className="text-xs">Start a new chat to begin</p>
          </div> : conversations.map(conversation => <Card key={conversation.id} className={`p-3 cursor-pointer transition-colors ${conversation.id === activeConversationId ? 'bg-primary/10 border-primary/30' : 'hover:bg-accent/50'}`} onClick={() => onSelectConversation(conversation.id)}>
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-sm truncate mb-1">
                    {conversation.title}
                  </h3>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="secondary" className={`text-xs ${getModeColor(conversation.mode)}`}>
                      {conversation.mode === 'auto' ? 'Auto' : conversation.mode === 'rag-only' ? 'RAG Only' : 'General'}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {conversation.messages.length} msgs
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {conversation.updated_at.toLocaleDateString()}
                  </div>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" onClick={e => e.stopPropagation()}>
                      <MoreVertical className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleRename(conversation.id, conversation.title)}>
                      <Edit2 className="h-3 w-3 mr-2" />
                      Rename
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onDelete(conversation.id)} className="text-destructive">
                      <Trash2 className="h-3 w-3 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </Card>)}
      </div>

      {/* Rename Dialog */}
      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Conversation</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Enter new title..." onKeyDown={e => {
            if (e.key === 'Enter') {
              submitRename();
            }
          }} />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setRenameDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={submitRename} disabled={!newTitle.trim()}>
                Rename
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>;
}