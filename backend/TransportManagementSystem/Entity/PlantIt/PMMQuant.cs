using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
namespace TransportManagementSystem.Entity.PlantIt
{
    [Table("tblPMMQuant")]
    public class PMMQuant
    {
        [Key]
        [Column("nKey")]
        public int Key { get; set; }

        [Column("nStorageLocationLink")]
        public int StorageLocationLink { get; set; }

        [Column("nMaterialLink")]
        public int MaterialLink { get; set; }

        [Column("szSupplierBatchNumber")]
        public string SupplierBatchNumber { get; set; }

        [Column("szApproachMaterialNumber")]
        public string ApproachMaterialNumber { get; set; }

        [Column("tExpiration")]
        public int Expiration { get; set; }  // utIdcTime = int

        [Column("bIsCanceled")]
        public bool IsCanceled { get; set; }

        [Column("nReservedQuantity")]
        public decimal ReservedQuantity { get; set; }

        [Column("nLockedQuantity")]
        public decimal LockedQuantity { get; set; }

        [Column("nTotalQuantity")]
        public decimal TotalQuantity { get; set; }

        // Colonne calculée - doit être incluse mais avec un setter privé ou ignoré
        [Column("nFreeQuantity")]
        public decimal FreeQuantity { get; set; }  // Colonne calculée

        [Column("tCreated")]
        public int Created { get; set; }  // utIdcTime = int

        [Column("tSpent")]
        public int Spent { get; set; }  // utIdcTime = int

        // Colonne calculée - doit être incluse mais avec un setter privé ou ignoré
        [Column("bIsSpent")]
        public bool IsSpent { get; set; }  // Colonne calculée

        [Column("nContainerLink")]
        public int ContainerLink { get; set; }

        [Column("tLastModified")]
        public int LastModified { get; set; }  // utIdcTime = int

        [Column("bLockedByExpiration")]
        public bool LockedByExpiration { get; set; }

        [Column("szCompleteUserName")]
        public string CompleteUserName { get; set; }

        [Column("tCompleted")]
        public int Completed { get; set; }  // utIdcTime = int
    }
}