using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using TransportManagementSystem.Entity.PlantIt.TMS.Models;

namespace TransportManagementSystem.Entity.PlantIt
{
    [Table("tblCPDataX", Schema = "dbo")]
    public class CPDataX
    {
        [Key]
        [Column("nKey")]
        public int Key { get; set; }

        [Column("tLastModified")]
        public DateTime LastModified { get; set; }

        [Column("bActivated")]
        public bool Activated { get; set; }

        [Column("nServerLink")]
        public int ServerLink { get; set; }

        [Column("nParentLink")]
        public int ParentLink { get; set; }

        [Column("szParentComponent")]
        public string ParentComponent { get; set; }

        [Column("nStructureLink")]
        public int StructureLink { get; set; }

        [Column("bPersistent")]
        public bool Persistent { get; set; }

        [Column("szName")]
        public string Name { get; set; }

        [Column("nOffset")]
        public int Offset { get; set; }

        [Column("nRawOffset")]
        public int RawOffset { get; set; }

        [Column("nRawLen")]
        public int RawLen { get; set; }

        [Column("bReadOnly")]
        public bool ReadOnly { get; set; }

        [Column("nRawFormat")]
        public byte RawFormat { get; set; }

        [Column("nDataType")]
        public int DataType { get; set; }

        [Column("nBrandArea")]
        public int BrandArea { get; set; }

        [Column("bBrandAreaDerived")]
        public bool BrandAreaDerived { get; set; }

        [Column("nShiftArea")]
        public int ShiftArea { get; set; }

        [Column("bShiftAreaDerived")]
        public bool ShiftAreaDerived { get; set; }

        [Column("nLocationKey1")]
        public byte LocationKey1 { get; set; }

        [Column("nLocationKey2")]
        public byte LocationKey2 { get; set; }

        [Column("nLocationKey3")]
        public byte LocationKey3 { get; set; }

        [Column("nLocationKey4")]
        public byte LocationKey4 { get; set; }

        [Column("nSourceType")]
        public int SourceType { get; set; }

        [Column("bStandardize")]
        public bool Standardize { get; set; }

        [Column("nGradient")]
        public double Gradient { get; set; }

        [Column("nOrdinate")]
        public double Ordinate { get; set; }

        [Column("nByteOrder")]
        public byte ByteOrder { get; set; }

        [Column("bBitMask")]
        public bool BitMask { get; set; }

        [Column("nFromBit")]
        public byte FromBit { get; set; }

        [Column("nCountBit")]
        public byte CountBit { get; set; }

        [Column("nCountChildItems")]
        public int CountChildItems { get; set; }

        [Column("nLanguageTextLink")]
        public int LanguageTextLink { get; set; }

        [Column("szDescription")]
        public string Description { get; set; }

        [Column("nObjectNameLink")]
        public int ObjectNameLink { get; set; }

        [Column("nUpdateRateInMSecs")]
        public int UpdateRateInMSecs { get; set; }

        [Column("uidKey")]
        public Guid UidKey { get; set; }

        [DatabaseGenerated(DatabaseGeneratedOption.Computed)]
        [Column("csGUIDKey")]
        public int CsGUIDKey { get; set; }

        [Column("bOpcVisible")]
        public bool OpcVisible { get; set; }

        [Column("nOpcAccessMode")]
        public int OpcAccessMode { get; set; }

        // Navigation property
        public virtual PMMWarehouse Warehouse { get; set; }
    }

}
