using System.ComponentModel.DataAnnotations;

namespace TransportManagementSystem.Models;

public class LocationDto
{
    public int? Id { get; set; }

    public required string Name { get; set; }

    public bool IsActive { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    public List<LocationGeographicalEntityDto> GeographicalEntities { get; set; } = new();
}
public class LocationGeographicalEntityDto
{
    public int GeographicalEntityId { get; set; }

    public string? Name { get; set; }
}
public class CreateLocationDto
{
    public string Name { get; set; } = string.Empty;

    public bool? IsActive { get; set; }

    public List<LocationGeographicalEntityDto>? GeographicalEntities { get; set; }
}
public class UpdateLocationDto
{
    public string? Name { get; set; }

    public bool? IsActive { get; set; }

    public List<LocationGeographicalEntityDto>? GeographicalEntities { get; set; }
}
