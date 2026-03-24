using TransportManagementSystem.Entity.PlantIt;

namespace TransportManagementSystem.Models
{
    public class WarehouseSearchOptions
    {
        public string? Search { get; set; }       // texte libre
        public WarehouseType? Type { get; set; }  // RawMaterial ou FinishedProduct

        public int? PageIndex { get; set; }
        public int? PageSize { get; set; } = 10;

        public string? SortField { get; set; }
        public string? SortDirection { get; set; } = "desc";
    }
}
