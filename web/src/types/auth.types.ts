export type User = {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  role: string;
  telegramLinked: boolean;
  // False for an account opened through Google that never set a password —
  // the profile then offers to set one instead of asking for the current one.
  hasPassword: boolean;
  googleLinked: boolean;
};

export type RegisterDto = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
};

export type LoginDto = { email: string; password: string };

// The ID token from Google Identity Services, plus — only on the second step
// of a first sign-up — the details Google doesn't give us.
export type GoogleAuthDto = {
  credential: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
};

// What Google told the server about a newcomer, shown back on the phone step.
export type GoogleProfile = {
  email: string;
  firstName: string | null;
  lastName: string | null;
};

export type GoogleAuthResult =
  | AuthResponse
  | { needsPhone: true; profile: GoogleProfile };

export type ForgotPasswordDto = { email: string };

export type ResetPasswordDto = { token: string; password: string };

export type ChangePasswordDto = { currentPassword: string; newPassword: string };

// One row per signed-in device. `isCurrent` is the server's answer, not the
// client's guess — only it can compare the presented cookie against the stored
// hash, and neither hash ever leaves it.
export type AuthSession = {
  id: number;
  userAgent: string | null;
  createdAt: string;
  expiresAt: string;
  isCurrent: boolean;
};

// No refreshToken: it never reaches JavaScript. The server sets it as an
// httpOnly cookie on login/register/refresh, and the browser sends it back
// on its own — see backend/src/auth/auth.cookie.ts.
export type AuthResponse = {
  accessToken: string;
  user: User;
};
