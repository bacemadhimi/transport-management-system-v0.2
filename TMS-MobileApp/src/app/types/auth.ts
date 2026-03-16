export interface IAuthToken {
  id: number;
  email: string;
  token: string;
  role: string;
  permissions?: string[];
  driverId?: number; // Added for driver association
}

export interface ILoginRequest {
  email: string;
  password: string;
}

export interface ILoginResponse {
  success: boolean;
  token?: IAuthToken;
  message?: string;
}