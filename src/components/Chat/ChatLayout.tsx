import { useState } from "react";
import { ChatSidebar } from "./ChatSidebar";
import { ChatMainPanel } from "./ChatMainPanel";
import { ChatRightPanel } from "./ChatRightPanel";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, PanelLeftOpen, PanelRightOpen } from "lucide-react";
import { useConversations } from "@/hooks/useConversations";

export function ChatLayout() {
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(true);
  const [mobileLeftOpen, setMobileLeftOpen] = useState(false);
  const [mobileRightOpen, setMobileRightOpen] = useState(false);
  
  const conversationsHook = useConversations();

  return (
    <div className="flex h-full bg-background">
      {/* Desktop Left Sidebar */}
      <div className={`hidden lg:flex transition-all duration-300 ${leftSidebarOpen ? 'w-80' : 'w-0'} overflow-hidden`}>
        <div className="w-80 border-r border-border bg-card/30 backdrop-blur-sm">
          <ChatSidebar {...conversationsHook} />
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 min-h-0 flex flex-col min-w-0">
        {/* Header with toggle buttons */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-card/20 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLeftSidebarOpen(!leftSidebarOpen)}
              className="hidden lg:flex"
            >
              <PanelLeftOpen className="h-4 w-4" />
            </Button>
            <h1 className="text-xl font-bold text-gt-gold">ChatGT</h1>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setRightSidebarOpen(!rightSidebarOpen)}
            className="hidden lg:flex"
          >
            <PanelRightOpen className="h-4 w-4" />
          </Button>
        </div>

        {/* Chat Panel */}
        <div className="flex-1 min-h-0 overflow-hidden">
          <ChatMainPanel 
            conversations={conversationsHook.conversations}
            activeConversation={conversationsHook.activeConversation}
            createNewConversation={conversationsHook.createNewConversation}
            addMessageToActive={conversationsHook.addMessageToActive}
          />
        </div>
      </div>

      {/* Desktop Right Sidebar */}
      <div className={`hidden lg:flex transition-all duration-300 ${rightSidebarOpen ? 'w-96' : 'w-0'} overflow-hidden`}>
        <div className="w-96 border-l border-border bg-card/30 backdrop-blur-sm">
          <ChatRightPanel activeConversation={conversationsHook.activeConversation} />
        </div>
      </div>

      {/* Mobile Left Sidebar */}
      <Sheet open={mobileLeftOpen} onOpenChange={setMobileLeftOpen}>
        <SheetTrigger asChild>
          <Button 
            variant="outline" 
            size="icon" 
            className="lg:hidden fixed bottom-4 left-4 z-50 bg-background shadow-lg"
          >
            <Menu className="h-4 w-4" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-80 p-0">
          <ChatSidebar {...conversationsHook} />
        </SheetContent>
      </Sheet>

      {/* Mobile Right Sidebar */}
      <Sheet open={mobileRightOpen} onOpenChange={setMobileRightOpen}>
        <SheetTrigger asChild>
          <Button 
            variant="outline" 
            size="icon" 
            className="lg:hidden fixed bottom-4 right-4 z-50 bg-background shadow-lg"
          >
            <PanelRightOpen className="h-4 w-4" />
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="w-96 p-0">
          <ChatRightPanel activeConversation={conversationsHook.activeConversation} />
        </SheetContent>
      </Sheet>
    </div>
  );
}