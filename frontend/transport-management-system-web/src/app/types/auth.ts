export interface IAuthToken {
  id: number;
  email: string;
  token: string;
  roles: string[];         
  permissions: string[];    
}
