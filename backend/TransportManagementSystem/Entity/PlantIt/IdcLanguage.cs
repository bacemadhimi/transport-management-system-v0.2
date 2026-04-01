using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TransportManagementSystem.Entity.PlantIt
{
    [Table("tblIdcLanguage")]
    public class IdcLanguage
    {
        [Key]
        [Column("nKey")]
        public int Key { get; set; }

        [Column("szName")]
        public string Name { get; set; }

        [Column("tLastModified")]
        public int LastModified { get; set; }

        [Column("bDefault")]
        public bool IsDefault { get; set; }

        [Column("bIsGlobal")]
        public bool IsGlobal { get; set; }

        [Column("bIsLocal")]
        public bool IsLocal { get; set; }

        [Column("nSubLanguage")]
        public int SubLanguage { get; set; }

        [Column("bIsUILanguage")]
        public bool IsUILanguage { get; set; }

        [Column("szUILocaleName")]
        public string UILocaleName { get; set; }
    }
}
