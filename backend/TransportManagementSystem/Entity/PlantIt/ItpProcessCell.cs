using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TransportManagementSystem.Entity.PlantIt
{
    [Table("tblItpProcessCell", Schema = "dbo")]
    public class ItpProcessCell
    {
        [Key]
        [Column("nKey")]
        public byte Key { get; set; }  // utItpProcessCellID = tinyint → byte

        [Column("nDataXLink")]
        public int DataXLink { get; set; }  // utIdcHCPDataX = int → int

        [Column("nDefaultStationLink")]
        public short DefaultStationLink { get; set; }  // utIdcStationID = smallint → short

        [Column("nSimulationTime")]
        public byte SimulationTime { get; set; }  // tinyint → byte

        [Column("bUserBatchRequest")]
        public bool UserBatchRequest { get; set; }  // bit → bool

        [Column("nPrecision")]
        public byte Precision { get; set; }  // tinyint → byte

        [Column("nVisibleRezFolders")]
        public int VisibleRezFolders { get; set; }  // int → int

        [Column("nBatchBlockMode")]
        public byte BatchBlockMode { get; set; }  // utItpBatchBlockMode = tinyint → byte

        [Column("nMaterialCheckMode")]
        public byte MaterialCheckMode { get; set; }  // utItpBatchMaterialCheckMode = tinyint → byte

        [Column("nTUReservation")]
        public int TUReservation { get; set; }  // int → int

        [Column("nLockMode")]
        public byte LockMode { get; set; }  // utItpProcessUnitLockMode = tinyint → byte

        [Column("tLastModified")]
        public int? LastModified { get; set; }  // int (timestamp Unix)

        [Column("szSiteLocalName")]
        public string SiteLocalName { get; set; }  // nvarchar → string

        [Column("szSiteGlobalName")]
        public string SiteGlobalName { get; set; }

        [Column("szAreaLocalName")]
        public string AreaLocalName { get; set; }

        [Column("szAreaGlobalName")]
        public string AreaGlobalName { get; set; }
    }
}