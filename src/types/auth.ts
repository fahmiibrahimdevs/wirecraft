export type UserRole = 'admin' | 'user';

export interface User {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  avatarUrl?: string;
  createdAt?: string;
}

export interface AuthResponse {
  success: boolean;
  token?: string;
  user?: User;
  error?: string;
  message?: string;
}
