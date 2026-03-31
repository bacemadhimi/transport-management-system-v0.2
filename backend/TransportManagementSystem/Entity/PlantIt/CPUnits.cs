// Dans QadToTmsSyncService.Entity.PlantIt, ajoutez cette classe
using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TransportManagementSystem.Entity.PlantIt
{
    [Table("tblCPUnits")]
    public class CPUnits
    {
        [Key]
        [Column("nKey")]
        public int Key { get; set; }

        [Column("nTextLink")]
        public int TextLink { get; set; }

        [Column("szShortName")]
        [MaxLength(10)]
        public string ShortName { get; set; }

        [Column("nBaseunitLink")]
        public int BaseUnitLink { get; set; }

        [Column("nGradient")]
        public double Gradient { get; set; }

        [Column("nOrdinate")]
        public double Ordinate { get; set; }

        [Column("tLastModified")]
        public int LastModified { get; set; }
    }
}