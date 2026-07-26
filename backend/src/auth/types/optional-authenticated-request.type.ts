import { Request } from 'express';

import { AuthenticatedUser } from './jwt-payload.type';

export interface OptionalAuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}
