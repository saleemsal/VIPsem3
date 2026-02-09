// Only import LocalDatabase on server side
let LocalDatabase: any;
if (typeof window === 'undefined') {
  LocalDatabase = require('./local-db').LocalDatabase;
}

export interface User {
  id: string;
  email: string;
  created_at: string;
  updated_at: string;
}

export interface Session {
  id: string;
  user_id: string;
  expires_at: string;
  created_at: string;
}

export interface AuthResponse {
  user: User | null;
  session: Session | null;
  error?: string;
}

// Simulate Supabase auth interface
export class LocalAuth {
  // Sign up with email and password
  static async signUp(email: string, password: string): Promise<AuthResponse> {
    try {
      const user = await LocalDatabase.createUser(email, password);
      const session = LocalDatabase.createSession(user.id);
      
      return {
        user: {
          id: user.id,
          email: user.email,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        session: {
          id: session.id,
          user_id: user.id,
          expires_at: session.expiresAt.toISOString(),
          created_at: new Date().toISOString()
        }
      };
    } catch (error: any) {
      return {
        user: null,
        session: null,
        error: error.message
      };
    }
  }
  
  // Sign in with email and password
  static async signInWithPassword(email: string, password: string): Promise<AuthResponse> {
    try {
      const user = LocalDatabase.getUserByEmail(email);
      
      if (!user) {
        return {
          user: null,
          session: null,
          error: 'Invalid email or password'
        };
      }
      
      const isValidPassword = await LocalDatabase.verifyPassword(password, user.password_hash);
      
      if (!isValidPassword) {
        return {
          user: null,
          session: null,
          error: 'Invalid email or password'
        };
      }
      
      const session = LocalDatabase.createSession(user.id);
      
      return {
        user: {
          id: user.id,
          email: user.email,
          created_at: user.created_at,
          updated_at: user.updated_at
        },
        session: {
          id: session.id,
          user_id: user.id,
          expires_at: session.expiresAt.toISOString(),
          created_at: new Date().toISOString()
        }
      };
    } catch (error: any) {
      return {
        user: null,
        session: null,
        error: error.message
      };
    }
  }
  
  // Get current user from session
  static async getUser(sessionId?: string): Promise<{ user: User | null }> {
    if (!sessionId) {
      return { user: null };
    }
    
    const session = LocalDatabase.getSession(sessionId);
    
    if (!session) {
      return { user: null };
    }
    
    return {
      user: {
        id: session.user_id,
        email: session.email,
        created_at: '', // We don't store this in sessions
        updated_at: ''
      }
    };
  }
  
  // Sign out
  static async signOut(sessionId?: string): Promise<{ error?: string }> {
    if (sessionId) {
      LocalDatabase.deleteSession(sessionId);
    }
    return {};
  }
  
  // Get session from token
  static getSessionFromToken(token: string): Session | null {
    const decoded = LocalDatabase.verifyToken(token);
    if (!decoded) return null;
    
    const session = LocalDatabase.getSession(decoded.userId);
    return session;
  }
}

// Session management utilities
export class SessionManager {
  private static readonly SESSION_KEY = 'local_session_id';
  
  static setSession(sessionId: string) {
    if (typeof window !== 'undefined') {
      localStorage.setItem(this.SESSION_KEY, sessionId);
    }
  }
  
  static getSession(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(this.SESSION_KEY);
    }
    return null;
  }
  
  static clearSession() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(this.SESSION_KEY);
    }
  }
  
  static async getCurrentUser(): Promise<User | null> {
    const sessionId = this.getSession();
    if (!sessionId) return null;
    
    const { user } = await LocalAuth.getUser(sessionId);
    return user;
  }
}

export default LocalAuth;
