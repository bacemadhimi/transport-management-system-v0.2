using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TransportManagementSystem.Entity
{
    public class SyncHistoryDetail
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int Id { get; set; }

        [Required]
        public int SyncHistoryId { get; set; } 

        [ForeignKey("SyncHistoryId")]
        public SyncHistory SyncHistory { get; set; }

        [Required]
        public string OrderNumber { get; set; } 

        public string Status { get; set; } 

        public string Notes { get; set; } 
    }
}
