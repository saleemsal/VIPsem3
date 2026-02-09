import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Brain, 
  Zap, 
  Clock, 
  Target, 
  TrendingUp,
  CheckCircle,
  AlertCircle,
  Loader2
} from 'lucide-react';

interface ModelResponse {
  model: string;
  response: string;
  reasoning: string;
  confidence: number;
  latency: number;
  accuracy?: number;
  error?: boolean;
}

interface ChainReasoningResult {
  prompt: string;
  context?: string;
  models: ModelResponse[];
  bestModel: string;
  totalLatency: number;
  averageAccuracy: number;
}

export function ChainReasoningInterface() {
  const [prompt, setPrompt] = useState('');
  const [context, setContext] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ChainReasoningResult | null>(null);
  const [selectedModels, setSelectedModels] = useState(['phi3', 'gemma2', 'ollama1']);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setIsLoading(true);
    try {
      const response = await fetch('http://localhost:8787/api/chain-reasoning', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          context: context.trim() || undefined,
          models: selectedModels,
          compareAccuracy: true
        })
      });

      if (!response.ok) {
        throw new Error('Chain reasoning failed');
      }

      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error('Chain reasoning error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getAccuracyColor = (accuracy: number) => {
    if (accuracy >= 0.8) return 'text-green-600';
    if (accuracy >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'bg-green-100 text-green-800';
    if (confidence >= 0.6) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold flex items-center justify-center gap-2">
          <Brain className="h-8 w-8 text-gt-gold" />
          Chain-of-Thought Reasoning
        </h1>
        <p className="text-muted-foreground">
          Compare reasoning across multiple fast and accurate models
        </p>
      </div>

      {/* Input Form */}
      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Question or Problem</label>
            <Textarea
              placeholder="Ask a question that requires step-by-step reasoning..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="min-h-[100px]"
              disabled={isLoading}
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Context (Optional)</label>
            <Textarea
              placeholder="Provide additional context or background information..."
              value={context}
              onChange={(e) => setContext(e.target.value)}
              className="min-h-[80px]"
              disabled={isLoading}
            />
          </div>

          <div className="flex items-center gap-4">
            <Button 
              type="submit" 
              disabled={!prompt.trim() || isLoading}
              className="flex items-center gap-2"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Brain className="h-4 w-4" />
              )}
              {isLoading ? 'Reasoning...' : 'Start Chain Reasoning'}
            </Button>
          </div>
        </form>
      </Card>

      {/* Results */}
      {result && (
        <div className="space-y-6">
          {/* Summary */}
          <Card className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-gt-gold">{result.models.length}</div>
                <div className="text-sm text-muted-foreground">Models Compared</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{result.bestModel}</div>
                <div className="text-sm text-muted-foreground">Best Model</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {(result.averageAccuracy * 100).toFixed(1)}%
                </div>
                <div className="text-sm text-muted-foreground">Avg Accuracy</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{result.totalLatency}ms</div>
                <div className="text-sm text-muted-foreground">Total Time</div>
              </div>
            </div>
          </Card>

          {/* Model Comparisons */}
          <Tabs defaultValue="comparison" className="space-y-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="comparison">Comparison</TabsTrigger>
              <TabsTrigger value="reasoning">Reasoning</TabsTrigger>
              <TabsTrigger value="analysis">Analysis</TabsTrigger>
            </TabsList>

            <TabsContent value="comparison" className="space-y-4">
              {result.models.map((model, index) => (
                <Card key={model.model} className={`p-6 ${index === 0 ? 'border-gt-gold bg-gt-gold/5' : ''}`}>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <Badge variant={index === 0 ? 'default' : 'secondary'} className="flex items-center gap-1">
                        {index === 0 && <CheckCircle className="h-3 w-3" />}
                        {model.model}
                      </Badge>
                      {model.error && (
                        <Badge variant="destructive" className="flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          Error
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {model.latency}ms
                      </div>
                      <div className="flex items-center gap-1">
                        <Target className="h-3 w-3" />
                        <span className={getConfidenceColor(model.confidence)}>
                          {(model.confidence * 100).toFixed(0)}%
                        </span>
                      </div>
                      {model.accuracy && (
                        <div className="flex items-center gap-1">
                          <TrendingUp className="h-3 w-3" />
                          <span className={getAccuracyColor(model.accuracy)}>
                            {(model.accuracy * 100).toFixed(0)}%
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <h4 className="font-medium mb-2">Response:</h4>
                      <p className="text-sm bg-muted/50 p-3 rounded-md">
                        {model.response}
                      </p>
                    </div>
                    
                    {model.accuracy && (
                      <div>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span>Accuracy</span>
                          <span>{(model.accuracy * 100).toFixed(1)}%</span>
                        </div>
                        <Progress value={model.accuracy * 100} className="h-2" />
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="reasoning" className="space-y-4">
              {result.models.map((model) => (
                <Card key={model.model} className="p-6">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Brain className="h-4 w-4" />
                    {model.model} Reasoning Process
                  </h3>
                  <div className="bg-muted/30 p-4 rounded-md">
                    <pre className="text-sm whitespace-pre-wrap font-mono">
                      {model.reasoning || 'No reasoning steps provided'}
                    </pre>
                  </div>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="analysis" className="space-y-4">
              <Card className="p-6">
                <h3 className="font-semibold mb-4">Performance Analysis</h3>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Speed Comparison</h4>
                    <div className="space-y-2">
                      {result.models.map((model) => (
                        <div key={model.model} className="flex items-center justify-between">
                          <span className="text-sm">{model.model}</span>
                          <div className="flex items-center gap-2">
                            <div className="w-32 bg-muted rounded-full h-2">
                              <div 
                                className="bg-blue-500 h-2 rounded-full" 
                                style={{ width: `${(model.latency / Math.max(...result.models.map(m => m.latency))) * 100}%` }}
                              />
                            </div>
                            <span className="text-sm text-muted-foreground">{model.latency}ms</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-2">Accuracy Ranking</h4>
                    <div className="space-y-2">
                      {result.models
                        .filter(m => m.accuracy !== undefined)
                        .sort((a, b) => (b.accuracy || 0) - (a.accuracy || 0))
                        .map((model, index) => (
                        <div key={model.model} className="flex items-center justify-between">
                          <span className="text-sm">#{index + 1} {model.model}</span>
                          <Badge variant={index === 0 ? 'default' : 'secondary'}>
                            {(model.accuracy || 0) * 100}%
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
}
