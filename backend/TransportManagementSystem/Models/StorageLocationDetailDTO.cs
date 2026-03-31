using System;

namespace TransportManagementSystem.Models
{
    public class StorageLocationDetailDTO
    {
        // Informations du dépôt
        public string DepotName { get; set; }
        public string DepotDescription { get; set; }
        public int DepotKey { get; set; }

        // Informations du lieu de stockage
        public string LieuStockageNom { get; set; }
        public string LieuStockageDescription { get; set; }
        public int LieuStockageKey { get; set; }
        public double? Capacite { get; set; }
        public double? Volume { get; set; }

        // Informations du matériau
        public int? MateriauKey { get; set; }
        public string MateriauDesignation { get; set; }
        public string ClasseMateriau { get; set; }
        public string GroupeMateriau { get; set; }
        public string DescriptionMateriau { get; set; }
        public double? Densite { get; set; }

        // Quantités et stocks
        public decimal StockTotal { get; set; }
        public decimal StockDisponible { get; set; }
        public decimal StockBloque { get; set; }
        public decimal StockReserve { get; set; }

        // Dates
        public DateTime? DateLimiteConsommation { get; set; }

        // Informations du lot
        public string NumLotFournisseur { get; set; }
        public string NumMaterielApproche { get; set; }
        public string StatutQuant { get; set; }
        public string BlocageExpiration { get; set; }
        public string EstConsomme { get; set; }
    }

    public class StorageLocationSearchOptions
    {
        public int WarehouseKey { get; set; }
        public string? Search { get; set; }
        public string? MaterialSearch { get; set; }
        public int? PageIndex { get; set; }
        public int? PageSize { get; set; }
        public string? SortField { get; set; }
        public string? SortDirection { get; set; }
    }
}