using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TransportManagementSystem.Entity.PlantIt
{
    [Table("tblItpProcessLine", Schema = "dbo")]
    public class ItpProcessLine
    {
        [Key]
        [Column("nKey")]
        public int Key { get; set; }  // utItpProcessLineID = int → int

        [Column("nDataXLink")]
        public int DataXLink { get; set; }  // utIdcHCPDataX = int → int

        [Column("nNumber")]
        public byte Number { get; set; }  // tinyint → byte

        [Column("nProcessCellLink")]
        public byte ProcessCellLink { get; set; }  // utItpProcessCellID = tinyint → byte

        [Column("nVisibleRezFolders")]
        public int VisibleRezFolders { get; set; }  // int → int

        [Column("nLockMode")]
        public byte LockMode { get; set; }  // utItpProcessUnitLockMode = tinyint → byte

        [Column("nMaxParallelBatches")]
        public int MaxParallelBatches { get; set; }

        [Column("nMaxGeneratedBatches")]
        public int MaxGeneratedBatches { get; set; }

        [Column("nMaxGeneratedBatchesStartMode")]
        public int MaxGeneratedBatchesStartMode { get; set; }

        [Column("tLastModified")]
        public int? LastModified { get; set; }  // int (timestamp Unix)

        [Column("nMaxCreatedBatchCount")]
        public int MaxCreatedBatchCount { get; set; }
    }
}