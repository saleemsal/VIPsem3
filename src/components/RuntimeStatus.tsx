import { useState } from "react";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { RUNTIME, API_BASE } from "../lib/runtime";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";

export function RuntimeStatus() {
  const [checking, setChecking] = useState(false);
  const [healthStatus, setHealthStatus] = useState<'unknown' | 'ok' | 'error'>('unknown');
  const [healthMessage, setHealthMessage] = useState('');

  const checkHealth = async () => {
    if (RUNTIME === 'mock') return;
    
    setChecking(true);
    try {
      const res = await fetch(`${API_BASE}/api/chat`);
      const data = await res.json();
      if (data.ok) {
        setHealthStatus('ok');
        setHealthMessage('API is healthy');
      } else {
        setHealthStatus('error');
        setHealthMessage('API returned unexpected response');
      }
    } catch (error) {
      setHealthStatus('error');
      setHealthMessage(`API error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    setChecking(false);
  };

  return (
    <div className="flex items-center gap-2">
      <Badge variant={RUNTIME === 'mock' ? 'secondary' : 'default'}>
        {RUNTIME === 'mock' ? 'Mock Mode' : 'Remote API'}
      </Badge>
      
      {RUNTIME === 'remote' && (
        <>
          <Button
            size="sm"
            variant="outline"
            onClick={checkHealth}
            disabled={checking}
          >
            {checking ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              'Health Check'
            )}
          </Button>
          
          {healthStatus !== 'unknown' && (
            <div className="flex items-center gap-1">
              {healthStatus === 'ok' ? (
                <CheckCircle className="h-3 w-3 text-green-500" />
              ) : (
                <XCircle className="h-3 w-3 text-red-500" />
              )}
              <span className="text-xs text-muted-foreground">{healthMessage}</span>
            </div>
          )}
        </>
      )}
    </div>
  );
}