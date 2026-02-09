import { API_BASE, RUNTIME } from './runtime';

export async function apiFetch(path: string, init?: RequestInit) {
  if (RUNTIME === 'mock') throw new Error('API not available in mock runtime');
  const res = await fetch(`${API_BASE}${path}`, init);
  const ct = res.headers.get('content-type') || '';
  // Guard: if static host returned HTML, surface a clear error
  if (ct.includes('text/html')) {
    const text = await res.text();
    throw new Error('API returned HTML (likely hitting SPA). Check VITE_API_BASE or deploy your API. Snippet: ' + text.slice(0,160));
  }
  return res;
}