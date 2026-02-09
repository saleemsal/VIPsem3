// OAuth client-side service
export class OAuthService {
  // API base URL - backend runs on port 8787
  private static readonly API_BASE = 'http://localhost:8787/api';
  private static readonly TOKEN_KEY = 'oauth_token';
  private static readonly USER_KEY = 'oauth_user';

  // Get Google OAuth authorization URL
  static async getGoogleAuthUrl(): Promise<string> {
    const response = await fetch(`${this.API_BASE}/auth/google/authorize`);
    if (!response.ok) {
      throw new Error('Failed to get OAuth URL');
    }
    const data = await response.json();
    return data.authUrl;
  }

  // Handle OAuth callback with code
  static async handleOAuthCallback(code: string): Promise<{ user: any; token: string }> {
    const response = await fetch(`${this.API_BASE}/auth/google/callback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'OAuth callback failed');
    }

    const data = await response.json();
    
    // Store token and user
    localStorage.setItem(this.TOKEN_KEY, data.token);
    localStorage.setItem(this.USER_KEY, JSON.stringify(data.user));
    
    return { user: data.user, token: data.token };
  }

  // Get current user from token
  static async getCurrentUser(): Promise<any | null> {
    const token = localStorage.getItem(this.TOKEN_KEY);
    if (!token) {
      return null;
    }

    try {
      const response = await fetch(`${this.API_BASE}/auth/session`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        this.clearSession();
        return null;
      }

      const data = await response.json();
      if (data.user) {
        localStorage.setItem(this.USER_KEY, JSON.stringify(data.user));
        return data.user;
      }
      
      return null;
    } catch (error) {
      console.error('Error getting current user:', error);
      this.clearSession();
      return null;
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

export default OAuthService;

