export interface IAuthToken {
  id: number;
  email: string;
  name?: string; // Added for user name
  token: string;
  role: string;
  permissions?: string[];
<<<<<<< HEAD
<<<<<<< HEAD
  driverId?: number; // Added for driver association
=======
  name?:string;
  profileImage?: string;
>>>>>>> dev
=======
  driverId?: number; // Added for driver association
  profileImage?: string; // Added for profile image
>>>>>>> 937f419bcbe87468db350f976736fa00128c160d
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