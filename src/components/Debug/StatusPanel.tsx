import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ChevronDown, Activity, Database, Clock, Search } from 'lucide-react';
import { sourcesRegistry } from '@/lib/sources';
import { retrieve } from '@/lib/rag';

export function StatusPanel() {
  const [isOpen, setIsOpen] = useState(false);
  
  // Get current status
  const readySources = sourcesRegistry.getSourcesByStatus('ready');
  const indexingSources = sourcesRegistry.getSourcesByStatus('indexing');
  const errorSources = sourcesRegistry.getSourcesByStatus('error');
  const debugInfo = sourcesRegistry.getDebugInfo();
  
  // Don't show in production
  if (process.env.NODE_ENV === 'production') {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <Button 
            variant="outline" 
            size="sm" 
            className="bg-background/95 backdrop-blur-sm border-muted"
          >
            <Activity className="h-4 w-4 mr-2" />
            Status
            <ChevronDown className={`h-4 w-4 ml-2 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </Button>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <Card className="mt-2 p-4 space-y-3 bg-background/95 backdrop-blur-sm">
            {/* Sources Status */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Database className="h-4 w-4" />
                Sources
              </div>
              <div className="flex gap-2 flex-wrap">
                <Badge variant="default">Ready: {readySources.length}</Badge>
                <Badge variant="secondary">Indexing: {indexingSources.length}</Badge>
                <Badge variant="destructive">Error: {errorSources.length}</Badge>
              </div>
            </div>

            {/* Index Status */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Search className="h-4 w-4" />
                Index
              </div>
              <div className="text-sm text-muted-foreground">
                Documents: {debugInfo.indexDocCount}
              </div>
              {debugInfo.lastUpdated && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  Last updated: {debugInfo.lastUpdated.toLocaleTimeString()}
                </div>
              )}
            </div>

            {/* Recent Sources */}
            {readySources.length > 0 && (
              <div className="space-y-2">
                <div className="text-sm font-medium">Ready Sources</div>
                <div className="space-y-1 max-h-24 overflow-y-auto">
                  {readySources.slice(0, 3).map(source => (
                    <div key={source.id} className="text-xs text-muted-foreground truncate">
                      {source.name}
                    </div>
                  ))}
                  {readySources.length > 3 && (
                    <div className="text-xs text-muted-foreground">
                      +{readySources.length - 3} more...
                    </div>
                  )}
                </div>
              </div>
            )}
          </Card>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}