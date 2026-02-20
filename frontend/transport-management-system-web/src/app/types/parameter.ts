export interface SearchOptions {
  pageIndex?: number;
  pageSize?: number;
  search?: string;
  parameterType?:string;
}

export interface PagedData<T> {
  totalData: number;
  data: T[];
}

export enum ParameterType {
  GOVERNORATE = 'GOVERNORATE',
  REGION = 'REGION',
  ZONE = 'ZONE',
  EmployeeCategorie = 'EmployeeCategorie'
}

export interface IGeneralSettings {
  id: number;
  parameterType: ParameterType;
  parameterCode: string;
  description: string;
}

export interface IGeneralSettingsDto {
  id?: number;
  parameterType: ParameterType;
  parameterCode: string;
  description: string;
}