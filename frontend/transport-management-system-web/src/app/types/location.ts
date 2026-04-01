export interface ILocation {
  id: number;
  name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  address:string;
  zoneName?:string;
  longitude:number;
  latitude:number;
}

export interface ICreateLocationDto {
  name: string;
  isActive?: boolean;
  address:string;
  longitude:number;
  latitude:number;
}

export interface IUpdateLocationDto {
  name?: string;
  isActive?: boolean;
  address:string;
  longitude:number;
  latitude:number;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}