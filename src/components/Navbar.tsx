import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { BookOpen, Link as LinkIcon, CheckCircle2 } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { RuntimeStatus } from "@/components/RuntimeStatus";
import UserMenu from "@/components/UserMenu";
import { API_BASE } from "@/lib/runtime";
import { useCanvasTools } from "@/hooks/useCanvasTools";

export function Navbar() {
  const location = useLocation();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [loading, setLoading] = useState(false);
  const { connected, refreshConnectionStatus } = useCanvasTools();

  useEffect(() => {
    console.log('Dialog state changed:', open);
  }, [open]);

  // Auto-reconnect on mount if API key is stored
  useEffect(() => {
    const autoReconnect = async () => {
      try {
        const storedKey = sessionStorage.getItem('canvas_api_key');
        const storedUrl = sessionStorage.getItem('canvas_api_url') || 'https://gatech.instructure.com';
        
        if (storedKey) {
          // Silently reconnect in the background
          const res = await fetch(`${API_BASE}/api/canvas/connect`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ apiUrl: storedUrl, apiKey: storedKey })
          });
          
          if (res.ok) {
            const data = await res.json();
            if (data.success) {
              console.log('[Navbar] Auto-reconnected to Canvas');
              // Refresh connection status after reconnecting
              setTimeout(() => {
                refreshConnectionStatus();
              }, 300);
            }
          }
        }
      } catch (error) {
        console.warn('[Navbar] Auto-reconnect failed:', error);
        // Clear invalid stored key
        sessionStorage.removeItem('canvas_api_key');
        sessionStorage.removeItem('canvas_api_url');
      }
    };
    
    autoReconnect();
  }, [refreshConnectionStatus]);

  const handleConnect = async () => {
    if (!apiKey.trim()) {
      toast({ title: "API key required", variant: "destructive" });
      return;
    }
    try {
      setLoading(true);
      
      // First validate the API key
      const validateRes = await fetch(`${API_BASE}/api/canvas/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiUrl: 'https://gatech.instructure.com', apiKey })
      });
      const validateData = await validateRes.json();
      
      if (!validateData.success) {
        toast({ 
          title: "Invalid API key", 
          description: validateData.error || "The API key could not be validated. Please check your key and try again.", 
          variant: "destructive" 
        });
        return;
      }
      
      // API key is valid, now connect
      const res = await fetch(`${API_BASE}/api/canvas/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiUrl: 'https://gatech.instructure.com', apiKey })
      });
      const data = await res.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Connect failed');
      }
      
      // Store API key in sessionStorage (clears when tab closes)
      try {
        sessionStorage.setItem('canvas_api_key', apiKey);
        sessionStorage.setItem('canvas_api_url', 'https://gatech.instructure.com');
      } catch (e) {
        console.warn('Failed to store API key in sessionStorage:', e);
      }
      
      // Show success notification with green variant
      toast({ 
        title: "Canvas connected successfully!", 
        description: "Your Canvas API key is valid and tools are now available.",
        className: "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800"
      });
      setOpen(false);
      setApiKey("");
      
      // Refresh connection status immediately and again after a short delay
      refreshConnectionStatus();
      setTimeout(() => {
        refreshConnectionStatus();
      }, 500);
    } catch (e: any) {
      toast({ title: "Failed to connect Canvas", description: e?.message || 'Error', variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <header className="border-b border-border/50 bg-card/30 backdrop-blur-sm">
        <div className="flex h-16 items-center justify-between px-6">
          <div className="flex items-center space-x-4">
            <Link to="/" className="flex items-center space-x-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg gt-gradient">
                <BookOpen className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Study Buddy</h1>
                <Badge variant="outline" className="gold-accent text-xs">
                  GT
                </Badge>
              </div>
            </Link>
          </div>

          <nav className="flex items-center space-x-6">
            <Button
              variant={location.pathname === "/" ? "default" : "ghost"}
              size="sm"
              asChild
            >
              <Link to="/">Chat</Link>
            </Button>
            <Button
              variant={location.pathname === "/search" ? "default" : "ghost"}
              size="sm"
              asChild
            >
              <Link to="/search">Search</Link>
            </Button>
            <Button
              variant={location.pathname === "/practice" ? "default" : "ghost"}
              size="sm"
              asChild
            >
              <Link to="/practice">Practice</Link>
            </Button>
            <Button
              variant={location.pathname === "/flashcards" ? "default" : "ghost"}
              size="sm"
              asChild
            >
              <Link to="/flashcards">Flashcards</Link>
            </Button>
          </nav>

          <div className="flex items-center space-x-3">
            <RuntimeStatus />
          <Button 
            variant={connected ? "default" : "outline"} 
            size="sm" 
            onClick={() => {
              if (!connected) {
                console.log('Connect Canvas button clicked, opening dialog');
                setOpen(true);
              }
            }}
            className={connected ? "bg-green-600 hover:bg-green-700 text-white" : ""}
          >
            {connected ? (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Canvas Connected
              </>
            ) : (
              <>
                <LinkIcon className="mr-2 h-4 w-4" />
                Connect Canvas
              </>
            )}
          </Button>
            <UserMenu />
          </div>
        </div>
      </header>
      <Dialog open={open} onOpenChange={(isOpen) => {
        console.log('Dialog onOpenChange called:', isOpen);
        setOpen(isOpen);
      }}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Connect Canvas</DialogTitle>
            <DialogDescription>
              Enter your Canvas API token. The base URL is preconfigured for Georgia Tech.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="block text-sm mb-1">Canvas URL</label>
              <Input value="https://gatech.instructure.com" disabled />
            </div>
            <div>
              <label className="block text-sm mb-1">API Token</label>
              <Input 
                type="password" 
                value={apiKey} 
                onChange={e => setApiKey(e.target.value)} 
                placeholder="Paste your token"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && apiKey.trim() && !loading) {
                    handleConnect();
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={loading}>Cancel</Button>
            <Button onClick={handleConnect} disabled={loading || !apiKey.trim()}>
              {loading ? 'Connecting…' : 'Connect'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}