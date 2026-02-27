using System.ComponentModel.DataAnnotations;

namespace TransportManagementSystem.Entity;

public class GeographicalLevel
{
    [Key]
    public int Id { get; set; }

    [Required]
    [MaxLength(50)]
    public string Name { get; set; } // e.g., "Region", "Governorate", "Zone", "District", "Sector"

    [Required]
    public int LevelNumber { get; set; } // 1, 2, 3, 4, 5

    [Required]
    public bool IsMappable { get; set; } // Whether this level requires coordinates

    public bool IsActive { get; set; } = true;

    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}
