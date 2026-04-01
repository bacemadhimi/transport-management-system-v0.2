using System.ComponentModel.DataAnnotations;

namespace TransportManagementSystem.Entity;

public class Location
{
    public int Id { get; set; }

    [Required]
    public string Name { get; set; } = string.Empty;

    public string? AddressText { get; set; }
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }
    public bool IsValidated { get; set; } = false;

    public bool IsActive { get; set; } = true;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    [Required]
    public string Address { get; set; } = string.Empty;
}
