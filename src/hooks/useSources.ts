import { useState, useEffect } from 'react';
import { sourcesRegistry, type Source } from '@/lib/sources';
import { LocalAuthClient } from '@/lib/local-auth-client';
import { toast } from '@/hooks/use-toast';

export function useSources() {
  const [sources, setSources] = useState<Source[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    // Initialize registry and set sources after init completes
    (async () => {
      try {
        await sourcesRegistry.initialize();
      } finally {
        if (mounted) {
          setSources(sourcesRegistry.getAllSources());
          setIsLoading(false);
        }
      }
    })();
    
    // Listen for updates
    const unsubscribe = sourcesRegistry.on('updated', () => {
      if (!mounted) return;
      setSources(sourcesRegistry.getAllSources());
    });

    // Initial load (in case already initialized)
    setSources(sourcesRegistry.getAllSources());

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

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

    const results: string[] = [];
    
    for (const file of files) {
      try {
        const sourceId = await sourcesRegistry.ingestFile(file, user.id);
        results.push(sourceId);
        
        toast({
          title: "File uploaded",
          description: `${file.name} has been processed and indexed.`
        });
      } catch (error) {
        console.error('Upload failed:', error);
        toast({
          title: "Upload failed",
          description: `Failed to process ${file.name}.`,
          variant: "destructive"
        });
      }
    }

    return results;
  };

  const updateTags = async (sourceId: string, tags: string[]) => {
    await sourcesRegistry.updateTags(sourceId, tags);
  };

  const deleteSource = async (sourceId: string) => {
    try {
      await sourcesRegistry.deleteSource(sourceId);
      toast({
        title: "File deleted",
        description: "File has been removed from your library."
      });
    } catch (error) {
      console.error('Delete failed:', error);
      toast({
        title: "Delete failed",
        description: "Failed to delete the file.",
        variant: "destructive"
      });
    }
  };

  const getDebugInfo = () => sourcesRegistry.getDebugInfo();

  return {
    sources,
    isLoading,
    uploadFiles,
    updateTags,
    deleteSource,
    getDebugInfo
  };
}