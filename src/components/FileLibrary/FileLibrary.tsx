import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { 
  Upload, 
  Search, 
  FileText, 
  Image, 
  Trash2, 
  Tag,
  Filter,
  Download,
  Eye,
  Loader2,
  Edit2,
  Save,
  X
} from "lucide-react";
import { useSources } from "@/hooks/useSources";
import { FilePreviewViewer } from "./FilePreviewViewer";
import { type Source } from "@/lib/sources";
import { 
  Dialog, 
  DialogContent, 
  DialogTrigger,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";

export function FileLibrary() {
  const { sources, isLoading, uploadFiles, updateTags, deleteSource } = useSources();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState<string>("all");
  const [sortBy, setSortBy] = useState("date");
  const [editingTags, setEditingTags] = useState<string | null>(null);
  const [tempTags, setTempTags] = useState("");

  // Convert sources to display format
  const files = sources.map(source => ({
    id: source.id,
    name: source.name,
    type: (source.mime.includes('pdf') ? 'pdf' : 'image') as 'pdf' | 'image',
    mime: source.mime,
    size: `${(source.size / 1024 / 1024).toFixed(1)} MB`,
    pages: source.pages,
    uploadDate: source.created_at,
    tags: source.tags,
    preview: `File uploaded on ${source.created_at.toLocaleDateString()}`,
    status: source.status,
    storagePath: source.storage_path
  }));

  const allTags = Array.from(new Set(files.flatMap(file => file.tags)));

  const filteredFiles = files
    .filter(file => {
      const matchesSearch = file.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           file.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesTag = selectedTag === "all" || selectedTag === "" || file.tags.includes(selectedTag);
      return matchesSearch && matchesTag;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.name.localeCompare(b.name);
        case "size":
          return parseFloat(a.size) - parseFloat(b.size);
        case "date":
        default:
          return b.uploadDate.getTime() - a.uploadDate.getTime();
      }
    });

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = event.target.files;
    if (!uploadedFiles) return;

    const validFiles = Array.from(uploadedFiles).filter(file => 
      ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'].includes(file.type)
    );

    if (validFiles.length === 0) {
      toast({
        title: "Invalid file type",
        description: "Please upload PDF, PNG, or JPG files only.",
        variant: "destructive"
      });
      return;
    }

    await uploadFiles(validFiles);
    event.target.value = '';
  };

  const handleEditTags = (fileId: string, currentTags: string[]) => {
    setEditingTags(fileId);
    setTempTags(currentTags.join(', '));
  };

  const handleSaveTags = async (fileId: string) => {
    const tags = tempTags.split(/[,\s]+/).filter(tag => tag.trim().length > 0);
    await updateTags(fileId, tags);
    setEditingTags(null);
    setTempTags("");
  };

  const handleCancelEdit = () => {
    setEditingTags(null);
    setTempTags("");
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'pdf':
        return <FileText className="h-5 w-5 text-red-500" />;
      case 'image':
        return <Image className="h-5 w-5 text-blue-500" />;
      default:
        return <FileText className="h-5 w-5" />;
    }
  };

  return (
    <div className="w-80 border-r border-border/50 bg-card/20 backdrop-blur-sm flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-border/50">
        <h2 className="text-lg font-semibold mb-4">File Library</h2>
        
        {/* Upload Banner */}
        <Card className="p-3 mb-4 bg-amber-500/10 border-amber-500/20">
          <p className="text-xs text-amber-600 dark:text-amber-400">
            Example tags: cs1301, lecture, programming<br/>
            Example tags: cs1332, notes, algorithms, complexity<br/>
            Example tags: handwritten, physics
          </p>
        </Card>

        {/* Upload Button */}
        <div>
          <input
            id="file-upload"
            type="file"
            multiple
            accept=".pdf,.png,.jpg,.jpeg"
            onChange={handleFileUpload}
            className="hidden"
          />
          <Button 
            className="w-full mb-4" 
            variant="outline"
            onClick={() => document.getElementById('file-upload')?.click()}
            style={{ pointerEvents: 'auto', zIndex: 10 }}
          >
            <Upload className="mr-2 h-4 w-4" />
            Add Files
          </Button>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-4">
          <Select value={selectedTag} onValueChange={setSelectedTag}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="All tags" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All tags</SelectItem>
              {allTags.map(tag => (
                <SelectItem key={tag} value={tag}>
                  <Tag className="mr-2 h-3 w-3" />
                  {tag}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date">Date</SelectItem>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="size">Size</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* File List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }, (_, i) => (
              <Card key={i} className="p-3 animate-pulse">
                <div className="space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                  <div className="h-3 bg-muted rounded w-2/3" />
                </div>
              </Card>
            ))}
          </div>
        ) : filteredFiles.map((file) => (
          <Card key={file.id} className="p-3 hover:bg-accent/50 transition-colors">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                {getFileIcon(file.type)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-sm truncate">{file.name}</h3>
                    {file.status === 'indexing' && (
                      <Loader2 className="h-3 w-3 animate-spin text-primary" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {file.size}
                    {file.pages && ` • ${file.pages} pages`}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {file.uploadDate.toLocaleDateString()}
                    {file.status === 'indexing' && ' • Indexing...'}
                    {file.status === 'ready' && ' • Ready'}
                    {file.status === 'error' && ' • Error'}
                  </p>
                  
                  {/* Tags */}
                  <div className="flex flex-wrap gap-1 mt-2">
                    {editingTags === file.id ? (
                      <div className="flex gap-1 w-full">
                        <Input
                          value={tempTags}
                          onChange={(e) => setTempTags(e.target.value)}
                          placeholder="Add tags (comma separated)"
                          className="text-xs h-6"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveTags(file.id);
                            if (e.key === 'Escape') handleCancelEdit();
                          }}
                        />
                        <Button size="sm" variant="ghost" onClick={() => handleSaveTags(file.id)}>
                          <Save className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={handleCancelEdit}>
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <>
                        {file.tags.map(tag => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          onClick={() => handleEditTags(file.id, file.tags)}
                          className="h-5 px-1"
                        >
                          <Edit2 className="h-3 w-3" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-1">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <Eye className="h-3 w-3" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl">
                    <DialogHeader>
                      <DialogTitle>{file.name}</DialogTitle>
                      {file.pages && (
                        <DialogDescription>
                          {file.pages} pages • {file.size}
                        </DialogDescription>
                      )}
                    </DialogHeader>
                    <FilePreviewViewer file={file} />
                  </DialogContent>
                </Dialog>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteSource(file.id)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </Card>
        ))}

        {filteredFiles.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No files found</p>
          </div>
        )}
      </div>
    </div>
  );
}