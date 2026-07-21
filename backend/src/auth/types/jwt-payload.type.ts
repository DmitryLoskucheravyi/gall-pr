import { UserRole } from '../../users/entities/user.entity';

export interface JwtPayload {
  sub: number;
  email: string;
  role: UserRole;
}

export interface AuthenticatedUser {
  id: number;
  email: string;
  role: UserRole;
}
