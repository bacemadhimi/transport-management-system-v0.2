using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TransportManagementSystem.Entity.PlantIt
{
    [Table("tblItpProcessUnit", Schema = "dbo")]
    public class ItpProcessUnit
    {
        [Key]
        [Column("nKey")]
        public int Key { get; set; }  // utIdcItemKey = int → int

        [Column("nDataXLink")]
        public int DataXLink { get; set; }  // utIdcHCPDataX = int → int

        [Column("nProcessCellLink")]
        public byte ProcessCellLink { get; set; }  // utItpProcessCellID = tinyint → byte

        [Column("nPLCRecordLink")]
        public int PLCRecordLink { get; set; }  // utIdcItemKey = int → int

        [Column("nProcessUnitClassLink")]
        public int ProcessUnitClassLink { get; set; }  // utIdcItemKey = int → int

        [Column("bStationDerived")]
        public bool StationDerived { get; set; }

        [Column("nStationLink")]
        public short StationLink { get; set; }  // utIdcStationID = smallint → short

        [Column("nNumber")]
        public short Number { get; set; }  // smallint → short

        [Column("nLockMode")]
        public byte LockMode { get; set; }  // utItpProcessUnitLockMode = tinyint → byte

        [Column("bSharedUsage")]
        public bool SharedUsage { get; set; }

        [Column("nUsageMode")]
        public byte UsageMode { get; set; }  // utItpProcessUnitUsageMode = tinyint → byte

        [Column("nAllocationMode")]
        public byte AllocationMode { get; set; }  // utItpProcessUnitAllocationMode = tinyint → byte

        [Column("nReleaseMode")]
        public byte ReleaseMode { get; set; }  // utItpProcessUnitReleaseMode = tinyint → byte

        [Column("nSyncObjectClassNo")]
        public int SyncObjectClassNo { get; set; }

        [Column("nSyncObjectRecordNo")]
        public int SyncObjectRecordNo { get; set; }

        [Column("nSourceUsageMode")]
        public byte SourceUsageMode { get; set; }  // utItpProcessUnitUsageMode = tinyint → byte

        [Column("nSourceAllocationMode")]
        public byte SourceAllocationMode { get; set; }  // utItpProcessUnitAllocationMode = tinyint → byte

        [Column("nSourceReleaseMode")]
        public byte SourceReleaseMode { get; set; }  // utItpProcessUnitReleaseMode = tinyint → byte

        [Column("nSourceSyncObjectClassNo")]
        public int SourceSyncObjectClassNo { get; set; }

        [Column("nSourceSyncObjectRecordNo")]
        public int SourceSyncObjectRecordNo { get; set; }

        [Column("nSourceResArea")]
        public byte SourceResArea { get; set; }  // tinyint → byte

        [Column("nDestinationResArea")]
        public byte DestinationResArea { get; set; }  // tinyint → byte

        [Column("tLastModified")]
        public int? LastModified { get; set; }  // int (timestamp Unix)

        [Column("nITPObjectDataXLink")]
        public int ITPObjectDataXLink { get; set; }  // utIdcHCPDataX = int → int
    }
}