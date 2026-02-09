import { retrieve } from './rag';
import { RUNTIME, API_BASE } from './runtime';
import type { ChatMode } from './modes';

type ChatPayload = {
  prompt: string;
  mode?: ChatMode;               // 'auto' | 'rag' | 'general'
  topK?: number;
  refusalThreshold?: number;     // normalized 0..1
  model?: string;                // for remote
};

async function* remoteRagStream(args: Required<Pick<ChatPayload,'prompt'|'topK'|'refusalThreshold'|'model'>>) {
  const res = await fetch(`${API_BASE}/api/chat`, {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ ...args, responseFormat: 'text', mode: 'rag' })
  });
  const reader = res.body!.getReader();
  const dec = new TextDecoder();
  let buf = '';
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let idx;
    while ((idx = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, idx).trim();
      buf = buf.slice(idx + 1);
      if (!line) continue;
      if (line.startsWith('{')) {
        try { const j = JSON.parse(line); if (j.citations) yield j; } catch {}
      } else {
        yield line;
      }
    }
  }
}

async function* remoteGeneralStream(args: { prompt: string; model?: string }) {
  const res = await fetch(`${API_BASE}/api/chat-general`, {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ prompt: args.prompt, model: args.model })
  });
  const reader = res.body!.getReader();
  const dec = new TextDecoder();
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    yield dec.decode(value, { stream: true });
  }
}

/** Hybrid chat stream:
 * mode='auto'  -> try RAG; if weak/no hits -> fallback to general
 * mode='rag-only'   -> force RAG & citations only
 * mode='general' -> pure model wrapper (no citations)
 */
export async function* chatStream({
  prompt, mode='auto', topK=12, refusalThreshold=0.25, model='mistral'
}: ChatPayload): AsyncGenerator<string | {citations:any[], grounded:boolean, note?:string}> {

  const cleaned = (prompt ?? '').trim();
  if (!cleaned) { yield 'Please enter a question or instruction.'; return; }

  // ----- GENERAL ONLY -----
  if (mode === 'general') {
    if (RUNTIME === 'remote') {
      for await (const t of remoteGeneralStream({ prompt: cleaned, model })) yield t;
      return;
    }
    // Mock general response (no citations)
    const reply = `Okay — answering generally (no course sources cited): `;
    for (const w of reply.split(' ')) { await new Promise(r=>setTimeout(r, 6)); yield w + ' '; }
    const echo = cleaned.slice(0, 240);
    for (const w of echo.split(' ')) { await new Promise(r=>setTimeout(r, 5)); yield w + ' '; }
    yield { citations: [], grounded:false, note:'General answer (no sources matched).' };
    return;
  }

  // ----- RAG (or AUTO initial step) -----
  const hits = retrieve(cleaned, topK);
  const maxScore = hits.reduce((m,c)=>Math.max(m,c.score), 0);

  const ragStrong = hits.length > 0 && maxScore >= refusalThreshold;

  if (mode === 'rag-only') {
    if (!ragStrong) {
      yield 'No relevant passages found in your files. Try adding course keywords or upload more material.';
      return;
    }
    if (RUNTIME === 'remote') {
      for await (const t of remoteRagStream({ prompt: cleaned, topK, refusalThreshold, model })) yield t;
      return;
    }
    // Mock grounded response
    const intro = `Grounded answer with citations:\n\n`;
    for (const w of intro.split(' ')) { await new Promise(r=>setTimeout(r, 6)); yield w + ' '; }
    const bullets = hits.slice(0,3).map(h=>`• ${h.source} p.${h.page} — ${h.text.slice(0,100)}…`).join('\n');
    for (const w of bullets.split(' ')) { await new Promise(r=>setTimeout(r, 5)); yield w + ' '; }
    yield { citations: hits.map(h=>({source:h.source, page:h.page, score:Number(h.score.toFixed(2))})), grounded:true };
    return;
  }

  // ----- AUTO mode -----
  if (ragStrong) {
    if (RUNTIME === 'remote') {
      for await (const t of remoteRagStream({ prompt: cleaned, topK, refusalThreshold, model })) yield t;
      return;
    }
    const intro = `Grounded answer with citations:\n\n`;
    for (const w of intro.split(' ')) { await new Promise(r=>setTimeout(r, 6)); yield w + ' '; }
    const bullets = hits.slice(0,3).map(h=>`• ${h.source} p.${h.page} — ${h.text.slice(0,100)}…`).join('\n');
    for (const w of bullets.split(' ')) { await new Promise(r=>setTimeout(r, 5)); yield w + ' '; }
    yield { citations: hits.map(h=>({source:h.source, page:h.page, score:Number(h.score.toFixed(2))})), grounded:true };
    return;
  }

  // Fallback to GENERAL if RAG weak
  if (RUNTIME === 'remote') {
    // Send a short preamble token locally so the user sees what's happening
    yield 'No matching sources found; switching to a general answer… ';
    for await (const t of remoteGeneralStream({ prompt: cleaned, model })) yield t;
    // Send a final marker (no citations)
    yield { citations: [], grounded:false, note:'General answer (no sources matched).' };
    return;
  }

  // Mock fallback
  const pre = `No matching sources found; switching to a general answer… `;
  for (const w of pre.split(' ')) { await new Promise(r=>setTimeout(r, 6)); yield w + ' '; }
  const gen = `Here's a general response to "${cleaned.slice(0,120)}" (no citations).`;
  for (const w of gen.split(' ')) { await new Promise(r=>setTimeout(r, 5)); yield w + ' '; }
  yield { citations: [], grounded:false, note:'General answer (no sources matched).' };
}