export type User = {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  role: string;
  telegramLinked: boolean;
};

export type RegisterDto = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
};

export type LoginDto = { email: string; password: string };

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
