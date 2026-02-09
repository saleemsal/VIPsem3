import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Paperclip, X, Loader2 } from 'lucide-react';
import { useSources } from '@/hooks/useSources';
import { toast } from '@/hooks/use-toast';

interface AttachedFile {
  id: string;
  name: string;
  status: 'indexing' | 'ready' | 'error';
  progress?: number;
}

interface AttachButtonProps {
  onFilesReady?: (fileCount: number) => void;
  disabled?: boolean;
}

const ACCEPT = ['application/pdf', 'image/png', 'image/jpeg'];

export function AttachButton({ onFilesReady, disabled }: AttachButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { uploadFiles } = useSources();
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || !files.length) return;
    
    const fileArray = Array.from(files);
    const validFiles = fileArray.filter(f => ACCEPT.includes(f.type));
    
    if (validFiles.length === 0) {
      toast({
        title: "Invalid file type",
        description: "Please upload PDF, PNG, or JPG files only.",
        variant: "destructive"
      });
      return;
    }

    // Add to attached files for UI
    const newFiles = validFiles.map(f => ({
      id: crypto.randomUUID(),
      name: f.name,
      status: 'indexing' as const,
      progress: 0
    }));
    setAttachedFiles(prev => [...prev, ...newFiles]);

    try {
      // Use unified upload pipeline
      await uploadFiles(validFiles);
      
      // Update all files to ready (unified pipeline handles success/failure internally)
      setAttachedFiles(prev => prev.map(f => 
        newFiles.some(nf => nf.id === f.id) ? { ...f, status: 'ready' } : f
      ));

      // Notify when files are ready
      onFilesReady?.(validFiles.length);
      
    } catch (error) {
      console.error('Error uploading files:', error);
      setAttachedFiles(prev => prev.map(f => 
        newFiles.some(nf => nf.id === f.id) ? { ...f, status: 'error' } : f
      ));
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    handleFileSelect(e.dataTransfer.files);
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const files = e.clipboardData.files;
    if (files.length > 0) {
      handleFileSelect(files);
    }
  };

  const removeFile = (id: string) => {
    setAttachedFiles(prev => prev.filter(f => f.id !== id));
  };

  const allFilesReady = attachedFiles.every(f => f.status === 'ready');
  const hasIndexingFiles = attachedFiles.some(f => f.status === 'indexing');

  return (
    <div 
      className="relative"
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
      onPaste={handlePaste}
    >
      <Button
        variant="ghost"
        size="sm"
        onClick={() => inputRef.current?.click()}
        disabled={disabled}
        className="p-2"
      >
        <Paperclip className="h-4 w-4" />
      </Button>

      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.png,.jpg,.jpeg"
        multiple
        hidden
        onChange={(e) => handleFileSelect(e.target.files)}
      />

      {/* File Pills */}
      {attachedFiles.length > 0 && (
        <div className="absolute bottom-full left-0 mb-2 flex flex-wrap gap-1 max-w-sm">
          {attachedFiles.map((file) => (
            <Badge
              key={file.id}
              variant={file.status === 'ready' ? 'default' : file.status === 'error' ? 'destructive' : 'secondary'}
              className="text-xs flex items-center gap-1"
            >
              {file.status === 'indexing' && <Loader2 className="h-3 w-3 animate-spin" />}
              <span className="truncate max-w-20">{file.name}</span>
              {file.status === 'indexing' && <span>Indexing...</span>}
              {file.status === 'ready' && <span>Ready</span>}
              {file.status === 'error' && <span>Error</span>}
              <button
                onClick={() => removeFile(file.id)}
                className="ml-1 hover:bg-black/20 rounded-full p-0.5"
              >
                <X className="h-2 w-2" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Status indicator for parent component */}
      <div className="hidden" data-files-ready={allFilesReady} data-has-indexing={hasIndexingFiles} />
    </div>
  );
}