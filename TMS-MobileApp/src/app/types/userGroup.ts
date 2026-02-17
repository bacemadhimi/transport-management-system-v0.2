export interface IUserGroup {
  id: number;
  name: string;
  createdAt?: Date;
  updatedAt?: Date;
  permissions?: Record<string, boolean>;
isSystemGroup?: boolean;   
}