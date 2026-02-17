using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TransportManagementSystem.Entity.QAD
{
    [Table("so_mstr")]
    public class SoMstr
    {
        [Key]
        [Column("so_id")]
        public int SoId { get; set; }

        [Required]
        [Column("so_nbr")]
        public string SoNbr { get; set; }

        [Required]
        [Column("so_site")]
        public string SoSite { get; set; }

        [Column("so_domain")]
        public string SoDomain { get; set; }

        // FK → cm_mstr.cm_id
        [Column("so_cust")]
        public int CustomerId { get; set; }

        [ForeignKey("CustomerId")]
        public CmMstr Customer { get; set; }

        [Column("so_shipto")]
        public string SoShipTo { get; set; }

        [Required]
        [Column("so_ord_date")]
        public DateTime SoOrdDate { get; set; }

        [Column("so_due_date")]
        public DateTime? SoDueDate { get; set; }

        [Required]
        [Column("so_stat")]
        public string SoStat { get; set; }

        [Column("so_priority")]
        public int? SoPriority { get; set; }

        [Column("so_carrier")]
        public string SoCarrier { get; set; }

        [Column("so_route")]
        public string SoRoute { get; set; }

        [Column("so_curr")]
        public string SoCurr { get; set; }

        [Column("so_total_amt")]
        public decimal? SoTotalAmount { get; set; }

        [Column("so_created_by")]
        public string SoCreatedBy { get; set; }

        [Column("so_created_date")]
        public DateTime? SoCreatedDate { get; set; }

        [Column("so_updated_date")]
        public DateTime? SoUpdatedDate { get; set; }

        [Column("so_delivery_date")]
        public DateTime? SoDeliveryDate { get; set; }

        [Column("weight_per_carton", TypeName = "decimal(10,2)")]
        public decimal? WeightPerCarton { get; set; }

        [Column("weight_per_palette", TypeName = "decimal(10,2)")]
        public decimal? WeightPerPalette { get; set; }

        [Column("total_weight", TypeName = "decimal(10,2)")]
        public decimal? TotalWeight { get; set; }

        [Column("weight_unit")]
        [StringLength(20)]
        public string WeightUnit { get; set; } = "palette"; // par défaut
        public ICollection<SodDet> SodDets { get; set; } = new List<SodDet>();
    }
}