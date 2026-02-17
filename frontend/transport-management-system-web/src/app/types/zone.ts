export interface IZone {
  id: number;
  name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ICreateZoneDto {
  name: string;
  isActive?: boolean;
}

export interface IUpdateZoneDto {
  name?: string;
  isActive?: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

