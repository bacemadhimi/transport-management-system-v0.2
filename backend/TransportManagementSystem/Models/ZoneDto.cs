using System.ComponentModel.DataAnnotations;

namespace TransportManagementSystem.Models;

public class ZoneDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class CreateZoneDto
{
    [Required]
    public string Name { get; set; } = string.Empty;

    public bool? IsActive { get; set; }
}

public class UpdateZoneDto
{
    public string? Name { get; set; }
    public bool? IsActive { get; set; }
}
