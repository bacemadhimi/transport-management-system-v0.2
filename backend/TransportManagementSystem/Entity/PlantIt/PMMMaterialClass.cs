using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Text;
using System.Threading.Tasks;


namespace TransportManagementSystem.Entity.PlantIt
{
    [Table("tblPMMMaterialClass")]
    public class PMMMaterialClass
    {
        [Key]
        [Column("nKey")]
        public int Key { get; set; }

        [Column("nGroupLink")]
        public int GroupLink { get; set; }

        [Column("szName")]
        public string Name { get; set; }

        [Column("nTextLink")]
        public int TextLink { get; set; }

        [Column("nMemoLink")]
        public int MemoLink { get; set; }

        [Column("szUserParam1")]
        public string UserParam1 { get; set; }

        [Column("szUserParam2")]
        public string UserParam2 { get; set; }

        [Column("tLastModified")]
        public int LastModified { get; set; }
    }
}
