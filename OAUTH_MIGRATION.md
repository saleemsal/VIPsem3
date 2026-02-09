# OAuth Migration Summary

## Overview
Successfully migrated from Supabase authentication to Google OAuth with local SQLite database storage.

## Changes Made

### 1. Database Schema Updates (`src/lib/local-db.ts`)
- Updated `users` table to support OAuth:
  - Added `provider` (e.g., 'google')
  - Added `provider_id` (Google user ID)
  - Added `name` (user's display name)
  - Added `avatar_url` (profile picture URL)
  - Made `password_hash` optional (for OAuth users)
- Added new SQL statements:
  - `getUserByProvider` - Find user by OAuth provider and ID
  - `createOAuthUser` - Create new OAuth user
  - `updateOAuthUser` - Update existing OAuth user
- Added new methods:
  - `LocalDatabase.getUserByProvider()`
  - `LocalDatabase.createOAuthUser()`

### 2. OAuth API Endpoints (`api/auth-oauth.ts`)
- `GET /api/auth/google/authorize` - Get Google OAuth authorization URL
- `POST /api/auth/google/callback` - Handle OAuth callback and create user session
- `GET /api/auth/session` - Get current user from JWT token

### 3. OAuth Client Service (`src/lib/oauth.ts`)
- `OAuthService.getGoogleAuthUrl()` - Get Google OAuth URL
- `OAuthService.handleOAuthCallback()` - Handle OAuth callback with code
- `OAuthService.getCurrentUser()` - Get current authenticated user
- `OAuthService.signOut()` - Sign out and clear session
- `OAuthService.getStoredUser()` - Get stored user (synchronous)

### 4. Updated Components

#### `src/components/AuthGate.tsx`
- Removed email/password login form
- Added Google OAuth sign-in button
- Handles OAuth callback from Google
- Checks for `code` parameter in URL
- Stores user session in localStorage

#### `src/components/UserMenu.tsx`
- Updated to use `OAuthService` instead of demo auth
- Displays user avatar and name from OAuth
- Shows user email
- Handles sign-out properly

### 5. API Server Updates (`scripts/local-api.ts`)
- Added OAuth handler routing
- Routes `/api/auth/*` to `oauthHandler`

## How It Works

1. **User clicks "Sign in with Google"**
   - Frontend calls `/api/auth/google/authorize`
   - Backend returns Google OAuth URL
   - User is redirected to Google

2. **Google authentication**
   - User authenticates with Google
   - Google redirects to `/auth/callback?code=...`

3. **OAuth callback handling**
   - `AuthGate` detects the `code` parameter
   - Frontend calls `/api/auth/google/callback` with code
   - Backend exchanges code for access token
   - Backend fetches user info from Google
   - User is created/updated in local database
   - Session is created and JWT token is returned

4. **User authenticated**
   - Token and user info stored in localStorage
   - User can access the app

## Setup Required

1. **Google OAuth Credentials**
   - Create OAuth 2.0 Client ID in Google Cloud Console
   - Set redirect URI: `http://localhost:8080/auth/callback`
   - Get Client ID and Client Secret

2. **Environment Variables**
   ```bash
   GOOGLE_CLIENT_ID=your-client-id
   GOOGLE_CLIENT_SECRET=your-client-secret
   FRONTEND_URL=http://localhost:8080
   ```

3. **Database Migration**
   - Database schema is automatically updated on first run
   - Existing users with passwords are preserved
   - OAuth users are stored separately

## Benefits

- ✅ No password management required
- ✅ Secure authentication via Google
- ✅ User profile data from Google (name, avatar)
- ✅ All data stored locally in SQLite
- ✅ No external dependencies (except Google OAuth)
- ✅ JWT token-based sessions
- ✅ Easy to add more OAuth providers in the future

## Testing

1. Start backend: `npx tsx scripts/local-api.ts`
2. Start frontend: `npm run dev`
3. Navigate to app and click "Sign in with Google"
4. Complete Google authentication
5. Should be redirected back and logged in

## Notes

- OAuth callback is handled by `AuthGate` component
- Sessions expire after 7 days
- Users are automatically created/updated on each login
- Avatar and name are synced from Google profile

