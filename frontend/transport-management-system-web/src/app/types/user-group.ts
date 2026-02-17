export interface IUserGroup {
  id: number;
  name: string;
  permissions: Record<string, boolean>;
  createdAt?: string; 
  updatedAt?: string; 
}
