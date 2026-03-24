// warehouse-plantit.model.ts
export interface WarehousePlantIt {
  key: number;
  dataXLink: number;
  lastModified: Date;
  processUnitClassLink: number;
  pipeCount: number;
  supportMultipleDocking: boolean;
  containerParallelUsageMode: boolean;
  warehouseCode: string;      // Nom du dépôt (de tblCPDataX.szName)
  warehouseName: string;      // Description (de tblCPDataX.szDescription)
  isActivated: boolean;
  uidKey: string;
  parentLink: number;
  structureLink: number;
}

export interface WarehouseSearchOptions {
  search?: string;
  status?: boolean;
  processUnitClassLink?: number;
  pageIndex?: number;
  pageSize?: number;
  sortField?: string;
  sortDirection?: string;
}