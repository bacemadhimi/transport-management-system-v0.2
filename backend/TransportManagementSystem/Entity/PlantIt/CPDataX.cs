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
        public int LastModified { get; set; }

        [Column("bActivated")]
        public bool Activated { get; set; }

        [Column("szName")]
        public string Name { get; set; }

        [Column("szDescription")]
        public string Description { get; set; }

        [Column("uidKey")]
        public Guid UidKey { get; set; }

        [Column("nParentLink")]
        public int ParentLink { get; set; }

        [Column("nStructureLink")]
        public int StructureLink { get; set; }
    }

}
