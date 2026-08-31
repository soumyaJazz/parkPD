import type { Request } from 'express';
import type { User } from '../users/users.service';

/**
 * What the guard leaves behind for the handler.
 *
 * Declared as its own type rather than augmenting Express's global Request:
 * `user` is only populated on routes the guard actually ran on, and marking it
 * optional here keeps that visible at every use site instead of pretending
 * every request in the app has one.
 */
export interface AuthenticatedRequest extends Request {
  user?: User;
}
