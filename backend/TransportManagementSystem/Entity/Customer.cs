using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TransportManagementSystem.Entity
{
    public class Customer
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int Id { get; set; }

        [Required]
        public DataSource SourceSystem { get; set; } = DataSource.TMS;

        [StringLength(50)]
        public string? ExternalId { get; set; }
        public string Name { get; set; }      
        public string? Phone { get; set; }
        public string? City { get; set; }
        public string Email { get; set; }
        public string Adress { get; set; }

        [Required]
        public string Matricule { get; set; }
        public string? Gouvernorat { get; set; }
        public string Contact { get; set; }
        public ICollection<Order> Orders { get; set; } = new List<Order>();
        public int? ZoneId { get; set; }
        public Zone? Zone { get; set; }

    }
}
