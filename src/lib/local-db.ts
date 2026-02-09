import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import path from 'path';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const DB_PATH = path.join(process.cwd(), 'data', 'local.db');

// Ensure data directory exists
import { mkdirSync } from 'fs';
try {
  mkdirSync(path.dirname(DB_PATH), { recursive: true });
} catch (error) {
  // Directory might already exist
}

const db = new Database(DB_PATH);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT,
    provider TEXT,
    provider_id TEXT,
    name TEXT,
    avatar_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Migrate existing database - add OAuth columns if they don't exist
try {
  const tableInfo = db.prepare("PRAGMA table_info(users)").all();
  const columnNames = tableInfo.map((col: any) => col.name);
  
  if (!columnNames.includes('provider')) {
    db.exec(`ALTER TABLE users ADD COLUMN provider TEXT`);
  }
  if (!columnNames.includes('provider_id')) {
    db.exec(`ALTER TABLE users ADD COLUMN provider_id TEXT`);
  }
  if (!columnNames.includes('name')) {
    db.exec(`ALTER TABLE users ADD COLUMN name TEXT`);
  }
  if (!columnNames.includes('avatar_url')) {
    db.exec(`ALTER TABLE users ADD COLUMN avatar_url TEXT`);
  }
  
  // Add unique constraint on provider/provider_id if not exists
  try {
    db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_provider ON users(provider, provider_id) WHERE provider IS NOT NULL AND provider_id IS NOT NULL`);
  } catch (e) {
    // Index might already exist, ignore
  }
} catch (error) {
  console.error('Migration error:', error);
  // Continue anyway - table might not exist yet
}

// Continue with other tables
db.exec(`

  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS feedback (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    conversation_id TEXT,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    additional_feedback TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS model_preferences (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    conversation_id TEXT,
    message_id TEXT,
    model_a TEXT NOT NULL,
    model_b TEXT NOT NULL,
    response_a TEXT NOT NULL,
    response_b TEXT NOT NULL,
    preferred_model TEXT NOT NULL,
    reasoning_mode BOOLEAN NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
  );

  CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
  CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
  CREATE INDEX IF NOT EXISTS idx_feedback_user_id ON feedback(user_id);
  CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON feedback(created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_model_preferences_user_id ON model_preferences(user_id);
`);

// Prepared statements
const stmts = {
  // User operations
  createUser: db.prepare(`
    INSERT INTO users (id, email, password_hash)
    VALUES (?, ?, ?)
  `),
  
  createUserWithoutPassword: db.prepare(`
    INSERT INTO users (id, email)
    VALUES (?, ?)
  `),
  
  getUserByEmail: db.prepare(`
    SELECT * FROM users WHERE email = ?
  `),
  
  getUserById: db.prepare(`
    SELECT * FROM users WHERE id = ?
  `),
  
  getUserByProvider: db.prepare(`
    SELECT * FROM users WHERE provider = ? AND provider_id = ?
  `),
  
  createOAuthUser: db.prepare(`
    INSERT INTO users (id, email, provider, provider_id, name, avatar_url)
    VALUES (?, ?, ?, ?, ?, ?)
  `),
  
  updateOAuthUser: db.prepare(`
    UPDATE users SET email = ?, name = ?, avatar_url = ?, updated_at = CURRENT_TIMESTAMP
    WHERE provider = ? AND provider_id = ?
  `),
  
  // Session operations
  createSession: db.prepare(`
    INSERT INTO sessions (id, user_id, expires_at)
    VALUES (?, ?, ?)
  `),
  
  getSession: db.prepare(`
    SELECT s.*, u.email, u.id as user_id
    FROM sessions s
    JOIN users u ON s.user_id = u.id
    WHERE s.id = ? AND s.expires_at > datetime('now')
  `),
  
  deleteSession: db.prepare(`
    DELETE FROM sessions WHERE id = ?
  `),
  
  deleteExpiredSessions: db.prepare(`
    DELETE FROM sessions WHERE expires_at <= datetime('now')
  `),
  
  // Feedback operations
  createFeedback: db.prepare(`
    INSERT INTO feedback (id, user_id, conversation_id, rating, additional_feedback)
    VALUES (?, ?, ?, ?, ?)
  `),
  
  getFeedbackByUser: db.prepare(`
    SELECT * FROM feedback 
    WHERE user_id = ? 
    ORDER BY created_at DESC
  `),
  
  // Model preferences
  createModelPreference: db.prepare(`
    INSERT INTO model_preferences (id, user_id, conversation_id, message_id, model_a, model_b, response_a, response_b, preferred_model, reasoning_mode)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
};

export class LocalDatabase {
  // User management
  static async createUser(email: string, password: string) {
    const id = crypto.randomUUID();
    const passwordHash = await bcrypt.hash(password, 10);
    
    try {
      stmts.createUser.run(id, email, passwordHash);
      return { id, email };
    } catch (error: any) {
      if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        throw new Error('User already exists');
      }
      throw error;
    }
  }
  
  static getUserByProvider(provider: string, providerId: string) {
    return stmts.getUserByProvider.get(provider, providerId);
  }
  
  static createOAuthUser(data: {
    email: string;
    provider: string;
    providerId: string;
    name?: string;
    avatarUrl?: string;
  }) {
    const id = crypto.randomUUID();
    try {
      stmts.createOAuthUser.run(
        id,
        data.email,
        data.provider,
        data.providerId,
        data.name || null,
        data.avatarUrl || null
      );
      return { id, email: data.email, name: data.name, avatarUrl: data.avatarUrl };
    } catch (error: any) {
      if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        // User already exists, update it
        stmts.updateOAuthUser.run(
          data.email,
          data.name || null,
          data.avatarUrl || null,
          data.provider,
          data.providerId
        );
        const existing = stmts.getUserByProvider.get(data.provider, data.providerId);
        return { id: existing.id, email: data.email, name: data.name, avatarUrl: data.avatarUrl };
      }
      throw error;
    }
  }
  
  static getUserByEmail(email: string) {
    return stmts.getUserByEmail.get(email);
  }
  
  static getUserById(id: string) {
    return stmts.getUserById.get(id);
  }
  
  static async verifyPassword(password: string, hash: string) {
    return bcrypt.compare(password, hash);
  }
  
  // Session management
  static createSession(userId: string) {
    const sessionId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    
    stmts.createSession.run(sessionId, userId, expiresAt.toISOString());
    return { id: sessionId, expiresAt };
  }
  
  static getSession(sessionId: string) {
    return stmts.getSession.get(sessionId);
  }
  
  static deleteSession(sessionId: string) {
    stmts.deleteSession.run(sessionId);
  }
  
  static cleanupExpiredSessions() {
    stmts.deleteExpiredSessions.run();
  }
  
  // Feedback management
  static createFeedback(data: {
    userId?: string;
    conversationId?: string;
    rating: number;
    additionalFeedback?: string;
  }) {
    const id = crypto.randomUUID();
    stmts.createFeedback.run(
      id,
      data.userId || null,
      data.conversationId || null,
      data.rating,
      data.additionalFeedback || null
    );
    return { id };
  }
  
  static getFeedbackByUser(userId: string) {
    return stmts.getFeedbackByUser.all(userId);
  }
  
  // Model preferences
  static createModelPreference(data: {
    userId?: string;
    conversationId?: string;
    messageId?: string;
    modelA: string;
    modelB: string;
    responseA: string;
    responseB: string;
    preferredModel: string;
    reasoningMode: boolean;
  }) {
    const id = crypto.randomUUID();
    stmts.createModelPreference.run(
      id,
      data.userId || null,
      data.conversationId || null,
      data.messageId || null,
      data.modelA,
      data.modelB,
      data.responseA,
      data.responseB,
      data.preferredModel,
      data.reasoningMode ? 1 : 0 // Convert boolean to integer for SQLite
    );
    return { id };
  }
  
  // JWT token management
  static generateToken(userId: string) {
    return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
  }
  
  static verifyToken(token: string) {
    try {
      return jwt.verify(token, JWT_SECRET) as { userId: string };
    } catch {
      return null;
    }
  }
}

// Cleanup expired sessions on startup
LocalDatabase.cleanupExpiredSessions();

export default LocalDatabase;
