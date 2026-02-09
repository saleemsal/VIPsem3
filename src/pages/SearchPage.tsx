import { useState, useEffect } from "react";
import { retrieve } from "@/lib/sources";
import { useSources } from "@/hooks/useSources";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  Search, 
  FileText, 
  Filter,
  Star,
  Clock,
  ExternalLink
} from "lucide-react";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { FilePreviewViewer } from "@/components/FileLibrary/FilePreviewViewer";

interface SearchResult {
  id: string;
  docId?: string;
  title: string;
  source: string;
  type: "file" | "canvas";
  snippet: string;
  score: number;
  page?: number;
  lastModified: Date;
  highlights: string[];
}

export default function SearchPage() {
  const { sources } = useSources();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [filterType, setFilterType] = useState<"all" | "file" | "canvas">("all");
  const [sortBy, setSortBy] = useState<"relevance" | "date">("relevance");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState<{
    id: string; name: string; type: 'pdf' | 'image'; mime: string; pages?: number; size: string; storagePath?: string;
  } | null>(null);

  const mockResults: SearchResult[] = [
    {
      id: "1",
      title: "Object-Oriented Programming Concepts",
      source: "CS 1301 - Lecture 5.pdf",
      type: "file",
      snippet: "Object-oriented programming is a programming paradigm based on the concept of objects, which can contain data and code: data in the form of fields...",
      score: 0.95,
      page: 12,
      lastModified: new Date("2024-01-15"),
      highlights: ["object-oriented", "programming", "paradigm"]
    },
    {
      id: "2",
      title: "Array Data Structures",
      source: "Data Structures Notes.pdf", 
      type: "file",
      snippet: "Arrays provide constant-time access to elements when the index is known. This makes them ideal for scenarios where quick lookups are required...",
      score: 0.87,
      page: 8,
      lastModified: new Date("2024-01-10"),
      highlights: ["arrays", "constant-time", "access"]
    },
    {
      id: "3",
      title: "Algorithm Complexity Analysis",
      source: "CS 1332 Assignment 3",
      type: "canvas",
      snippet: "Analyze the time complexity of sorting algorithms. Compare bubble sort, merge sort, and quicksort implementations...",
      score: 0.82,
      lastModified: new Date("2024-01-08"),
      highlights: ["algorithm", "complexity", "sorting"]
    },
    {
      id: "4",
      title: "Big O Notation Fundamentals",
      source: "Algorithm Analysis.pdf",
      type: "file", 
      snippet: "Big O notation describes the limiting behavior of a function when the argument tends towards infinity. It is used to classify algorithms...",
      score: 0.78,
      page: 23,
      lastModified: new Date("2024-01-08"),
      highlights: ["big o", "notation", "algorithms"]
    }
  ];

  const handleSearch = async () => {
    if (!query.trim()) return;

    setIsSearching(true);
    
    try {
      // Use unified RAG search
      const ragResults = retrieve(query, 20, 0.15);
      
      if (ragResults.length === 0) {
        setResults([]);
        setIsSearching(false);
        return;
      }

      // Get source metadata for each result
      const searchResults: SearchResult[] = ragResults.map((result, idx) => {
        const source = sources.find(s => s.name === result.source);
        return {
          id: `${result.id}_${idx}`,
          docId: (result as any).docId,
          title: result.text.slice(0, 100) + (result.text.length > 100 ? '...' : ''),
          source: result.source,
          type: "file" as const,
          snippet: result.text.slice(0, 120) + (result.text.length > 120 ? '...' : ''),
          score: Math.min(result.score, 1.0), // Clamp to 0-1
          page: result.page,
          lastModified: source?.created_at || new Date(),
          highlights: query.toLowerCase().split(' ').filter(w => w.length > 2)
        };
      });
      
      setResults(searchResults);
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    }
    
    setIsSearching(false);
  };

  const openInApp = (r: SearchResult) => {
    // Prefer docId to map to uploaded source
    const src = (r.docId && sources.find(s => s.id === r.docId)) || sources.find(s => s.name === r.source);
    if (!src) {
      setPreviewFile({
        id: r.docId || r.id,
        name: r.source,
        mime: 'application/pdf',
        type: 'pdf',
        pages: undefined,
        size: '',
        storagePath: undefined
      });
      setPreviewOpen(true);
      return;
    }
    const type: 'pdf' | 'image' = src.mime.includes('pdf') ? 'pdf' : 'image';
    setPreviewFile({
      id: src.id,
      name: src.name,
      mime: src.mime,
      type,
      pages: src.pages,
      size: `${(src.size / 1024 / 1024).toFixed(1)} MB`,
      storagePath: src.storage_path
    });
    setPreviewOpen(true);
  };

  const filteredResults = results
    .filter(result => {
      if (filterType === "all") return true;
      if (filterType === "file") return result.type === "file";
      if (filterType === "canvas") return result.type === "canvas";
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "relevance") {
        return b.score - a.score;
      } else {
        return b.lastModified.getTime() - a.lastModified.getTime();
      }
    });

  const highlightText = (text: string, highlights: string[]) => {
    let highlightedText = text;
    highlights.forEach(highlight => {
      const regex = new RegExp(`(${highlight})`, 'gi');
      highlightedText = highlightedText.replace(regex, '<mark class="bg-primary/20 px-1 rounded">$1</mark>');
    });
    return highlightedText;
  };

  const getScoreColor = (score: number) => {
    if (score >= 0.9) return "text-green-500";
    if (score >= 0.7) return "text-yellow-500";
    return "text-red-500";
  };

  return (
    <div className="min-h-screen bg-gradient-academic">
      <Navbar />
      
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 text-gt-gold">Global Search</h1>
          <p className="text-muted-foreground">
            Search across all uploaded files and Canvas documents
          </p>
        </div>

        {/* Search Bar */}
        <Card className="p-6 mb-8">
          <div className="flex gap-4 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search your study materials..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleSearch();
                  }
                }}
                className="pl-9 h-12"
              />
            </div>
            <Button 
              onClick={handleSearch} 
              disabled={isSearching || !query.trim()}
              variant="gt-gold"
              size="lg"
            >
              {isSearching ? "Searching..." : "Search"}
            </Button>
          </div>

          {/* Filters */}
          <div className="flex gap-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={filterType} onValueChange={(value) => setFilterType(value as "all" | "file" | "canvas")}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sources</SelectItem>
                  <SelectItem value="file">Files Only</SelectItem>
                  <SelectItem value="canvas">Canvas Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Select value={sortBy} onValueChange={(value) => setSortBy(value as "relevance" | "date")}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="relevance">Relevance</SelectItem>
                <SelectItem value="date">Date</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </Card>

        {/* Results */}
        {query && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">
                Search Results
                {filteredResults.length > 0 && (
                  <span className="text-muted-foreground ml-2">
                    ({filteredResults.length} found)
                  </span>
                )}
              </h2>
            </div>

            {isSearching ? (
              <div className="grid gap-4">
                {Array.from({ length: 3 }, (_, i) => (
                  <Card key={i} className="p-6 animate-pulse">
                    <div className="space-y-3">
                      <div className="h-4 bg-muted rounded w-3/4" />
                      <div className="h-3 bg-muted rounded w-1/2" />
                      <div className="h-3 bg-muted rounded w-full" />
                      <div className="h-3 bg-muted rounded w-5/6" />
                    </div>
                  </Card>
                ))}
              </div>
            ) : filteredResults.length > 0 ? (
              <div className="grid gap-4">
                {filteredResults.map((result) => (
                  <Card key={result.id} className="p-6 hover:bg-accent/50 transition-colors">
                    <div className="space-y-4">
                      {/* Header */}
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <FileText className="h-4 w-4 text-blue-500" />
                            <h3 className="font-semibold">{result.title}</h3>
                            <Badge variant={result.type === "canvas" ? "default" : "secondary"}>
                              {result.type}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {result.source}
                            {result.page && ` • Page ${result.page}`}
                          </p>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1">
                            <Star className="h-3 w-3 text-yellow-500" />
                            <span className={`text-sm font-medium ${getScoreColor(result.score)}`}>
                              {Math.round(Math.min(result.score * 100, 100))}%
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Snippet */}
                      <div className="bg-muted/50 p-3 rounded-md">
                        <p 
                          className="text-sm"
                          dangerouslySetInnerHTML={{
                            __html: highlightText(result.snippet, result.highlights)
                          }}
                        />
                      </div>

                      {/* Footer */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {result.lastModified.toLocaleDateString()}
                        </div>
                        
                        <Button variant="gt-gold" size="sm" onClick={() => openInApp(result)}>
                          <ExternalLink className="mr-2 h-3 w-3" />
                          Open
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="p-8 text-center">
                <Search className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">No results found</h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Try course keywords like "arrays", "recursion", or "Big-O". 
                  Attach a file to ground results in your uploaded materials.
                </p>
              </Card>
            )}
          </div>
        )}

        {/* Empty State */}
        {!query && (
          <Card className="p-12 text-center">
            <Search className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-medium mb-2">Start searching</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              Enter a query above to search across all your uploaded files and Canvas documents. 
              Get ranked results with highlighted snippets and confidence scores.
            </p>
          </Card>
        )}
      </div>
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{previewFile?.name ?? 'Preview'}</DialogTitle>
          </DialogHeader>
          {previewFile && <FilePreviewViewer file={previewFile} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}