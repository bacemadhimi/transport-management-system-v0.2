// WarehousePlantItDTO.cs
public class WarehousePlantItDTO
{
    // Données de tblPMMWarehouse
    public int Key { get; set; }
    public int DataXLink { get; set; }
    public int LastModified { get; set; }
    public int ProcessUnitClassLink { get; set; }
    public int PipeCount { get; set; }
    public bool SupportMultipleDocking { get; set; }
    public bool ContainerParallelUsageMode { get; set; }

    // Données de tblCPDataX (entrepôt)
    public string WarehouseCode { get; set; }
    public string WarehouseName { get; set; }
    public bool IsActivated { get; set; }
    public Guid UidKey { get; set; }
    public int ParentLink { get; set; }
    public int StructureLink { get; set; }

    // Données du parent (tblCPDataX parent)
    public string ParentCode { get; set; }
    public string ParentName { get; set; }
    public bool? ParentIsActivated { get; set; }
}

// WarehouseSearchOptions.cs
// WarehouseSearchOptions.cs
public class WarehouseSearchOptions
{
    public string? Search { get; set; }
    public bool? Status { get; set; }
    public int? ProcessUnitClassLink { get; set; }  // Garder pour compatibilité
    public int? WarehouseType { get; set; }  // NOUVEAU: Type d'entrepôt (70603 ou 70604)
    public int? ParentLink { get; set; }
    public int? PageIndex { get; set; }
    public int? PageSize { get; set; }
    public string? SortField { get; set; }
    public string? SortDirection { get; set; }
}