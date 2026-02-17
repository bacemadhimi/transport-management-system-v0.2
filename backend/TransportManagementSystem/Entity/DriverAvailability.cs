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
    [DataType(DataType.Date)]
    [Column(TypeName = "date")]
    public DateTime Date { get; set; }

    public bool IsAvailable { get; set; } = true;

    public bool IsDayOff { get; set; } = false;

    [StringLength(255)]
    public string? Reason { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation property
    [ForeignKey("DriverId")]
    public virtual Driver Driver { get; set; }

    public int DriverIndex { get; set; }
    public DateTime DateIndex { get; set; }
    public int? TripId { get; set; }
}
