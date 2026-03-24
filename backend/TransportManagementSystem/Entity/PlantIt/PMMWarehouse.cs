namespace TransportManagementSystem.Entity.PlantIt
{
    using System;
    using System.ComponentModel.DataAnnotations;
    using System.ComponentModel.DataAnnotations.Schema;

    namespace TMS.Models
    {
        [Table("tblPMMWarehouse", Schema = "dbo")]
        public class PMMWarehouse
        {
            [Key]
            [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
            [Column("nKey")]
            public int Key { get; set; }

            [Column("nDataXLink")]
            public int DataXLink { get; set; }

            [Column("tLastModified")]
            public DateTime LastModified { get; set; }

            [Column("nProcessUnitClassLink")]
            public int ProcessUnitClassLink { get; set; }

            [Column("nPipeCount")]
            public int PipeCount { get; set; }

            [Column("bSupportMultipleDocking")]
            public bool SupportMultipleDocking { get; set; }

            [Column("bContainerParallelUsageMode")]
            public bool ContainerParallelUsageMode { get; set; }

            // Navigation properties
            [ForeignKey("DataXLink")]
            public virtual CPDataX CPData { get; set; }
        }
    }
    public enum WarehouseType
    {
        RawMaterial,
        FinishedProduct
    }
}
