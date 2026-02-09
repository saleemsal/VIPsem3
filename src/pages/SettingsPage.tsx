import { useState } from "react";
import { deleteAllData } from "@/lib/privacy";
import { connectCanvasMock } from "@/lib/canvas";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { 
  Key, 
  Database, 
  Shield, 
  Trash2, 
  AlertTriangle,
  BarChart3,
  Info,
  Github,
  ExternalLink,
  Eye,
  EyeOff
} from "lucide-react";
import { 
  Alert,
  AlertDescription,
} from "@/components/ui/alert";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function SettingsPage() {
  const [apiKey, setApiKey] = useState("sk-***************************");
  const [showApiKey, setShowApiKey] = useState(false);
  const [chunkSize, setChunkSize] = useState([512]);
  const [chunkCount, setChunkCount] = useState([10]);
  const [overlap, setOverlap] = useState([12]);
  const [maxContext, setMaxContext] = useState([8000]);
  const [rerankEnabled, setRerankEnabled] = useState(true);
  const [refusalThreshold, setRefusalThreshold] = useState([0.3]);
  const [noTraining, setNoTraining] = useState(true);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  // Mock monitoring data
  const monitoringData = {
    p50Latency: 1250,
    p95Latency: 3400,
    tokensIn: 45231,
    tokensOut: 23156,
    errorRate: 0.02,
    uptime: 99.8
  };

  const handleSaveApiKey = () => {
    console.log("Saving API key...");
  };

  const handleDeleteAll = () => {
    if (deleteConfirmText === "DELETE") {
      console.log("Deleting all data...");
      setDeleteConfirmText("");
    }
  };

  const getLatencyColor = (latency: number) => {
    if (latency < 2000) return "text-green-500";
    if (latency < 5000) return "text-yellow-500";
    return "text-red-500";
  };

  return (
    <div className="min-h-screen bg-gradient-academic">
      <Navbar />
      
      <div className="container mx-auto px-6 py-8 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Settings</h1>
          <p className="text-muted-foreground">
            Configure your Study Buddy preferences and integrations
          </p>
        </div>

        <div className="space-y-8">
          {/* API Configuration */}
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Key className="h-5 w-5" />
              <h2 className="text-xl font-semibold">Gemini API Configuration</h2>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="api-key">API Key</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      id="api-key"
                      type={showApiKey ? "text" : "password"}
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="Enter your Gemini API key"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute right-2 top-1/2 -translate-y-1/2"
                      onClick={() => setShowApiKey(!showApiKey)}
                    >
                      {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  <Button onClick={handleSaveApiKey}>Save</Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Your API key is encrypted and stored securely on the server
                </p>
              </div>

              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Get your Gemini API key from the{" "}
                  <a 
                    href="https://aistudio.google.com/app/apikey" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    Google AI Studio
                  </a>
                </AlertDescription>
              </Alert>
            </div>
          </Card>

          {/* RAG Configuration */}
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Database className="h-5 w-5" />
              <h2 className="text-xl font-semibold">RAG Configuration</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Chunk Size: {chunkSize[0]} tokens</Label>
                  <Slider
                    value={chunkSize}
                    onValueChange={setChunkSize}
                    max={1024}
                    min={256}
                    step={64}
                    className="w-full"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Retrieved Chunks: {chunkCount[0]}</Label>
                  <Slider
                    value={chunkCount}
                    onValueChange={setChunkCount}
                    max={20}
                    min={5}
                    step={1}
                    className="w-full"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Overlap: {overlap[0]}%</Label>
                  <Slider
                    value={overlap}
                    onValueChange={setOverlap}
                    max={25}
                    min={5}
                    step={1}
                    className="w-full"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Max Context: {maxContext[0]} tokens</Label>
                  <Slider
                    value={maxContext}
                    onValueChange={setMaxContext}
                    max={32000}
                    min={4000}
                    step={1000}
                    className="w-full"
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="rerank">Enable Reranking</Label>
                  <p className="text-sm text-muted-foreground">
                    Improve retrieval quality with additional ranking
                  </p>
                </div>
                <Switch
                  id="rerank"
                  checked={rerankEnabled}
                  onCheckedChange={setRerankEnabled}
                />
              </div>

              <div className="space-y-2">
                <Label>Refusal Threshold: {refusalThreshold[0].toFixed(2)}</Label>
                <p className="text-sm text-muted-foreground mb-2">
                  Minimum confidence score to provide an answer
                </p>
                <Slider
                  value={refusalThreshold}
                  onValueChange={setRefusalThreshold}
                  max={0.8}
                  min={0.1}
                  step={0.05}
                  className="w-full"
                />
              </div>
            </div>
          </Card>

          {/* Safety & Privacy */}
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="h-5 w-5" />
              <h2 className="text-xl font-semibold">Safety & Privacy</h2>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="no-training">Do not train on prompts/content</Label>
                  <p className="text-sm text-muted-foreground">
                    Your data will not be used for model training
                  </p>
                </div>
                <Switch
                  id="no-training"
                  checked={noTraining}
                  onCheckedChange={setNoTraining}
                />
              </div>

              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  We accept handwriting but prefer typed notes for OCR reliability.
                  No personal data should be included in uploads.
                </AlertDescription>
              </Alert>
            </div>
          </Card>

          {/* Monitoring */}
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="h-5 w-5" />
              <h2 className="text-xl font-semibold">Monitoring</h2>
              <Badge variant="outline">Read-only</Badge>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>P50 Latency</Label>
                  <span className={`font-mono ${getLatencyColor(monitoringData.p50Latency)}`}>
                    {monitoringData.p50Latency}ms
                  </span>
                </div>
                <Progress value={Math.min((monitoringData.p50Latency / 5000) * 100, 100)} />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>P95 Latency</Label>
                  <span className={`font-mono ${getLatencyColor(monitoringData.p95Latency)}`}>
                    {monitoringData.p95Latency}ms
                  </span>
                </div>
                <Progress value={Math.min((monitoringData.p95Latency / 15000) * 100, 100)} />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Error Rate</Label>
                  <span className="font-mono text-green-500">
                    {(monitoringData.errorRate * 100).toFixed(2)}%
                  </span>
                </div>
                <Progress value={(1 - monitoringData.errorRate) * 100} />
              </div>

              <div className="space-y-2">
                <Label>Tokens (Input/Output)</Label>
                <p className="font-mono text-sm">
                  {monitoringData.tokensIn.toLocaleString()} / {monitoringData.tokensOut.toLocaleString()}
                </p>
              </div>

              <div className="space-y-2">
                <Label>Uptime</Label>
                <p className="font-mono text-sm text-green-500">{monitoringData.uptime}%</p>
              </div>
            </div>

            {monitoringData.p95Latency > 15000 && (
              <Alert className="mt-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  High P95 latency detected. Consider reducing context size or chunk count.
                </AlertDescription>
              </Alert>
            )}
          </Card>

          {/* About */}
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Info className="h-5 w-5" />
              <h2 className="text-xl font-semibold">About</h2>
            </div>
            
            <div className="space-y-4">
              <div>
                <h3 className="font-medium mb-2">Backend LLM</h3>
                <p className="text-sm text-muted-foreground">
                  Gemini only (fast and efficient with good rate limits)
                </p>
              </div>

              <div>
                <h3 className="font-medium mb-2">OCR Support</h3>
                <p className="text-sm text-muted-foreground">
                  We accept handwriting but prefer typed notes for OCR reliability.
                  Future updates may include open-source OCR evaluation.
                </p>
              </div>

              <div>
                <h3 className="font-medium mb-2">Canvas Integration</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  Optional Canvas LMS integration for assignment sync.
                </p>
                <a 
                  href="https://github.com/modelcontextprotocol/servers/tree/main/src/canvas"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                >
                  <Github className="h-4 w-4" />
                  MCP Canvas LMS Repository
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          </Card>

          {/* Danger Zone */}
          <Card className="p-6 border-destructive/50">
            <div className="flex items-center gap-2 mb-4">
              <Trash2 className="h-5 w-5 text-destructive" />
              <h2 className="text-xl font-semibold text-destructive">Danger Zone</h2>
            </div>
            
            <Alert className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                This action cannot be undone. All your files, chat history, and settings will be permanently deleted.
              </AlertDescription>
            </Alert>

            <Dialog>
              <DialogTrigger asChild>
                <Button variant="destructive">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete All Data & History
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Are you absolutely sure?</DialogTitle>
                  <DialogDescription>
                    This will permanently delete all your uploaded files, chat history, 
                    flashcards, and settings. This action cannot be undone.
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4">
                  <Label htmlFor="delete-confirm">Type DELETE to confirm</Label>
                  <Input
                    id="delete-confirm"
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    placeholder="DELETE"
                  />
                </div>

                <DialogFooter>
                  <Button variant="outline">Cancel</Button>
                  <Button 
                    variant="destructive" 
                    onClick={handleDeleteAll}
                    disabled={deleteConfirmText !== "DELETE"}
                  >
                    Delete Everything
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </Card>
        </div>
      </div>
    </div>
  );
}