import { useState } from 'react';
import { LocalAuthClient } from '@/lib/local-auth-client';
import { sourcesRegistry } from '@/lib/sources';
import { toast } from '@/hooks/use-toast';

interface UploadStatus {
  id: string;
  name: string;
  status: 'uploading' | 'processing' | 'indexing' | 'ready' | 'error';
  progress?: number;
}

export function useFileUpload() {
  const [uploads, setUploads] = useState<UploadStatus[]>([]);

  const uploadFiles = async (files: File[]) => {
    const user = await LocalAuthClient.getCurrentUser();
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to upload files.",
        variant: "destructive"
      });
      return [];
    }

    const validFiles = files.filter(file => 
      ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'].includes(file.type)
    );

    if (validFiles.length === 0) {
      toast({
        title: "Invalid file type",
        description: "Please upload PDF, PNG, or JPG files only.",
        variant: "destructive"
      });
      return [];
    }

    // Create upload status entries
    const uploadStatuses = validFiles.map(file => ({
      id: crypto.randomUUID(),
      name: file.name,
      status: 'uploading' as const,
      progress: 0
    }));

    setUploads(prev => [...prev, ...uploadStatuses]);

    const results = [];

    for (let i = 0; i < validFiles.length; i++) {
      const file = validFiles[i];
      const status = uploadStatuses[i];

      try {
        // Use sourcesRegistry to handle file upload
        setUploads(prev => prev.map(u => 
          u.id === status.id ? { ...u, status: 'processing', progress: 50 } : u
        ));

        const sourceId = await sourcesRegistry.ingestFile(file, user.id);

        // Mark as ready
        setUploads(prev => prev.map(u => 
          u.id === status.id ? { ...u, status: 'ready', progress: 100 } : u
        ));

        results.push({
          id: sourceId,
          name: file.name,
          pages: sourcesRegistry.getSource(sourceId)?.pages || 1,
          success: true
        });

      } catch (error) {
        console.error('Error processing file:', error);
        setUploads(prev => prev.map(u => 
          u.id === status.id ? { ...u, status: 'error' } : u
        ));
        
        results.push({
          id: status.id,
          name: file.name,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // Clean up upload status after delay
    setTimeout(() => {
      setUploads(prev => prev.filter(u => !uploadStatuses.find(s => s.id === u.id)));
    }, 3000);

    return results;
  };

  const clearUploads = () => setUploads([]);

  return {
    uploads,
    uploadFiles,
    clearUploads,
    hasActiveUploads: uploads.some(u => ['uploading', 'processing', 'indexing'].includes(u.status))
  };
}