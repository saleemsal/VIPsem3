import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { retrieve } from '@/lib/sources';
import { toast } from '@/hooks/use-toast';
import { LocalAuthClient } from '@/lib/local-auth-client';
import { API_BASE } from '@/lib/runtime';
import { useFeedback } from '@/hooks/useFeedback';
import { StarRatingFeedback } from '@/components/Feedback/StarRatingFeedback';
import { QuizHistoryPanel } from './QuizHistoryPanel';
import { 
  Brain, 
  Play, 
  CheckCircle, 
  XCircle, 
  FileText,
  Download,
  Clock,
  BarChart3,
  History
} from 'lucide-react';
import { useSources } from '@/hooks/useSources';

interface Question {
  id: string;
  type: 'multiple_choice' | 'short_answer' | 'free_response';
  stem: string;
  options?: string[];
  correct_index?: number;
  points: number;
  explanation: string;
  citation: { file: string; page: number };
}

interface PracticeSet {
  title: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  estimated_minutes: number;
  questions: Question[];
}

interface PracticeGeneratorProps {
  // Remove availableSources prop - get from registry
}

export function PracticeGenerator({}: PracticeGeneratorProps) {
  // Use reactive sources from registry
  const { sources, uploadFiles } = useSources();
  const readySources = sources.filter(s => s.status === 'ready');
  const availableSources = readySources.map(source => source.name);
  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const [difficulty, setDifficulty] = useState([3]);
  const [questionCount, setQuestionCount] = useState([10]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [practiceSet, setPracticeSet] = useState<PracticeSet | null>(null);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [showResults, setShowResults] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const { submitFeedback, isSubmitting } = useFeedback();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Quiz history functionality
  const saveQuizToHistory = (quiz: PracticeSet) => {
    try {
      const quizHistoryItem = {
        id: `quiz-${Date.now()}`,
        title: quiz.title,
        difficulty: quiz.difficulty,
        questionCount: quiz.questions.length,
        estimatedMinutes: quiz.estimated_minutes,
        createdAt: new Date(),
        completed: false,
        questions: quiz.questions
      };

      const existingHistory = JSON.parse(localStorage.getItem('quiz-history') || '[]');
      const updatedHistory = [quizHistoryItem, ...existingHistory];
      localStorage.setItem('quiz-history', JSON.stringify(updatedHistory));
    } catch (error) {
      console.error('Error saving quiz to history:', error);
    }
  };

  const loadQuizFromHistory = (quiz: any) => {
    setPracticeSet({
      title: quiz.title,
      difficulty: quiz.difficulty,
      estimated_minutes: quiz.estimatedMinutes,
      questions: quiz.questions
    });
    setSelectedAnswers({});
    setShowResults(false);
    setShowFeedback(false);
    setFeedbackSubmitted(false);
    
    toast({
      title: "Quiz loaded",
      description: `Loaded "${quiz.title}" from history.`
    });
  };

  const deleteQuizFromHistory = (quizId: string) => {
    try {
      const existingHistory = JSON.parse(localStorage.getItem('quiz-history') || '[]');
      const updatedHistory = existingHistory.filter((quiz: any) => quiz.id !== quizId);
      localStorage.setItem('quiz-history', JSON.stringify(updatedHistory));
      
      toast({
        title: "Quiz deleted",
        description: "Quiz removed from history."
      });
    } catch (error) {
      console.error('Error deleting quiz from history:', error);
    }
  };

  // Check auth status
  useEffect(() => {
    const checkAuth = async () => {
      const user = await LocalAuthClient.getCurrentUser();
      setCurrentUser(user);
    };
    checkAuth();
  }, []);

  const getDifficultyLabel = (level: number) => {
    const labels = ["Very Easy", "Easy", "Medium", "Hard", "Very Hard"];
    return labels[level - 1] || "Medium";
  };

  const handleSourceToggle = (source: string) => {
    setSelectedSources(prev => 
      prev.includes(source) 
        ? prev.filter(s => s !== source)
        : [...prev, source]
    );
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleUploadChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (!files.length) return;
    await uploadFiles(files);
    e.target.value = '';
    toast({
      title: "Files added",
      description: "Your files are being processed and indexed.",
    });
  };

  const handleGenerate = async () => {
    // Check authentication first
    if (!currentUser) {
      toast({
        title: "Authentication required",
        description: "Please sign in to generate practice questions.",
        variant: "destructive"
      });
      return;
    }

    // Check if user has sources available
    if (readySources.length === 0) {
      toast({
        title: "No sources available",
        description: "Upload sources to generate practice questions.",
        variant: "destructive"
      });
      return;
    }

    if (selectedSources.length === 0) {
      toast({
        title: "No sources selected",
        description: "Please select at least one source to generate practice questions.",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);
    
    try {
      // Get relevant context from selected sources
      const query = selectedSources.join(' ');
      const hits = retrieve(query, 12, 0.15);
      
      if (hits.length === 0) {
        toast({
          title: "No relevant pages found",
          description: "No relevant pages found. Try different keywords or include more sources.",
          variant: "destructive"
        });
        setIsGenerating(false);
        return;
      }

      // Build context for AI
      const context = hits.map(h => {
        const snippet = h.text.length > 800 ? h.text.substring(0, 800) + '...' : h.text;
        return `[[source: ${h.source} | page: ${h.page}]]\n${snippet}\n`;
      }).join('\n');

      // Generate practice set via AI Makerspace
      const systemPrompt = `You are GT Study Buddy. Create a balanced practice set grounded ONLY in the provided context. Output valid JSON matching this schema:

{
  "title": "string",
  "difficulty": "Easy" | "Medium" | "Hard", 
  "estimated_minutes": number,
  "questions": [
    {
      "id": "string",
      "type": "multiple_choice" | "short_answer" | "free_response",
      "stem": "string (clean sentence, no truncated text)",
      "options": ["string", "string", "string", "string"] (for multiple_choice only),
      "correct_index": number (0-3, for multiple_choice only),
      "points": number,
      "explanation": "string",
      "citation": {"file": "string", "page": number}
    }
  ]
}

Use clear stems (no 'complete the sentence' unless context truly suits it). Include exactly one correct option per MCQ, 3 plausible distractors, an explanation, and the exact citation (file + page). Avoid truncated stems. No external knowledge unless labeled 'General'.`;

      // Use local Ollama API
      const response = await fetch(`${API_BASE}/api/generate-practice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          context,
          questionCount: questionCount[0],
          difficulty: getDifficultyLabel(difficulty[0]),
          systemPrompt
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Local API error:', errorData);
        throw new Error(errorData.error || 'Failed to generate practice set');
      }

      const data = await response.json();
      
      // Show fallback notice if used
      if (data.fallbackModel) {
        toast({
          title: "Using fallback model",
          description: `Generated using ${data.fallbackModel} due to rate limits.`
        });
      }
      
      // Validate and parse response
      let practiceData: PracticeSet;
      try {
        practiceData = typeof data.practiceSet === 'string' 
          ? JSON.parse(data.practiceSet) 
          : data.practiceSet;
      } catch (parseError) {
        throw new Error('Invalid practice set format received');
      }

      setPracticeSet(practiceData);
      setSelectedAnswers({});
      setShowResults(false);
      setShowFeedback(false);
      setFeedbackSubmitted(false);
      
      // Save to quiz history
      saveQuizToHistory(practiceData);
      
      toast({
        title: "Practice set generated",
        description: `Created ${practiceData.questions.length} questions from your sources.`
      });

    } catch (error: any) {
      console.error('Error generating practice:', error);
      
      // Show specific error message with better detail
      let errorMessage = "Failed to generate practice set from your sources. Please try again.";
      if (error.message?.includes('401') || error.message?.includes('Authentication')) {
        errorMessage = "Authentication failed. Please sign in and try again.";
      } else if (error.message?.includes('429') || error.message?.includes('rate limit')) {
        errorMessage = "Rate limit exceeded. Please wait a moment and try again.";
      } else if (error.message?.includes('OpenRouter API error')) {
        errorMessage = error.message; // Show the specific OpenRouter error
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Generation failed", 
        description: errorMessage,
        variant: "destructive"
      });
    }
    
    setIsGenerating(false);
  };

  const handleSubmit = () => {
    setShowResults(true);
    // Show feedback form after results are displayed
    setTimeout(() => {
      setShowFeedback(true);
    }, 1000);
  };

  const getQuestionResult = (question: Question) => {
    if (question.type !== 'multiple_choice' || !question.options) return null;
    const userAnswerIndex = question.options.indexOf(selectedAnswers[question.id]);
    return userAnswerIndex === question.correct_index;
  };

  const calculateScore = () => {
    if (!practiceSet) return 0;
    const mcqQuestions = practiceSet.questions.filter(q => q.type === 'multiple_choice');
    const correct = mcqQuestions.filter(q => getQuestionResult(q) === true).length;
    return Math.round((correct / mcqQuestions.length) * 100);
  };

  const handleFeedbackSubmit = async (feedbackData: { rating: number; additional_feedback: string | null }) => {
    const success = await submitFeedback(feedbackData);
    if (success) {
      setFeedbackSubmitted(true);
      setShowFeedback(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Tabs for Practice and History */}
      <Tabs defaultValue="practice" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="practice" className="flex items-center gap-2">
            <Brain className="h-4 w-4" />
            Practice Generator
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Quiz History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="practice" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Configuration Panel */}
            <div className="lg:col-span-1">
              <Card className="p-6 space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Brain className="h-5 w-5" />
                    Practice Settings
                  </h3>
                </div>

          {/* Source Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Select Sources</Label>
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                multiple
                onChange={handleUploadChange}
                className="hidden"
              />
              <Button variant="outline" size="sm" onClick={handleUploadClick}>
                Add Files
              </Button>
              <span className="text-xs text-muted-foreground">
                PDF / PNG / JPG
              </span>
            </div>
            <div className="space-y-2">
              {availableSources.map((source, index) => (
                <div key={`${source}-${index}`} className="flex items-center space-x-2 p-2 rounded-md hover:bg-gt-gold/10 transition-colors">
                  <Checkbox
                    id={`source-${index}`}
                    checked={selectedSources.includes(source)}
                    onCheckedChange={() => handleSourceToggle(source)}
                    className="data-[state=checked]:bg-gt-gold data-[state=checked]:border-gt-gold"
                  />
                  <Label 
                    htmlFor={`source-${index}`} 
                    className="text-sm font-normal cursor-pointer"
                  >
                    {source}
                  </Label>
                </div>
              ))}
            </div>
            
            {/* Info when no sources are available */}
            {readySources.length === 0 && (
              <div className="p-3 bg-gt-gold/10 border border-gt-gold/30 rounded-md text-sm">
                No sources available yet. Upload files above to get started.
              </div>
            )}
          </div>

          {/* Difficulty */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">
              Difficulty: <span className="text-gt-gold font-semibold">{getDifficultyLabel(difficulty[0])}</span>
            </Label>
            <Slider
              value={difficulty}
              onValueChange={setDifficulty}
              max={5}
              min={1}
              step={1}
              className="w-full [&_.slider-thumb]:bg-gt-gold [&_.slider-track]:bg-gt-gold/20"
            />
          </div>

          {/* Question Count */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">
              Questions: <span className="text-gt-gold font-semibold">{questionCount[0]}</span>
            </Label>
            <Slider
              value={questionCount}
              onValueChange={setQuestionCount}
              max={20}
              min={5}
              step={1}
              className="w-full [&_.slider-thumb]:bg-gt-gold [&_.slider-track]:bg-gt-gold/20"
            />
          </div>

          {/* Generate Button */}
          <Button 
            onClick={handleGenerate}
            disabled={isGenerating || (!currentUser) || (selectedSources.length === 0)}
            variant="gt-gold"
            className="w-full"
            size="lg"
          >
            {isGenerating ? (
              "Generating..."
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Generate Practice
              </>
            )}
          </Button>

          {!currentUser && (
            <p className="text-sm text-muted-foreground text-red-500">
              Please sign in to generate practice questions
            </p>
          )}
          {currentUser && selectedSources.length === 0 && readySources.length > 0 && (
            <p className="text-sm text-muted-foreground">
              Select at least one source to generate practice questions
            </p>
          )}
        </Card>
      </div>

      {/* Practice Content */}
      <div className="lg:col-span-2">
        {isGenerating ? (
          <Card className="p-8">
            <div className="text-center space-y-4">
              <Brain className="h-12 w-12 mx-auto animate-pulse text-primary" />
              <h3 className="text-lg font-medium">Generating Practice Questions</h3>
              <p className="text-muted-foreground">
                Analyzing your sources and creating questions that match existing formats...
              </p>
            </div>
          </Card>
        ) : practiceSet ? (
          <div className="space-y-6">
            {/* Practice Header */}
            <Card className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-xl font-bold">{practiceSet.title}</h2>
                  <p className="text-muted-foreground">
                    {practiceSet.questions.length} questions • 
                    {practiceSet.difficulty} difficulty
                  </p>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  ~{practiceSet.estimated_minutes} min
                </div>
              </div>

              {showResults && (
                <div className="bg-primary/10 p-4 rounded-lg mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <BarChart3 className="h-5 w-5" />
                    <span className="font-medium">Results</span>
                  </div>
                  <p className="text-lg font-bold">Score: {calculateScore()}%</p>
                </div>
              )}

              <div className="flex gap-2">
                {!showResults ? (
                  <Button onClick={handleSubmit} variant="gt-gold">
                    Submit Practice
                  </Button>
                ) : (
                  <Button onClick={handleGenerate} variant="outline">
                    Generate New Practice
                  </Button>
                )}
                <Button variant="outline">
                  <Download className="mr-2 h-4 w-4" />
                  Export PDF
                </Button>
              </div>
            </Card>

            {/* Feedback Section */}
            {showResults && showFeedback && !feedbackSubmitted && (
              <Card className="p-6 border-gt-gold/20 bg-gt-gold/5">
                <StarRatingFeedback
                  title="How was this practice quiz?"
                  description="Help us improve by rating your experience with this practice set."
                  onSubmit={handleFeedbackSubmit}
                  isSubmitting={isSubmitting}
                  textPlaceholder="What did you think about the difficulty, questions, or explanations?"
                  submitButtonText="Submit feedback"
                />
              </Card>
            )}

            {showResults && feedbackSubmitted && (
              <Card className="p-4 border-green-500/20 bg-green-500/5">
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="h-5 w-5" />
                  <span className="font-medium">Thanks for your feedback!</span>
                </div>
              </Card>
            )}

            {/* Questions */}
            <div className="space-y-6">
              {practiceSet.questions.map((question, index) => (
                <Card key={question.id} className="p-6">
                  <div className="space-y-4">
                    {/* Question Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant={question.type === "multiple_choice" ? "default" : "secondary"}>
                            {question.type === "multiple_choice" ? "Multiple Choice" : "Free Response"}
                          </Badge>
                          <Badge variant="outline">
                            {question.points} points
                          </Badge>
                          {showResults && question.type === "multiple_choice" && (
                            <Badge 
                              variant={getQuestionResult(question) ? "default" : "destructive"}
                            >
                              {getQuestionResult(question) ? (
                                <CheckCircle className="mr-1 h-3 w-3" />
                              ) : (
                                <XCircle className="mr-1 h-3 w-3" />
                              )}
                              {getQuestionResult(question) ? "Correct" : "Incorrect"}
                            </Badge>
                          )}
                        </div>
                        <h3 className="font-medium">
                          {index + 1}. {question.stem}
                        </h3>
                      </div>
                    </div>

                    {/* Question Content */}
                    {question.type === "multiple_choice" && question.options ? (
                      <RadioGroup
                        value={selectedAnswers[question.id] || ""}
                        onValueChange={(value) => 
                          setSelectedAnswers(prev => ({
                            ...prev,
                            [question.id]: value
                          }))
                        }
                        disabled={showResults}
                      >
                        {question.options.map((choice, choiceIndex) => (
                          <div 
                            key={choiceIndex} 
                            className={`flex items-center space-x-2 p-2 rounded ${
                              showResults && choiceIndex === question.correct_index
                                ? "bg-green-500/10 border border-green-500/30" 
                                : showResults && choice === selectedAnswers[question.id] && choiceIndex !== question.correct_index
                                ? "bg-red-500/10 border border-red-500/30"
                                : ""
                            }`}
                          >
                            <RadioGroupItem value={choice} id={`${question.id}-${choiceIndex}`} />
                            <Label htmlFor={`${question.id}-${choiceIndex}`} className="flex-1 cursor-pointer">
                              {choice}
                            </Label>
                            {showResults && choiceIndex === question.correct_index && (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            )}
                          </div>
                        ))}
                      </RadioGroup>
                    ) : (
                      <div className="bg-muted/50 p-4 rounded-lg">
                        <p className="text-sm text-muted-foreground mb-2">
                          Write your answer here:
                        </p>
                        <div className="h-32 border border-border rounded bg-background" />
                      </div>
                    )}

                    {/* Show explanation if results are shown */}
                    {showResults && (
                      <div className="bg-blue-500/10 p-3 rounded-lg">
                        <p className="text-sm font-medium mb-1">Explanation:</p>
                        <p className="text-sm">{question.explanation}</p>
                      </div>
                    )}

                    {/* Citation */}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <FileText className="h-3 w-3" />
                      Source: {question.citation.file}, Page {question.citation.page}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        ) : (
          <Card className="p-12 text-center">
            <Brain className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-medium mb-2">Ready to Practice</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              Configure your practice settings on the left and click "Generate Practice" 
              to create questions that mirror your course materials.
            </p>
          </Card>
        )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <QuizHistoryPanel 
              onLoadQuiz={loadQuizFromHistory}
              onDeleteQuiz={deleteQuizFromHistory}
            />
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="h-5 w-5" />
                <h3 className="text-lg font-semibold">About Quiz History</h3>
              </div>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>
                  Your generated quizzes are automatically saved here for easy access.
                </p>
                <ul className="space-y-2 ml-4">
                  <li>• Click "Continue" to resume an incomplete quiz</li>
                  <li>• Click "Review" to retake a completed quiz</li>
                  <li>• Delete quizzes you no longer need</li>
                  <li>• History is stored locally in your browser</li>
                </ul>
              </div>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}