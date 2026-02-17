using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TransportManagementSystem.Entity
{
    public class MarqueTruck
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int Id { get; set; }

        [Required]
        public string Name { get; set; }

        // Navigation property (one brand → many trucks)
        public ICollection<Truck>? Trucks { get; set; }
    }
}
