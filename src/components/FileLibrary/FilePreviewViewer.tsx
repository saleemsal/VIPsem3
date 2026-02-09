import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { getFileBlob, getFileMeta } from '@/lib/store';

interface PreviewFile {
  id: string;
  name: string;
  type: 'pdf' | 'image';
  mime: string;
  pages?: number;
  size: string;
  storagePath?: string;
}

export function FilePreviewViewer({ file }: { file: PreviewFile }) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let url: string | null = null;
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        // Try local blob first (uploaded files stored in idb)
        const blob = await getFileBlob(file.id);
        if (blob) {
          url = URL.createObjectURL(blob);
          if (!cancelled) setObjectUrl(url);
          setLoading(false);
          return;
        }
        // If no local blob, preview is unavailable
        if (!cancelled) {
          setObjectUrl(null);
        }
      } catch (e) {
        console.error('Failed to load preview blob', e);
        if (!cancelled) {
          toast({
            title: 'Preview unavailable',
            description: 'Could not load the file preview.',
            variant: 'destructive'
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [file.id]);

  if (loading) {
    return (
      <Card className="p-4 bg-muted/50">
        <p className="text-sm">Loading preview…</p>
      </Card>
    );
  }

  if (!objectUrl) {
    return (
      <Card className="p-4 bg-muted/50">
        <p className="text-sm">Preview unavailable.</p>
        <div className="mt-2">
          <Button variant="outline" disabled>Open in new tab</Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="h-[70vh]">
      {file.type === 'pdf' ? (
        <iframe src={`${objectUrl}#toolbar=1&navpanes=0`} className="w-full h-full rounded-md border" />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-muted/30 rounded-md">
          <img src={objectUrl} alt={file.name} className="max-w-full max-h-full object-contain" />
        </div>
      )}
    </div>
  );
}


