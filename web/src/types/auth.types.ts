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

// No refreshToken: it never reaches JavaScript. The server sets it as an
// httpOnly cookie on login/register/refresh, and the browser sends it back
// on its own — see backend/src/auth/auth.cookie.ts.
export type AuthResponse = {
  accessToken: string;
  user: User;
};
