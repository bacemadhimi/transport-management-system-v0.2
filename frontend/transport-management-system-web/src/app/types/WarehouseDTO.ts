// warehouse-plantit.model.ts
export interface WarehousePlantIt {
  key: number;
  dataXLink: number;
  lastModified: Date;
  processUnitClassLink: number;
  pipeCount: number;
  supportMultipleDocking: boolean;
  containerParallelUsageMode: boolean;
  warehouseCode: string;
  warehouseName: string;
  isActivated: boolean;
  uidKey: string;
  parentLink: number;
  structureLink: number;
  parentCode?: string;
  parentName?: string;
  parentIsActivated?: boolean;
}

export interface WarehouseSearchOptions {
  search?: string;
  status?: boolean;
  processUnitClassLink?: number;
  warehouseType?: number;  // NOUVEAU: Remplacer processUnitClassLink
  parentLink?: number;
  pageIndex?: number;
  pageSize?: number;
  sortField?: string;
  sortDirection?: string;
}