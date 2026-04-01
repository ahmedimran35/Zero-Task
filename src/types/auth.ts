export type Role = 'admin' | 'user';

export interface User {
  id: string;
  email: string;
  password: string;
  name: string;
  role: Role;
  createdAt: string;
  isActive: boolean;
  avatar: string | null;
}

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  avatar: string | null;
}

export interface AuthContextType {
  currentUser: SessionUser | null;
  users: User[];
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  createUser: (email: string, password: string, name: string) => Promise<{ success: boolean; error?: string }>;
  updateUser: (id: string, data: Partial<Pick<User, 'name' | 'email' | 'isActive'>>) => Promise<{ success: boolean; error?: string }>;
  deleteUser: (id: string) => Promise<void>;
  resetPassword: (id: string, newPassword: string) => Promise<void>;
  toggleUserActive: (id: string) => Promise<void>;
  getUserTaskCount: (userId: string) => Promise<number>;
  viewAsUser: SessionUser | null;
  setViewAsUser: (user: SessionUser | null) => void;
}
