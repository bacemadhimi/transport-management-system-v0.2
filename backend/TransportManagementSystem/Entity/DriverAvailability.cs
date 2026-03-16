using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TransportManagementSystem.Entity;

public class DriverAvailability
{
    [Key]
    public int Id { get; set; }

    [Required]
    public int DriverId { get; set; }

    [Required]
    public DateTime StartDate { get; set; }

    [Required]
    public DateTime EndDate { get; set; }

    public bool IsAvailable { get; set; } = true;

    public bool IsDayOff { get; set; } = false;

    [StringLength(255)]
    public string? Reason { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation property
    [ForeignKey("DriverId")]
    public virtual Driver Driver { get; set; }

    public int? TripId { get; set; }
    public string? TripReference { get; set; }

    // Propriété Date pour les requêtes (computed property, not mapped to database)
    // Using private setter to allow EF Core to work with the property
    [NotMapped]
    public DateTime Date { get => StartDate; set { StartDate = value; EndDate = value; } }
}
