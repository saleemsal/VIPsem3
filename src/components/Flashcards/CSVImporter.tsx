import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { Upload, FileText, AlertTriangle, CheckCircle } from 'lucide-react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';

interface CSVFlashcard {
  front: string;
  back: string;
  tags: string;
  source?: string;
  page?: string;
}

interface CSVImporterProps {
  onImport: (cards: CSVFlashcard[], deckTitle?: string) => void;
  onDeckCreated?: (deckInfo: any) => void;
}

export function CSVImporter({ onImport, onDeckCreated }: CSVImporterProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewData, setPreviewData] = useState<CSVFlashcard[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  const parseCSV = (content: string): { data: CSVFlashcard[], errors: string[] } => {
    const lines = content.trim().split('\n');
    const errors: string[] = [];
    const data: CSVFlashcard[] = [];

    if (lines.length === 0) {
      errors.push('File is empty');
      return { data, errors };
    }

    // Check for header row
    const header = lines[0].toLowerCase();
    const requiredColumns = ['front', 'back'];
    const optionalColumns = ['tags', 'source', 'page'];
    
    if (!requiredColumns.every(col => header.includes(col))) {
      errors.push('CSV must have header row with "front" and "back" columns');
      return { data, errors };
    }

    // Parse data rows
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      try {
        // Simple CSV parsing (handles basic cases)
        const values = line.split(',').map(v => v.trim().replace(/^"(.*)"$/, '$1'));
        
        if (values.length < 2) {
          errors.push(`Row ${i + 1}: Missing required columns`);
          continue;
        }

        const card: CSVFlashcard = {
          front: values[0] || '',
          back: values[1] || '',
          tags: values[2] || '',
          source: values[3] || undefined,
          page: values[4] || undefined
        };

        if (!card.front.trim() || !card.back.trim()) {
          errors.push(`Row ${i + 1}: Front and back cannot be empty`);
          continue;
        }

        data.push(card);
      } catch (error) {
        errors.push(`Row ${i + 1}: Failed to parse row`);
      }
    }

    return { data, errors };
  };

  const handleFileSelect = async (file: File) => {
    if (!file.name.endsWith('.csv')) {
      toast({
        title: "Invalid file type",
        description: "Please select a CSV file",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    setErrors([]);
    setPreviewData([]);

    try {
      const content = await file.text();
      const { data, errors } = parseCSV(content);
      
      setPreviewData(data);
      setErrors(errors);
      
      if (errors.length === 0 && data.length > 0) {
        toast({
          title: "CSV parsed successfully",
          description: `Found ${data.length} valid flashcards`
        });
      } else if (errors.length > 0) {
        toast({
          title: "CSV parsing errors",
          description: `${errors.length} errors found, please review`,
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "File reading error",
        description: "Failed to read the CSV file",
        variant: "destructive"
      });
      setErrors(['Failed to read file']);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImport = () => {
    if (previewData.length === 0) return;
    
    const deckTitle = `Imported ${new Date().toLocaleDateString()}`;
    onImport(previewData, deckTitle);
    
    // Notify about deck creation
    if (onDeckCreated) {
      onDeckCreated({
        title: deckTitle,
        count: previewData.length,
        cards: previewData
      });
    }
    
    setPreviewData([]);
    setErrors([]);
    setIsOpen(false);
    
    toast({
      title: "Cards imported",
      description: `Successfully imported ${previewData.length} flashcards`
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="mr-2 h-4 w-4" />
          Import CSV
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Flashcards from CSV</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Upload Area */}
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragging 
                ? 'border-primary bg-primary/5' 
                : 'border-muted-foreground/25 hover:border-muted-foreground/50'
            }`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">Drop CSV file here</h3>
            <p className="text-muted-foreground mb-4">
              or click to browse files
            </p>
            
            <Input
              type="file"
              accept=".csv"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileSelect(file);
              }}
              className="hidden"
              id="csv-upload"
            />
            <Button variant="outline" asChild>
              <label htmlFor="csv-upload" className="cursor-pointer">
                Select CSV File
              </label>
            </Button>
          </div>

          {/* Format Info */}
          <Card className="p-4">
            <h4 className="font-medium mb-2">CSV Format Requirements:</h4>
            <div className="text-sm text-muted-foreground space-y-1">
              <p><strong>Required columns:</strong> front, back</p>
              <p><strong>Optional columns:</strong> tags (semicolon-separated), source, page</p>
              <p><strong>Example header:</strong> front,back,tags,source,page</p>
              <p><strong>Example row:</strong> "What is OOP?","Object-oriented programming","cs1301;programming","Lecture 5.pdf","12"</p>
            </div>
          </Card>

          {/* Processing State */}
          {isProcessing && (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Processing CSV file...</p>
            </div>
          )}

          {/* Errors */}
          {errors.length > 0 && (
            <Card className="p-4 border-destructive/50 bg-destructive/5">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                <h4 className="font-medium text-destructive">Parsing Errors</h4>
              </div>
              <div className="text-sm space-y-1">
                {errors.map((error, index) => (
                  <p key={index} className="text-destructive/80">{error}</p>
                ))}
              </div>
            </Card>
          )}

          {/* Preview */}
          {previewData.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Preview ({previewData.length} cards)
                </h4>
                
                <Button 
                  onClick={handleImport}
                  disabled={errors.length > 0}
                >
                  Import Cards
                </Button>
              </div>

              <div className="max-h-64 overflow-y-auto space-y-2">
                {previewData.slice(0, 10).map((card, index) => (
                  <Card key={index} className="p-3">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="font-medium text-xs text-muted-foreground mb-1">FRONT</p>
                        <p className="truncate">{card.front}</p>
                      </div>
                      <div>
                        <p className="font-medium text-xs text-muted-foreground mb-1">BACK</p>
                        <p className="truncate">{card.back}</p>
                      </div>
                    </div>
                    
                    {(card.tags || card.source) && (
                      <div className="flex gap-2 mt-2">
                        {card.tags && (
                          <div className="flex flex-wrap gap-1">
                            {card.tags.split(';').map((tag, i) => (
                              <Badge key={i} variant="secondary" className="text-xs">
                                {tag.trim()}
                              </Badge>
                            ))}
                          </div>
                        )}
                        {card.source && (
                          <Badge variant="outline" className="text-xs">
                            {card.source}{card.page && ` p.${card.page}`}
                          </Badge>
                        )}
                      </div>
                    )}
                  </Card>
                ))}
                
                {previewData.length > 10 && (
                  <p className="text-sm text-muted-foreground text-center py-2">
                    ...and {previewData.length - 10} more cards
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}