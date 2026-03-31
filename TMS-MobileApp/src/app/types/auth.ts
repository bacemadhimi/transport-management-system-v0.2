export interface IAuthToken {
  id: number;
  email: string;
  token: string;
  role: string;
  permissions?: string[];
<<<<<<< HEAD
  driverId?: number; // Added for driver association
=======
  name?:string;
  profileImage?: string;
>>>>>>> dev
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