import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { 
  ChevronDown, 
  ChevronUp, 
  Bug, 
  Database, 
  Clock, 
  FileText 
} from 'lucide-react';
import { sourcesRegistry } from '@/lib/sources';

export function SourcesDebug() {
  const [isOpen, setIsOpen] = useState(false);
  const [debugInfo, setDebugInfo] = useState(sourcesRegistry.getDebugInfo());

  const refreshDebugInfo = () => {
    setDebugInfo(sourcesRegistry.getDebugInfo());
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ready': return 'bg-green-500';
      case 'indexing': return 'bg-yellow-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  if (process.env.NODE_ENV === 'production') {
    return null; // Don't show in production
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="outline" size="sm">
            <Bug className="mr-2 h-4 w-4" />
            Debug
            {isOpen ? (
              <ChevronUp className="ml-2 h-4 w-4" />
            ) : (
              <ChevronDown className="ml-2 h-4 w-4" />
            )}
          </Button>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <Card className="mt-2 p-4 w-80 max-h-96 overflow-y-auto">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium flex items-center gap-2">
                  <Database className="h-4 w-4" />
                  Sources Registry
                </h3>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={refreshDebugInfo}
                >
                  Refresh
                </Button>
              </div>

              {/* Registry Stats */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Total Sources:</span>
                  <Badge variant="outline">{debugInfo.totalSources}</Badge>
                </div>
                
                <div className="flex justify-between text-sm">
                  <span>Ready:</span>
                  <div className="flex items-center gap-1">
                    <div className={`w-2 h-2 rounded-full ${getStatusColor('ready')}`} />
                    <Badge variant="outline">{debugInfo.readySources}</Badge>
                  </div>
                </div>
                
                <div className="flex justify-between text-sm">
                  <span>Indexing:</span>
                  <div className="flex items-center gap-1">
                    <div className={`w-2 h-2 rounded-full ${getStatusColor('indexing')}`} />
                    <Badge variant="outline">{debugInfo.indexingSources}</Badge>
                  </div>
                </div>
                
                <div className="flex justify-between text-sm">
                  <span>Error:</span>
                  <div className="flex items-center gap-1">
                    <div className={`w-2 h-2 rounded-full ${getStatusColor('error')}`} />
                    <Badge variant="outline">{debugInfo.errorSources}</Badge>
                  </div>
                </div>
              </div>

              {/* Index Stats */}
              <div className="border-t pt-3 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Index Docs:</span>
                  <Badge variant="outline">{debugInfo.indexDocCount}</Badge>
                </div>
                
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>Last updated: {debugInfo.lastUpdated.toLocaleTimeString()}</span>
                </div>
              </div>

              {/* Recent Retrievals */}
              <div className="border-t pt-3">
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <FileText className="h-3 w-3" />
                  Last Retrieval
                </h4>
                <div className="text-xs text-muted-foreground">
                  {debugInfo.lastRetrieval ? (
                    <div>
                      <p>Query: "{debugInfo.lastRetrieval.query}"</p>
                      <p>Results: {debugInfo.lastRetrieval.count} hits</p>
                      {debugInfo.lastRetrieval.topScores.length > 0 && (
                        <p>Top score: {(debugInfo.lastRetrieval.topScores[0] * 100).toFixed(1)}%</p>
                      )}
                    </div>
                  ) : (
                    <p>No recent retrievals</p>
                  )}
                </div>
              </div>
            </div>
          </Card>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}