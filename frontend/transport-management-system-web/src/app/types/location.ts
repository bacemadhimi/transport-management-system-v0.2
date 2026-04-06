// location.ts
export interface ILocation {
  id: number;
  name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  zoneName?: string;
  geographicalEntities?: ILocationGeographicalEntity[];
}

export interface ILocationGeographicalEntity {
  geographicalEntityId: number;
  name?: string;
}

export interface ICreateLocationDto {
  name: string;
  geographicalEntities?: ILocationGeographicalEntity[];
  isActive?: boolean;
}

export interface IUpdateLocationDto {
  name?: string;
  geographicalEntities?: ILocationGeographicalEntity[];
  isActive?: boolean;
}
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}