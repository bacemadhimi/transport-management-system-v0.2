using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TransportManagementSystem.Entity.PlantIt
{
    [Table("tblPMMStorageLocation", Schema = "dbo")]
    public class PMMStorageLocation
    {
        [Key]
        [Column("nKey")]
        public int Key { get; set; }  // utIdcItemKey = int → int

        [Column("nProcessUnitLink")]
        public int? ProcessUnitLink { get; set; }  // utIdcItemKey = int? → int?

        [Column("nWarehouseLink")]
        public int? WarehouseLink { get; set; }  // utIdcItemKey = int? → int?

        [Column("nCapacity")]
        public double? Capacity { get; set; }  // float → double?

        [Column("nVolume")]
        public double? Volume { get; set; }

        [Column("bProductAdminQuantity")]
        public bool? ProductAdminQuantity { get; set; }

        [Column("bForceEmpty")]
        public bool? ForceEmpty { get; set; }

        [Column("nDosagePriority")]
        public int? DosagePriority { get; set; }

        [Column("bSupportAutoSiloSubst")]
        public bool? SupportAutoSiloSubst { get; set; }

        [Column("bSupportManualSiloSubst")]
        public bool? SupportManualSiloSubst { get; set; }

        [Column("bSingleUse")]
        public bool? SingleUse { get; set; }

        [Column("eExtractionType")]
        public byte? ExtractionType { get; set; }  // utPMMExtractionType = tinyint → byte?

        [Column("nQuantity")]
        public double? Quantity { get; set; }

        [Column("bFillingLocked")]
        public bool? FillingLocked { get; set; }

        [Column("bExtractionLocked")]
        public bool? ExtractionLocked { get; set; }

        [Column("nActualContainerLink")]
        public int? ActualContainerLink { get; set; }  // utIdcItemKey = int? → int?

        [Column("bMustNotBeDocked")]
        public bool? MustNotBeDocked { get; set; }

        [Column("tLastModified")]
        public int? LastModified { get; set; }  // int (timestamp Unix)

        [Column("bUnlimitedStock")]
        public bool? UnlimitedStock { get; set; }

        [Column("ucLoadCellPointer")]
        public byte[] LoadCellPointer { get; set; }  // utITPPointer = binary → byte[]

        [Column("bEnableQuantOverbooking")]
        public bool? EnableQuantOverbooking { get; set; }

        [Column("nMaxQuants")]
        public int? MaxQuants { get; set; }

        [Column("nMaxBookings")]
        public int? MaxBookings { get; set; }

        [Column("nTooManyBookingsStrategy")]
        public int? TooManyBookingsStrategy { get; set; }

        [Column("bInvisibleInStockOverview")]
        public bool? InvisibleInStockOverview { get; set; }
    }
}