using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TransportManagementSystem.Entity.PlantIt
{
    [Table("tblItpProcessUnitClass", Schema = "dbo")]
    public class ItpProcessUnitClass
    {
        [Key]
        [Column("nKey")]
        public int Key { get; set; }  // utIdcItemKey = int → int

        [Column("nNumber")]
        public short Number { get; set; }  // smallint → short

        [Column("szName")]
        public string Name { get; set; }  // utIdcItemName = nvarchar → string

        [Column("nType")]
        public byte Type { get; set; }  // utItpProcessUnitClassType = tinyint → byte

        [Column("nSubType")]
        public byte SubType { get; set; }  // utItpProcessUnitSubType = tinyint → byte

        [Column("nGroupLink")]
        public int GroupLink { get; set; }  // utIdcItemKey = int → int

        [Column("nTextLink")]
        public int TextLink { get; set; }  // utIdcItemKey = int → int

        [Column("nMemoLink")]
        public int MemoLink { get; set; }  // utIdcItemKey = int → int

        [Column("szUserParam1")]
        public string UserParam1 { get; set; }  // utIdcItemName = nvarchar → string

        [Column("szUserParam2")]
        public string UserParam2 { get; set; }

        [Column("tLastModified")]
        public int? LastModified { get; set; }  // int (timestamp Unix)

        [Column("nStorageMMType")]
        public short StorageMMType { get; set; }  // utItpProcessUnitStorageMMType = smallint → short

        [Column("bTankFarm")]
        public bool TankFarm { get; set; }

        [Column("bReusableContainer")]
        public bool ReusableContainer { get; set; }

        [Column("szUserDlgName")]
        public string UserDlgName { get; set; }

        [Column("nStationTypeLink")]
        public int StationTypeLink { get; set; }  // utIdcItemKey = int → int

        [Column("nHostItpObjClassNo")]
        public int HostItpObjClassNo { get; set; }

        [Column("bIsITPProxyClass")]
        public bool IsITPProxyClass { get; set; }

        [Column("bExtendedTransferWays")]
        public bool ExtendedTransferWays { get; set; }
    }
}