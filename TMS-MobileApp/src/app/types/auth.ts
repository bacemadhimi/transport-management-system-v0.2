export interface IAuthToken {
  id: number;
  email: string;
  name?: string; // Added for user name
  token: string;
  role: string;
  permissions?: string[];
  driverId?: number; // Added for driver association
  profileImage?: string; // Added for profile image
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