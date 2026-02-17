using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TransportManagementSystem.Entity;

public class Truck
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int Id { get; set; }

    [Required]
    public string Immatriculation { get; set; }

    [Required]
    public string CapacityUnit { get; set; } = "tonnes";
    [Required]
    public int Capacity { get; set; }

    [Required]
    public DateTime TechnicalVisitDate { get; set; }

    [Required]
    public string Brand { get; set; } 

    [Required]
    public string Status { get; set; }

    [Required]
    public string Color { get; set; }

    public string? ImageBase64 { get; set; }
    public bool IsEnable { get; set; } = true;
    public virtual ICollection<TruckAvailability>? Availabilities { get; set; }
    public int? ZoneId { get; set; }
    public Zone? Zone { get; set; }
}
