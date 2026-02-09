import * as pdfjs from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
(pdfjs as any).GlobalWorkerOptions.workerSrc = pdfjsWorker;

export async function extractPdfText(blob: Blob): Promise<{page:number;text:string}[]> {
  const arr = new Uint8Array(await blob.arrayBuffer());
  const pdf = await (pdfjs as any).getDocument({ data: arr }).promise;
  const pages: {page:number;text:string}[] = [];
  for (let p=1; p<=pdf.numPages; p++){
    const page = await pdf.getPage(p);
    const textContent = await page.getTextContent();
    const text = textContent.items.map((i:any)=>i.str).join(' ');
    pages.push({ page: p, text });
  }
  return pages;
}