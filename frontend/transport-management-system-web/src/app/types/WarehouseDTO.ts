export interface WarehouseDTO {
  Id: number;
  Code: string;
  Name: string;
  Type: number;
  Zones: ZoneDTO[];
}

export interface ZoneDTO {
  Id: number;
  Code: string;
  Name: string;
  ZoneType: number;
}

export interface WarehouseSearchOptions {
  Search?: string;
  Type?: number;
  PageIndex?: number;
  PageSize?: number;
  SortField?: string;
  SortDirection?: string;
}