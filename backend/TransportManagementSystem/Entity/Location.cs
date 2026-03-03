using System.ComponentModel.DataAnnotations;

namespace TransportManagementSystem.Entity;

public class Location
{
    public int Id { get; set; }

    [Required]
    public string Name { get; set; } = string.Empty;

    public bool IsActive { get; set; } = true;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    [Required]
    public string Address { get; set; } = string.Empty;
    public required double Longitude { get; set; }
    public required double Latitude { get; set; }
}
