import { useState, useEffect } from "react";
import { generateFlashcards } from "@/lib/generators";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { CSVImporter } from "@/components/Flashcards/CSVImporter";
import { StarRatingFeedback } from "@/components/Feedback/StarRatingFeedback";
import { useFeedback } from "@/hooks/useFeedback";
import { toast } from "@/hooks/use-toast";
import { 
  Plus, 
  Download, 
  Upload,
  Edit,
  Trash2,
  RotateCcw,
  Eye,
  EyeOff,
  FileText,
  Filter,
  CheckCircle,
  MessageCircle
} from "lucide-react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";

import { type FlashcardSet, type Flashcard } from '@/types/flashcards';

interface FlashcardDeck {
  id: string;
  name: string;
  cards: Flashcard[];
  createdAt: Date;
}

export default function FlashcardsPage() {
  const [decks, setDecks] = useState<FlashcardDeck[]>([]);
  const [flashcardSets, setFlashcardSets] = useState<FlashcardSet[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [filterTag, setFilterTag] = useState<string>("all");
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [feedbackContext, setFeedbackContext] = useState<string>("");
  const [cardFeedbackOpen, setCardFeedbackOpen] = useState<string | null>(null);
  const { submitFeedback, isSubmitting } = useFeedback();
  
  // Initialize with seed data if no sets exist
  useEffect(() => {
    if (!isInitialized) {
      const seedDecks: FlashcardDeck[] = [
        {
          id: "seed-cs1301",
          name: "CS1301: Python Basics",
          createdAt: new Date("2024-01-15"),
          cards: [
            {
              id: "cs1301-1",
              front: "What is a variable in Python?",
              back: "A variable is a name that refers to a value. It's like a container that stores data values.",
              tags: ["cs1301", "variables", "basics"],
              createdAt: new Date("2024-01-15"),
              difficulty: 1,
              deck_id: "seed-cs1301"
            },
            {
              id: "cs1301-2",
              front: "What are the basic data types in Python?",
              back: "int (integers), float (decimal numbers), str (strings), bool (True/False), list, dict, tuple",
              tags: ["cs1301", "types", "basics"],
              createdAt: new Date("2024-01-15"),
              difficulty: 2,
              deck_id: "seed-cs1301"
            },
            {
              id: "cs1301-3",
              front: "How do you create a function in Python?",
              back: "Use the 'def' keyword: def function_name(parameters): followed by indented code block",
              tags: ["cs1301", "functions", "syntax"],
              createdAt: new Date("2024-01-15"),
              difficulty: 2,
              deck_id: "seed-cs1301"
            },
            {
              id: "cs1301-4",
              front: "What is a for loop used for?",
              back: "For loops iterate over sequences (lists, strings, ranges) to repeat code for each element",
              tags: ["cs1301", "loops", "iteration"],
              createdAt: new Date("2024-01-15"),
              difficulty: 2,
              deck_id: "seed-cs1301"
            }
          ]
        },
        {
          id: "seed-cs1332",
          name: "CS1332: Data Structures",
          createdAt: new Date("2024-01-12"),
          cards: [
            {
              id: "cs1332-1",
              front: "What is the time complexity of array access by index?",
              back: "O(1) - constant time, because arrays provide direct memory access to elements via index calculation",
              tags: ["cs1332", "arrays", "complexity"],
              createdAt: new Date("2024-01-12"),
              difficulty: 2,
              deck_id: "seed-cs1332"
            },
            {
              id: "cs1332-2",
              front: "What is a stack and what operations does it support?",
              back: "A stack is a LIFO (Last In, First Out) data structure. Main operations: push (add), pop (remove), peek/top (view top), isEmpty",
              tags: ["cs1332", "stacks", "data-structures"],
              createdAt: new Date("2024-01-12"),
              difficulty: 2,
              deck_id: "seed-cs1332"
            },
            {
              id: "cs1332-3",
              front: "What is a queue and how does it differ from a stack?",
              back: "A queue is FIFO (First In, First Out). Operations: enqueue (add rear), dequeue (remove front), peek (view front), isEmpty",
              tags: ["cs1332", "queues", "data-structures"],
              createdAt: new Date("2024-01-12"),
              difficulty: 2,
              deck_id: "seed-cs1332"
            },
            {
              id: "cs1332-4",
              front: "What is a binary tree?",
              back: "A hierarchical data structure where each node has at most two children (left and right). Root is the top node.",
              tags: ["cs1332", "trees", "hierarchical"],
              createdAt: new Date("2024-01-12"),
              difficulty: 3,
              deck_id: "seed-cs1332"
            },
            {
              id: "cs1332-5",
              front: "What is a hash map and what's its average time complexity?",
              back: "A hash map stores key-value pairs using a hash function. Average O(1) for insert, delete, and lookup operations.",
              tags: ["cs1332", "hash-maps", "complexity"],
              createdAt: new Date("2024-01-12"),
              difficulty: 3,
              deck_id: "seed-cs1332"
            }
          ]
        },
        {
          id: "seed-algorithms",
          name: "Algorithms: Complexity",
          createdAt: new Date("2024-01-10"),
          cards: [
            {
              id: "algo-1",
              front: "What does Big-O notation describe?",
              back: "Big-O describes the upper bound of algorithm complexity - the worst-case time or space requirements as input size grows",
              tags: ["algorithms", "complexity", "big-o"],
              createdAt: new Date("2024-01-10"),
              difficulty: 2,
              deck_id: "seed-algorithms"
            },
            {
              id: "algo-2",
              front: "What is the time complexity of bubble sort?",
              back: "O(n²) in worst and average case, O(n) in best case (already sorted). Space complexity: O(1)",
              tags: ["algorithms", "sorting", "bubble-sort"],
              createdAt: new Date("2024-01-10"),
              difficulty: 2,
              deck_id: "seed-algorithms"
            },
            {
              id: "algo-3",
              front: "What is the time complexity of merge sort?",
              back: "O(n log n) in all cases (best, average, worst). Space complexity: O(n) due to temporary arrays",
              tags: ["algorithms", "sorting", "merge-sort"],
              createdAt: new Date("2024-01-10"),
              difficulty: 3,
              deck_id: "seed-algorithms"
            },
            {
              id: "algo-4",
              front: "What is a recurrence relation?",
              back: "An equation that defines a sequence based on previous terms. Used to analyze recursive algorithm complexity.",
              tags: ["algorithms", "recursion", "analysis"],
              createdAt: new Date("2024-01-10"),
              difficulty: 3,
              deck_id: "seed-algorithms"
            }
          ]
        }
      ];
      
      setDecks(seedDecks);
      
      // Create flashcard sets from decks
      const sets: FlashcardSet[] = seedDecks.map(deck => ({
        id: deck.id,
        title: deck.name,
        created_at: deck.createdAt,
        tags: Array.from(new Set(deck.cards.flatMap(card => card.tags))),
        count: deck.cards.length,
        source: 'seed'
      }));
      
      setFlashcardSets(sets);
      setIsInitialized(true);
    }
  }, [isInitialized]);

  const [selectedDeck, setSelectedDeck] = useState<FlashcardDeck | null>(null);
  const [studyMode, setStudyMode] = useState(false);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [newSetName, setNewSetName] = useState("");
  const [editingCard, setEditingCard] = useState<Flashcard | null>(null);
  const [newCardFront, setNewCardFront] = useState("");
  const [newCardBack, setNewCardBack] = useState("");

  // Get all unique tags
  const allTags = Array.from(new Set(
    decks.flatMap(deck => deck.cards.flatMap(card => card.tags))
  ));

  // Filter cards by tag if selected
  const filteredDecks = filterTag && filterTag !== "all" ? 
    decks.map(deck => ({
      ...deck,
      cards: deck.cards.filter(card => card.tags.includes(filterTag))
    })).filter(deck => deck.cards.length > 0) : 
    decks;

  const handleCreateSet = () => {
    if (!newSetName.trim()) return;

    const newDeck: FlashcardDeck = {
      id: `deck-${Date.now()}`,
      name: newSetName,
      cards: [],
      createdAt: new Date()
    };

    setDecks(prev => [newDeck, ...prev]);
    
    // Add to flashcard sets
    const newFlashcardSet: FlashcardSet = {
      id: newDeck.id,
      title: newDeck.name,
      created_at: newDeck.createdAt,
      tags: [],
      count: 0
    };
    
    setFlashcardSets(prev => [newFlashcardSet, ...prev]);
    setNewSetName("");
    setSelectedDeck(newDeck);
  };

  const handleAddCard = () => {
    if (!newCardFront.trim() || !newCardBack.trim() || !selectedDeck) return;

    const newCard: Flashcard = {
      id: `card-${Date.now()}`,
      front: newCardFront,
      back: newCardBack,
      tags: [],
      createdAt: new Date(),
      difficulty: 2,
      deck_id: selectedDeck.id
    };

    setDecks(prev => prev.map(deck => 
      deck.id === selectedDeck.id 
        ? { ...deck, cards: [...deck.cards, newCard] }
        : deck
    ));

    setSelectedDeck(prev => prev ? { ...prev, cards: [...prev.cards, newCard] } : null);
    setNewCardFront("");
    setNewCardBack("");
  };

  const handleDeleteCard = (cardId: string) => {
    if (!selectedDeck) return;

    setDecks(prev => prev.map(deck => 
      deck.id === selectedDeck.id 
        ? { ...deck, cards: deck.cards.filter(card => card.id !== cardId) }
        : deck
    ));

    setSelectedDeck(prev => prev ? {
      ...prev, 
      cards: prev.cards.filter(card => card.id !== cardId)
    } : null);
  };

  const handleCSVImport = (csvCards: any[], deckTitle: string = `Imported ${new Date().toLocaleDateString()}`) => {
    // Create new deck for import
    const newDeck: FlashcardDeck = {
      id: `deck-${Date.now()}`,
      name: deckTitle,
      cards: [],
      createdAt: new Date()
    };

    const newCards: Flashcard[] = csvCards.map(csvCard => ({
      id: `imported-${Date.now()}-${Math.random()}`,
      front: csvCard.front,
      back: csvCard.back,
      tags: csvCard.tags ? csvCard.tags.split(';').map((t: string) => t.trim()) : [],
      createdAt: new Date(),
      difficulty: 2,
      source: csvCard.source,
      deck_id: newDeck.id
    }));

    newDeck.cards = newCards;
    
    setDecks(prev => [newDeck, ...prev]);
    
    // Add to flashcard sets and auto-select
    const newFlashcardSet: FlashcardSet = {
      id: newDeck.id,
      title: newDeck.name,
      created_at: newDeck.createdAt,
      tags: Array.from(new Set(newCards.flatMap(card => card.tags))),
      count: newCards.length
    };
    
    setFlashcardSets(prev => [newFlashcardSet, ...prev]);
    setSelectedDeck(newDeck);
    
    // Show feedback form after import
    setFeedbackContext(`CSV Import: ${deckTitle} (${newCards.length} cards)`);
    setShowFeedback(true);
    setFeedbackSubmitted(false);
    
    // Trigger refresh of sets list to ensure it appears
    setTimeout(() => {
      setFlashcardSets(current => [...current]);
    }, 100);
  };

  const handleDeckCreated = (deckInfo: any) => {
    // Force refresh of flashcard sets list
    setTimeout(() => {
      setFlashcardSets(prev => [...prev]);
    }, 100);
  };

  const handleFeedbackSubmit = async (feedbackData: { rating: number; additional_feedback: string | null }) => {
    const success = await submitFeedback(feedbackData);
    if (success) {
      setFeedbackSubmitted(true);
      setShowFeedback(false);
    }
  };

  const handleCardFeedbackSubmit = async (feedbackData: { rating: number; additional_feedback: string | null }, cardId: string) => {
    const success = await submitFeedback(feedbackData);
    if (success) {
      setCardFeedbackOpen(null);
      toast({
        title: "Thanks for your feedback! 🎉",
        description: "Your input helps us improve individual flashcards.",
      });
    }
  };

  const startStudySession = () => {
    if (!selectedDeck || selectedDeck.cards.length === 0) return;
    setStudyMode(true);
    setCurrentCardIndex(0);
    setShowAnswer(false);
  };

  const nextCard = () => {
    if (!selectedDeck) return;
    
    if (currentCardIndex < selectedDeck.cards.length - 1) {
      setCurrentCardIndex(prev => prev + 1);
      setShowAnswer(false);
    } else {
      setStudyMode(false);
      setCurrentCardIndex(0);
    }
  };

  const prevCard = () => {
    if (currentCardIndex > 0) {
      setCurrentCardIndex(prev => prev - 1);
      setShowAnswer(false);
    }
  };

  const getDifficultyColor = (difficulty: number) => {
    const colors = {
      1: "text-green-500",
      2: "text-blue-500", 
      3: "text-yellow-500",
      4: "text-orange-500",
      5: "text-red-500"
    };
    return colors[difficulty as keyof typeof colors] || "text-gray-500";
  };

  const getDifficultyLabel = (difficulty: number) => {
    const labels = {
      1: "Very Easy",
      2: "Easy",
      3: "Medium", 
      4: "Hard",
      5: "Very Hard"
    };
    return labels[difficulty as keyof typeof labels] || "Unknown";
  };

  if (studyMode && selectedDeck) {
    const currentCard = selectedDeck.cards[currentCardIndex];
    
    return (
      <div className="min-h-screen bg-gradient-academic">
        <Navbar />
        
        <div className="container mx-auto px-6 py-8">
          <div className="max-w-2xl mx-auto">
            {/* Study Header */}
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold mb-2">{selectedDeck.name}</h1>
              <p className="text-muted-foreground">
                Card {currentCardIndex + 1} of {selectedDeck.cards.length}
              </p>
            </div>

            {/* Flashcard */}
            <Card className="p-8 min-h-[300px] flex flex-col justify-center text-center">
              <div className="space-y-6">
                <Badge variant="outline" className={getDifficultyColor(currentCard.difficulty)}>
                  {getDifficultyLabel(currentCard.difficulty)}
                </Badge>
                
                <div className="space-y-4">
                  <h2 className="text-xl font-medium">{currentCard.front}</h2>
                  
                  {showAnswer && (
                    <div className="border-t pt-4">
                      <p className="text-muted-foreground">{currentCard.back}</p>
                      {currentCard.source && (
                        <p className="text-xs text-muted-foreground mt-2">
                          Source: {currentCard.source}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex justify-center gap-4">
                  {!showAnswer ? (
                    <Button onClick={() => setShowAnswer(true)} variant="gt-gold">
                      <Eye className="mr-2 h-4 w-4" />
                      Reveal Answer
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={prevCard} disabled={currentCardIndex === 0}>
                        Previous
                      </Button>
                      <Button onClick={nextCard} variant="gt-gold">
                        {currentCardIndex === selectedDeck.cards.length - 1 ? "Finish" : "Next"}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </Card>

            {/* Study Controls */}
            <div className="flex justify-center mt-6">
              <Button variant="outline" onClick={() => setStudyMode(false)}>
                Exit Study Mode
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-academic">
      <Navbar />
      
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2 text-gt-gold">Flashcards</h1>
            <p className="text-muted-foreground">
              Create and study flashcards from your notes
            </p>
          </div>
          
          <div className="flex gap-2">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="gt-gold">
                  <Plus className="mr-2 h-4 w-4" />
                  New Set
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Flashcard Set</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <Input
                    placeholder="Set name..."
                    value={newSetName}
                    onChange={(e) => setNewSetName(e.target.value)}
                  />
                  <Button onClick={handleCreateSet} className="w-full">
                    Create Set
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            
            <CSVImporter onImport={handleCSVImport} onDeckCreated={handleDeckCreated} />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Sets List */}
          <div className="lg:col-span-1">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Flashcard Sets</h3>
                <Select value={filterTag} onValueChange={setFilterTag}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Filter" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Tags</SelectItem>
                    {allTags.map(tag => (
                      <SelectItem key={tag} value={tag}>
                        {tag}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                {filteredDecks.map((deck) => (
                  <div
                    key={deck.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedDeck?.id === deck.id
                        ? "bg-primary text-primary-foreground" 
                        : "hover:bg-accent"
                    }`}
                    onClick={() => setSelectedDeck(deck)}
                  >
                    <h4 className="font-medium">{deck.name}</h4>
                    <p className="text-sm opacity-80">
                      {deck.cards.length} cards
                    </p>
                  </div>
                ))}
                
                {filteredDecks.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">
                      {filterTag !== "all" ? "No cards with selected tag" : "No sets yet"}
                    </p>
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Set Content */}
          <div className="lg:col-span-2">
            {selectedDeck ? (
              <div className="space-y-6">
                {/* Set Header */}
                <Card className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-xl font-bold">{selectedDeck.name}</h2>
                      <p className="text-muted-foreground">
                        {selectedDeck.cards.length} cards • Created {selectedDeck.createdAt.toLocaleDateString()}
                      </p>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button onClick={startStudySession} disabled={selectedDeck.cards.length === 0}>
                        <RotateCcw className="mr-2 h-4 w-4" />
                        Study
                      </Button>
                      <Button variant="outline">
                        <Download className="mr-2 h-4 w-4" />
                        Export CSV
                      </Button>
                    </div>
                  </div>
                </Card>

                {/* Add Card */}
                <Card className="p-6">
                  <h3 className="font-semibold mb-4">Add New Card</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Front</label>
                      <Input
                        placeholder="Question or prompt..."
                        value={newCardFront}
                        onChange={(e) => setNewCardFront(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Back</label>
                      <Textarea
                        placeholder="Answer or explanation..."
                        value={newCardBack}
                        onChange={(e) => setNewCardBack(e.target.value)}
                        rows={3}
                      />
                    </div>
                    <Button onClick={handleAddCard} disabled={!newCardFront.trim() || !newCardBack.trim()}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Card
                    </Button>
                  </div>
                </Card>

                {/* Cards Table */}
                <Card className="p-6">
                  <h3 className="font-semibold mb-4">Cards</h3>
                  
                  {selectedDeck.cards.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Front</TableHead>
                          <TableHead>Back</TableHead>
                          <TableHead>Difficulty</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedDeck.cards.map((card) => (
                          <TableRow key={card.id}>
                            <TableCell className="font-medium max-w-xs">
                              <div className="truncate">{card.front}</div>
                            </TableCell>
                            <TableCell className="max-w-xs">
                              <div className="truncate text-muted-foreground">{card.back}</div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={getDifficultyColor(card.difficulty)}>
                                {getDifficultyLabel(card.difficulty)}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button variant="ghost" size="sm">
                                  <Edit className="h-3 w-3" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => setCardFeedbackOpen(card.id)}
                                  className="text-blue-600 hover:text-blue-700"
                                >
                                  <MessageCircle className="h-3 w-3" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => handleDeleteCard(card.id)}
                                  className="text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No cards in this set</p>
                      <p className="text-xs mt-1">Add your first card above</p>
                    </div>
                  )}
                </Card>
              </div>
            ) : (
              <Card className="p-12 text-center">
                <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-xl font-medium mb-2">Select a Flashcard Set</h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Choose a set from the sidebar to view and edit cards, or create a new set to get started.
                </p>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Feedback Section */}
      {showFeedback && !feedbackSubmitted && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-md w-full">
            <StarRatingFeedback
              title="How was your flashcard experience?"
              description="Help us improve by rating your experience with flashcard generation or import."
              onSubmit={handleFeedbackSubmit}
              isSubmitting={isSubmitting}
              textPlaceholder="What did you think about the flashcard quality, format, or import process?"
              submitButtonText="Submit feedback"
            />
          </Card>
        </div>
      )}

      {feedbackSubmitted && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-md w-full p-6">
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-5 w-5" />
              <span className="font-medium">Thanks for your feedback!</span>
            </div>
            <Button 
              onClick={() => setFeedbackSubmitted(false)} 
              variant="outline" 
              className="w-full mt-4"
            >
              Close
            </Button>
          </Card>
        </div>
      )}

      {/* Individual Card Feedback Dialog */}
      {cardFeedbackOpen && selectedDeck && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-md w-full">
            <StarRatingFeedback
              title="How was this flashcard?"
              description="Help us improve by rating this specific flashcard."
              onSubmit={(feedbackData) => handleCardFeedbackSubmit(feedbackData, cardFeedbackOpen)}
              isSubmitting={isSubmitting}
              textPlaceholder="What did you think about the question, answer, or difficulty level?"
              submitButtonText="Submit feedback"
            />
            <div className="p-4 border-t">
              <Button 
                variant="outline" 
                onClick={() => setCardFeedbackOpen(null)}
                className="w-full"
              >
                Maybe later
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}