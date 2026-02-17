export interface ICity {
  id: number;
  name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  zoneId: number;
  zoneName?: string;
}

export interface ICreateCityDto {
  name: string;
  isActive?: boolean;
  zoneId:number;
}

export interface IUpdateCityDto {
  name?: string;
  isActive?: boolean;
  zoneId:number;
}

export interface ApiResponses<T> {
  success: boolean;
  message: string;
  data: T;
}