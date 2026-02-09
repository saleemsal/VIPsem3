import { useEffect, useState } from 'react';
import { LocalAuthClient } from '@/lib/local-auth-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);

  const checkAuth = async () => {
    try {
      // First check stored user (synchronous, fast)
      const storedUser = LocalAuthClient.getStoredUser();
      if (storedUser) {
        setIsLoggedIn(true);
        setLoading(false);
        // Verify with server in background
        const verifiedUser = await LocalAuthClient.getCurrentUser();
        if (!verifiedUser) {
          setIsLoggedIn(false);
        }
        return;
      }
      
      // If no stored user, check with server
      const user = await LocalAuthClient.getCurrentUser();
      setIsLoggedIn(!!user);
    } catch (error) {
      console.error('Auth check error:', error);
      setIsLoggedIn(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  // Navigate to chatbot on successful login
  useEffect(() => {
    if (isLoggedIn && window.location.pathname !== '/') {
      // Navigate to home (chatbot) page
      window.location.href = '/';
    }
  }, [isLoggedIn]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return <LoginForm onAuthSuccess={checkAuth} />;
  }

  return <>{children}</>;
}

function LoginForm({ onAuthSuccess }: { onAuthSuccess: () => Promise<void> }) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isSignUp) {
        await LocalAuthClient.signUp(email, password);
      } else {
        await LocalAuthClient.signIn(email, password);
      }
      
      // Re-check auth state (this will update the parent component)
      await onAuthSuccess();
      
      // Navigate to chatbot page (home page)
      window.location.href = '/';
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="max-w-sm mx-auto p-6 border rounded-lg bg-card">
        <h2 className="text-2xl font-semibold mb-2 text-center">
          {isSignUp ? 'Create Account' : 'Welcome Back'}
        </h2>
        <p className="text-sm text-muted-foreground mb-6 text-center">
          {isSignUp ? 'Sign up to get started' : 'Sign in to continue'}
        </p>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={isSignUp ? "At least 6 characters" : "Your password"}
              required
              minLength={6}
              disabled={loading}
            />
          </div>

          {error && (
            <div className="text-sm text-destructive bg-destructive/10 p-2 rounded">
              {error}
            </div>
          )}

          <Button
            type="submit"
            disabled={loading || !email || !password}
            className="w-full"
            size="lg"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                {isSignUp ? 'Creating account...' : 'Signing in...'}
              </>
            ) : (
              isSignUp ? 'Create Account' : 'Sign In'
            )}
          </Button>
        </form>

        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError('');
            }}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
          </button>
        </div>
      </div>
    </div>
  );
}
