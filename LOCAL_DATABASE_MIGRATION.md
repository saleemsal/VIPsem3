# Local Database Migration

## Overview
Successfully migrated from Supabase to a local SQLite database for feedback collection and authentication.

## What Was Changed

### 1. Database Infrastructure
- **Added**: `src/lib/local-db.ts` - SQLite database with better-sqlite3
- **Added**: `src/lib/local-auth.ts` - Local authentication service
- **Added**: `src/lib/local-feedback.ts` - Local feedback service
- **Added**: `src/lib/local-client.ts` - Supabase-compatible client interface

### 2. Database Schema
Created SQLite tables:
- `users` - User accounts with email/password authentication
- `sessions` - User session management
- `feedback` - User feedback collection
- `model_preferences` - Model comparison preferences

### 3. Updated Components
- **`src/hooks/useFeedback.ts`** - Now uses local database
- **`src/components/AuthGate.tsx`** - Local authentication
- **`src/components/UserMenu.tsx`** - Local session management
- **`api/log-preference.ts`** - Local model preference logging

### 4. Dependencies Added
```bash
npm install better-sqlite3 @types/better-sqlite3 bcryptjs @types/bcryptjs jsonwebtoken @types/jsonwebtoken
```

## Features

### ✅ Authentication
- User registration and login
- Session management with localStorage
- Password hashing with bcryptjs
- JWT token support

### ✅ Feedback Collection
- Star rating feedback
- Additional text feedback
- User association
- Conversation tracking

### ✅ Model Preferences
- Model comparison logging
- User preference tracking
- Reasoning mode tracking

## Database Location
- **File**: `data/local.db`
- **Type**: SQLite3
- **Backup**: Database file can be copied for backup

## Migration Benefits
1. **No External Dependencies** - No need for Supabase account
2. **Local Control** - Full control over data
3. **Privacy** - Data stays on local machine
4. **Performance** - Faster than remote database
5. **Offline Support** - Works without internet

## Testing
All database functionality has been tested and verified:
- ✅ User creation and authentication
- ✅ Session management
- ✅ Feedback submission
- ✅ Model preference logging

## Usage
The application now works entirely with the local database. No Supabase configuration is needed.

### Starting the Application
1. Run `npm run dev` for the frontend
2. Run `./start-gemini-api.sh` for the API server
3. The local database will be created automatically

### Data Management
- Database file: `data/local.db`
- To reset: Delete `data/local.db` and restart
- To backup: Copy `data/local.db` file

## Compatibility
The local client maintains Supabase-compatible interfaces, so existing code continues to work with minimal changes.
