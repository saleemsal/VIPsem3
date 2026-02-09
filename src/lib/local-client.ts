import { LocalAuth, SessionManager } from './local-auth';
import { LocalFeedback } from './local-feedback';
import { LocalDatabase } from './local-db';

// Simulate Supabase client interface
export class LocalClient {
  auth = {
    signUp: async (credentials: { email: string; password: string }) => {
      return LocalAuth.signUp(credentials.email, credentials.password);
    },
    
    signInWithPassword: async (credentials: { email: string; password: string }) => {
      return LocalAuth.signInWithPassword(credentials.email, credentials.password);
    },
    
    getUser: async () => {
      const sessionId = SessionManager.getSession();
      return LocalAuth.getUser(sessionId || undefined);
    },
    
    signOut: async () => {
      const sessionId = SessionManager.getSession();
      if (sessionId) {
        LocalDatabase.deleteSession(sessionId);
        SessionManager.clearSession();
      }
      return { error: null };
    }
  };
  
  from = (table: string) => {
    return {
      insert: (data: any) => ({
        select: () => ({
          single: async () => {
            if (table === 'feedback') {
              const result = await LocalFeedback.submitFeedback(
                data.rating,
                data.user_id,
                data.conversation_id
              );
              return { data: result, error: result.error ? { message: result.error } : null };
            }
            return { data: null, error: { message: 'Table not supported' } };
          }
        })
      }),
      
      select: (columns?: string) => ({
        eq: (column: string, value: any) => ({
          order: (orderBy: string) => ({
            desc: () => ({
              limit: (count: number) => ({
                data: async () => {
                  if (table === 'feedback' && column === 'user_id') {
                    const feedback = await LocalFeedback.getFeedbackByUser(value);
                    return { data: feedback, error: null };
                  }
                  return { data: [], error: null };
                }
              })
            })
          })
        })
      })
    };
  };
}

// Create singleton instance
export const localClient = new LocalClient();

// Export for compatibility
export default localClient;
