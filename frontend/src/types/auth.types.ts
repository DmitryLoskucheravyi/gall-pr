export type User = {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  role: string;
  isVerified: boolean;
};

export type RegisterDto = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
};

export type LoginDto = { email: string; password: string };
export type JwtUser = { id: number; email: string; role: string };

export type AuthResponse = {
  accessToken: string;
  refreshToken: string;
  user: User;
};

export type ProfileResponse = {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  role: string;
  isVerified: boolean;
};
