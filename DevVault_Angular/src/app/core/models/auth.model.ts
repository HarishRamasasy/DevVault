import { User } from './user.model';

export interface AuthPayload {
  user: User;
  token: string;
}
