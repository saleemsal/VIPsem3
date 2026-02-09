import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileLibrary } from "@/components/FileLibrary/FileLibrary";
import { CitationPanel } from "@/components/Citations/CitationPanel";
import { SourcesDebug } from "@/components/Debug/SourcesDebug";
import { StatusPanel } from "@/components/Debug/StatusPanel";
import type { Conversation } from "@/lib/conversations";
import { sourcesRegistry } from "@/lib/sources";
import { findDocBySourcePage } from "@/lib/rag";
import { toast } from "@/hooks/use-toast";
import { 
  FileText, 
  Quote, 
  Bug, 
  Settings, 
  ChevronDown, 
  Database,
  Activity
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FilePreviewViewer } from "@/components/FileLibrary/FilePreviewViewer";

interface ChatRightPanelProps {
  activeConversation: Conversation | null;
}

export function ChatRightPanel({ activeConversation }: ChatRightPanelProps) {
  
  // Derive last assistant message and citations for the panel
  const lastAssistantMessage = activeConversation?.messages?.filter(m => m.role === 'assistant').slice(-1)[0] || null;
  const panelCitations = lastAssistantMessage?.citations && lastAssistantMessage.citations.length > 0
    ? lastAssistantMessage.citations
    : (lastAssistantMessage?.sources || []).map((name: string) => ({ source: name, page: 1, score: 100 }));

  const citationCount = panelCitations?.length || 0;
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState<
    | { file: { id: string; name: string; type: 'pdf' | 'image'; mime: string; pages?: number; size: string; storagePath?: string } }
    | { fallback: { source: string; page: number; text: string } }
    | null
  >(null);

  const handleOpenCitation = async (sourceName: string, page: number) => {
    try {
      const allSources = sourcesRegistry.getAllSources();
      // Try exact match by display name or filename base
      const baseName = sourceName.split('\\').pop()!.split('/').pop()!;
      const baseNoExt = baseName.replace(/\.[^/.]+$/, '').toLowerCase();
      let match = allSources.find(s => s.name === sourceName || s.name === baseName || s.name.toLowerCase().replace(/\.[^/.]+$/, '') === baseNoExt);
      // If not found, try matching by docId from the index (when ids look like <docId>:<page>)
      if (!match) {
        const doc = findDocBySourcePage(sourceName, page);
        if (doc) {
          match = allSources.find(s => s.id === (doc as any).docId || s.name === doc.source || s.name.toLowerCase().replace(/\.[^/.]+$/, '') === baseNoExt);
        }
      }
      if (!match) {
        // Fallback: open inline viewer with indexed text
        const doc = findDocBySourcePage(sourceName, page);
        if (doc) {
          setPreviewData({ fallback: { source: sourceName, page, text: doc.text } });
          setPreviewOpen(true);
          return;
        }
        toast({ title: "File not found", description: `Could not locate ${sourceName} in your library.` });
        return;
      }

      if (!match.storage_path) {
        // Same fallback to indexed text if available
        const doc = findDocBySourcePage(sourceName, page);
        if (doc) {
          setPreviewData({ fallback: { source: sourceName, page, text: doc.text } });
          setPreviewOpen(true);
          return;
        }
        toast({ title: "Preview unavailable", description: `${sourceName} is a demo or missing storage path.` });
        return;
      }
      // Open in-app preview dialog using FilePreviewViewer
      const type: 'pdf' | 'image' = match.mime === 'application/pdf' ? 'pdf' : 'image';
      const sizeStr = `${(match.size / 1024 / 1024).toFixed(1)} MB`;
      setPreviewData({
        file: {
          id: match.id,
          name: match.name,
          type,
          mime: match.mime,
          pages: match.pages,
          size: sizeStr,
          storagePath: match.storage_path
        }
      });
      setPreviewOpen(true);
    } catch (err: any) {
      toast({ title: "Error", description: err?.message || "Failed to open citation." });
    }
  };

  return (
    <>
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-6 border-b border-border bg-card/20 backdrop-blur-sm">
        <h2 className="text-lg font-semibold text-foreground mb-4">Resources</h2>
        
        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="p-3 bg-background/50">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-blue-500" />
              <div>
                <p className="text-sm font-medium">Files</p>
                <p className="text-xs text-muted-foreground">Library</p>
              </div>
            </div>
          </Card>
          <Card className="p-3 bg-background/50">
            <div className="flex items-center gap-2">
              <Quote className="h-4 w-4 text-gt-gold" />
              <div>
                <p className="text-sm font-medium">{citationCount}</p>
                <p className="text-xs text-muted-foreground">Sources</p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Tabbed Content */}
      <div className="flex-1 overflow-hidden">
        <Tabs defaultValue="files" className="h-full flex flex-col">
          <div className="px-4 pt-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="files" className="text-xs">
                <FileText className="h-3 w-3 mr-1" />
                Files
              </TabsTrigger>
              <TabsTrigger value="sources" className="text-xs">
                <Quote className="h-3 w-3 mr-1" />
                Sources
                {citationCount > 0 && (
                  <Badge variant="secondary" className="ml-1 h-4 w-4 p-0 text-xs">
                    {citationCount}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="debug" className="text-xs">
                <Bug className="h-3 w-3 mr-1" />
                Debug
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-hidden">
            <TabsContent value="files" className="h-full mt-0 p-4">
              <div className="h-full overflow-y-auto">
                <FileLibrary />
              </div>
            </TabsContent>

            <TabsContent value="sources" className="h-full mt-0 p-4">
              <div className="h-full overflow-y-auto">
                <CitationPanel 
                  citations={panelCitations}
                  message={lastAssistantMessage as any}
                  onCitationClick={handleOpenCitation}
                />
              </div>
            </TabsContent>

            <TabsContent value="debug" className="h-full mt-0 p-4">
              <div className="h-full overflow-y-auto space-y-4">
                <Card className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Database className="h-4 w-4 text-blue-500" />
                    <h3 className="font-medium">Sources Registry</h3>
                  </div>
                  <SourcesDebug />
                </Card>
                
                <Card className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Activity className="h-4 w-4 text-green-500" />
                    <h3 className="font-medium">System Status</h3>
                  </div>
                  <StatusPanel />
                </Card>
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
    {/* In-app preview dialog for citations */}
    <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Source Preview</DialogTitle>
        </DialogHeader>
        {previewData && 'file' in previewData && (
          <FilePreviewViewer file={previewData.file} />
        )}
        {previewData && 'fallback' in previewData && (
          <Card className="p-4 bg-muted/50">
            <p className="text-sm mb-2">{previewData.fallback.source} — Page {previewData.fallback.page}</p>
            <pre className="text-sm whitespace-pre-wrap">{previewData.fallback.text}</pre>
          </Card>
        )}
      </DialogContent>
    </Dialog>
    </>
  );
}