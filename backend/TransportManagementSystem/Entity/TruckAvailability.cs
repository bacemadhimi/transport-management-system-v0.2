using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TransportManagementSystem.Entity;

public class TruckAvailability
{
    [Key]
    public int Id { get; set; }

    [Required]
    public int TruckId { get; set; }

    [Required]
    [DataType(DataType.Date)]
    [Column(TypeName = "date")]
    public DateTime Date { get; set; }

    public bool IsAvailable { get; set; } = true;

    public bool IsDayOff { get; set; } = false;

    [StringLength(255)]
    public string? Reason { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    [ForeignKey(nameof(TruckId))]
    public virtual Truck? Truck { get; set; }

    // Propriétés pour les requêtes (pour compatibilité avec DriverAvailability)
    [NotMapped]
    public DateTime? StartDate { get => Date; set { if (value.HasValue) Date = value.Value; } }

    [NotMapped]
    public DateTime? EndDate { get => Date; set { if (value.HasValue) Date = value.Value; } }

    public string? TripReference { get; set; }
}
