import MiniSearch from 'minisearch';

export type Doc = { id:string; source:string; page:number; text:string };

let index: MiniSearch<Doc> | null = null;

export function ensureIndex() {
  if (!index) {
    index = new MiniSearch<Doc>({
      fields: ['text','source'],
      storeFields: ['source','page','text'],
      searchOptions: { boost: { text: 2, source: 1 }, prefix: true, fuzzy: 0.2 }
    });
  }
  return index;
}

export function addDocs(docs: Doc[]) {
  try {
    // Remove duplicates before adding
    const idx = ensureIndex();
    const existingIds = new Set();
    
    // If index has documents, we need to be careful with duplicates
    if (idx.documentCount > 0) {
      // Clear and rebuild index to avoid duplicates
      clearDocs();
      const newIdx = ensureIndex();
      
      const uniqueDocs = docs.filter(doc => {
        if (existingIds.has(doc.id)) {
          return false;
        }
        existingIds.add(doc.id);
        return true;
      });
      
      newIdx.addAll(uniqueDocs);
      console.log(`Added ${uniqueDocs.length} unique documents to search index`);
    } else {
      // Fresh index, just filter duplicates within the current batch
      const uniqueDocs = docs.filter(doc => {
        if (existingIds.has(doc.id)) {
          return false;
        }
        existingIds.add(doc.id);
        return true;
      });
      
      idx.addAll(uniqueDocs);
      console.log(`Added ${uniqueDocs.length} documents to fresh search index`);
    }
  } catch (error) {
    console.error('Error adding documents to search index:', error);
    // If there's still a duplicate ID error, recreate the index
    if (error.message.includes('duplicate ID')) {
      clearDocs();
      const newIdx = ensureIndex();
      const uniqueDocs = docs.filter((doc, index, self) => 
        index === self.findIndex(d => d.id === doc.id)
      );
      newIdx.addAll(uniqueDocs);
      console.log(`Recreated index and added ${uniqueDocs.length} unique documents`);
    }
  }
}

export function clearDocs() {
  index = null;
}

// Normalize query: lowercase, remove punctuation, filter stopwords
function normalizeQuery(query: string): string {
  const stopwords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'what', 'how', 'why', 'when', 'where']);
  return query
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopwords.has(word))
    .join(' ');
}

// Expand query with common academic terms
function expandQuery(query: string): string {
  const expansions: Record<string, string[]> = {
    'design': ['gestalt', 'visual', 'ui', 'ux', 'typography'],
    'algorithm': ['complexity', 'analysis', 'big-o', 'time', 'space'],
    'data': ['structure', 'array', 'list', 'tree', 'graph'],
    'programming': ['code', 'function', 'method', 'class', 'object']
  };
  
  let expanded = query;
  for (const [key, terms] of Object.entries(expansions)) {
    if (query.toLowerCase().includes(key)) {
      expanded += ' ' + terms.join(' ');
    }
  }
  return expanded;
}

export function retrieve(query: string, topK=12, threshold=0.15) {
  const idx = ensureIndex();
  
  // Try normalized query first
  let normalizedQuery = normalizeQuery(query);
  let results = idx.search(normalizedQuery);
  
  // If no good hits, try expanded query
  if (results.length === 0 || (results[0]?.score ?? 0) < threshold) {
    const expandedQuery = expandQuery(normalizedQuery);
    const expandedResults = idx.search(expandedQuery);
    if (expandedResults.length > 0 && (expandedResults[0]?.score ?? 0) > (results[0]?.score ?? 0)) {
      results = expandedResults;
    }
  }
  
  // If still no good hits, try bi-grams
  if (results.length === 0 || (results[0]?.score ?? 0) < threshold) {
    const words = normalizedQuery.split(' ');
    const bigrams = [];
    for (let i = 0; i < words.length - 1; i++) {
      bigrams.push(words[i] + ' ' + words[i + 1]);
    }
    if (bigrams.length > 0) {
      const bigramResults = idx.search(bigrams.join(' '));
      if (bigramResults.length > 0 && (bigramResults[0]?.score ?? 0) > (results[0]?.score ?? 0)) {
        results = bigramResults;
      }
    }
  }
  
  // Normalize scores RELATIVE to the top result so best match = 1.0 (100%)
  const topRawScore = results[0]?.score ?? 1;
  const finalResults = results.slice(0, topK).map(r => {
    const d = r as any;
    const { id, source, page, text } = d;
    const raw = r.score ?? 0;
    // Relative normalization; guard against division by zero
    const relative = topRawScore > 0 ? raw / topRawScore : 0;
    const score = Math.max(0, Math.min(relative, 1));
    const docId = String(id).includes(':') ? String(id).split(':')[0] : String(id);
    return { id, docId, source, page, text, score };
  }).sort((a, b) => b.score - a.score); // Sort by score descending

  // Track for debugging (import sourcesRegistry if needed)
  try {
    const { sourcesRegistry } = require('./sources');
    sourcesRegistry.trackRetrieval(query, finalResults);
  } catch (e) {
    // Ignore if sources not available
  }

  return finalResults;
}

// Best-effort helper to get stored page text by source and page number
export function findDocBySourcePage(source: string, page: number): (Doc & { docId?: string }) | null {
  const idx = ensureIndex();
  const norm = (s: string) => s.toLowerCase().trim();
  const base = (s: string) => {
    const justName = s.split('\\').pop()!.split('/').pop()!;
    return { 
      full: norm(justName),
      noExt: norm(justName.replace(/\.[^/.]+$/, ''))
    };
  };
  try {
    // Broad search by provided source label
    const results = idx.search(source);
    const target = base(source);
    for (const r of results as any[]) {
      const cand = base(String(r.source || ''));
      const pageMatches = Number(r.page) === Number(page);
      const nameMatches = 
        cand.full === target.full ||
        cand.noExt === target.noExt ||
        cand.full.includes(target.noExt) ||
        target.full.includes(cand.noExt);
      if (pageMatches && nameMatches) {
        const docId = String(r.id).includes(':') ? String(r.id).split(':')[0] : String(r.id);
        return { id: r.id, source: r.source, page: r.page, text: r.text, docId } as Doc & { docId: string };
      }
    }
    // As a last resort, return first matching page regardless of name
    for (const r of results as any[]) {
      if (Number(r.page) === Number(page)) {
        const docId = String(r.id).includes(':') ? String(r.id).split(':')[0] : String(r.id);
        return { id: r.id, source: r.source, page: r.page, text: r.text, docId } as Doc & { docId: string };
      }
    }
  } catch {
    // ignore
  }
  return null;
}