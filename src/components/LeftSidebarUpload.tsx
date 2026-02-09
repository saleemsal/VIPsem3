import React, { useRef, useState } from 'react';
import { LocalAuthClient } from '@/lib/local-auth-client';
import { sourcesRegistry } from '@/lib/sources';
import { Upload } from 'lucide-react';

const ACCEPT = ['application/pdf','image/png','image/jpeg'];

export default function LeftSidebarUpload(){
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy,setBusy] = useState(false);
  const [msg,setMsg] = useState<string|null>(null);

  async function onFiles(files: FileList | null){
    if (!files?.length) return;
    setBusy(true); setMsg('Uploading…');

    const user = await LocalAuthClient.getCurrentUser();
    if (!user) { setMsg('Please log in first.'); setBusy(false); return; }

    for (const f of Array.from(files)) {
      if (!ACCEPT.includes(f.type)) { continue; }

      try {
        // Use sourcesRegistry to handle file upload
        await sourcesRegistry.ingestFile(f, user.id);
      } catch (error) {
        setMsg('Upload failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
        continue;
      }
    }

    setBusy(false); setMsg('Upload complete');
    setTimeout(() => setMsg(null), 3000);
  }

  return (
    <div className="flex items-center gap-2">
      <button 
        className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50" 
        onClick={()=>inputRef.current?.click()} 
        disabled={busy}
      >
        <Upload size={16} />
        {busy ? 'Uploading…' : 'Upload'}
      </button>
      <input 
        ref={inputRef} 
        type="file" 
        multiple 
        accept=".pdf,.png,.jpg,.jpeg" 
        hidden 
        onChange={e=>onFiles(e.target.files)} 
      />
      {msg && <span className="text-xs text-muted-foreground">{msg}</span>}
    </div>
  );
}