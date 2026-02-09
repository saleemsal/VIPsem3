import { ChatMode } from '@/hooks/useChatModes';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  sources?: string[];
  citations?: Array<{
    source: string;
    page: number;
    score: number;
    snippet: string;
  }>;
}

export interface Conversation {
  id: string;
  title: string;
  mode: ChatMode;
  messages: ChatMessage[];
  created_at: Date;
  updated_at: Date;
}

const CONVERSATIONS_KEY = 'gt-study-buddy-conversations';
const ACTIVE_CONVERSATION_KEY = 'gt-study-buddy-active-conversation';

export class ConversationStore {
  private conversations: Conversation[] = [];
  private activeConversationId: string | null = null;

  constructor() {
    this.loadFromStorage();
    this.ensureDemoData();
  }

  // Initialize properly - ensure we have a selected conversation
  initializeConversations(): Conversation | null {
    // If no active conversation but conversations exist, select the most recent
    if (!this.activeConversationId && this.conversations.length > 0) {
      this.activeConversationId = this.conversations[0].id;
      this.saveToStorage();
    }
    
    return this.getActiveConversation();
  }

  // Ensure we have demo conversations for new users
  private ensureDemoData() {
    if (this.conversations.length === 0) {
      this.createDemoConversations();
    }
  }

  private createDemoConversations() {
    const demoConversations: Conversation[] = [
      {
        id: 'demo-conv-1',
        title: 'Getting Started with CS 1301',
        mode: 'auto',
        created_at: new Date('2024-01-15T10:30:00'),
        updated_at: new Date('2024-01-15T10:45:00'),
        messages: [
          {
            id: 'demo-msg-1',
            role: 'user',
            content: 'Can you explain object-oriented programming concepts from my CS 1301 notes?',
            timestamp: new Date('2024-01-15T10:30:00')
          },
          {
            id: 'demo-msg-2',
            role: 'assistant',
            content: 'Based on your CS 1301 lecture notes, object-oriented programming (OOP) is built around four main concepts:\n\n## Key OOP Concepts:\n\n**1. Encapsulation** - Bundling data and methods that operate on that data within a single unit (class)\n\n**2. Inheritance** - Classes can inherit properties and methods from parent classes, promoting code reuse\n\n**3. Polymorphism** - Objects of different types can be treated uniformly through a common interface\n\n**4. Abstraction** - Hiding complex implementation details while exposing only necessary functionality\n\nThese principles help create more maintainable, reusable, and organized code structures.',
            timestamp: new Date('2024-01-15T10:32:00'),
            sources: ['CS 1301 - Lecture 5.pdf'],
            citations: [
              { source: 'CS 1301 - Lecture 5.pdf', page: 1, score: 95, snippet: 'Introduction to Object-Oriented Programming concepts including classes, objects, inheritance, and polymorphism.' },
              { source: 'CS 1301 - Lecture 5.pdf', page: 12, score: 88, snippet: 'Object-oriented programming is a programming paradigm based on the concept of objects...' }
            ]
          },
          {
            id: 'demo-msg-3',
            role: 'user',
            content: 'How do I implement inheritance in Python?',
            timestamp: new Date('2024-01-15T10:35:00')
          },
          {
            id: 'demo-msg-4',
            role: 'assistant',
            content: 'Here\'s how to implement inheritance in Python:\n\n```python\n# Parent class (Base class)\nclass Animal:\n    def __init__(self, name, species):\n        self.name = name\n        self.species = species\n    \n    def make_sound(self):\n        return "Some generic animal sound"\n    \n    def info(self):\n        return f"{self.name} is a {self.species}"\n\n# Child class (Derived class)\nclass Dog(Animal):  # Inherits from Animal\n    def __init__(self, name, breed):\n        super().__init__(name, "Dog")  # Call parent constructor\n        self.breed = breed\n    \n    def make_sound(self):  # Override parent method\n        return "Woof!"\n    \n    def fetch(self):  # New method specific to Dog\n        return f"{self.name} is fetching the ball"\n\n# Usage\nmy_dog = Dog("Buddy", "Golden Retriever")\nprint(my_dog.info())  # Inherited method\nprint(my_dog.make_sound())  # Overridden method\nprint(my_dog.fetch())  # Dog-specific method\n```\n\n**Key points:**\n- Use `class ChildClass(ParentClass):` syntax\n- Call `super().__init__()` to initialize parent class\n- Override methods by redefining them\n- Add new methods specific to the child class',
            timestamp: new Date('2024-01-15T10:40:00'),
            sources: ['CS 1301 - Lecture 5.pdf']
          }
        ]
      },
      {
        id: 'demo-conv-2',
        title: 'Data Structures and Algorithms',
        mode: 'auto',
        created_at: new Date('2024-01-12T14:20:00'),
        updated_at: new Date('2024-01-12T14:35:00'),
        messages: [
          {
            id: 'demo-msg-5',
            role: 'user',
            content: 'What\'s the difference between arrays and linked lists?',
            timestamp: new Date('2024-01-12T14:20:00')
          },
          {
            id: 'demo-msg-6',
            role: 'assistant',
            content: '## Arrays vs Linked Lists\n\n### Arrays:\n- **Memory**: Contiguous memory allocation\n- **Access**: O(1) random access by index\n- **Insertion/Deletion**: O(n) at arbitrary positions\n- **Cache Performance**: Excellent due to spatial locality\n- **Memory Overhead**: Minimal\n\n### Linked Lists:\n- **Memory**: Non-contiguous, nodes scattered in memory\n- **Access**: O(n) sequential access required\n- **Insertion/Deletion**: O(1) if you have the node reference\n- **Cache Performance**: Poor due to scattered memory\n- **Memory Overhead**: Extra memory for storing pointers\n\n### When to Use:\n- **Arrays**: When you need frequent random access or mathematical operations\n- **Linked Lists**: When you frequently insert/delete elements and don\'t need random access\n\nBoth are fundamental building blocks for more complex data structures!',
            timestamp: new Date('2024-01-12T14:25:00'),
            sources: ['Data Structures Notes.pdf'],
            citations: [
              { source: 'Data Structures Notes.pdf', page: 3, score: 92, snippet: 'Linked lists are linear data structures where elements are stored in nodes...' },
              { source: 'Data Structures Notes.pdf', page: 8, score: 89, snippet: 'Arrays provide constant-time access to elements when the index is known...' }
            ]
          }
        ]
      },
      {
        id: 'demo-conv-3',
        title: 'Big O Notation Explained',
        mode: 'auto',
        created_at: new Date('2024-01-10T16:15:00'),
        updated_at: new Date('2024-01-10T16:25:00'),
        messages: [
          {
            id: 'demo-msg-7',
            role: 'user',
            content: 'Can you explain Big O notation with examples?',
            timestamp: new Date('2024-01-10T16:15:00')
          },
          {
            id: 'demo-msg-8',
            role: 'assistant',
            content: '# Big O Notation Explained\n\nBig O notation describes how algorithm performance scales with input size.\n\n## Common Time Complexities:\n\n**O(1) - Constant Time**\n```python\narray[index]  # Direct array access\n```\n\n**O(log n) - Logarithmic**\n```python\n# Binary search in sorted array\ndef binary_search(arr, target):\n    left, right = 0, len(arr) - 1\n    # Each iteration halves the search space\n```\n\n**O(n) - Linear**\n```python\n# Finding max element\nmax_val = max(array)  # Must check every element\n```\n\n**O(n log n) - Linearithmic**\n```python\n# Merge sort, heap sort\nsorted_array = sorted(array)\n```\n\n**O(n²) - Quadratic**\n```python\n# Bubble sort, nested loops\nfor i in range(n):\n    for j in range(n):\n        # Process each pair\n```\n\n**O(2ⁿ) - Exponential**\n```python\n# Recursive fibonacci (naive)\ndef fib(n):\n    if n <= 1: return n\n    return fib(n-1) + fib(n-2)\n```\n\n## Performance Ranking:\nO(1) < O(log n) < O(n) < O(n log n) < O(n²) < O(2ⁿ)',
            timestamp: new Date('2024-01-10T16:20:00'),
            sources: ['Algorithm Analysis.pdf'],
            citations: [
              { source: 'Algorithm Analysis.pdf', page: 23, score: 94, snippet: 'Big O notation describes the limiting behavior of a function when the argument tends towards infinity...' },
              { source: 'Algorithm Analysis.pdf', page: 29, score: 87, snippet: 'Common time complexities include O(1) constant, O(log n) logarithmic...' }
            ]
          }
        ]
      }
    ];

    // Add demo conversations to the store
    this.conversations = demoConversations;
    this.activeConversationId = demoConversations[0].id;
    this.saveToStorage();
  }

  private loadFromStorage() {
    try {
      const stored = localStorage.getItem(CONVERSATIONS_KEY);
      
      if (stored) {
        this.conversations = JSON.parse(stored).map((conv: any) => ({
          ...conv,
          created_at: new Date(conv.created_at),
          updated_at: new Date(conv.updated_at),
          messages: conv.messages.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          }))
        }));
        
        console.log('[ConversationStore] Loaded from localStorage:', {
          totalConversations: this.conversations.length,
          conversationSummaries: this.conversations.map(c => ({
            id: c.id,
            title: c.title,
            messageCount: c.messages.length
          }))
        });
      } else {
        console.log('[ConversationStore] No conversations found in localStorage');
      }
      
      this.activeConversationId = localStorage.getItem(ACTIVE_CONVERSATION_KEY);
      console.log('[ConversationStore] Active conversation ID:', this.activeConversationId);
    } catch (error) {
      console.error('[ConversationStore] Failed to load conversations:', error);
      this.conversations = [];
      this.activeConversationId = null;
    }
  }

  private saveToStorage() {
    try {
      localStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(this.conversations));
      if (this.activeConversationId) {
        localStorage.setItem(ACTIVE_CONVERSATION_KEY, this.activeConversationId);
      }
      console.log('[ConversationStore] Saved to localStorage:', {
        totalConversations: this.conversations.length,
        activeConversationId: this.activeConversationId,
        conversationSummaries: this.conversations.map(c => ({
          id: c.id,
          title: c.title,
          messageCount: c.messages.length
        }))
      });
    } catch (error) {
      console.error('[ConversationStore] Failed to save conversations:', error);
    }
  }

  createConversation(mode: ChatMode = 'auto'): Conversation {
    const conversation: Conversation = {
      id: crypto.randomUUID(),
      title: 'New Chat',
      mode,
      messages: [],
      created_at: new Date(),
      updated_at: new Date()
    };

    this.conversations.unshift(conversation);
    this.activeConversationId = conversation.id;
    this.saveToStorage();
    
    return conversation;
  }

  getConversation(id: string): Conversation | null {
    const conv = this.conversations.find(conv => conv.id === id);
    // Return a deep copy of messages to ensure fresh references for React
    return conv ? { 
      ...conv,
      messages: [...conv.messages] // Create new array reference
    } : null;
  }

  getActiveConversation(): Conversation | null {
    if (!this.activeConversationId) {
      console.log('[ConversationStore] No active conversation ID set');
      return null;
    }
    
    const conv = this.getConversation(this.activeConversationId);
    
    if (conv) {
      console.log('[ConversationStore] Retrieved active conversation:', {
        id: conv.id,
        title: conv.title,
        messageCount: conv.messages.length,
        mode: conv.mode
      });
    } else {
      console.warn('[ConversationStore] Active conversation not found:', this.activeConversationId);
    }
    
    return conv;
  }

  setActiveConversation(id: string): boolean {
    const conversation = this.getConversation(id);
    if (conversation) {
      this.activeConversationId = id;
      this.saveToStorage();
      return true;
    }
    return false;
  }

  getAllConversations(): Conversation[] {
    // Return copies with fresh message array references so React detects changes
    return this.conversations
      .map(conv => ({ 
        ...conv,
        messages: [...conv.messages] // New array reference for React updates
      }))
      .sort((a, b) => b.updated_at.getTime() - a.updated_at.getTime());
  }

  addMessage(conversationId: string, message: ChatMessage): boolean {
    // Find the actual conversation object in the array (not a copy)
    const conversation = this.conversations.find(conv => conv.id === conversationId);
    if (!conversation) {
      console.error('[ConversationStore] Cannot add message - conversation not found:', conversationId);
      return false;
    }

    conversation.messages.push(message);
    conversation.updated_at = new Date();
    
    // Auto-generate title from first user message
    if (conversation.messages.length === 1 && message.role === 'user') {
      conversation.title = message.content.slice(0, 50) + (message.content.length > 50 ? '...' : '');
    }

    console.log('[ConversationStore] Message added:', {
      conversationId,
      messageRole: message.role,
      totalMessages: conversation.messages.length,
      contentPreview: message.content.substring(0, 50),
      hasCitations: !!message.citations
    });

    this.saveToStorage();
    return true;
  }

  updateConversationMode(conversationId: string, mode: ChatMode): boolean {
    // Find the actual conversation object in the array (not a copy)
    const conversation = this.conversations.find(conv => conv.id === conversationId);
    if (!conversation) return false;

    conversation.mode = mode;
    conversation.updated_at = new Date();
    this.saveToStorage();
    return true;
  }

  renameConversation(conversationId: string, title: string): boolean {
    // Find the actual conversation object in the array (not a copy)
    const conversation = this.conversations.find(conv => conv.id === conversationId);
    if (!conversation) return false;

    conversation.title = title;
    conversation.updated_at = new Date();
    this.saveToStorage();
    return true;
  }

  deleteConversation(conversationId: string): boolean {
    const index = this.conversations.findIndex(conv => conv.id === conversationId);
    if (index === -1) return false;

    this.conversations.splice(index, 1);
    
    if (this.activeConversationId === conversationId) {
      this.activeConversationId = this.conversations.length > 0 ? this.conversations[0].id : null;
    }
    
    this.saveToStorage();
    return true;
  }

  clearAll() {
    this.conversations = [];
    this.activeConversationId = null;
    this.saveToStorage();
  }
}

// Global conversation store instance
export const conversationStore = new ConversationStore();