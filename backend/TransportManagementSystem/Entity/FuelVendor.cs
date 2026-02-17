using System.ComponentModel.DataAnnotations;

namespace TransportManagementSystem.Entity
{
    public class FuelVendor
    {
        [Key]
        public int Id { get; set; }
        [Required]
        public string Name { get; set; }
    }
}
