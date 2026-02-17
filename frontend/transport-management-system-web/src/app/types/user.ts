export interface IUser {
  id: number;
  email: string;
  password?: string;

  userGroups?: { id: number; name: string }[]; 
  userGroupIds?: number[];                     

  profileImage?: string;
  name?: string;
  phone?: string;
  phoneCountry?: string;

  createdAt?: Date;
  updatedAt?: Date;
}
