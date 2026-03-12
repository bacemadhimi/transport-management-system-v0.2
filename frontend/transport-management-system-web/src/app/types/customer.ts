import { IGeographicalEntity } from './general-settings';

export interface ICustomer {
  id: number;
  name: string;
  phone: string;
  phoneCountry: string;
  email: string;
  matricule: string;
  contact: string;
  sourceSystem?: string;


  geographicalEntities?: IGeographicalEntityWithDetails[];


  createdAt?: Date;
  updatedAt?: Date;
}

export interface IGeographicalEntityWithDetails {
  geographicalEntityId: number;
  geographicalEntityName?: string;
  levelName?: string;
  levelNumber?: number;
  latitude?: number;
  longitude?: number;
}