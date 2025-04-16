export interface User {
  id: string;
  username: string;
  fullname: string;
  email: string;
  phone: string;
  dob: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface RegisterCredentials {
  fullname: string;
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  phone: string;
  dob: string;
}

export interface AuthResponse {
  user?: User;
  token?: string;
  message?: string;
  error?: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
} 