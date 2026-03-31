using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TransportManagementSystem.Entity.PlantIt
{
    [Table("tblPMMMaterialGroup")]
    public class PMMMaterialGroup
    {
        [Key]
        [Column("nKey")]
        public int Key { get; set; }

        [Column("szName")]
        public string Name { get; set; }

        [Column("nParentLink")]
        public int ParentLink { get; set; }

        [Column("nTextLink")]
        public int TextLink { get; set; }

        [Column("nMemoLink")]
        public int MemoLink { get; set; }

        [Column("szUserParam1")]
        public string UserParam1 { get; set; }

        [Column("szUserParam2")]
        public string UserParam2 { get; set; }

        [Column("tLastModified")]
        public int LastModified { get; set; }  // utIdcTime = int
    }
}