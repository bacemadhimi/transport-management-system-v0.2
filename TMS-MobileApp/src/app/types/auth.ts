export interface IAuthToken {
  id: number;
  email: string;
  token: string;
  role: string;
  permissions?: string[];
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