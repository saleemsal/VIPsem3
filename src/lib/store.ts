import { set, get, del, keys } from 'idb-keyval';

export type FileRec = {
  id: string;
  name: string;
  mime: string;
  pages?: number;
  textByPage?: { page: number; text: string }[];
  ocr?: boolean;
  createdAt: number;
};

const KEY_PREFIX = 'sb:file:';

export async function saveFile(rec: FileRec, blob: Blob) {
  await set(KEY_PREFIX + rec.id + ':meta', rec);
  await set(KEY_PREFIX + rec.id + ':blob', blob);
}

export async function getFileMeta(id: string): Promise<FileRec | undefined> {
  return get(KEY_PREFIX + id + ':meta');
}

export async function getFileBlob(id: string): Promise<Blob | undefined> {
  return get(KEY_PREFIX + id + ':blob');
}

export async function listFiles(): Promise<FileRec[]> {
  const ks = await keys();
  const metas = ks.filter(k => String(k).endsWith(':meta'));
  const out: FileRec[] = [];
  for (const k of metas) out.push(await get(String(k)) as FileRec);
  return out.sort((a,b)=>b.createdAt - a.createdAt);
}

export async function deleteFile(id: string) {
  await del(KEY_PREFIX + id + ':meta');
  await del(KEY_PREFIX + id + ':blob');
}