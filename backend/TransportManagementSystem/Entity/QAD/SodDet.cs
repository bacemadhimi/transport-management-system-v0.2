using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TransportManagementSystem.Entity.QAD
{
    [Table("sod_det")]
    public class SodDet
    {
        [Key]
        [Column("sod_id")]
        public int SodId { get; set; }

        [Column("sod_so_id")]
        public int SoId { get; set; }

        [ForeignKey("SoId")]
        public SoMstr SoMstr { get; set; } 

        [Column("sod_line")]
        public int Line { get; set; }

        [Column("sod_part")]
        public string Part { get; set; }

        [Column("sod_um")]
        public string Um { get; set; }

        [Column("sod_qty_ord")]
        public decimal QtyOrd { get; set; }

        [Column("sod_qty_rcvd")]
        public decimal QtyRcvd { get; set; }

        [Column("sod_um_conv")]
        public decimal UmConv { get; set; }

        [Column("sod_due_date")]
        public DateTime DueDate { get; set; }

        [Column("sod_status")]
        public string Status { get; set; }
    }

}
