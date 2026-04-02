export interface StorageLocationDetail {
  depotName: string;
  depotDescription: string;
  depotKey: number;
  lieuStockageNom: string;
  lieuStockageDescription: string;
  lieuStockageKey: number;
  capacite: number;
  volume: number;
  materiauDesignation: string;
  materiauKey: number;
  classeMateriau: string;
  groupeMateriau: string;
  descriptionMateriau: string;
  densite: number;
  stockTotal: number;
  stockDisponible: number;
  stockBloque: number;
  stockReserve: number;
  dateLimiteConsommation: Date | null;
  numLotFournisseur: string;
  numMaterielApproche: string;
  statutQuant: string;
  blocageExpiration: string;
  estConsomme: string;
}

export interface StorageLocationSearchOptions {
  warehouseKey: number;
  search?: string;
  materialSearch?: string;
  pageIndex?: number;
  pageSize?: number;
  sortField?: string;
  sortDirection?: string;
}