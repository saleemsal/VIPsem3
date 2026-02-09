# OAuth Authentication Setup

This application now uses Google OAuth for authentication, storing user accounts in the local SQLite database.

## Setup Instructions

### 1. Create Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API
4. Go to **Credentials** → **Create Credentials** → **OAuth 2.0 Client ID**
5. Configure the OAuth consent screen:
   - User Type: External (or Internal if using Google Workspace)
   - Fill in the app name, support email, and developer contact
6. Create OAuth 2.0 Client ID:
   - Application type: Web application
   - Name: GT Study Buddy
   - Authorized redirect URIs:
     - `http://localhost:8080/auth/callback` (for local development)
     - `https://yourdomain.com/auth/callback` (for production)

### 2. Set Environment Variables

Create a `.env` file in the root directory:

```bash
GOOGLE_CLIENT_ID=your-google-client-id-here
GOOGLE_CLIENT_SECRET=your-google-client-secret-here
OAUTH_REDIRECT_URI=http://localhost:8080/auth/callback
```

Or export them before starting the server:

```bash
export GOOGLE_CLIENT_ID="your-google-client-id-here"
export GOOGLE_CLIENT_SECRET="your-google-client-secret-here"
export OAUTH_REDIRECT_URI="http://localhost:8080/auth/callback"
```

### 3. Database Schema

The database schema has been updated to support OAuth users:

- `users` table now includes:
  - `provider` (e.g., 'google')
  - `provider_id` (Google user ID)
  - `name` (user's display name)
  - `avatar_url` (profile picture URL)
  - `password_hash` (optional, for non-OAuth users)

### 4. How It Works

1. **User clicks "Sign in with Google"**
   - Frontend calls `/api/auth/google/authorize`
   - Backend returns Google OAuth URL
   - User is redirected to Google

2. **Google redirects back with code**
   - Google redirects to `/auth/callback?code=...`
   - AuthGate component detects the code
   - Frontend calls `/api/auth/google/callback` with the code

3. **Backend exchanges code for tokens**
   - Backend exchanges code for access token
   - Backend fetches user info from Google
   - User is created/updated in local database
   - Session is created and token is returned

4. **User is authenticated**
   - Token is stored in localStorage
   - User info is stored in localStorage
   - User is redirected to the app

### 5. API Endpoints

- `GET /api/auth/google/authorize` - Get Google OAuth URL
- `POST /api/auth/google/callback` - Handle OAuth callback
- `GET /api/auth/session` - Get current user from token

### 6. Testing

1. Start the backend server:
   ```bash
   npx tsx scripts/local-api.ts
   ```

2. Start the frontend:
   ```bash
   npm run dev
   ```

3. Navigate to the app and click "Sign in with Google"

## Troubleshooting

- **"Google OAuth not configured"**: Make sure `GOOGLE_CLIENT_ID` is set
- **"Failed to exchange code"**: Check `GOOGLE_CLIENT_SECRET` and redirect URI
- **Redirect URI mismatch**: Ensure redirect URI matches exactly in Google Console
- **CORS errors**: Make sure the API server is running on port 8787

