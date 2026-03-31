using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TransportManagementSystem.Entity.PlantIt
{
    [Table("tblIdcLanguageText")]
    [PrimaryKey(nameof(Key), nameof(LanguageId))]  // Clé composite
    public class IdcLanguageText
    {
        [Key]
        [Column("nKey")]
        public int Key { get; set; }

        [Key]
        [Column("nLanguageId")]
        public int LanguageId { get; set; }

        [Column("szText")]
        public string Text { get; set; }

        [Column("nType")]
        public short Type { get; set; }

        [Column("tLastModified")]
        public int LastModified { get; set; }
    }
}
