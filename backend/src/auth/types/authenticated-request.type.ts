import { Request } from 'express';

import { AuthenticatedUser } from './jwt-payload.type';

export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}
