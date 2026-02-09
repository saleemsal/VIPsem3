import { Navbar } from "@/components/Navbar";
import { ChatLayout } from "@/components/Chat/ChatLayout";

export default function ChatPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="h-[calc(100vh-4rem)]">
        <ChatLayout />
      </div>
    </div>
  );
}