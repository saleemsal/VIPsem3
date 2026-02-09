import { retrieve } from './rag';

export function generatePractice(query:string, count=6){
  const hits = retrieve(query, 20);
  const mcq = hits.slice(0, Math.min(count, hits.length)).map((h,i)=>({
    question: `Q${i+1}: Based on ${h.source} p.${h.page}, ${h.text.slice(0,80)}… What is the correct completion?`,
    choices: ['A','B','C','D'],
    answer: 'A',
    citation: { source: h.source, page: h.page }
  }));
  const frq = hits.slice(0,2).map(h=>({
    prompt: `Explain: ${h.text.slice(0,120)}… (cite ${h.source} p.${h.page})`,
    rubricPoints: ['Key concept','Definition','Example','Citation']
  }));
  return { mcq, frq };
}

export function generateFlashcards(query:string, count=20){
  const hits = retrieve(query, count);
  return hits.map(h=>({
    front: h.text.slice(0,80) + '…',
    back:  'Answer based on the cited material.',
    source: h.source, page: h.page
  }));
}