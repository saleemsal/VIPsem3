import { keys, del } from 'idb-keyval';
import { clearDocs } from './rag';

export async function deleteAllData() {
  // Clear RAG index
  clearDocs();
  
  // Delete all files from IndexedDB
  const allKeys = await keys();
  const fileKeys = allKeys.filter(k => String(k).startsWith('sb:file:'));
  
  for (const key of fileKeys) {
    await del(key);
  }
  
  return fileKeys.length;
}