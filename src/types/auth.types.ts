import type { User, Session } from '@supabase/supabase-js';
import type { Profile } from './database.types';

export interface AuthState {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;
}

export interface SignInCredentials {
  email: string;
  password?: string;
  redirectTo?: string;
}

export type AuthMode = 'sign_in' | 'magic_link' | 'sign_up';

export interface SignUpResult {
  user: User | null;
  session: Session | null;
  membershipId: string | null;
  requiresEmailConfirmation: boolean;
  error: string | null;
}
