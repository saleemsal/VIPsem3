import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  ScrollArea,
  ScrollBar 
} from '@/components/ui/scroll-area';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { FileText, ExternalLink } from 'lucide-react';

export interface Citation {
  source: string;
  page: number;
  score: number;
  snippet?: string;
}

interface CitationPanelProps {
  citations: Citation[];
  onCitationClick: (source: string, page: number) => void;
  message?: any; // Selected assistant message
}

export function CitationPanel({ citations, onCitationClick, message }: CitationPanelProps) {
  // Use citations from the last assistant message if available, prioritizing message citations
  const displayCitations = message?.citations && message.citations.length > 0 ? message.citations : citations;
  
  console.log('📖 CitationPanel received:', {
    messageCitations: message?.citations?.length || 0,
    propCitations: citations?.length || 0,
    displayCitations: displayCitations?.length || 0,
    message: message,
    displayCitationsData: displayCitations
  });
  
  if (displayCitations.length === 0) {
    return (
      <Card className="w-80 p-6">
        <div className="text-center space-y-3">
          <FileText className="h-8 w-8 mx-auto text-muted-foreground" />
          <div>
            <h3 className="font-medium mb-1">Sources & Citations</h3>
            <p className="text-sm text-muted-foreground">
              {message?.grounded === false ? "No sources cited for this answer" : "No citations available"}
            </p>
          </div>
        </div>
      </Card>
    );
  }

  // Group citations by source file - ensure we have Citation objects
  const typedCitations = (displayCitations as Citation[]).filter(c => c.source && c.page && typeof c.score === 'number');
  const groupedCitations = typedCitations.reduce((acc, citation) => {
    if (!acc[citation.source]) {
      acc[citation.source] = [];
    }
    acc[citation.source].push(citation);
    return acc;
  }, {} as Record<string, Citation[]>);

  return (
    <Card className="w-80 p-6">
      <div className="space-y-4">
        <h3 className="font-medium flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Sources & Citations
        </h3>
        
        <ScrollArea className="h-96">
          <div className="space-y-4">
            {Object.entries(groupedCitations).map(([source, sourceCitations]) => (
              <div key={source} className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground truncate">
                  {source}
                </h4>
                
                <div className="flex flex-wrap gap-1">
                  {sourceCitations
                    .sort((a, b) => b.score - a.score) // Sort by score descending
                    .map((citation, index) => (
                      <TooltipProvider key={index}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 px-2 text-xs"
                              onClick={() => onCitationClick(citation.source, citation.page)}
                            >
                              p.{citation.page}
                              <ExternalLink className="ml-1 h-3 w-3" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="left" className="max-w-xs">
                            <div className="space-y-1">
                              <p className="font-medium">
                                {citation.source} - Page {citation.page}
                              </p>
                              {citation.snippet && (
                                <p className="text-xs">
                                  {citation.snippet.length > 120 
                                    ? citation.snippet.substring(0, 120) + '...'
                                    : citation.snippet
                                  }
                                </p>
                              )}
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ))}
                </div>
              </div>
            ))}
          </div>
          <ScrollBar />
        </ScrollArea>
      </div>
    </Card>
  );
}