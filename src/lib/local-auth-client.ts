// Client-side local authentication service
export class LocalAuthClient {
  private static readonly API_BASE = 'http://localhost:8787/api';
  private static readonly TOKEN_KEY = 'auth_token';
  private static readonly USER_KEY = 'auth_user';

  // Sign up with email and password
  static async signUp(email: string, password: string): Promise<{ user: any; token: string }> {
    const response = await fetch(`${this.API_BASE}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create account');
    }

    const data = await response.json();
    
    // Store token and user
    localStorage.setItem(this.TOKEN_KEY, data.token);
    localStorage.setItem(this.USER_KEY, JSON.stringify(data.user));
    
    return { user: data.user, token: data.token };
  }

  // Sign in with email and password
  static async signIn(email: string, password: string): Promise<{ user: any; token: string }> {
    const response = await fetch(`${this.API_BASE}/auth/signin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to sign in');
    }

    const data = await response.json();
    
    // Store token and user
    localStorage.setItem(this.TOKEN_KEY, data.token);
    localStorage.setItem(this.USER_KEY, JSON.stringify(data.user));
    
    return { user: data.user, token: data.token };
  }

  // Get current user from token
  static async getCurrentUser(): Promise<any | null> {
    // First check stored user (fast, synchronous)
    const storedUser = this.getStoredUser();
    const token = localStorage.getItem(this.TOKEN_KEY);
    
    if (!token) {
      return storedUser; // Return stored user even if no token (might be from previous session)
    }

    try {
      const response = await fetch(`${this.API_BASE}/auth/session`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        // If token is invalid, clear everything
        this.clearSession();
        return null;
      }

      const data = await response.json();
      if (data.user) {
        localStorage.setItem(this.USER_KEY, JSON.stringify(data.user));
        return data.user;
      }
      
      // If API doesn't return user but we have stored user, return stored user
      return storedUser;
    } catch (error) {
      console.error('Error getting current user:', error);
      // On network error, return stored user if available
      return storedUser;
    }
  }

  // Sign out
  static signOut() {
    this.clearSession();
    window.location.reload();
  }

  // Clear session
  static clearSession() {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
  }

  // Get stored user (synchronous)
  static getStoredUser(): any | null {
    const userStr = localStorage.getItem(this.USER_KEY);
    if (!userStr) return null;
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  }
}

export default LocalAuthClient;

