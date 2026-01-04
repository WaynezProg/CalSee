export type AuthStatus = "authenticated" | "unauthenticated" | "loading";

export interface AuthUser {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null;
}

export interface Session {
  user: AuthUser;
  expires: string;
}

export type AuthErrorType =
  | "network"
  | "service_unavailable"
  | "permissions_denied"
  | "session_expired"
  | "rate_limit_exceeded"
  | "invalid_session"
  | "cookies_disabled"
  | "default";

export interface AuthError {
  type: AuthErrorType;
  message: string;
  timestamp: number;
}

export interface AuthState {
  status: AuthStatus;
  session: Session | null;
  error: AuthError | null;
}
