// WarehousePlantItDTO.cs
using System;

namespace TransportManagementSystem.Models
{
    public class WarehousePlantItDTO
    {
        // Propriétés de tblPMMWarehouse
        public int Key { get; set; }
        public int DataXLink { get; set; }
        public DateTime LastModified { get; set; }
        public int ProcessUnitClassLink { get; set; }
        public int PipeCount { get; set; }
        public bool SupportMultipleDocking { get; set; }
        public bool ContainerParallelUsageMode { get; set; }

        // Propriétés de tblCPDataX
        public string WarehouseCode { get; set; }      // szName
        public string WarehouseName { get; set; }      // szDescription
        public bool IsActivated { get; set; }          // bActivated
        public Guid UidKey { get; set; }               // uidKey
        public int ParentLink { get; set; }            // nParentLink
        public int StructureLink { get; set; }         // nStructureLink
    }

    public class WarehouseSearchOptions
    {
        public string? Search { get; set; }
        public bool? Status { get; set; }
        public int? ProcessUnitClassLink { get; set; }
        public int? PageIndex { get; set; }
        public int? PageSize { get; set; }
        public string? SortField { get; set; }
        public string? SortDirection { get; set; }
    }
}