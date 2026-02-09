import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  History, 
  Clock, 
  BarChart3, 
  Play, 
  Trash2,
  FileText,
  Calendar
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface QuizHistoryItem {
  id: string;
  title: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  questionCount: number;
  estimatedMinutes: number;
  createdAt: Date;
  score?: number;
  completed: boolean;
  questions: any[];
}

interface QuizHistoryPanelProps {
  onLoadQuiz: (quiz: QuizHistoryItem) => void;
  onDeleteQuiz: (quizId: string) => void;
}

export function QuizHistoryPanel({ onLoadQuiz, onDeleteQuiz }: QuizHistoryPanelProps) {
  const [quizHistory, setQuizHistory] = useState<QuizHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadQuizHistory();
  }, []);

  const loadQuizHistory = () => {
    try {
      const stored = localStorage.getItem('quiz-history');
      if (stored) {
        const history = JSON.parse(stored).map((item: any) => ({
          ...item,
          createdAt: new Date(item.createdAt)
        }));
        setQuizHistory(history.sort((a: QuizHistoryItem, b: QuizHistoryItem) => 
          b.createdAt.getTime() - a.createdAt.getTime()
        ));
      }
    } catch (error) {
      console.error('Error loading quiz history:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteQuiz = (quizId: string) => {
    try {
      const updatedHistory = quizHistory.filter(quiz => quiz.id !== quizId);
      setQuizHistory(updatedHistory);
      localStorage.setItem('quiz-history', JSON.stringify(updatedHistory));
      onDeleteQuiz(quizId);
    } catch (error) {
      console.error('Error deleting quiz:', error);
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Easy': return 'bg-green-100 text-green-800 border-green-200';
      case 'Medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Hard': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <History className="h-5 w-5" />
          <h3 className="text-lg font-semibold">Quiz History</h3>
        </div>
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-sm text-muted-foreground mt-2">Loading history...</p>
        </div>
      </Card>
    );
  }

  if (quizHistory.length === 0) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <History className="h-5 w-5" />
          <h3 className="text-lg font-semibold">Quiz History</h3>
        </div>
        <div className="text-center py-8">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No quizzes generated yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            Generate your first quiz to see it here
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <History className="h-5 w-5" />
        <h3 className="text-lg font-semibold">Quiz History</h3>
        <Badge variant="secondary" className="ml-auto">
          {quizHistory.length} quiz{quizHistory.length !== 1 ? 'es' : ''}
        </Badge>
      </div>

      <ScrollArea className="h-[400px] pr-4">
        <div className="space-y-3">
          {quizHistory.map((quiz) => (
            <Card key={quiz.id} className="p-4 hover:bg-muted/50 transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h4 className="font-medium text-sm mb-1 line-clamp-2">
                    {quiz.title}
                  </h4>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                    <Calendar className="h-3 w-3" />
                    {formatDistanceToNow(quiz.createdAt, { addSuffix: true })}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteQuiz(quiz.id)}
                  className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>

              <div className="flex items-center gap-2 mb-3">
                <Badge 
                  variant="outline" 
                  className={`text-xs ${getDifficultyColor(quiz.difficulty)}`}
                >
                  {quiz.difficulty}
                </Badge>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <FileText className="h-3 w-3" />
                  {quiz.questionCount} questions
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  ~{quiz.estimatedMinutes} min
                </div>
              </div>

              {quiz.completed && quiz.score !== undefined && (
                <div className="flex items-center gap-2 mb-3">
                  <BarChart3 className="h-3 w-3 text-primary" />
                  <span className="text-xs font-medium">
                    Score: {quiz.score}%
                  </span>
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => onLoadQuiz(quiz)}
                  className="flex-1"
                >
                  <Play className="h-3 w-3 mr-1" />
                  {quiz.completed ? 'Review' : 'Continue'}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </ScrollArea>
    </Card>
  );
}
