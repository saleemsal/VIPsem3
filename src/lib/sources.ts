import { addDocs, ensureIndex } from './rag';
import { saveFile } from './store';
import { extractPdfText } from './pdf';
import { ocrImageToText } from './ocr';

export interface Source {
  id: string;
  name: string;
  user_id: string;
  size: number;
  mime: string;
  pages: number;
  created_at: Date;
  tags: string[];
  status: 'indexing' | 'ready' | 'error';
  storage_path?: string;
}

export interface SourcePage {
  document_id: string;
  page: number;
  text: string;
}

class SourcesRegistry {
  private sources: Map<string, Source> = new Map();
  private listeners: Set<() => void> = new Set();
  private isInitialized = false;

  // Event system
  on(event: 'updated', listener: () => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit() {
    this.listeners.forEach(listener => listener());
  }

  // Error notifications
  private notifyError(message: string, error?: any) {
    console.error(message, error);
    // Import toast dynamically to avoid circular dependencies
    import('@/hooks/use-toast').then(({ toast }) => {
      toast({
        title: "Error",
        description: message,
        variant: "destructive"
      });
    });
  }

  // Initialize registry on app start
  async initialize() {
    if (this.isInitialized) return;
    
    try {
      console.log('Initializing sources registry...');
      // Start with no preloaded sources; users will upload their own files
      this.isInitialized = true;
      this.emit();
    } catch (error) {
      console.error('Failed to initialize sources registry:', error);
      this.isInitialized = true;
      this.emit();
    }
  }

  private loadDemoSources() {
    const demoSources: Source[] = [
      {
        id: "demo-1",
        name: "CS 1301 - Lecture 5.pdf",
        user_id: "demo",
        size: 2457600,
        mime: "application/pdf",
        pages: 24,
        created_at: new Date("2024-01-14"),
        tags: ["cs1301", "lecture", "programming"],
        status: 'ready'
      },
      {
        id: "demo-2",
        name: "Data Structures Notes.pdf",
        user_id: "demo",
        size: 1887436,
        mime: "application/pdf",
        pages: 18,
        created_at: new Date("2024-01-09"),
        tags: ["cs1332", "notes", "algorithms"],
        status: 'ready'
      },
      {
        id: "demo-3",
        name: "Algorithm Analysis.pdf",
        user_id: "demo",
        size: 3251200,
        mime: "application/pdf",
        pages: 32,
        created_at: new Date("2024-01-07"),
        tags: ["cs1332", "analysis", "complexity"],
        status: 'ready'
      },
      {
        id: "demo-4",
        name: "Handwritten Notes.jpg",
        user_id: "demo",
        size: 1258291,
        mime: "image/jpeg",
        pages: 1,
        created_at: new Date("2024-01-11"),
        tags: ["handwritten", "physics"],
        status: 'ready'
      },
      {
        id: "demo-5",
        name: "Calculus Formulas.pdf",
        user_id: "demo",
        size: 892340,
        mime: "application/pdf",
        pages: 12,
        created_at: new Date("2024-01-08"),
        tags: ["math1552", "calculus", "formulas"],
        status: 'ready'
      },
      {
        id: "demo-6",
        name: "Physics Lab Report.pdf",
        user_id: "demo",
        size: 1456789,
        mime: "application/pdf",
        pages: 8,
        created_at: new Date("2024-01-13"),
        tags: ["phys2211", "lab", "mechanics"],
        status: 'ready'
      },
      {
        id: "demo-7",
        name: "Study Schedule.jpg",
        user_id: "demo",
        size: 734521,
        mime: "image/jpeg",
        pages: 1,
        created_at: new Date("2024-01-16"),
        tags: ["planning", "schedule"],
        status: 'ready'
      },
      {
        id: "demo-8",
        name: "Database Design Notes.pdf",
        user_id: "demo",
        size: 2134567,
        mime: "application/pdf",
        pages: 28,
        created_at: new Date("2024-01-05"),
        tags: ["cs4400", "database", "design"],
        status: 'ready'
      }
    ];

    // Derive pseudo storage paths for demo pdfs so preview works across refresh
    demoSources.forEach(source => {
      if (source.mime === 'application/pdf') {
        source.storage_path = `${source.user_id}/${source.id}/${source.name}`;
      }
      this.sources.set(source.id, source);
    });
    
    // Add demo pages to RAG index - expanded with more content
    const demoPages = [
      { id: "demo-1:1", source: "CS 1301 - Lecture 5.pdf", page: 1, text: "Introduction to Object-Oriented Programming concepts including classes, objects, inheritance, and polymorphism. Key principles of encapsulation and abstraction. Classes serve as blueprints for creating objects, while objects are instances of classes containing both data and methods." },
      { id: "demo-1:12", source: "CS 1301 - Lecture 5.pdf", page: 12, text: "Object-oriented programming is a programming paradigm based on the concept of objects, which can contain data and code: data in the form of fields (often known as attributes or properties), and code, in the form of procedures (often known as methods). Inheritance allows classes to inherit properties and methods from parent classes." },
      { id: "demo-1:18", source: "CS 1301 - Lecture 5.pdf", page: 18, text: "Polymorphism enables objects of different types to be treated uniformly through a common interface. Method overriding and overloading are key implementation techniques." },
      { id: "demo-2:3", source: "Data Structures Notes.pdf", page: 3, text: "Linked lists are linear data structures where elements are stored in nodes, each containing data and a reference to the next node. Unlike arrays, linked lists don't require contiguous memory allocation." },
      { id: "demo-2:8", source: "Data Structures Notes.pdf", page: 8, text: "Arrays provide constant-time access to elements when the index is known. This makes them ideal for scenarios where quick lookups are required. Dynamic arrays can grow and shrink as needed." },
      { id: "demo-2:14", source: "Data Structures Notes.pdf", page: 14, text: "Hash tables use hash functions to map keys to array indices, providing average O(1) time complexity for insertion, deletion, and lookup operations. Collision resolution strategies include chaining and open addressing." },
      { id: "demo-3:5", source: "Algorithm Analysis.pdf", page: 5, text: "Algorithm efficiency is measured in terms of time and space complexity. Time complexity describes how the running time changes as input size increases." },
      { id: "demo-3:23", source: "Algorithm Analysis.pdf", page: 23, text: "Big O notation describes the limiting behavior of a function when the argument tends towards infinity. It is used to classify algorithms according to how their run time or space requirements grow as the input size grows." },
      { id: "demo-3:29", source: "Algorithm Analysis.pdf", page: 29, text: "Common time complexities include O(1) constant, O(log n) logarithmic, O(n) linear, O(n log n) linearithmic, O(n²) quadratic, and O(2^n) exponential." },
      { id: "demo-4:1", source: "Handwritten Notes.jpg", page: 1, text: "Physics problem solutions involving kinematics equations. Velocity and acceleration calculations for projectile motion scenarios. Initial velocity v₀, acceleration a, and time t are key variables in motion equations." },
      { id: "demo-5:2", source: "Calculus Formulas.pdf", page: 2, text: "Integration by parts formula: ∫u dv = uv - ∫v du. This is particularly useful for products of polynomial and transcendental functions." },
      { id: "demo-5:7", source: "Calculus Formulas.pdf", page: 7, text: "Chain rule for derivatives: (f(g(x)))' = f'(g(x)) · g'(x). Essential for differentiating composite functions." },
      { id: "demo-6:3", source: "Physics Lab Report.pdf", page: 3, text: "Experimental setup for measuring oscillation periods of a pendulum. Variables include length L, mass m, and gravitational acceleration g." },
      { id: "demo-7:1", source: "Study Schedule.jpg", page: 1, text: "Weekly study schedule showing dedicated time blocks for CS 1301, Math 1552, and Physics 2211. Color-coded by subject with exam dates highlighted." },
      { id: "demo-8:15", source: "Database Design Notes.pdf", page: 15, text: "Entity-Relationship (ER) diagrams represent database structure using entities, attributes, and relationships. Primary keys uniquely identify records." }
    ];
    
    addDocs(demoPages);
  }

  // loadFromDatabase removed - using local storage only
  // Supabase database is no longer used for file storage

  // Get all sources
  getAllSources(): Source[] {
    return Array.from(this.sources.values()).sort((a, b) => 
      b.created_at.getTime() - a.created_at.getTime()
    );
  }

  // Get sources by status
  getSourcesByStatus(status: Source['status']): Source[] {
    return this.getAllSources().filter(source => source.status === status);
  }

  // Get source by ID
  getSource(id: string): Source | undefined {
    return this.sources.get(id);
  }

  // Update source
  updateSource(id: string, updates: Partial<Source>) {
    const source = this.sources.get(id);
    if (source) {
      Object.assign(source, updates);
      this.sources.set(id, source);
      this.emit();
    }
  }

  // Add source
  addSource(source: Source) {
    this.sources.set(source.id, source);
    this.emit();
  }

  // Remove source
  removeSource(id: string) {
    this.sources.delete(id);
    this.emit();
  }

  // Ingest a new file (unified pipeline)
  async ingestFile(file: File, userId: string): Promise<string> {
    const sourceId = crypto.randomUUID();
    
    // Create initial source record
    const source: Source = {
      id: sourceId,
      name: file.name,
      user_id: userId,
      size: file.size,
      mime: file.type,
      pages: 1,
      created_at: new Date(),
      tags: [],
      status: 'indexing'
    };

    this.addSource(source);

    try {
      // Files are now stored locally - no Supabase storage needed
      const filePath = `${userId}/${sourceId}/${file.name}`;

      // Extract text
      let textByPage: { page: number; text: string }[] = [];
      let pages = 1;

      if (file.type === 'application/pdf') {
        textByPage = await extractPdfText(file);
        pages = textByPage.length;
      } else if (file.type.startsWith('image/')) {
        const text = await ocrImageToText(file);
        textByPage = [{ page: 1, text }];
        pages = 1;
      }

      // Persist file blob and extracted metadata locally for preview
      await saveFile(
        {
          id: sourceId,
          name: file.name,
          mime: file.type,
          pages,
          textByPage,
          ocr: file.type.startsWith('image/'),
          createdAt: Date.now(),
        },
        file
      );

      // Add to RAG index
      if (textByPage.length > 0) {
        const ragDocs = textByPage.map(tp => ({
          id: `${sourceId}:${tp.page}`,
          source: file.name,
          page: tp.page,
          text: tp.text
        }));
        addDocs(ragDocs);
      }

      // Update source status
      this.updateSource(sourceId, { 
        status: 'ready', 
        pages,
        storage_path: filePath 
      });

      return sourceId;
    } catch (error) {
      console.error('File ingestion failed:', error);
      this.updateSource(sourceId, { status: 'error' });
      throw error;
    }
  }

  // Update tags
  async updateTags(sourceId: string, tags: string[]) {
    const source = this.sources.get(sourceId);
    if (!source) return;

    // Update local state
    this.updateSource(sourceId, { tags });

    // Persist to database (we'll add tags column later if needed)
    // For now, just update locally
  }

  // Delete source
  async deleteSource(sourceId: string) {
    // Skip Supabase deletion - using local storage only
    // Supabase auth is disabled in favor of OAuth
    this.removeSource(sourceId);
  }

  // Debug info
  getDebugInfo() {
    const sources = this.getAllSources();
    return {
      totalSources: sources.length,
      readySources: sources.filter(s => s.status === 'ready').length,
      indexingSources: sources.filter(s => s.status === 'indexing').length,
      errorSources: sources.filter(s => s.status === 'error').length,
      lastUpdated: new Date(),
      indexDocCount: ensureIndex().documentCount,
      lastRetrieval: this.lastRetrieval
    };
  }

  // Track last retrieval for debugging
  private lastRetrieval: { query: string; count: number; topScores: number[] } | null = null;

  trackRetrieval(query: string, results: any[]) {
    this.lastRetrieval = {
      query,
      count: results.length,
      topScores: results.slice(0, 3).map(r => r.score)
    };
  }
}

// Global registry instance
export const sourcesRegistry = new SourcesRegistry();

// Export retrieve function that uses the unified index
export { retrieve } from './rag';