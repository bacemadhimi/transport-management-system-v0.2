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
  EMPLOYEE_CATEGORY = 'EMPLOYEE_CATEGORY'
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