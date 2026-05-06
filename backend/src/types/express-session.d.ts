import 'express-session';

declare module 'express-session' {
  interface SessionData {
    userId?: string;
    username?: string;
    passkeyChallenge?: string | null;
    passkeyUsername?: string | null;
    publicUserId?: string;
    submissionAnonymousToken?: string;
  }
}
