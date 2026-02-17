using System.ComponentModel.DataAnnotations;

namespace TransportManagementSystem.Entity
{
    public class City
    {
        public int Id { get; set; }

        [Required]
        public string Name { get; set; } = string.Empty;

        public bool IsActive { get; set; } = true;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        public int? ZoneId { get; set; }
        public Zone? Zone { get; set; }
        public ICollection<Driver> Drivers { get; set; } = new List<Driver>();
        public ICollection<Convoyeur> Convoyeurs { get; set; } = new List<Convoyeur>();
    }
}
