using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TransportManagementSystem.Entity.QAD
{
    [Table("cm_mstr")]
    public class CmMstr
    {
        [Key]
        [Column("cm_id")]
        public int CmId { get; set; }

        [Column("BusinessRelationName1")]
        public string? Name1 { get; set; }

        [Column("BusinessRelationName2")]
        public string? Name2 { get; set; }

        [Column("AddressStreet1")]
        public string? Street1 { get; set; }

        [Column("AddressCity")]
        public string? City { get; set; }

        [Column("CountryCode")]
        public string? CountryCode { get; set; }

        [Column("ZoneId")]
        public int? ZoneId { get; set; }


        public ICollection<SoMstr> SalesOrders { get; set; } = new List<SoMstr>();
    }
}
