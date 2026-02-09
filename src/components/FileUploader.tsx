import React, { useRef, useState } from 'react';
import { saveFile } from '../lib/store';
import { extractPdfText } from '../lib/pdf';
import { ocrImageToText } from '../lib/ocr';
import { addDocs } from '../lib/rag';
import { Button } from './ui/button';

const ACCEPT = ['application/pdf','image/png','image/jpeg'];

export default function FileUploader(){
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string|null>(null);

  async function onFiles(files: FileList | null){
    if (!files || !files.length) return;
    setBusy(true); setMsg('Processing uploads...');
    for (const f of Array.from(files)){
      if (!ACCEPT.includes(f.type)) { setMsg(`Skipped unsupported: ${f.name}`); continue; }
      const id = crypto.randomUUID();
      let textByPage: {page:number;text:string}[] | undefined;
      let pages: number | undefined;
      let ocr = false;
      if (f.type === 'application/pdf') {
        textByPage = await extractPdfText(f);
        pages = textByPage.length;
      } else {
        const text = await ocrImageToText(f);
        textByPage = [{ page: 1, text }];
        pages = 1; ocr = true;
      }
      await saveFile({ id, name: f.name, mime: f.type, pages, textByPage, ocr, createdAt: Date.now() }, f);
      // index to RAG
      const docs = (textByPage ?? []).map(tp => ({
        id: `${id}:${tp.page}`,
        source: f.name,
        page: tp.page,
        text: tp.text
      }));
      addDocs(docs);
    }
    setBusy(false); setMsg('Upload complete');
    setTimeout(() => setMsg(null), 2000);
  }

  return (
    <div className="space-y-2">
      <div className="text-xs text-muted-foreground">Handwriting accepted, but <b>typed notes preferred</b> for accuracy.</div>
      <div className="flex items-center gap-2">
        <Button 
          onClick={()=>inputRef.current?.click()} 
          disabled={busy}
          variant="outline"
          size="sm"
        >
          {busy ? 'Processing…' : 'Upload PDF / PNG / JPG'}
        </Button>
        {msg && <span className="text-xs text-muted-foreground">{msg}</span>}
      </div>
      <input ref={inputRef} type="file" accept=".pdf,.png,.jpg,.jpeg" multiple hidden onChange={e=>onFiles(e.target.files)} />
    </div>
  );
}