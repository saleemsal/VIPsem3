import { OCR_MODE } from './runtime';

export async function ocrImageToText(blob: Blob): Promise<string> {
  if (OCR_MODE === 'off') return '';
  const { createWorker } = await import('tesseract.js');
  const worker = await createWorker();
  const { data: { text } } = await worker.recognize(blob);
  await worker.terminate();
  return text;
}