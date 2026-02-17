using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TransportManagementSystem.Entity
{
    public class SyncHistory
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int Id { get; set; }

        [Required]
        public string Source { get; set; } 

        [Required]
        public DateTime SyncDate { get; set; }

        public int TotalRecords { get; set; }

        public int ProcessedRecords { get; set; }

    
        [Required]
        public string Status { get; set; }

        public ICollection<SyncHistoryDetail> Details { get; set; } = new List<SyncHistoryDetail>();
    }

}
