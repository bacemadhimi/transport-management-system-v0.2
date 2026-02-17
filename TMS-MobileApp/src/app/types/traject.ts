// types/traject.ts
export interface ITraject {
  id: number;
  name: string;
  createdAt: string;
  updatedAt?: string;
  points: ITrajectPoint[];
  startLocationId: number;
  endLocationId: number;
  isPredefined: boolean;

}

export interface ITrajectPoint {
  id?: number;
  location?: string;
  order: number;
  trajectId?: number;
  clientId?: number;
  clientName?: string;
}

export interface ICreateTrajectDto {
  name: string;
  points: ICreateTrajectPointDto[];
}

export interface ICreateTrajectPointDto {
  location: string;
  order: number;
  clientId?: number;
}

export interface IUpdateTrajectDto {
  name?: string;
  points?: ICreateTrajectPointDto[];
}
export interface IPagedTrajectData {
  data: ITraject[];
  totalData: number;
}

// Options pour le formulaire
export interface ITrajectFormData {
  trajectId?: number;
}