export interface FlashcardSet {
  id: string;
  title: string;
  created_at: Date;
  tags: string[];
  count: number;
  source?: string;
}

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  tags: string[];
  createdAt: Date;
  lastReviewed?: Date;
  difficulty: 1 | 2 | 3 | 4 | 5;
  source?: string;
  deck_id: string;
}